/** All chapter placement is authored in paragraphs.content.blocks (OPENBRAIN-62).
 * Kept empty for older editor conversion tools. Never add code placements here.
 */
export const WIDGET_PLACEMENTS = [];

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
      // Below the two-column reader, a card instead (a desktop-sized tool).
      ...(placement.narrowKind ? { narrowKind: placement.narrowKind } : {}),
      // A built-in view to show while an upload isn't published yet.
      ...(placement.fallbackWidgetId
        ? { fallbackWidgetId: placement.fallbackWidgetId }
        : {}),
      title: placement.title || "",
      blurb: placement.blurb || "",
      credit: placement.credit || "",
      route: placement.route || "",
      ...(placement.fullScreen ? { fullScreen: true } : {}),
      ...(placement.launchCard ? { launchCard: placement.launchCard } : {}),
    },
  };
}

/** Presentation belongs to the authored block, with no placement inheritance. */
export function fullScreenOf(placement) {
  return placement?.fullScreen === true;
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

/* Whether the chapter's own content already places this widget: a DB block
   with the same widget, or one that took over the placement by its id (the
   Penfield block kept `foundations-case-cabinet` when the cabinet became the
   uploaded binder, OPENBRAIN-168). Paragraphs this config produced don't count. */
function hasWidget(chapter, placement) {
  const widgetId = placement.widgetId;
  for (const section of [
    ...(chapter?.intro || []),
    ...(chapter?.sections || []),
  ]) {
    if (!Array.isArray(section.paragraphs)) continue;
    for (const list of paragraphLists(section)) {
      if (
        list.some(
          (p) =>
            p?.type === "widget" &&
            (p.widget?.widgetId === widgetId ||
              (p.widget?.placedBy !== "config" &&
                p.widget?.placementId === placement.id))
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
    if (hasWidget(chapter, placement)) {
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
