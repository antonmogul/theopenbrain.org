/*
 * railFigure — what a picture is on a breakout box's side-scrolling track
 * (OPENBRAIN-194; the track itself is helper/exploreRail.js).
 *
 * Stuart, 14 Nov, on the boxes: "you can get rid of the 'legend' button and
 * legend in the side scrolling breakout boxes, and then can make the images
 * bigger", and of the doctor with an icepick's two photographs: "you see
 * the images, plus their thumbnails, plus the pause/array buttons, then the
 * figure legends. This is too much for just 2 photos."
 *
 * So on a track a figure of one to three still images is drawn as plates
 * (RailFigure.vue): its label and title, then just the images, side by side
 * on the pinned track and a page each on a phone, each with a button that
 * opens it full screen, where the legend is. No thumbnails, no play/pause,
 * no view-all, no legend control. Anything else (a larger set, a video, a
 * widget, a Lottie) is still drawn by the figure shell (IllustrationInline).
 *
 * Pure functions: which figures are plates, what they are called, and how
 * wide a row of plates is for the height it has.
 */
import { figureImages, usesFigureShell } from "@/helper/figureCycle";

/** The most images a figure can have and still be shown as plates. */
export const RAIL_PLATES_MAX = 3;

/**
 * A figure's images when it can be shown as plates: an image figure of one
 * to RAIL_PLATES_MAX stills. Null for everything the figure shell must draw
 * (no record yet, a widget, a larger set, a video the reader plays or a
 * silent loop, a placeholder with no artwork).
 * @param {object | null | undefined} record the animation record
 * @returns {{ src: string, caption: string, alt: string }[] | null}
 */
export function railPlatesOf(record) {
  if (!record || record.widgetId || record.isTransition) return null;
  if (!usesFigureShell(record)) return null;
  const images = figureImages(record);
  if (!images.length || images.length > RAIL_PLATES_MAX) return null;
  if (images.some((image) => image.youtube)) return null;
  return images;
}

/** "FIG 03" (a number, zero-padded) or "FIG A" (a box letter); "" for a
 *  figure with no number, which is then named by its title alone. */
export function railFigureLabel(record) {
  const n = record?.figureNumber;
  if (n === undefined || n === null || n === "") return "";
  const numeric = typeof n === "number" || /^\d+$/.test(String(n));
  return `FIG ${numeric ? String(n).padStart(2, "0") : n}`;
}

/**
 * How wide a row of plates is when each is `height` tall: the images'
 * widths at that height and the gaps between them. 0 when a ratio is
 * missing (an image that has not loaded).
 * @param {number[]} ratios each image's width / height
 * @param {number} height px
 * @param {number} gap px between plates
 */
export function railPlatesWidth(ratios, height, gap = 0) {
  const list = ratios || [];
  if (!list.length || !(height > 0)) return 0;
  if (list.some((r) => !(r > 0))) return 0;
  const sum = list.reduce((a, r) => a + r, 0);
  return sum * height + Math.max(0, gap) * (list.length - 1);
}

/**
 * How tall the plates are in a row `width` wide (the row above, turned
 * round), never taller than `max`.
 */
export function railPlatesHeight(ratios, width, gap = 0, max = Infinity) {
  const list = ratios || [];
  if (!list.length || !(width > 0)) return 0;
  if (list.some((r) => !(r > 0))) return 0;
  const sum = list.reduce((a, r) => a + r, 0);
  const inner = width - Math.max(0, gap) * (list.length - 1);
  return Math.max(0, Math.min(max, inner / sum));
}
