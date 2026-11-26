import { figureImages } from "./figureCycle";
import { imageTakesTint } from "./figureTint";
import { SECTION_ART_ORIGINALS } from "./sectionArt";

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
 * flash by. The caller gives short first-figure openings `MIN_RUN` of
 * extra heading room; this guard still skips a short run into a band.
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

/** The first pane figure can carry the card when it is the same still.
 * Baked section exports declare their originals in SECTION_ART_ORIGINALS; ordinary
 * art matches by src; and a figure whose picture names the section's art as
 * its own washed copy (`wash`, OPENBRAIN-86: the brain of H.M.) says so
 * itself. Since OPENBRAIN-93 that only identifies the picture: the
 * hand-over colours every figure the same way, in the shell, and shows no
 * copy. A different first figure, film or gallery keeps its own card.
 * Never guess identity from a title or a filename fragment.
 */
export function sectionCardFigure(art, record) {
  const images = figureImages(record);
  if (
    !art ||
    art.placeholder ||
    images.length !== 1 ||
    !imageTakesTint(images[0])
  )
    return null;
  if (
    record.widgetId ||
    record.fullscreen ||
    record.scroll ||
    record.isTransition ||
    record.switch
  )
    return null;
  return images[0].wash === art.src ||
    [art.src, ...(SECTION_ART_ORIGINALS[art.src] || [])].includes(images[0].src)
    ? record
    : null;
}
