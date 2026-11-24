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
 * middle of the screen; a little later when a box or band above it still
 * covers the pane, see figureWait) and, by default, leaves when its bottom
 * does. A
 * "hold" keeps it longer, but never past the first of:
 * - the next figure's trigger (so the next figure is never delayed),
 * - a full-width band (FIGURE_BANDS: a full-screen figure, an anchored box, a
 *   break or a wide image is a FullBleed `.fb-slot`; a widget is `.wb`). An
 *   image in the text column is not one, nor is a band inside the held
 *   figure's own trigger (its paragraph, or the subsection its header
 *   wraps): that is text the figure belongs to,
 * - the end of its section, or, for the last section before the chapter's
 *   back matter (BACK_MATTER: References, Further reading) when that has no
 *   figures of its own, the end of the back matter: so the closing figure
 *   stays beside the references (Stuart, 13 Oct). Since OPENBRAIN-179 a
 *   reader's references run full width below the text column (TextComp's
 *   #chapter-back), where the pane is covered, so this only still applies
 *   where a References section is in the column: while a creator edits it.
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
 * - A hold never outlasts the next figure's trigger, so a short paragraph
 *   followed straight by another figure stays short however it is held.
 *   `animationFlags.room` (figureHold.mjs, data-figure-room; OPENBRAIN-143)
 *   pads the trigger below the paragraph instead, which this measures as
 *   part of the trigger: the figure stays through the room and the next
 *   trigger moves down.
 *
 * - One figure on several paragraphs in a row (the Retina's widgets) is one
 *   stay (OPENBRAIN-76, sameFigureNeighbour): each paragraph's window runs
 *   on to the next one's top, across the margin or the band between them,
 *   and the next one never waits for a cover. The pane has nothing to
 *   change, so it must not empty and bring the same figure back.
 *
 * figureEnd is called by ScrollTrigger on every refresh, so font, image and
 * viewport reflow is measured.
 */

/** Full-width bands a hold stops at (see above). */
export const FIGURE_BANDS = ".fb-slot:not(.fb-slot--column), .wb";

/**
 * What lies over the figure pane while it passes: the full-width bands, and
 * the chapter's opener above the first section. A figure waits for the one
 * above it to clear the pane (figureStart).
 */
export const PANE_COVERS = `${FIGURE_BANDS}, [data-chapter-opener]`;

/** A figure that waits still shows for at least this share of a screen
 * before it leaves. */
const WAIT_RESERVE = 0.25;

/** Section slugs a closing figure may hold beside (see above). */
export const BACK_MATTER = ["references", "further-reading"];

/** Where a hold in `section` must end: its bottom, or that of the figureless
 * back matter right after it. */
function holdLimit(section) {
  let end = section.getBoundingClientRect().bottom;
  const all = [
    ...(section.ownerDocument?.querySelectorAll("section.reader-section") ||
      []),
  ];
  const at = all.indexOf(section);
  if (at < 0) return end;
  for (const next of all.slice(at + 1)) {
    if (
      !BACK_MATTER.includes(next.dataset?.sectionSlug) ||
      next.querySelector(".animationTrigger")
    )
      break;
    end = next.getBoundingClientRect().bottom;
  }
  return end;
}

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
 * The trigger read just before (`step` -1) or after (+1) `trigger`, when it
 * names the same figure in the same section; else null. `triggers` is the
 * reader's, in reading order. A trigger that wraps this one, or that this
 * one wraps (a subsection header's and its paragraphs'), is not a neighbour:
 * those overlap, and the inner one wins while it is on.
 *
 * The two are then one stay (OPENBRAIN-76). The Retina's cell-types widget
 * is triggered by four paragraphs in a row with the full-screen "Lateral
 * organization" figure inside the third: the fourth waited for that band to
 * leave the pane (figureWait), so the widget showed under the departing
 * band, went away for 300px and came back (Stuart, 20 Nov: "a clunky reload
 * of the previously-shown retinal cross section").
 */
export function sameFigureNeighbour(trigger, triggers, records, step) {
  const at = triggers?.indexOf(trigger) ?? -1;
  if (at < 0) return null;
  const figure = (el) => {
    const key = el.id.replace(/^trigger/i, "");
    return String(figureRecordFor(key, records)?.id ?? key).toLowerCase();
  };
  for (let i = at + step; i >= 0 && i < triggers.length; i += step) {
    const other = triggers[i];
    if (other.contains(trigger) || trigger.contains(other)) continue;
    return figure(other) === figure(trigger) &&
      other.closest("section") === trigger.closest("section")
      ? other
      : null;
  }
  return null;
}

/**
 * How far past the reading line a figure's trigger must go before the pane
 * is clear for it, in pixels of scroll; 0 for most figures (OPENBRAIN-195).
 *
 * A figure appears when its trigger's top reaches the reading line. A
 * breakout box, a widget band or the opener that ends just above that
 * paragraph is then still on the upper half of the screen, over the pane:
 * History's Plato and Aristotle came in with Box A across their heads, and
 * were only whole 300px of scroll later (Stuart, 13 Nov: "figure out how to
 * make it such that, when you scroll, the whole image pops up at the same
 * time"). So the figure waits until the cover above it has left the pane
 * (its bottom at the pane's top, under the top bar), and leaves at the same
 * point on the way back up. It never waits out its own stay: a quarter of a
 * screen is kept for it before it leaves. `end` is what figureEnd gave for
 * it (a scroll position when it holds), else it leaves with its paragraph.
 */
export function figureWait(
  trigger,
  win = window,
  end = undefined,
  triggers = undefined,
  records = undefined
) {
  if (
    typeof win.matchMedia === "function" &&
    !win.matchMedia(READER_WIDE_QUERY).matches
  )
    return 0;
  // A paragraph that carries on the figure of the one before it (given the
  // reader's `triggers` and `records`) never waits: that figure is on.
  if (sameFigureNeighbour(trigger, triggers, records, -1)) return 0;
  const half = win.innerHeight / 2;
  const rect = trigger.getBoundingClientRect();
  const scope =
    trigger.closest?.(".chapter-reader") || trigger.ownerDocument || document;
  let above = -Infinity;
  for (const cover of scope.querySelectorAll(PANE_COVERS)) {
    if (cover.contains(trigger) || trigger.contains(cover)) continue;
    const bottom = cover.getBoundingClientRect().bottom;
    if (bottom <= rect.top + 1 && bottom > above) above = bottom;
  }
  if (above === -Infinity) return 0;
  const pane = scope.querySelector?.(".figure-pane");
  const paneTop = pane ? pane.getBoundingClientRect().top : 0;
  // Scroll, from where the trigger's top is on the reading line, to where
  // the cover's bottom is at the pane's top.
  const wait = above - paneTop - (rect.top - half);
  // How long it is on, from its top on the reading line to where it leaves.
  const stay =
    typeof end === "number"
      ? end - (rect.top + win.scrollY - half)
      : rect.bottom - rect.top;
  const most = stay - WAIT_RESERVE * win.innerHeight;
  return Math.max(0, Math.min(wait, most));
}

/**
 * ScrollTrigger `start` for a pane figure's trigger element: `top <half the
 * viewport>` (its top on the reading line), or the scroll position a little
 * later at which the cover above it has left the pane (figureWait; `end`
 * as there).
 */
export function figureStart(
  trigger,
  win = window,
  end = undefined,
  triggers = undefined,
  records = undefined
) {
  const half = win.innerHeight / 2;
  const wait = figureWait(trigger, win, end, triggers, records);
  if (!wait) return `top ${half}`;
  return trigger.getBoundingClientRect().top + win.scrollY - half + wait;
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
  const rect = trigger.getBoundingClientRect();
  // A figure the next paragraph carries on stays until that paragraph has
  // taken over: one pixel past its top, so the two windows overlap and no
  // scroll position falls between them.
  const next = sameFigureNeighbour(trigger, triggers, records, 1);
  const handover = next ? next.getBoundingClientRect().top + 1 : -Infinity;
  const carried = next
    ? Math.max(rect.bottom, handover) + win.scrollY - win.innerHeight / 2
    : fallback;
  const record = figureRecordFor(trigger.id.replace(/^trigger/i, ""), records);
  const hold = resolveFigureHold(record, trigger.dataset?.figureHold);
  if (!hold) return carried;
  const section = trigger.closest("section");
  if (!section) return carried;
  const top = rect.top;
  const boundaries = [holdLimit(section)];
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
    Math.max(top + 1, rect.bottom, Math.min(...boundaries), handover) +
    win.scrollY -
    win.innerHeight / 2
  );
}

/** The name this had while it was History's rule only. */
export const historyFigureEnd = figureEnd;
