/*
 * The chapter-colour wash on pane pictures (OPENBRAIN-80, Maura's sketch of
 * 23 Nov, idea 2).
 *
 * From 1024px a photograph in the figure pane first shows as a duotone in
 * the chapter's colour and clears to the natural picture as the reader
 * scrolls through that figure's window, the one the pane itself uses
 * (figureStart / figureEnd). It is scrubbed by the scroll, never timed.
 *
 * A figure asks for it on its `animations` row: `config.tintFade: true`.
 * Only plain stills take it. A video poster is replaced by its player or
 * loop, and the designers' delivered posters are already duotones (baked,
 * like every duotone in the book), so a picture can also say `tint: false`.
 *
 * The wash is a second copy of the picture run through an SVG duotone
 * filter (FigureImages), laid over the natural one and faded with opacity.
 * It is not a colour layer with mix-blend-mode: a blend takes in whatever
 * is behind it (the pane's ground in the letterbox, a cutout's transparent
 * pixels), while a filter recolours the picture's own pixels and keeps
 * their alpha. The filter never changes, so the browser rasterises the copy
 * once and the scroll only moves an opacity.
 *
 * Pure functions; useFigureTint drives them from the scroll.
 */
import { RAMP_HEX } from "./chapterTheme.js";

/** The injection key the pane provides and FigureImages reads. */
export const FIGURE_TINT = Symbol("figureTint");

/** The part of a figure's window over which the wash clears. */
export const TINT_PORTION = 0.5;
/** And never over more than this many screens, so a figure that holds for
 *  a whole section is itself while its text is still being read. */
export const TINT_MAX_SCREENS = 1.5;

/** A figure record that asks for the wash. Strictly `true`, like a flag
 *  an editor would store; anything else is none. */
export function wantsTintFade(record) {
  return !!record && record.tintFade === true;
}

/** One picture of such a figure: a plain still that hasn't opted out. */
export function imageTakesTint(image) {
  return (
    !!image &&
    typeof image.src === "string" &&
    !!image.src &&
    !image.youtube &&
    !image.loop &&
    image.tint !== false
  );
}

/**
 * The wash's opacity at scroll position `y` in a window from `start` to
 * `end`: 1 until the window starts, 0 from the point where it has cleared,
 * straight in between.
 */
export function tintAt(y, start, end, viewport = 0) {
  if (![y, start, end].every(Number.isFinite) || end <= start) return 0;
  let run = (end - start) * TINT_PORTION;
  if (viewport > 0) run = Math.min(run, viewport * TINT_MAX_SCREENS);
  if (run <= 0) return 0;
  const cleared = (y - start) / run;
  return Math.min(1, Math.max(0, 1 - cleared));
}

const channels = (hex) => {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
};
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

/**
 * The duotone for a ramp, as feComponentTransfer tables (shadow, mid,
 * highlight per channel): the ramp's deep step darkened for the shadows,
 * its main step in the middle, its pale step lifted towards white for the
 * highlights. That is the range of the designers' own violet posters.
 * Null for an unknown ramp: no wash without a chapter colour.
 */
export function tintTables(ramp) {
  const r = RAMP_HEX[ramp];
  if (!r) return null;
  const stops = [
    mix(channels(r.deep), [0, 0, 0], 0.5),
    channels(r.main),
    mix(channels(r.pale), [1, 1, 1], 0.5),
  ];
  const table = (i) => stops.map((s) => s[i].toFixed(4)).join(" ");
  return { r: table(0), g: table(1), b: table(2) };
}
