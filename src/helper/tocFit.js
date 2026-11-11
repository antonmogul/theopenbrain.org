/*
 * How much the contents' gaps give so the list fits its column
 * (OPENBRAIN-182). Pure: OpenerTocArt measures and asks.
 *
 * The opener's contents (OPENBRAIN-174) are one screen tall and the list is
 * anchored at its top; one section's parts are open at a time, under their
 * row. The list must fit the column in every one of those states, or its
 * last rows are cut off on a short window. The text cannot give, so the
 * space between rows and between parts does: every gap is multiplied by one
 * factor, 1 when the tallest state fits as drawn, less when it does not,
 * never below FIT_MIN (past that the column scrolls inside itself, which
 * the component leaves to CSS).
 */

/** The tightest the gaps go: below this rows read as one block of text. */
export const FIT_MIN = 0.35;

/**
 * @param {object} m  Measured in px, with the gaps as drawn (factor 1):
 *   room   height the list may take in its column
 *   rows   height of all the section rows together
 *   gaps   the gaps between those rows together
 *   parts  one per section that has parts: { text, gaps } — the height of
 *          its parts' text, and of the gaps above and between them
 * @returns {number} the factor for every gap, FIT_MIN..1
 */
export function listFit({ room, rows, gaps, parts = [] } = {}) {
  if (![room, rows, gaps].every(Number.isFinite) || room <= 0) return 1;
  // Each state: the rows, their gaps, and one section's parts (or none).
  const states = [{ text: 0, gaps: 0 }, ...parts];
  let fit = 1;
  for (const state of states) {
    const fixed = rows + (state.text || 0);
    const giving = gaps + (state.gaps || 0);
    if (fixed + giving <= room) continue;
    fit = Math.min(fit, giving > 0 ? (room - fixed) / giving : FIT_MIN);
  }
  return Math.min(1, Math.max(FIT_MIN, fit));
}

/** Does the tallest state fit at this factor? (False: the column scrolls.) */
export function listFits({ room, rows, gaps, parts = [] } = {}, fit = 1) {
  return [{ text: 0, gaps: 0 }, ...parts].every(
    (state) =>
      rows + (state.text || 0) + fit * (gaps + (state.gaps || 0)) <= room + 0.5
  );
}
