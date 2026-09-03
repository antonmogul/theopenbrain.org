/**
 * Pure transform helpers shared by useChapter (the reader) and the Node-side
 * Chapter 1 tooling (scripts/check-chapter1-text-parity.mjs, the repair
 * migration generator, and the importer round-trip test).
 *
 * Everything here is side-effect free and framework-free on purpose: no Vue,
 * no `@/` aliases, no import.meta.env — so plain `node` can import it. The
 * functions were hoisted verbatim out of the useChapter() closure; useChapter
 * re-exports them, so existing imports keep working.
 *
 * Input shape: DB paragraph rows as fetched by useChapter.fetchChapter, with
 * `animation_key` / `animation_title` already attached (fetch step 3b).
 * Output shape: Chapter 1's text.json paragraph tree.
 */

/**
 * Convert JSONB content blocks to HTML text
 * Returns an object with text (for paragraphs) and hasHeading flag
 */
/**
 * Extract Chapter 1-specific metadata from content blocks.
 * Returns extra fields to merge onto the paragraph object
 * (animationFull, type, img, steps, etc.)
 */
export function extractChapter1Meta(blocks) {
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

export function contentBlocksToHTML(blocks) {
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
      if (block.type === "figure_placeholder") {
        // Inline "(Figure N)" callout. Anchors to the left-column placeholder
        // via data-figure so it can later deep-link / scroll-sync.
        const n = block.number;
        const label = n === undefined || n === null ? "Figure" : `Figure ${n}`;
        return `<span class="figure-ref" data-figure="${n ?? ""}">${label}</span>`;
      }
      // Chapter 1-specific types — metadata only, no HTML
      if (
        [
          "animation",
          "animation_full",
          "break_section",
          "break_video",
          "further_reading",
          "footnote",
        ].includes(block.type)
      ) {
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
export function transformParagraph(p) {
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

  // Add animation if present. The left column matches on the animation KEY
  // (IllustrationsComp compares activeAnimation === animation.id.toLowerCase()),
  // and the DOM trigger id is `triggerAnimation` + animation.name. So `name`
  // must be the animation_key with its leading "animation" prefix removed and
  // `id` the full key — mirroring Chapter 1's text.json shape
  // ({name:"EyeStructur", id:"animationEyeStructur"}). `animation_key` is
  // attached to the row during fetch (see fetchChapter); fall back gracefully
  // if it is missing.
  // Skip the inline animation object on fullscreen rows: those carry an
  // `animation_full` block (→ para.animationFull, spread from meta above) AND an
  // animation_id FK. Attaching both makes mobile SectionComp mount FullScreenIllustration
  // *and* IllustrationInline for the same paragraph. Static fullscreen paragraphs carry
  // only animationFull.
  if (p.animation_id && p.animation_key && !para.animationFull) {
    // Display flags (start/middel/end/stage) round-trip through the content
    // JSONB — written by scripts/import-chapter-1-to-supabase.mjs.
    const flags = p.content?.animationFlags || {};

    para.animation = {
      name: p.animation_key.replace(/^animation/, ""),
      id: p.animation_key,
      title: p.animation_title || "",
      // Transition figures: the flag round-trips via animationFlags; the
      // legacy 'scroll' trigger value is kept as back-compat for rows seeded
      // before the flags existed.
      transition: flags.transition === true || p.animation_trigger === "scroll",
      // start/middel/end drive StartEndIcon.vue. stage has no consumer yet;
      // carried so nothing is lost across a re-seed.
      ...(flags.start ? { start: true } : {}),
      ...(flags.middel ? { middel: true } : {}),
      ...(flags.end ? { end: true } : {}),
      ...(flags.stage ? { stage: flags.stage } : {}),
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
export function reconstructNesting(flatParagraphs) {
  const result = [];
  let currentSubSection = null;
  let currentSubSubGroup = null;

  for (const p of flatParagraphs) {
    const level = p.subsection_level || 0;

    if (p.is_subsection_header && level === 1) {
      // Start a new subSection. FLUSH the previous one first — otherwise a run of
      // consecutive subsection headers silently overwrites all but the last (this
      // dropped ~11 of Chapter 1's figures, incl. the entire Diseases video strip).
      // mergeConsecutiveSubSections() re-groups the flushed entries into a single
      // { subSection: [...] } wrapper matching text.json's shape.
      if (currentSubSection) {
        // Close any open subSubSection group before flushing its parent
        if (currentSubSubGroup) {
          currentSubSection.paragraphs.push({
            subSubSection: currentSubSubGroup,
          });
          currentSubSubGroup = null;
        }
        result.push({ subSection: [currentSubSection] });
      }
      // Defensive: discard any orphan subSubSection group with no valid parent
      // (a level-2 row that arrived before any header). Real Ch1 data never emits
      // one, but the transformer is shared with Chapter 2+ and must not leak it
      // forward into the new subSection.
      currentSubSubGroup = null;
      currentSubSection = {
        id: p.id,
        title: p.content_text || "",
        paragraphs: [],
      };
      // Add animation from the section-header paragraph (keyed off the real
      // animation_key — see transformParagraph for the contract).
      if (p.animation_id && p.animation_key) {
        // Same flags round-trip as transformParagraph above.
        const flags = p.content?.animationFlags || {};

        currentSubSection.animation = {
          name: p.animation_key.replace(/^animation/, ""),
          id: p.animation_key,
          title: p.animation_title || "",
          // Same flags round-trip + legacy back-compat as transformParagraph.
          transition:
            flags.transition === true || p.animation_trigger === "scroll",
          ...(flags.start ? { start: true } : {}),
          ...(flags.middel ? { middel: true } : {}),
          ...(flags.end ? { end: true } : {}),
          ...(flags.stage ? { stage: flags.stage } : {}),
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
        currentSubSection.paragraphs.push({
          subSubSection: currentSubSubGroup,
        });
        currentSubSubGroup = null;
      }
      currentSubSection.paragraphs.push(transformParagraph(p));
      continue;
    }

    // level === 0: top-level paragraph
    // First, flush any open subSection
    if (currentSubSection) {
      if (currentSubSubGroup) {
        currentSubSection.paragraphs.push({
          subSubSection: currentSubSubGroup,
        });
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
      currentSubSection.paragraphs.push({
        subSubSection: currentSubSubGroup,
      });
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
export function mergeConsecutiveSubSections(paragraphs) {
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
 * Transform one main section's flat paragraph rows into the reader's nested
 * paragraph tree. Sorts by order_index; sections with any subsection rows go
 * through reconstructNesting + mergeConsecutiveSubSections, flat ones (Chapter
 * 2+) map straight through transformParagraph.
 * @param {Array<Object>} rows - DB paragraph rows of one section
 */
export function transformSectionParagraphs(rows) {
  const sorted = rows
    ? [...rows].sort((a, b) => a.order_index - b.order_index)
    : [];

  // Check if any paragraphs have subsection nesting
  const hasNesting = sorted.some(
    (p) => (p.subsection_level || 0) > 0 || p.is_subsection_header
  );

  if (hasNesting) {
    return mergeConsecutiveSubSections(reconstructNesting(sorted));
  }
  return sorted.map(transformParagraph);
}

/**
 * Transform database module structure to Chapter 1 format
 */
export function transformModuleToChapterFormat(module) {
  if (!module || !module.sections) {
    return null;
  }

  // Sort sections by order_index
  const sortedSections = [...module.sections].sort(
    (a, b) => a.order_index - b.order_index
  );

  // Find special sections
  const introSection = sortedSections.find(
    (s) => s.slug === "introduction" || s.order_index === 0
  );
  const furtherReadingSection = sortedSections.find(
    (s) => s.slug === "further-reading"
  );
  const footnotesSection = sortedSections.find((s) => s.slug === "footnotes");
  const mainSections = sortedSections.filter(
    (s) =>
      s !== introSection &&
      s !== furtherReadingSection &&
      s !== footnotesSection
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
    const paragraphs = transformSectionParagraphs(section.paragraphs);

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
    const frParas = [...furtherReadingSection.paragraphs].sort(
      (a, b) => a.order_index - b.order_index
    );
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
    const fnParas = [...footnotesSection.paragraphs].sort(
      (a, b) => a.order_index - b.order_index
    );
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
    "intro:",
    transformed.intro.length,
    "sections:",
    transformed.sections.length,
    "footnotes:",
    transformed.footNotes.notes.length
  );

  return transformed;
}
