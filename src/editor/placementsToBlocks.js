/**
 * Turn code-placed widgets (src/widgets/placements.js) into real `widget`
 * blocks, so the chapter block page can move and edit them (OPENBRAIN-62).
 *
 * The reader skips a placement when the chapter already has a DB widget
 * block with the same widgetId ("the DB wins"), so converting one only
 * means inserting that block where its anchors say. This resolves the same
 * anchors against a section's flat paragraph rows (sorted by order_index):
 *
 *   { after:  { textIncludes } }  → just after the row whose text has it
 *   { before: { textIncludes } }  → just before that row
 *   { beforeSubSection: title }   → just before that subsection's header row
 *   { endOfSection: true }        → after the last row
 *
 * The first anchor that resolves wins, as in the reader.
 */

const rowText = (row) => row?.content_text || "";

/** Index to insert at, or -1 if no anchor resolves. */
export function resolveAnchorIndex(rows, anchors = []) {
  for (const a of anchors) {
    if (a?.after?.textIncludes) {
      const i = rows.findIndex((r) =>
        rowText(r).includes(a.after.textIncludes)
      );
      if (i >= 0) return i + 1;
    } else if (a?.before?.textIncludes) {
      const i = rows.findIndex((r) =>
        rowText(r).includes(a.before.textIncludes)
      );
      if (i >= 0) return i;
    } else if (a?.beforeSubSection) {
      const i = rows.findIndex(
        (r) =>
          r.is_subsection_header && rowText(r).trim() === a.beforeSubSection
      );
      if (i >= 0) return i;
    } else if (a?.endOfSection) {
      return rows.length;
    }
  }
  return -1;
}

/** The `widget` block a placement stands for. */
export function placementBlock(p) {
  return {
    type: "widget",
    widgetId: p.widgetId,
    kind: p.kind === "inline" ? "inline" : "breakout",
    title: p.title || "",
    blurb: p.blurb || "",
    credit: p.credit || "",
    placementId: p.id,
    route: p.route || "",
  };
}

/**
 * Plan the conversion for one chapter: which placements still apply (no DB
 * widget with the same widgetId) and where each would go.
 *
 * @returns {{ placement, sectionId, index, block }[]} ready, in order; and
 *          `unresolved` placements whose section or anchors weren't found.
 */
export function planPlacementConversion({
  placements,
  sections,
  rowsBySection,
  existingWidgetIds,
}) {
  const ready = [];
  const unresolved = [];
  for (const p of placements) {
    if (existingWidgetIds.has(p.widgetId)) continue;
    const section = sections.find((s) => s.slug === p.sectionSlug);
    const rows = section ? rowsBySection.get(section.id) || [] : [];
    const index = section ? resolveAnchorIndex(rows, p.anchors) : -1;
    if (index < 0) unresolved.push(p);
    else
      ready.push({
        placement: p,
        sectionId: section.id,
        index,
        block: placementBlock(p),
      });
  }
  return { ready, unresolved };
}
