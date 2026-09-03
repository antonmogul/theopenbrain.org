/*
 * Widget placements — where an interactive widget sits inside a chapter.
 *
 * The reader renders a chapter from Supabase (modules → sections → paragraphs),
 * transformed by useChapter into the legacy text.json shape. Widgets, by
 * contrast, are Vue routes registered in src/widgets/catalog.js and were only
 * reachable through the /widgets gallery. This module bridges the two: a
 * placement says "put widget X inside chapter Y at position Z", and
 * applyWidgetPlacements() splices a `{ type: "widget" }` paragraph into the
 * transformed chapter at that position. SectionComp / SubSection /
 * SubSubSection render that paragraph as <WidgetBreakout>.
 *
 * Why code-side and not a DB block: content authors asked for three widgets at
 * exact editorial positions (OPENBRAIN-21) while the paragraph rows those
 * positions refer to are still being repaired (OPENBRAIN-22). Anchoring by
 * section slug + text is stable across re-seeds, needs no production write,
 * and is trivially testable. When a `{ type: "widget", widgetId }` block is
 * later authored in `paragraphs.content.blocks`, transformParagraph turns it
 * into the same paragraph shape and the matching placement here is skipped —
 * the DB wins, so migrating a placement into the DB is a delete here, nothing
 * else.
 *
 * Anchor semantics (tried in order; the first that resolves wins):
 *   { after: { textIncludes } }   — right after the paragraph whose rendered
 *                                    text contains the string (any nesting depth)
 *   { beforeSubSection: title }   — at the end of the subsection that precedes
 *                                    the named one, i.e. visually just above its
 *                                    heading; if it is the first subsection, in
 *                                    the parent list before the group
 *   { endOfSection: true }        — last paragraph of the section
 *
 * Two placements resolving to the same anchor land in array order.
 */

/** @typedef {"breakout" | "inline"} PlacementKind */

/**
 * @typedef {Object} WidgetPlacement
 * @property {string} id            Unique placement id (kebab-case)
 * @property {string} widgetId      Key into src/widgets/embeds.js and the catalog
 * @property {string} chapterSlug   `modules.slug` of the chapter
 * @property {string} sectionSlug   `sections.slug` inside that chapter
 * @property {PlacementKind} kind   "inline" mounts the widget in the prose
 *                                  column; "breakout" shows a card that opens
 *                                  the widget full-screen
 * @property {Array<Object>} anchors  See "Anchor semantics" above
 * @property {string} title         Card title
 * @property {string} blurb         One or two sentences under the title
 * @property {string} credit        Author credit line
 * @property {string} route         Standalone route of the widget
 */

/** @type {WidgetPlacement[]} */
export const WIDGET_PLACEMENTS = [
  // ── The Retina — Stuart Trenholm's three requests (email 2026-08-20) ──
  {
    id: "retina-color-vision",
    widgetId: "color-vision",
    chapterSlug: "the-retina",
    sectionSlug: "amacrine-and-ganglion-cells-circuits-computations-and-output",
    kind: "breakout",
    // "at the color vision section of the chapter as a breakout box" — the
    // colour material lives under Circuit computations (colour opponency,
    // then Dalton's account of colour blindness).
    anchors: [
      { after: { textIncludes: "John Dalton" } },
      { after: { textIncludes: "Color opponency" } },
      { beforeSubSection: "Rod and cone pathways" },
    ],
    title: "Colour vision starts in the retina",
    blurb:
      "Work from the electromagnetic spectrum down to cone opponency: how three pigment classes, and their overlap, become the colours we see.",
    credit: "Interactive by Stuart Trenholm",
    route: "/color-vision",
  },
  {
    id: "retina-direction-selectivity",
    widgetId: "direction-selectivity",
    chapterSlug: "the-retina",
    sectionSlug: "amacrine-and-ganglion-cells-circuits-computations-and-output",
    kind: "breakout",
    // "a breakout box at the end of the Direction selective section within
    // Circuit Computations". The direction-selectivity paragraphs are being
    // restored to the DB (OPENBRAIN-22); until then fall back to the end of
    // Circuit computations, just above Rod and cone pathways.
    anchors: [
      { after: { textIncludes: "direction selective ganglion cells" } },
      { after: { textIncludes: "Direction-selectivity" } },
      { beforeSubSection: "Rod and cone pathways" },
    ],
    title: "What do direction selective ganglion cells respond like?",
    blurb:
      "Responses from four real retinal ganglion cells to a stimulus moving in eight directions, with the Python that draws the figure. Edit the code and re-run it.",
    credit: "Interactive and data by Stuart Trenholm",
    route: "/direction-selectivity",
  },
  {
    id: "retina-retinabox",
    widgetId: "retinabox",
    chapterSlug: "the-retina",
    sectionSlug: "amacrine-and-ganglion-cells-circuits-computations-and-output",
    kind: "inline",
    // "at the bottom of the Circuit Computations section, right before the
    // Rod vs. Cone signals section". Listed after the direction-selectivity
    // placement so that, when both resolve to the same anchor, RetINaBox is
    // the last thing before Rod and cone pathways.
    anchors: [{ beforeSubSection: "Rod and cone pathways" }],
    title: "RetINaBox — build a retinal circuit",
    blurb:
      "Wire photoreceptors, bipolar and ganglion cells yourself and watch how the circuit turns a light stimulus into spikes. Based on the Trenholm lab's outreach tool.",
    credit: "Interactive by Stuart Trenholm",
    route: "/retinabox",
  },
];

