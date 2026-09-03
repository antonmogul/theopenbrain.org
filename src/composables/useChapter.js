import { ref } from "vue";
import { apiRequest as supabaseRest } from "@/services/api/client";
import { clog, cgroup } from "@/helper/chapterDebug";
import { transformModuleToChapterFormat } from "./chapterTransform.mjs";

/**
 * Generic composable to fetch and transform any chapter from Supabase
 * Transforms database structure to match Chapter 1's JSON format
 */
export function useChapter() {
  const chapterData = ref(null);
  const transformedData = ref(null);
  const loading = ref(false);
  const error = ref(null);
  let fetchGeneration = 0;

  /**
   * Fetch chapter by slug - using direct REST API
   * @param {string} slug - The chapter slug (e.g., 'foundations-of-neuroscience')
   */
  async function fetchChapter(slug) {
    const generation = ++fetchGeneration;
    loading.value = true;
    error.value = null;
    // A route change must never expose the preceding chapter while the next
    // request is pending (or after it fails). ChapterView keys all of its
    // reader-specific initialization from transformedData.moduleId.
    chapterData.value = null;
    transformedData.value = null;

    try {
      if (!slug) {
        throw new Error("Chapter slug is required");
      }

      console.log("useChapter: Fetching chapter by slug:", slug);

      // Step 1: Get the module by slug
      const modules = await supabaseRest(
        `modules?slug=eq.${encodeURIComponent(slug)}&select=id,title,slug,order_index,status`
      );

      if (generation !== fetchGeneration) {
        return { data: null, error: null, stale: true };
      }

      console.log("useChapter: Module query result:", modules);

      const moduleData = modules?.[0];
      if (!moduleData) {
        throw new Error(`Chapter with slug "${slug}" not found`);
      }

      // Step 2: Get sections for this module (include animation fields for Chapter 1)
      const sectionsData = await supabaseRest(
        `sections?module_id=eq.${moduleData.id}&select=id,title,slug,order_index,module_id,animation_id,animation_config&order=order_index.asc`
      );

      if (generation !== fetchGeneration) {
        return { data: null, error: null, stale: true };
      }

      console.log("useChapter: Sections query result:", sectionsData?.length);

      // Step 3: Get paragraphs for all sections (include subsection_level for Chapter 1 nesting)
      const sectionIds = sectionsData?.map((s) => s.id) || [];
      let paragraphsData = [];

      if (sectionIds.length > 0) {
        // Use 'in' filter for multiple IDs
        const idsParam = sectionIds.map((id) => `"${id}"`).join(",");
        paragraphsData = await supabaseRest(
          `paragraphs?section_id=in.(${idsParam})&select=id,order_index,content,animation_id,animation_trigger,is_subsection_header,subsection_level,content_text,section_id&order=order_index.asc`
        );

        if (generation !== fetchGeneration) {
          return { data: null, error: null, stale: true };
        }

        console.log(
          "useChapter: Paragraphs query result:",
          paragraphsData?.length
        );
      }

      // Step 3b: Resolve animation keys for paragraphs that link an animation.
      // The transform needs the animation_key (not just the FK) to build the
      // left-column trigger id, so attach animation_key/title onto each row.
      const animationIds = [
        ...new Set(
          (paragraphsData || []).map((p) => p.animation_id).filter(Boolean)
        ),
      ];
      if (animationIds.length > 0) {
        const animIdsParam = animationIds.map((id) => `"${id}"`).join(",");
        const animRows = await supabaseRest(
          `animations?id=in.(${animIdsParam})&select=id,animation_key,title`
        );
        if (generation !== fetchGeneration) {
          return { data: null, error: null, stale: true };
        }
        const animById = new Map((animRows || []).map((a) => [a.id, a]));
        for (const p of paragraphsData) {
          const a = p.animation_id && animById.get(p.animation_id);
          if (a) {
            p.animation_key = a.animation_key;
            p.animation_title = a.title || "";
          }
        }
      }

      // Step 4: Assemble the chapter structure
      const chapter = {
        ...moduleData,
        sections: sectionsData?.map((section) => ({
          ...section,
          paragraphs: (paragraphsData || []).filter(
            (p) => p.section_id === section.id
          ),
        })),
      };

      console.log("useChapter: Assembled chapter:", {
        id: chapter.id,
        title: chapter.title,
        sectionsCount: chapter.sections?.length,
        sections: chapter.sections?.map((s) => ({
          title: s.title,
          paragraphsCount: s.paragraphs?.length,
        })),
      });

      chapterData.value = chapter;
      transformedData.value = transformModuleToChapterFormat(chapter);

      // [2 TREE] summarise the transformed tree: sections, subsections, figures, and
      // how many carry a scroll `transition` flag (that's the seeded animation_trigger
      // ='scroll' rows). This is the reconstructNesting output — the #1-fix surface.
      try {
        const t = transformedData.value;
        const sections = t?.sections || [];
        let subSections = 0,
          figures = 0,
          transitions = 0;
        const walk = (nodes) => {
          for (const n of nodes || []) {
            if (n.subSection) {
              subSections += n.subSection.length;
              n.subSection.forEach((s) => walk(s.paragraphs));
            }
            if (n.subSubSection) walk(n.subSubSection);
            if (n.animation) {
              figures++;
              if (n.animation.transition) transitions++;
            }
          }
        };
        sections.forEach((s) => walk(s.paragraphs));
        cgroup("TREE", `transform → ${sections.length} sections`, () => {
          clog("TREE", "tree shape", {
            sections: sections.length,
            subSections,
            figures,
            scrollTransitions: transitions,
            title: t?.intro?.[0]?.title,
          });
        });
      } catch (e) {
        clog("TREE", "tree summary failed (non-fatal)", { error: String(e) });
      }

      return { data: transformedData.value, error: null };
    } catch (err) {
      if (generation !== fetchGeneration) {
        return { data: null, error: null, stale: true };
      }
      console.error("useChapter: Error fetching chapter:", err);
      chapterData.value = null;
      transformedData.value = null;
      error.value = err.message;
      return { data: null, error: err };
    } finally {
      if (generation === fetchGeneration) {
        loading.value = false;
      }
    }
  }

  return {
    chapterData,
    transformedData,
    loading,
    error,
    fetchChapter,
  };
}

// Pure transform helpers live in ./chapterTransform.js (no Vue / no aliases so
// Node scripts can import them). Re-exported here so the composable stays the
// single import point for reader code and tests.
export {
  extractChapter1Meta,
  contentBlocksToHTML,
  transformParagraph,
  reconstructNesting,
  mergeConsecutiveSubSections,
  transformSectionParagraphs,
  transformModuleToChapterFormat,
} from "./chapterTransform.mjs";
