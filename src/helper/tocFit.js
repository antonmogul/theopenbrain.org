/*
 * How much the contents' gaps give so the list fits its column
 * (OPENBRAIN-182). Pure: OpenerTocArt measures and asks.
 *
 * The opener's contents (OPENBRAIN-174) are one screen tall and the list is
 * anchored at its top. The list must fit the column, or its last rows are
 * cut off on a short window. The text cannot give, so the space between
 * rows does: every gap is multiplied by one factor, 1 when the list fits as
 * drawn, less when it does not, never below FIT_MIN (past that the column
 * scrolls inside itself, which the component leaves to CSS).
 *
 * The list is section titles only since OPENBRAIN-193; while a section's
 * parts opened under its row, the tallest of those states was what had to
 * fit.
 */

/** The tightest the gaps go: below this rows read as one block of text. */
export const FIT_MIN = 0.35;

/**
 * @param {object} m  Measured in px, with the gaps as drawn (factor 1):
 *   room   height the list may take in its column
 *   rows   height of all the section rows together
 *   gaps   the gaps between those rows together
 * @returns {number} the factor for every gap, FIT_MIN..1
 */
export function listFit({ room, rows, gaps } = {}) {
  if (![room, rows, gaps].every(Number.isFinite) || room <= 0) return 1;
  if (rows + gaps <= room) return 1;
  const fit = gaps > 0 ? (room - rows) / gaps : FIT_MIN;
  return Math.min(1, Math.max(FIT_MIN, fit));
}

/** Does the list fit at this factor? (False: the column scrolls.) */
export function listFits({ room, rows, gaps } = {}, fit = 1) {
  return rows + fit * gaps <= room + 0.5;
}