/**
 * Placements that belong to one chapter, in declaration order.
 * @param {string} chapterSlug
 * @param {WidgetPlacement[]} [placements]
 */
export function placementsForChapter(
  chapterSlug,
  placements = WIDGET_PLACEMENTS
) {
  return placements.filter((p) => p.chapterSlug === chapterSlug);
}

/**
 * The paragraph object the reader renders for a placement. Mirrors the shape
 * transformParagraph produces for a DB `{ type: "widget" }` block so both
 * paths hit the same <WidgetBreakout> branch.
 * @param {WidgetPlacement} placement
 */
export function widgetParagraph(placement) {
  return {
    id: `widget-${placement.id}`,
    type: "widget",
    text: "",
    widget: {
      placementId: placement.id,
      widgetId: placement.widgetId,
      kind: placement.kind || "breakout",
      title: placement.title || "",
      blurb: placement.blurb || "",
      credit: placement.credit || "",
      route: placement.route || "",
    },
  };
}

const stripTags = (html) =>
  String(html || "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

/* Every paragraph list in a section, depth-first, with its parent array so
   the caller can splice into it. Skips widget paragraphs themselves. */
function* paragraphLists(section) {
  yield section.paragraphs;
  for (const p of section.paragraphs) {
    if (p?.subSection) {
      for (const sub of p.subSection) {
        if (!Array.isArray(sub.paragraphs)) continue;
        yield sub.paragraphs;
        for (const sp of sub.paragraphs) {
          if (sp?.subSubSection) yield sp.subSubSection;
        }
      }
    } else if (p?.subSubSection) {
      yield p.subSubSection;
    }
  }
}

function findSection(chapter, placement) {
  const sections = chapter?.sections || [];
  return (
    sections.find((s) => s.slug && s.slug === placement.sectionSlug) ||
    sections.find(
      (s) =>
        placement.sectionTitle &&
        stripTags(s.title).toLowerCase() ===
          placement.sectionTitle.toLowerCase()
    ) ||
    null
  );
}

function hasWidget(chapter, widgetId) {
  for (const section of [
    ...(chapter?.intro || []),
    ...(chapter?.sections || []),
  ]) {
    if (!Array.isArray(section.paragraphs)) continue;
    for (const list of paragraphLists(section)) {
      if (
        list.some(
          (p) => p?.type === "widget" && p.widget?.widgetId === widgetId
        )
      )
        return true;
    }
  }
  return false;
}

function resolveAfterText(section, needle) {
  const target = needle.toLowerCase();
  for (const list of paragraphLists(section)) {
    const idx = list.findIndex(
      (p) =>
        p &&
        p.type !== "widget" &&
        typeof p.text === "string" &&
        stripTags(p.text).toLowerCase().includes(target)
    );
    if (idx !== -1) return { list, index: idx + 1 };
  }
  return null;
}

function resolveBeforeSubSection(section, title) {
  const target = stripTags(title).toLowerCase();
  const parent = section.paragraphs;
  for (let i = 0; i < parent.length; i++) {
    const wrapper = parent[i];
    if (!wrapper?.subSection) continue;
    const j = wrapper.subSection.findIndex(
      (sub) => stripTags(sub.title).toLowerCase() === target
    );
    if (j === -1) continue;
    if (j > 0) {
      const prev = wrapper.subSection[j - 1];
      if (!Array.isArray(prev.paragraphs)) prev.paragraphs = [];
      return { list: prev.paragraphs, index: prev.paragraphs.length };
    }
    return { list: parent, index: i };
  }
  return null;
}

function resolveAnchor(section, anchor) {
  if (!anchor || !section) return null;
  if (anchor.after?.textIncludes) {
    return resolveAfterText(section, anchor.after.textIncludes);
  }
  if (anchor.beforeSubSection) {
    return resolveBeforeSubSection(section, anchor.beforeSubSection);
  }
  if (anchor.endOfSection) {
    return { list: section.paragraphs, index: section.paragraphs.length };
  }
  return null;
}

/**
 * Splice widget paragraphs into a transformed chapter, in place.
 *
 * @param {Object} chapter   Output of transformModuleToChapterFormat
 * @param {WidgetPlacement[]} placements  Already filtered to this chapter
 * @returns {{ applied: string[], skipped: string[], unresolved: string[] }}
 *   applied    placement ids inserted
 *   skipped    placements whose widget the chapter already carries (DB block)
 *   unresolved placements whose section or anchors could not be found
 */
export function applyWidgetPlacements(chapter, placements) {
  const result = { applied: [], skipped: [], unresolved: [] };
  if (!chapter || !Array.isArray(chapter.sections)) return result;

  for (const placement of placements || []) {
    if (hasWidget(chapter, placement.widgetId)) {
      result.skipped.push(placement.id);
      continue;
    }
    const section = findSection(chapter, placement);
    if (!section || !Array.isArray(section.paragraphs)) {
      result.unresolved.push(placement.id);
      continue;
    }
    let spot = null;
    for (const anchor of placement.anchors || []) {
      spot = resolveAnchor(section, anchor);
      if (spot) break;
    }
    if (!spot) {
      result.unresolved.push(placement.id);
      continue;
    }
    spot.list.splice(spot.index, 0, widgetParagraph(placement));
    result.applied.push(placement.id);
  }
  return result;
}
