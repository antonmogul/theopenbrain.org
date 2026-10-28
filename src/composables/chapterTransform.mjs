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
// Relative and alias-free like this file, so plain `node` can still import it.
import {
  normalizeFigureHold,
  normalizeFigureRoom,
} from "../helper/figureHold.mjs";

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
      if (block.wide) meta.imgWide = true; // FullBleed (OPENBRAIN-72)
    }
    if (block.type === "video" && block.youtubeId) {
      // A YouTube video in the prose (OPENBRAIN-70 D2); VideoEmbed renders it.
      meta.video = {
        youtubeId: block.youtubeId,
        title: block.title || "",
        start: block.start || 0,
      };
    }
    if (block.type === "widget" && block.widgetId) {
      // Author-placed interactive (OPENBRAIN-21). Same paragraph shape as
      // src/widgets/placements.js produces, so the reader has one branch.
      meta.type = "widget";
      meta.widget = {
        placementId: block.placementId || block.widgetId,
        widgetId: block.widgetId,
        kind: block.kind === "inline" ? "inline" : "breakout",
        title: block.title || "",
        blurb: block.blurb || "",
        credit: block.credit || "",
        route: block.route || "",
      };
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

/*
 * Markdown bold that leaked through an import (`**defended by** …` renders
 * literally in Foundations, OPENBRAIN-35). Balanced `**…**` pairs on one
 * line become <strong>; any `**` run left over (an unclosed marker, an empty
 * `****`) is markdown residue with no meaning to a reader and is dropped.
 * Single asterisks are left alone because they appear in prose
 * ("p < 0.05 * 2") far more often than as emphasis. Migration
 * 20260911000300 rewrites the affected rows; this keeps the reader correct
 * before it is applied and for any future import that slips.
 */
export function markdownBoldToHtml(html) {
  if (typeof html !== "string" || !html.includes("**")) return html || "";
  return html
    .replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*{2,}/g, "")
    .replace(/ {2,}/g, " ");
}

