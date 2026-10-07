import { figureImages } from "./figureCycle";
import { READER_WIDE_QUERY } from "./readerLayout";
import { FIGURE_HOLDS, normalizeFigureHold } from "./figureHold.mjs";

export { FIGURE_HOLDS, normalizeFigureHold };

/*
 * How long a figure stays in the pinned left pane (OPENBRAIN-131). It started
 * as History's rule (hence the file name): a static plate needs a reading
 * interval, rather than disappearing at the last line of its short
 * caption-bearing paragraph. It now applies by figure kind, in every
 * chapter, and an author can change it per figure.
 *
 * A figure appears when its trigger's top reaches the reading line (the
 * middle of the screen) and, by default, leaves when its bottom does. A
 * "hold" keeps it longer, but never past the first of:
 * - the next figure's trigger (so the next figure is never delayed),
 * - a full-width band (FIGURE_BANDS: a full-screen figure, an anchored box, a
 *   break or a wide image is a FullBleed `.fb-slot`; a widget is `.wb`). An
 *   image in the text column is not one, nor is a band inside the held
 *   figure's own trigger (its paragraph, or the subsection its header
 *   wraps): that is text the figure belongs to,
 * - the end of its section.
 * A hold only ever lengthens a figure: it never ends before its trigger's
 * bottom (its paragraph's window).
 *
 * - Still images with artwork hold until one of those by default (History's
 *   plates, Attention's images, the Retina's two stills, from the database
 *   or animations.json). Lotties, widgets, videos, "Artwork pending"
 *   placeholders and the rest keep their paragraph's window, so the Retina's
 *   authored switch points stay as they are.
 * - Scroll-scrubbed, full-screen and transition figures never hold: scroll
 *   drives them.
 * - An author's choice is `paragraphs.content.animationFlags.hold`
 *   (FIGURE_HOLDS, in screens; absent = Automatic), bound on the trigger as
 *   `data-figure-hold`. Anything else counts as Automatic.
 * - Wide screens only: below 1024px the pane is hidden and figures are drawn
 *   in the text, so every figure keeps its paragraph's window there.
 *
 * figureEnd is called by ScrollTrigger on every refresh, so font, image and
 * viewport reflow is measured.
 */

/** Full-width bands a hold stops at (see above). */
export const FIGURE_BANDS = ".fb-slot:not(.fb-slot--column), .wb";

/** The chapter editor's choices, in FIGURE_HOLDS order. */
export const FIGURE_HOLD_OPTIONS = [
  { value: 0, label: "With its paragraph" },
  { value: 0.5, label: "+ ½ screen" },
  { value: 1, label: "+ 1 screen" },
  { value: 2, label: "+ 2 screens" },
  { value: "next", label: "Until the next figure" },
];

/** Screens to hold (Infinity = until the next figure); undefined = Automatic. */
export function parseFigureHold(raw) {
  const hold = normalizeFigureHold(raw);
  if (hold === null) return undefined;
  return hold === "next" ? Infinity : hold;
}

/** Scroll-scrubbed, full-screen and transition figures never hold. */
export function holdableFigure(record) {
  return (
    !!record && !record.fullscreen && !record.scroll && !record.isTransition
  );
}

/**
 * Whether a figure is a still image with artwork: images or an image URL
 * (the database's shape), or animations.json's `illuImage`, a PNG the pane
 * draws from /publicAssets/images/illuImages (the Retina's stills when the
 * animations fetch falls back to the JSON); not a video embed with a poster.
 */
function stillWithArtwork(record) {
  if (record.widgetId || record.youtubeID || record.videoUrl) return false;
  return figureImages(record).length > 0 || record.illuImage === true;
}

/**
 * The kind default: a still image with artwork holds until the next figure;
 * everything else (Lotties, widgets, videos, placeholders without artwork)
 * keeps its paragraph's window. History's original predicate, without its
 * key regex.
 */
