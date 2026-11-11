/*
 * When a section's card is in the figure pane (OPENBRAIN-174). Pure: the
 * caller (SectionCards.vue) measures the page and asks.
 *
 * Between two sections the reader crosses the section gap and the new
 * heading with nothing in the pane: the last figure has left (it holds to
 * the section's end at most, or a full-width band ended it earlier) and the
 * new section's first figure has not reached the figure line. The card
 * fills exactly that: it comes in once the last section's text has passed
 * `START_LINE` of the screen, and leaves at the figure line, mid-screen,
 * where the first figure takes over (helper/historyFigureTiming.js).
 *
 * A figure still in the pane always wins (the caller checks that): a card
 * never shortens a hold. So where a held figure reaches the section's top
 * and the first figure follows its heading at once, the card would only
 * flash by. `MIN_RUN` leaves those sections without one.
 */

/** Share of the screen's height at which the last section's end brings the card in. */
export const START_LINE = 0.75;
/** The figure line: where a figure's paragraph brings it into the pane. */
export const FIGURE_LINE = 0.5;
/** px from a section's top to its first figure for a card to be worth showing. */
export const MIN_RUN = 200;

/**
 * @param {{ gapStart: number, top: number, end: number }} box  Viewport y's:
 *   where the section before stops (its text, before the gap), this
 *   section's top, and its first figure's paragraph (or band, or its own
 *   end when it has neither).
 * @param {number} screen  The viewport's height.
 * @returns {{ on: boolean, progress: number }}  progress runs 0 → 1 across
 *   the card's stay, clamped outside it.
 */
export function cardState(box, screen, minRun = MIN_RUN) {
  const off = { on: false, progress: 0 };
  if (!box || !(screen > 0)) return off;
  const { gapStart, top, end } = box;
  if (![gapStart, top, end].every(Number.isFinite)) return off;
  if (end - top < minRun) return off;
  const startLine = screen * START_LINE;
  const endLine = screen * FIGURE_LINE;
  // Scroll distance from the card's arrival: the gap's start has to rise
  // from the start line, then the first figure to the figure line.
  const travelled = startLine - gapStart;
  const total = end - gapStart + (startLine - endLine);
  if (travelled < 0) return off;
  if (end <= endLine) return { on: false, progress: 1 };
  return {
    on: true,
    progress: total > 0 ? Math.min(1, Math.max(0, travelled / total)) : 0,
  };
}

/** The card's title is whole while the section's heading is below this share of the screen… */
export const HEADING_IN = 0.86;
/** …and gone once the heading has come up to this one. */
export const HEADING_UP = 0.62;

/**
 * How much of the card's title shows, 1 → 0: it gives way to the section's
 * own heading as that comes up the screen beside it, so the title is never
 * set twice side by side. `top` is the section's top (viewport y).
 */
export function titleShare(top, screen) {
  if (!Number.isFinite(top) || !(screen > 0)) return 1;
  const share = (top / screen - HEADING_UP) / (HEADING_IN - HEADING_UP);
  return Math.min(1, Math.max(0, share));
}
