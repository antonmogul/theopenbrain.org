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
  function contentBlocksToHTML(blocks) {
    if (!blocks || !Array.isArray(blocks)) {
      console.log("useChapter: No blocks or not an array:", blocks);
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
        if (block.type === "animation") {
          // Animation markers - skip for display
          return "";
        }
        // Default: try to use content property
        return block.content || "";
      })
      .join("");

    return { text: html, hasHeading };
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
    console.log("useChapter: Total sections found:", sortedSections.length);
    console.log(
      "useChapter: Section titles:",
      sortedSections.map((s) => `${s.order_index}: ${s.title}`),
    );

    // Find introduction section (order_index 0 or slug 'introduction')
    const introSection = sortedSections.find(
      (s) => s.slug === "introduction" || s.order_index === 0,
    );
    const mainSections = sortedSections.filter(
      (s) => s.slug !== "introduction" && s.order_index !== 0,
    );
    console.log("useChapter: Intro section:", introSection?.title);
    console.log("useChapter: Main sections count:", mainSections.length);

    // Transform intro section
    const intro = introSection
      ? [
          {
            id: introSection.id,
            title: introSection.title,
            paragraphs: introSection.paragraphs
              ? introSection.paragraphs
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((p) => {
                    const contentResult = contentBlocksToHTML(
                      p.content?.blocks || [],
                    );
                    return {
                      id: p.id,
                      text: contentResult.text,
                      hasHeading: contentResult.hasHeading,
                      ...(p.animation_id && {
                        animation: {
                          name: p.animation_trigger || "default",
                          id: `animation${p.animation_trigger || "default"}`,
                        },
                      }),
                    };
                  })
              : [],
          },
        ]
      : [];

    // Transform main sections
    const sections = mainSections.map((section) => ({
      id: section.id,
      title: section.title,
      paragraphs: section.paragraphs
        ? section.paragraphs
            .sort((a, b) => a.order_index - b.order_index)
            .map((p) => {
              const contentResult = contentBlocksToHTML(
                p.content?.blocks || [],
              );
              const baseParagraph = {
                id: p.id,
                text: contentResult.text,
                hasHeading: contentResult.hasHeading,
              };

              // Add animation if present
              if (p.animation_id) {
                baseParagraph.animation = {
                  name: p.animation_trigger || "default",
                  id: `animation${p.animation_trigger || "default"}`,
                };
              }

              // Handle subsection headers
              if (p.is_subsection_header) {
                baseParagraph.subSection = [
                  {
                    id: p.id,
                    title: p.content_text || "",
                    paragraphs: [], // Will be populated by subsequent paragraphs
                  },
                ];
              }

              return baseParagraph;
            })
        : [],
    }));

    const transformed = {
      intro,
      sections,
      // Add empty furtherReading and footNotes if not present in module
      // These are required by the TextComp component
      furtherReading: module.furtherReading || {
        id: "default-further-reading",
        title: "Further reading:",
        paragraphs: [],
      },
      footNotes: module.footNotes || {
        id: "default-footnotes",
        title: "Footnotes",
        animation: { name: "Placeholder" },
        notes: [],
      },
    };

    console.log(
      "useChapter: Transformed data - intro:",
      transformed.intro.length,
      "sections:",
      transformed.sections.length,
    );
    console.log(
      "useChapter: Section titles in transformed:",
      transformed.sections.map((s) => s.title),
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

      // Step 2: Get sections for this module
      const sectionsData = await supabaseRest(
        `sections?module_id=eq.${moduleData.id}&select=id,title,slug,order_index,module_id&order=order_index.asc`,
      );

      console.log("useChapter: Sections query result:", sectionsData?.length);

      // Step 3: Get paragraphs for all sections
      const sectionIds = sectionsData?.map((s) => s.id) || [];
      let paragraphsData = [];

      if (sectionIds.length > 0) {
        // Use 'in' filter for multiple IDs
        const idsParam = sectionIds.map((id) => `"${id}"`).join(",");
        paragraphsData = await supabaseRest(
          `paragraphs?section_id=in.(${idsParam})&select=id,order_index,content,animation_id,animation_trigger,is_subsection_header,content_text,section_id&order=order_index.asc`,
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
