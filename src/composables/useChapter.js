import { ref } from "vue";

// Direct REST API helper to bypass supabase-js client issues with new key format
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

async function supabaseRest(endpoint) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  return response.json();
}

/**
 * Generic composable to fetch and transform any chapter from Supabase
 * Transforms database structure to match Chapter 1's JSON format
 */
export function useChapter() {
  const chapterData = ref(null);
  const transformedData = ref(null);
  const loading = ref(false);
  const error = ref(null);

  /**
   * Convert JSONB content blocks to HTML text
   * Returns an object with text (for paragraphs) and hasHeading flag
   */
  /**
   * Extract Chapter 1-specific metadata from content blocks.
   * Returns extra fields to merge onto the paragraph object
   * (animationFull, type, img, steps, etc.)
   */
  function extractChapter1Meta(blocks) {
    const meta = {};
    if (!blocks || !Array.isArray(blocks)) return meta;
    for (const block of blocks) {
      if (!block) continue;
      if (block.type === "animation_full") {
        meta.animationFull = true;
        meta.animationId = block.animationId || null;
        if (block.scroll) meta.scroll = true;
      }
      if (block.type === "break_section") {
        meta.type = "breakSection";
        meta.title = block.title;
        meta.steps = block.steps;
      }
      if (block.type === "break_video") {
        meta.type = "breakVideo";
        meta.title = block.title;
        if (block.videoSlug) meta.videoSlug = block.videoSlug;
      }
      if (block.type === "image") {
        meta.img = block.src;
        if (block.caption) meta.imgCap = block.caption;
        if (block.closed) meta.imgClosed = block.closed;
      }
      if (block.type === "further_reading") {
        meta._isFurtherReading = true;
        meta.title = block.title;
        meta.links = block.links;
      }
      if (block.type === "footnote") {
        meta._isFootnote = true;
        meta.footnoteNumber = block.number;
        meta.footnoteContent = block.content;
      }
    }
    return meta;
  }

  function contentBlocksToHTML(blocks) {
    if (!blocks || !Array.isArray(blocks)) {
      return { text: "", hasHeading: false };
    }

    let hasHeading = false;
    const html = blocks
      .map((block) => {
        if (!block) return "";

        if (block.type === "heading") {
          hasHeading = true;
          const level = block.level || 2;
          return `<h${level} class="text-black">${block.content || ""}</h${level}>`;
        }
        if (block.type === "text" || block.type === "paragraph") {
          return block.content || "";
        }
        if (block.type === "code") {
          return `<pre><code>${block.content || ""}</code></pre>`;
        }
        if (block.type === "list") {
          const items = (block.items || [])
            .map((item) => `<li>${item}</li>`)
            .join("");
          return block.ordered ? `<ol>${items}</ol>` : `<ul>${items}</ul>`;
        }
        if (block.type === "blockquote") {
          return `<blockquote>${block.content || ""}</blockquote>`;
        }
        if (block.type === "image") {
          return `<img src="${block.src || ""}" alt="${block.alt || ""}" />`;
        }
        if (block.type === "citation_ref") {
          return `<sup class="citation-ref" data-ref="${block.number}">${block.number}</sup>`;
        }
        // Chapter 1-specific types — metadata only, no HTML
        if (["animation", "animation_full", "break_section", "break_video", "further_reading", "footnote"].includes(block.type)) {
          return "";
        }
        // Default: try to use content property
        return block.content || "";
      })
      .join("");

    return { text: html, hasHeading };
  }

  /**
   * Transform a single DB paragraph row into a legacy JSON paragraph object.
   */
  function transformParagraph(p) {
    const blocks = p.content?.blocks || [];
    const contentResult = contentBlocksToHTML(blocks);
    const meta = extractChapter1Meta(blocks);

    const para = {
      id: p.id,
      text: contentResult.text,
      hasHeading: contentResult.hasHeading,
      // Spread Chapter 1-specific metadata (animationFull, type, img, etc.)
      ...meta,
    };

    // Add animation if present
    if (p.animation_id) {
      para.animation = {
        name: p.animation_trigger || "default",
        id: `animation${p.animation_trigger || "default"}`,
      };
    }

    return para;
  }

  /**
   * Reconstruct nested subSection / subSubSection structure from flat
   * paragraph rows that have subsection_level and is_subsection_header.
   *
   * Input:  flat list of DB paragraph rows sorted by order_index
   * Output: nested array matching text.json's paragraphs structure
   */
  function reconstructNesting(flatParagraphs) {
    const result = [];
    let currentSubSection = null;
    let currentSubSubGroup = null;

    for (const p of flatParagraphs) {
      const level = p.subsection_level || 0;

      if (p.is_subsection_header && level === 1) {
        // Start a new subSection
        if (currentSubSection) {
          // Close any open subSubSection group
          if (currentSubSubGroup) {
            currentSubSection.paragraphs.push({ subSubSection: currentSubSubGroup });
            currentSubSubGroup = null;
          }
        }
        currentSubSection = {
          id: p.id,
          title: p.content_text || "",
          paragraphs: [],
        };
        // Add animation from the section-header paragraph
        if (p.animation_id) {
          currentSubSection.animation = {
            name: p.animation_trigger || "default",
            id: `animation${p.animation_trigger || "default"}`,
          };
        }
        continue;
      }

      if (level === 2) {
        // subSubSection content
        if (!currentSubSubGroup) currentSubSubGroup = [];
        currentSubSubGroup.push(transformParagraph(p));
        continue;
      }

      if (level === 1 && currentSubSection) {
        // Close subSubSection group if open
        if (currentSubSubGroup) {
          currentSubSection.paragraphs.push({ subSubSection: currentSubSubGroup });
          currentSubSubGroup = null;
        }
        currentSubSection.paragraphs.push(transformParagraph(p));
        continue;
      }

      // level === 0: top-level paragraph
      // First, flush any open subSection
      if (currentSubSection) {
        if (currentSubSubGroup) {
          currentSubSection.paragraphs.push({ subSubSection: currentSubSubGroup });
          currentSubSubGroup = null;
        }
        // Wrap as a subSection entry in parent
        result.push({ subSection: [currentSubSection] });
        currentSubSection = null;
      }

      result.push(transformParagraph(p));
    }

    // Flush remaining
    if (currentSubSection) {
      if (currentSubSubGroup) {
        currentSubSection.paragraphs.push({ subSubSection: currentSubSubGroup });
      }
      result.push({ subSection: [currentSubSection] });
    }

    return result;
  }

  /**
   * Group consecutive subSection entries that were split across
   * multiple is_subsection_header rows into a single { subSection: [...] } wrapper.
   * The original text.json has one paragraph with subSection: [sub1, sub2, sub3, ...]
   */
  function mergeConsecutiveSubSections(paragraphs) {
    const merged = [];
    let subSectionBuffer = [];

    for (const p of paragraphs) {
      if (p.subSection) {
        subSectionBuffer.push(...p.subSection);
      } else {
        if (subSectionBuffer.length > 0) {
          merged.push({ subSection: subSectionBuffer });
          subSectionBuffer = [];
        }
        merged.push(p);
      }
    }
    if (subSectionBuffer.length > 0) {
      merged.push({ subSection: subSectionBuffer });
    }
    return merged;
  }

  /**
   * Transform database module structure to Chapter 1 format
   */
  function transformModuleToChapterFormat(module) {
    if (!module || !module.sections) {
      return null;
    }

    // Sort sections by order_index
    const sortedSections = [...module.sections].sort(
      (a, b) => a.order_index - b.order_index,
    );

    // Find special sections
    const introSection = sortedSections.find(
      (s) => s.slug === "introduction" || s.order_index === 0,
    );
    const furtherReadingSection = sortedSections.find(
      (s) => s.slug === "further-reading",
    );
    const footnotesSection = sortedSections.find(
      (s) => s.slug === "footnotes",
    );
    const mainSections = sortedSections.filter(
      (s) =>
        s !== introSection &&
        s !== furtherReadingSection &&
        s !== footnotesSection,
    );

    // Transform intro section
    const intro = introSection
      ? [
          {
            id: introSection.id,
            title: introSection.title,
            animation: introSection.animation_config || undefined,
            paragraphs: introSection.paragraphs
              ? introSection.paragraphs
                  .sort((a, b) => a.order_index - b.order_index)
                  .map(transformParagraph)
              : [],
          },
        ]
      : [];

    // Transform main sections — reconstruct nesting from flat paragraphs
    const sections = mainSections.map((section) => {
      const sorted = section.paragraphs
        ? [...section.paragraphs].sort((a, b) => a.order_index - b.order_index)
        : [];

      // Check if any paragraphs have subsection nesting
      const hasNesting = sorted.some((p) => (p.subsection_level || 0) > 0 || p.is_subsection_header);

      let paragraphs;
      if (hasNesting) {
        paragraphs = mergeConsecutiveSubSections(reconstructNesting(sorted));
      } else {
        paragraphs = sorted.map(transformParagraph);
      }

      const sectionObj = {
        id: section.id,
        title: section.title,
        paragraphs,
      };

      // Restore section-level animation from animation_config
      if (section.animation_config) {
        sectionObj.animation = section.animation_config;
      }

      return sectionObj;
    });

    // Build furtherReading from its section's paragraphs
    let furtherReading = {
      id: "default-further-reading",
      title: "Further reading:",
      paragraphs: [],
    };
    if (furtherReadingSection?.paragraphs) {
      const frParas = [...furtherReadingSection.paragraphs]
        .sort((a, b) => a.order_index - b.order_index);
      furtherReading = {
        id: furtherReadingSection.id,
        title: furtherReadingSection.title || "Further reading:",
        paragraphs: frParas.map((p) => {
          const meta = extractChapter1Meta(p.content?.blocks || []);
          return {
            id: p.id,
            title: meta.title || p.content_text || "",
            links: meta.links || [],
          };
        }),
      };
    }

    // Build footNotes from its section's paragraphs
    let footNotes = {
      id: "default-footnotes",
      title: "Footnotes",
      animation: { name: "Placeholder" },
      notes: [],
    };
    if (footnotesSection?.paragraphs) {
      const fnParas = [...footnotesSection.paragraphs]
        .sort((a, b) => a.order_index - b.order_index);
      footNotes = {
        id: footnotesSection.id,
        title: footnotesSection.title || "Footnotes",
        animation: { name: "Placeholder" },
        notes: fnParas.map((p) => {
          const meta = extractChapter1Meta(p.content?.blocks || []);
          return { text: meta.footnoteContent || p.content_text || "" };
        }),
      };
    }

    const transformed = {
      moduleId: module.id,
      intro,
      sections,
      furtherReading,
      footNotes,
    };

    console.log(
      "useChapter: Transformed -",
      "intro:", transformed.intro.length,
      "sections:", transformed.sections.length,
      "footnotes:", transformed.footNotes.notes.length,
    );

    return transformed;
  }

  /**
   * Fetch chapter by slug - using direct REST API
   * @param {string} slug - The chapter slug (e.g., 'visual-perception-ux')
   */
  async function fetchChapter(slug) {
    loading.value = true;
    error.value = null;

    try {
      if (!slug) {
        throw new Error("Chapter slug is required");
      }

      console.log("useChapter: Fetching chapter by slug:", slug);

      // Step 1: Get the module by slug
      const modules = await supabaseRest(
        `modules?slug=eq.${encodeURIComponent(slug)}&select=id,title,slug,order_index,status`,
      );

      console.log("useChapter: Module query result:", modules);

      const moduleData = modules?.[0];
      if (!moduleData) {
        throw new Error(`Chapter with slug "${slug}" not found`);
      }

      // Step 2: Get sections for this module (include animation fields for Chapter 1)
      const sectionsData = await supabaseRest(
        `sections?module_id=eq.${moduleData.id}&select=id,title,slug,order_index,module_id,animation_id,animation_config&order=order_index.asc`,
      );

      console.log("useChapter: Sections query result:", sectionsData?.length);

      // Step 3: Get paragraphs for all sections (include subsection_level for Chapter 1 nesting)
      const sectionIds = sectionsData?.map((s) => s.id) || [];
      let paragraphsData = [];

      if (sectionIds.length > 0) {
        // Use 'in' filter for multiple IDs
        const idsParam = sectionIds.map((id) => `"${id}"`).join(",");
        paragraphsData = await supabaseRest(
          `paragraphs?section_id=in.(${idsParam})&select=id,order_index,content,animation_id,animation_trigger,is_subsection_header,subsection_level,content_text,section_id&order=order_index.asc`,
        );

        console.log(
          "useChapter: Paragraphs query result:",
          paragraphsData?.length,
        );
      }

      // Step 4: Assemble the chapter structure
      const chapter = {
        ...moduleData,
        sections: sectionsData?.map((section) => ({
          ...section,
          paragraphs: (paragraphsData || []).filter(
            (p) => p.section_id === section.id,
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

      return { data: transformedData.value, error: null };
    } catch (err) {
      console.error("useChapter: Error fetching chapter:", err);
      error.value = err.message;
      return { data: null, error: err };
    } finally {
      loading.value = false;
    }
  }

  /**
   * Fetch chapter by module ID - direct query without nested joins
   * @param {string} moduleId - The module UUID
   */
  async function fetchChapterById(moduleId) {
    loading.value = true;
    error.value = null;

    try {
      if (!moduleId) {
        throw new Error("Module ID is required");
      }

      console.log("useChapter: Fetching chapter by ID:", moduleId);

      // Step 1: Get the module by ID
      const { data: moduleData, error: moduleError } = await supabase
        .from("modules")
        .select("id, title, slug, order_index, status")
        .eq("id", moduleId)
        .single();

      if (moduleError) {
        throw new Error(`Module not found: ${moduleError.message}`);
      }

      if (!moduleData) {
        throw new Error("Chapter not found");
      }

      // Step 2: Get sections for this module
      const { data: sectionsData, error: sectionsError } = await supabase
        .from("sections")
        .select("id, title, slug, order_index, module_id")
        .eq("module_id", moduleId)
        .order("order_index", { ascending: true });

      if (sectionsError) {
        throw new Error(`Failed to load sections: ${sectionsError.message}`);
      }

      // Step 3: Get paragraphs for all sections
      const sectionIds = sectionsData?.map((s) => s.id) || [];
      let paragraphsData = [];

      if (sectionIds.length > 0) {
        const { data: pData, error: paragraphsError } = await supabase
          .from("paragraphs")
          .select(
            "id, order_index, content, animation_id, animation_trigger, is_subsection_header, content_text, section_id",
          )
          .in("section_id", sectionIds)
          .order("order_index", { ascending: true });

        if (paragraphsError) {
          throw new Error(
            `Failed to load paragraphs: ${paragraphsError.message}`,
          );
        }
        paragraphsData = pData || [];
      }

      // Step 4: Assemble the chapter structure
      const chapter = {
        ...moduleData,
        sections: sectionsData?.map((section) => ({
          ...section,
          paragraphs: paragraphsData.filter((p) => p.section_id === section.id),
        })),
      };

      chapterData.value = chapter;
      transformedData.value = transformModuleToChapterFormat(chapter);

      return { data: transformedData.value, error: null };
    } catch (err) {
      console.error("useChapter: Error fetching chapter by ID:", err);
      error.value = err.message;
      return { data: null, error: err };
    } finally {
      loading.value = false;
    }
  }

  return {
    chapterData,
    transformedData,
    loading,
    error,
    fetchChapter,
    fetchChapterById,
  };
}