export function contentBlocksToHTML(blocks) {
  if (!blocks || !Array.isArray(blocks)) {
    return { text: "", hasHeading: false };
  }

  let hasHeading = false;
  const html = blocks
    .map((block, index) => {
      if (!block) return "";

      if (block.type === "heading") {
        hasHeading = true;
        const level = block.level || 2;
        return `<h${level} class="text-black">${block.content || ""}</h${level}>`;
      }
      if (block.type === "text" || block.type === "paragraph") {
        return markdownBoldToHtml(block.content || "");
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
        // Preserve a multi-reference source such as 2,3 as two independently
        // addressable citations without visually concatenating it into 23.
        const separator =
          blocks[index - 1]?.type === "citation_ref"
            ? '<span aria-hidden="true">,</span>'
            : "";
        return `<sup class="citation-ref" data-ref="${block.number}">${separator}${block.number}</sup>`;
      }
      if (block.type === "figure_placeholder") {
        // Stuart's 1 October review supersedes the earlier scroll-link
        // behavior: figure citations are emphasized prose, not navigation.
        const n = block.number;
        const label = n === undefined || n === null ? "Figure" : `Figure ${n}`;
        return `<strong class="figure-ref">${label}</strong>`;
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
          "widget",
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
 * The reader's figure object for a paragraph row with an animation_key:
 * `id` is the full key (IllustrationsComp matches activeAnimation on it) and
 * `name` drops the leading "animation" (the DOM trigger id is
 * `triggerAnimation` + name). Display flags (start/middel/end/stage) round-trip
 * through content.animationFlags (scripts/import-chapter-1-to-supabase.mjs).
 * Also used by the reader's Change figure to update a paragraph in place.
 */
export function figureFor(p) {
  const flags = p.content?.animationFlags || {};
  const hold = normalizeFigureHold(flags.hold);
  const room = normalizeFigureRoom(flags.room);
  return {
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
    // How long the figure stays in the pane (OPENBRAIN-131; the chapter
    // editor's "Stays"). Normalised here, the one place rows become figures,
    // so the page only ever carries 0 | 0.5 | 1 | 2 | "next" and a malformed
    // value is Automatic in the reader as in the editor (an array would
    // otherwise stringify into a valid data-figure-hold). 0 is a choice of
    // its own, so test for null. historyFigureTiming reads the attribute.
    ...(hold !== null ? { hold } : {}),
    // Reading room below the paragraph in the two-column reader, in
    // screens (OPENBRAIN-143; data-figure-room, index.css). Normalised the
    // same way; absent = none.
    ...(room !== null ? { room } : {}),
  };
}

/**
 * Transform a single DB paragraph row into a legacy JSON paragraph object.
 */
/**
 * Put breakout boxes where they belong (OPENBRAIN-70 A3, A4). A box with a
 * parent section follows that section in reading order; if its anchor
 * paragraph is one of the parent's top-level paragraphs it is also marked
 * `anchored`, and SectionComp renders it right after that paragraph instead
 * of on its own. A parent's boxes come out in the order the reader meets
 * them, by anchor paragraph, unanchored ones last in their authored order
 * (OPENBRAIN-142; Stuart, 7 Oct: "reletter them in order"), and
 * sectionLabelMap letters that order. Unplaced boxes keep their order.
 * Returns a new array; `parentId` stays on each box for the contents.
 */
export function placeBoxes(sections) {
  const byId = new Map(sections.map((s) => [s.id, s]));
  const children = new Map();
  const top = [];
  for (const s of sections) {
    const parent = s.kind === "box" && s.parentId && byId.get(s.parentId);
    if (parent && parent !== s && parent.kind !== "box") {
      if (!children.has(parent.id)) children.set(parent.id, []);
      children.get(parent.id).push(s);
    } else top.push(s);
  }
  const out = [];
  for (const s of top) {
    out.push(s);
    const kids = children.get(s.id) || [];
    const at = new Map((s.paragraphs || []).map((p, i) => [p.id, i]));
    const position = (box) =>
      box.anchorParagraphId && at.has(box.anchorParagraphId)
        ? at.get(box.anchorParagraphId)
        : Infinity;
    const placed = kids.map((box, i) => ({ box, i }));
    placed.sort((a, b) => position(a.box) - position(b.box) || a.i - b.i);
    for (const { box } of placed) {
      box.anchored = position(box) !== Infinity;
      out.push(box);
    }
  }
  return out;
}

/**
 * An "Explore more" segment (OPENBRAIN-142): a paragraph a breakout box
 * keeps folded behind a card, its image beside a prompt, until the reader
 * opens it (Stuart, 7 Oct: "a picture of Hippocrates on the left … text
 * that says something like 'Explore more about Hippocrates' view on
 * epilepsy' … when you click on one then it reveals the relevant text and
 * another related image"). Authored on the row as
 * `content.explore = { title, prompt?, image?: { src, alt? }, legend? }`,
 * beside `blocks` and `animationFlags`, which both editors keep
 * (editability.withBlocks). The paragraph's own figure and images open with
 * its text, so the "related image" is the row's figure. Returns null for
 * anything without a title: a malformed value reads as a plain paragraph.
 */
export function exploreFor(content) {
  const raw = content?.explore;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!title) return null;
  const src = typeof raw.image?.src === "string" ? raw.image.src.trim() : "";
  const prompt =
    typeof raw.prompt === "string" && raw.prompt.trim()
      ? raw.prompt.trim()
      : `Explore more about ${title}`;
  const legend = typeof raw.legend === "string" ? raw.legend.trim() : "";
  return {
    title,
    prompt,
    ...(src
      ? {
          image: {
            src,
            alt: typeof raw.image.alt === "string" ? raw.image.alt : "",
          },
        }
      : {}),
    ...(legend ? { legend } : {}),
  };
}

export function transformParagraph(p) {
  const blocks = p.content?.blocks || [];
  const contentResult = contentBlocksToHTML(blocks);
  const meta = extractChapter1Meta(blocks);

  const para = {
    id: p.id,
    text: contentResult.text,
    hasHeading: contentResult.hasHeading,
    // The stored blocks, so the reader's Edit mode can edit them losslessly
    // (OPENBRAIN-64); rendering still uses `text` above.
    blocks: blocks,
    // Spread Chapter 1-specific metadata (animationFull, type, img, etc.)
    ...meta,
  };
  // Folded behind an "Explore more" card (OPENBRAIN-142; ExploreCard.vue).
  const explore = exploreFor(p.content);
  if (explore) para.explore = explore;

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
    para.animation = figureFor(p);
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
        // The header row's blocks, for editing the title in the reader.
        blocks: p.content?.blocks || [],
        paragraphs: [],
      };
      // Add animation from the section-header paragraph (keyed off the real
      // animation_key — see transformParagraph for the contract).
      if (p.animation_id && p.animation_key) {
        currentSubSection.animation = figureFor(p);
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
          // The reader prints this as the chapter's h1, so it must be the
          // chapter's name. Chapter 1 named its intro section after the
          // chapter; Foundations calls its intro "Introduction", which read
          // as the chapter title. The section's own title is kept alongside.
          title: module.title || introSection.title,
          sectionTitle: introSection.title,
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
      // Stable handle for widget placements (sections.slug is unique per
      // module); titles get edited, slugs do not.
      slug: section.slug,
      title: section.title,
      // Foundations seeds its sidebars as sections slugged box-*; the reader
      // letters those as breakout boxes instead of numbering them.
      kind: section.slug?.startsWith("box-") ? "box" : "section",
      // Box placement (OPENBRAIN-70 A3, A4): the section a box belongs to,
      // and the paragraph it follows. placeBoxes() applies them.
      orderIndex: section.order_index,
      parentId: section.parent_section_id || null,
      anchorParagraphId: section.anchor_paragraph_id || null,
      paragraphs,
    };
    // A box's own treatment ("pale" | "dark" | "plate" | "chapter"), set in
    // the chapter editor into sections.box_treatment (OPENBRAIN-157;
    // select=* brings it through). Unset, the slug map in
    // helper/breakoutTreatment.js decides (OPENBRAIN-153). Only boxes carry
    // it; the resolver reads older names ("violet") too.
    if (sectionObj.kind === "box" && section.box_treatment) {
      sectionObj.treatment = section.box_treatment;
    }

    // Restore section-level animation from animation_config
    if (section.animation_config) {
      sectionObj.animation = section.animation_config;
    }

    return sectionObj;
  });

  const placedSections = placeBoxes(sections);

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
    title: module.title || "",
    slug: module.slug || "",
    intro,
    sections: placedSections,
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