export function defaultFigureHold(record) {
  return holdableFigure(record) && stillWithArtwork(record) ? Infinity : 0;
}

/** The hold that applies: the author's (`raw`), else the kind default. */
export function resolveFigureHold(record, raw) {
  if (!holdableFigure(record)) return 0;
  return parseFigureHold(raw) ?? defaultFigureHold(record);
}

/** How the chapter editor words a resolved hold. */
export function figureHoldLabel(hold) {
  if (hold === Infinity) return "until the next figure";
  if (!hold) return "with its paragraph";
  if (hold === 0.5) return "½ screen more";
  return hold === 1 ? "1 screen more" : `${hold} screens more`;
}

/** A media library row (the editor's) as the reader's figure record. */
export function figureRecordOfMedia(media) {
  if (!media) return null;
  return {
    ...(media.config || {}),
    id: media.animation_key,
    ...(media.image_file_url ? { imageUrl: media.image_file_url } : {}),
  };
}

/**
 * The figure record a trigger names. `key` is the trigger's id without
 * "trigger": sections and subsections build it as `triggerAnimation` + the
 * key without its leading "animation" (figureFor's `name`), sub-subsections
 * as `trigger` + the whole key. A key the editor made has no "animation"
 * prefix to drop (`image-…`, `widget-…`, `youtube-…`), so the first form
 * reads "Animationimage-…": try the key as it is, then without "animation".
 * Case-insensitive, like the pane's `activeAnimation`.
 */
export function figureRecordFor(key, records = []) {
  const wanted = String(key || "").toLowerCase();
  if (!wanted) return undefined;
  const byId = (id) =>
    records.find((item) => String(item?.id || "").toLowerCase() === id);
  const bare = wanted.replace(/^animation/, "");
  return byId(wanted) || (bare && bare !== wanted ? byId(bare) : undefined);
}

/**
 * ScrollTrigger `end` for a pane figure's trigger element: `bottom <half the
 * viewport>` (its paragraph's window) unless the figure holds; then the
 * scroll position at which its hold's end reaches the reading line.
 */
export function figureEnd(trigger, triggers, records, win = window) {
  const fallback = `bottom ${win.innerHeight / 2}`;
  if (
    typeof win.matchMedia === "function" &&
    !win.matchMedia(READER_WIDE_QUERY).matches
  )
    return fallback;
  const record = figureRecordFor(trigger.id.replace(/^trigger/i, ""), records);
  const hold = resolveFigureHold(record, trigger.dataset?.figureHold);
  if (!hold) return fallback;
  const section = trigger.closest("section");
  if (!section) return fallback;
  const rect = trigger.getBoundingClientRect();
  const top = rect.top;
  const boundaries = [section.getBoundingClientRect().bottom];
  if (Number.isFinite(hold))
    boundaries.push(rect.bottom + hold * win.innerHeight);
  // What lies inside the held trigger is the text it belongs to: a held
  // container (a subsection header's figure) is not cut by the figures or
  // bands inside it (those figures still win while they are active), nor a
  // paragraph by its own image.
  for (const candidate of triggers) {
    if (
      candidate === trigger ||
      trigger.contains(candidate) ||
      candidate.closest("section") !== section
    )
      continue;
    const nextTop = candidate.getBoundingClientRect().top;
    if (nextTop > top) boundaries.push(nextTop);
  }
  for (const band of section.querySelectorAll(FIGURE_BANDS)) {
    if (trigger.contains(band)) continue;
    const bandTop = band.getBoundingClientRect().top;
    if (bandTop > top) boundaries.push(bandTop);
  }
  // Never shorter than its paragraph's window. Anything not inside the
  // trigger starts at or below its bottom, so the next figure is still never
  // delayed.
  return (
    Math.max(top + 1, rect.bottom, Math.min(...boundaries)) +
    win.scrollY -
    win.innerHeight / 2
  );
}

/** The name this had while it was History's rule only. */
export const historyFigureEnd = figureEnd;
