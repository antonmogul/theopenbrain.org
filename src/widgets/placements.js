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
 *   { before: { textIncludes } }  — right before that paragraph; the fallback
 *                                    of choice when the widget's own passage
 *                                    may be reworded, because it stays ahead
 *                                    of the next topic (endOfSection would
 *                                    drop it behind later widgets)
 *   { beforeSubSection: title }   — at the end of the subsection that precedes
 *                                    the named one, i.e. visually just above its
 *                                    heading; if it is the first subsection, in
 *                                    the parent list before the group
 *   { endOfSection: true }        — after the section's last prose paragraph;
 *                                    widget blocks already at the tail stay last
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

  // ── Attention & Working Memory — Arjun Krishnaswamy's widgets (OPENBRAIN-34)
  // Sonia's frame (1495:34228) shows these in the figure pane, i.e. inline.
  // Shipped as breakout cards in OPENBRAIN-34 while inline stages were
  // clipped by the prose column; inline since OPENBRAIN-37 fixed that.
  // SDT and the normalization model are DB-authored widget blocks from the
  // OPENBRAIN-26 seed and are not placed here.
  {
    id: "attention-posner-cueing",
    widgetId: "posner-cueing",
    chapterSlug: "attention-and-working-memory",
    sectionSlug: "attention-is-measured-behaviorally",
    kind: "inline",
    // "The spatial cueing paradigm introduced by Michael Posner in 1980…"
    anchors: [
      { after: { textIncludes: "Michael Posner in 1980" } },
      { after: { textIncludes: "spatial cueing paradigm" } },
      { before: { textIncludes: "Posner's original measurements" } },
      { endOfSection: true },
    ],
    title: "Run the Posner cueing task",
    blurb:
      "Valid, invalid and neutral cues, your own reaction times: see why a cue at the target's location speeds detection and an invalid one slows it.",
    credit: "Interactive by Arjun Krishnaswamy",
    route: "/posner-cueing",
  },
  {
    id: "attention-contrast-response-gain",
    widgetId: "contrast-response-gain",
    chapterSlug: "attention-and-working-memory",
    sectionSlug: "neural-correlates-of-visual-attention",
    kind: "inline",
    // After the response-gain paragraph so both gain types are introduced
    // before the model that lets you switch between them.
    // Fallbacks stay ahead of the next topic (biased competition) rather than
    // dropping to the end of the section behind the normalization block.
    anchors: [
      { after: { textIncludes: "Response gain increases" } },
      { after: { textIncludes: "Contrast gain causes" } },
      { before: { textIncludes: "Attention biases competition" } },
      { before: { textIncludes: "feature-similarity gain principle" } },
      { before: { textIncludes: "Normalization model:" } },
      { endOfSection: true },
    ],
    title: "Contrast gain or response gain?",
    blurb:
      "Slide attention onto a neuron's receptive field and watch its contrast-response curve shift left or stretch up — the two signatures the chapter just described.",
    credit: "Interactive by Arjun Krishnaswamy",
    route: "/contrast-response",
  },
  {
    id: "attention-biased-competition",
    widgetId: "biased-competition",
    chapterSlug: "attention-and-working-memory",
    sectionSlug: "neural-correlates-of-visual-attention",
    kind: "inline",
    anchors: [
      {
        after: {
          textIncludes: "Attention biases competition between two stimuli",
        },
      },
      { after: { textIncludes: "biases competition" } },
      { before: { textIncludes: "feature-similarity gain principle" } },
      { before: { textIncludes: "Normalization model:" } },
      { endOfSection: true },
    ],
    title: "Two stimuli, one receptive field",
    blurb:
      "Put a preferred and a non-preferred stimulus in the same receptive field and attend to either: the biased competition model shows which one wins the neuron's response.",
    credit: "Interactive by Arjun Krishnaswamy",
    route: "/biased-competition",
  },
  {
    id: "attention-feature-attention",
    widgetId: "tmt-feature-attention",
    chapterSlug: "attention-and-working-memory",
    sectionSlug: "neural-correlates-of-visual-attention",
    kind: "inline",
    anchors: [
      { after: { textIncludes: "feature-similarity gain principle" } },
      { after: { textIncludes: "Treue and Martinez-Trujillo" } },
      { before: { textIncludes: "Normalization model:" } },
      { endOfSection: true },
    ],
    title: "Feature-based attention",
    blurb:
      "Attend to a colour or a direction rather than a place: the feature-similarity gain principle multiplies a neuron's response by how well the attended feature matches its tuning.",
    credit: "Interactive by Arjun Krishnaswamy",
    route: "/feature-attention",
  },

  // ── Foundations of Neuroscience (History) — in-house prototypes (OPENBRAIN-35)
  {
    id: "foundations-phrenology",
    widgetId: "phrenology",
    chapterSlug: "foundations-of-neuroscience",
    sectionSlug: "do-different-parts",
    kind: "breakout",
    // After the paragraph on phrenology's popularity (Gall's faculties are
    // introduced just before it); fall back to the end of the section.
    anchors: [
      { after: { textIncludes: "Phrenology became wildly popular" } },
      { after: { textIncludes: "phrenolog" } },
      { after: { textIncludes: "Gall" } },
      { endOfSection: true },
    ],
    title: "Phrenology — the skull that mapped the mind",
    blurb:
      "Gall pinned 27 faculties to bumps on the skull. Explore the map, then see why localisation survived even though phrenology did not.",
    credit: "Interactive by The Open Brain",
    route: "/phrenology",
  },
  {
    id: "foundations-case-cabinet",
    widgetId: "case-cabinet",
    chapterSlug: "foundations-of-neuroscience",
    sectionSlug: "box-penfield",
    kind: "breakout",
    // The box shares the widget's title ("Wilder Penfield and the Montreal
    // Procedure"). The folders are Penfield and Perot's patients, so the
    // cabinet follows the paragraph where stimulation "triggered memory
    // recall"; else after the Montreal Procedure paragraph; else box end.
    anchors: [
      { after: { textIncludes: "triggered memory recall" } },
      { after: { textIncludes: "Montreal Procedure" } },
      { endOfSection: true },
    ],
    title: "Penfield’s case files — what stimulation brought back",
    blurb:
      "Pull a patient’s folder from the drawer: the numbered points Penfield stimulated, and what the patient reported. From Penfield and Perot, Brain, 1963.",
    credit: "Interactive by The Open Brain",
    route: "/case-cabinet",
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
      // Marks paragraphs this config produced; DB-authored blocks (which the
      // transform also gives a placementId) never carry it.
      placedBy: "config",
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

function findParagraphByText(section, needle) {
  const target = needle.toLowerCase();
  for (const list of paragraphLists(section)) {
    const idx = list.findIndex(
      (p) =>
        p &&
        p.type !== "widget" &&
        typeof p.text === "string" &&
        stripTags(p.text).toLowerCase().includes(target)
    );
    if (idx !== -1) return { list, index: idx };
  }
  return null;
}

function resolveAfterText(section, needle) {
  const hit = findParagraphByText(section, needle);
  return hit ? { list: hit.list, index: hit.index + 1 } : null;
}

/* Insert just before the paragraph containing the needle. Used as the
   fallback for a placement whose own passage may be reworded: landing before
   the NEXT topic keeps it in the right region, whereas endOfSection would
   drop it behind everything else in the section (including DB-authored
   widget blocks) and silently reverse the reading order. */
function resolveBeforeText(section, needle) {
  return findParagraphByText(section, needle);
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
  if (anchor.before?.textIncludes) {
    return resolveBeforeText(section, anchor.before.textIncludes);
  }
  if (anchor.beforeSubSection) {
    return resolveBeforeSubSection(section, anchor.beforeSubSection);
  }
  if (anchor.endOfSection) {
    // "End of the section" means after its last piece of prose or after the
    // last widget placed by this config, but ahead of DB-authored widget
    // blocks sitting at the tail (only config placements carry placedBy). A placement
    // whose every text anchor drifted therefore lands before the seed's
    // trailing block instead of silently reversing the reading order, while
    // successive endOfSection placements still keep their declaration order.
    const list = section.paragraphs;
    let index = list.length;
    while (
      index > 0 &&
      list[index - 1]?.type === "widget" &&
      list[index - 1]?.widget?.placedBy !== "config"
    ) {
      index -= 1;
    }
    return { list, index };
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
