/*
 * exploreRail — a breakout box read sideways (OPENBRAIN-163, 187).
 *
 * A box can lay its content on one horizontal track instead of running
 * down the page: Anton, 9 Nov, on the Hippocrates box, "turning it into
 * side scroll … when the user is actually scrolling down it just scrolls
 * horizontally, or can just click a right button to go right, so it would
 * replace the open and have them next to each other." Stuart, 12 Nov,
 * asked for it on the boxes of ordinary paragraphs too, and on phones.
 *
 * What is on the track (railLayoutOf). The box is cut into parts, each a
 * picture or two and then text flowing in columns as tall as the track:
 * an "Explore more" paragraph is a part under its own name; ordinary
 * paragraphs run together, and one that brings a figure starts a new part
 * with that figure, so every picture is shown once, before the text that
 * discusses it (Stuart: "just show the image with legend and expandable
 * button once, first, and then not at the end"). A widget that ends the
 * box (the Penfield binder's full-screen band) is not on the track: it
 * follows the box.
 *
 * Two ways it moves, by the box's mode:
 *
 * "track", from the two-column breakpoint. The box already pins below the
 * top bar while a spacer in its colour scrolls past (BreakoutBox, the
 * pause). Here that spacer is as long as the track is wide, and the page's
 * scroll position inside it is the track's scrollLeft: one pixel down is
 * one pixel across, after a short lead-in (RAIL_LEAD of the screen) and
 * with the same again before the box lets go. The track is a real
 * horizontal scroll container, so a sideways swipe, the arrow keys and
 * keyboard focus move it natively; the page then follows the track, so
 * the two never disagree. Under reduced motion nothing pins and the track
 * is a plain scroller.
 *
 * "swipe", below it (phones, tablets). Nothing pins and the page's scroll
 * is never taken over (a pin on a phone is what makes the page judder):
 * the track is a native swipe with scroll snapping, a page at a time,
 * each page one figure or one column of text, and two buttons under it say
 * the reader may choose: "Explore more →" turns the page, "Keep going ↓"
 * carries on down the chapter.
 *
 * This file is the part with no framework in it: which boxes are rails and
 * what their parts are, the arithmetic between the two scroll positions,
 * and the DOM contract other code reads (readerJump lands on a paragraph
 * in a later part; the chapter timeline places it).
 * composables/useExploreRail.js drives it.
 *
 * DOM contract, written by BreakoutBox while the rail is on:
 *   [data-rail-pause]     the box's frame (.bx-pause)
 *   [data-rail-scroller]  the track, with
 *     data-rail-mode      "track" | "swipe"
 *     data-rail-pinned    "1" while the page's scroll drives it
 *     data-rail-lead      px of page scroll before the track starts moving
 *     data-rail-top       px below the viewport top where the box pins
 *   [data-rail-part]      one part (RailPart's root; an Explore part also
 *                         carries data-explore)
 *   [data-rail-columns]   a part's text, flowed in columns as tall as the
 *                         track (fitRailColumns sizes it to its columns)
 *   [data-rail-figure]    a part's picture (fitRailFigures fits it into the
 *                         track's height)
 */

/**
 * Which boxes read sideways, by chapter slug then box slug (box slugs are
 * only unique within a module, as in breakoutTreatment.js). Opt-in: add a
 * slug to put another box on the track, remove it to go back to the box
 * that runs down the page (fold-out cards, for Explore paragraphs). The
 * box must also be something a track can hold (railLayoutOf).
 */
export const RAIL_BOXES_BY_SLUG = Object.freeze({
  "foundations-of-neuroscience": Object.freeze([
    "box-sacred-disease",
    // Box B, the rete mirabile and the hippocampus minor (Anton, 11 Nov).
    "box-rete-mirabile",
    // The boxes of ordinary paragraphs (Stuart, 12 Nov; OPENBRAIN-187).
    "box-descartes",
    "box-electrical-stim",
    "box-psychosurgery",
    "box-penfield",
    "box-ngf",
  ]),
});

/** The pinned track needs this much screen height: under it the track
 *  would be a few lines tall, and the box runs down the page. */
export const RAIL_MIN_HEIGHT_QUERY = "(min-height: 560px)";
/** Screens of page scroll before the track moves, and after it stops. */
export const RAIL_LEAD = 0.2;
/** How far Previous / Next move inside a part wider than the screen. */
export const RAIL_PAGE = 0.8;

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));

/* What a track cannot hold: a full-screen figure, a break. */
const offTrack = (p) =>
  !p ||
  p.type === "breakVideo" ||
  p.type === "breakSection" ||
  !!p.animationFull;

/**
 * A box cut into the parts its track shows, or null when a track cannot
 * hold it (no paragraphs, a widget in the middle of the text, a break or a
 * full-screen figure).
 *
 * - An Explore paragraph is a part of its own, under its title.
 * - Ordinary paragraphs run together into one part; a paragraph that
 *   brings a figure starts a new one, so the figure leads the text that
 *   discusses it. `figures` are those paragraphs (the reader draws each
 *   one's figure once, at the start of the part).
 * - Widgets that end the box are the `tail`: they follow the track.
 * - `named` says every part has a name (a box made only of Explore
 *   paragraphs): the nav then lists them; otherwise it counts stops.
 *
 * @param {{ kind?: string, paragraphs?: object[] } | null} section
 * @returns {{ parts: { id: string, title: string, explore: boolean,
 *   paragraphs: object[], figures: object[] }[], tail: object[],
 *   named: boolean } | null}
 */
export function railLayoutOf(section) {
  if (section?.kind !== "box") return null;
  const all = [...(section.paragraphs || [])];
  const tail = [];
  while (all.length && all[all.length - 1]?.type === "widget")
    tail.unshift(all.pop());
  if (!all.length) return null;
  if (all.some((p) => offTrack(p) || p.type === "widget")) return null;

  const parts = [];
  let open = null; // the part ordinary paragraphs are being added to
  for (const p of all) {
    if (p.explore) {
      parts.push({
        id: p.id,
        title: p.explore.title || "",
        explore: true,
        paragraphs: [p],
        figures: p.animation?.id ? [p] : [],
      });
      open = null;
      continue;
    }
    const figure = !!p.animation?.id;
    if (!open || figure) {
      open = {
        id: p.id,
        title: "",
        explore: false,
        paragraphs: [],
        figures: [],
      };
      parts.push(open);
    }
    open.paragraphs.push(p);
    if (figure) open.figures.push(p);
  }
  return { parts, tail, named: parts.every((part) => part.explore) };
}

/**
 * Whether a box reads sideways: listed for its chapter, and something a
 * track can hold.
 * @param {{ kind?: string, slug?: string, paragraphs?: object[] } | null} section
 * @param {string | null | undefined} chapterSlug the module's slug
 */
export function boxIsRail(section, chapterSlug) {
  const listed = chapterSlug ? RAIL_BOXES_BY_SLUG[chapterSlug] : null;
  return !!listed?.includes(section?.slug) && !!railLayoutOf(section);
}

/** The track position for a page scrolled `scrolled` px past the pin. */
export function railXForScrolled(scrolled, { lead = 0, max = 0 } = {}) {
  return clamp((Number(scrolled) || 0) - lead, 0, Math.max(0, max));
}

/** Px past the pin the page is at when the track is at `x`. */
export function railScrolledForX(x, { lead = 0, max = 0 } = {}) {
  return lead + clamp(Number(x) || 0, 0, Math.max(0, max));
}

/** The pause spacer's height: lead-in, the track's travel, lead-out. */
export function railRoom({ lead = 0, max = 0 } = {}) {
  return max > 0 ? Math.round(2 * lead + max) : 0;
}

/**
 * Where Previous and Next stop: each part's start, a page at a time inside
 * a part wider than the screen, and the end of the track. Sorted, clamped
 * to the track, with near-duplicates dropped.
 * @param {number[]} starts each part's start on the track, px
 * @param {number} view the track's visible width, px
 * @param {number} max the furthest the track scrolls, px
 */
export function railStops(starts, view, max) {
  const end = Math.max(0, Number(max) || 0);
  const bases = [...(starts || []), end]
    .map((x) => clamp(Number(x) || 0, 0, end))
    .sort((a, b) => a - b);
  const step = Math.max(1, (Number(view) || 0) * RAIL_PAGE);
  const out = [0];
  const push = (x) => {
    if (x - out[out.length - 1] > 2) out.push(x);
  };
  for (const base of bases) {
    // Pages between the last stop and this one, never leaving a sliver
    // (under a quarter of a page) for the step that reaches it.
    let from = out[out.length - 1];
    while (view > 0 && base - from > step * 1.25) {
      from += step;
      push(Math.round(from));
    }
    push(base);
  }
  return out;
}

/**
 * A swipe track's stops: one per page, a page being the track's width (a
 * figure, or a column of text).
 * @param {number} view the track's visible width, px
 * @param {number} max the furthest the track scrolls, px
 */
export function railPageStops(view, max) {
  const end = Math.max(0, Number(max) || 0);
  const page = Number(view) || 0;
  if (!(page > 0) || !end) return [0];
  const count = Math.max(1, Math.round(end / page));
  return Array.from({ length: count + 1 }, (_, i) =>
    i === count ? end : Math.round(i * page)
  );
}

/** The stop after (`dir` 1) or before (-1) `x`; `x`'s own side's end if none. */
export function railNextStop(stops, x, dir = 1) {
  const list = stops?.length ? stops : [0];
  const at = Number(x) || 0;
  if (dir >= 0) return list.find((stop) => stop > at + 2) ?? list.at(-1);
  return [...list].reverse().find((stop) => stop < at - 2) ?? list[0];
}

/**
 * Which stop a track at `x` is on: the last one it has reached, or the
 * next once it is more than half-way there (a swipe that has not settled),
 * so the count never lags the eye.
 */
export function railStopIndex(stops, x) {
  const list = stops?.length ? stops : [0];
  const at = Number(x) || 0;
  let index = 0;
  list.forEach((stop, i) => {
    if (stop <= at + 2) index = i;
  });
  const next = list[index + 1];
  if (next !== undefined && at > (list[index] + next) / 2) index += 1;
  return index;
}

/**
 * The part the reader is in: the last one whose start has come within 40%
 * of the screen from the left edge (so a part counts once it leads the
 * view, not only when it is flush left). The last part also counts at the
 * end of the track, where it may never reach that line; on a track with
 * nowhere to go (everything fits) it is the first.
 */
export function railActivePart(starts, x, view, max) {
  const list = starts || [];
  if (!list.length || !(max > 0)) return 0;
  if (x >= max - 2) return list.length - 1;
  const line = (Number(x) || 0) + (Number(view) || 0) * 0.4;
  let active = 0;
  list.forEach((start, i) => {
    if (start <= line) active = i;
  });
  return active;
}

/* ── DOM ───────────────────────────────────────────────────────────────── */

const num = (el, name) => Number(el?.getAttribute?.(name)) || 0;

/** The furthest a track scrolls. */
export function railMax(scroller) {
  return Math.max(
    0,
    (scroller?.scrollWidth || 0) - (scroller?.clientWidth || 0)
  );
}

/**
 * Where `el` starts on its track: the scrollLeft that puts its left edge
 * on the track's left gutter. An element near the start of its part gets
 * the part's start instead, so the part's image and title come with it.
 */
export function railXOf(el, scroller) {
  if (!el?.getBoundingClientRect || !scroller?.getBoundingClientRect) return 0;
  const pad = parseFloat(getComputedStyle(scroller).paddingLeft) || 0;
  const origin = scroller.getBoundingClientRect().left - scroller.scrollLeft;
  const at = (node) => node.getBoundingClientRect().left - origin - pad;
  const max = railMax(scroller);
  let x = at(el);
  const part = el.closest?.("[data-rail-part]");
  if (part && scroller.contains(part)) {
    const start = at(part);
    if (x - start < scroller.clientWidth * 0.6) x = start;
  }
  // A swipe track only rests on whole pages.
  if (scroller.getAttribute("data-rail-mode") === "swipe") {
    const page = scroller.clientWidth;
    if (page > 0) x = Math.floor((x + 2) / page) * page;
  }
  return clamp(x, 0, max);
}

/** The track `el` is on, or null. */
export const railOf = (el) => el?.closest?.("[data-rail-scroller]") || null;

/**
 * The page scrollY that shows `el`: the box pinned and its track moved to
 * `el`. Null when `el` is not on a track, or the track is not driven by the
 * page (reduced motion, a swipe track: see revealInRail).
 */
export function railLandingY(el, win = globalThis.window) {
  const scroller = railOf(el);
  if (!scroller || !win) return null;
  if (scroller.getAttribute("data-rail-pinned") !== "1") return null;
  const pause = scroller.closest("[data-rail-pause]");
  if (!pause) return null;
  const scrollY = win.scrollY || win.pageYOffset || 0;
  return (
    pause.getBoundingClientRect().top +
    scrollY -
    num(scroller, "data-rail-top") +
    railScrolledForX(railXOf(el, scroller), {
      lead: num(scroller, "data-rail-lead"),
      max: railMax(scroller),
    })
  );
}

/**
 * Bring `el` into view on a track the page does not drive (a swipe track,
 * or reduced motion: the box is not pinned and the track only scrolls by
 * itself). Returns whether it moved a track.
 */
export function revealInRail(el) {
  const scroller = railOf(el);
  if (!scroller || scroller.getAttribute("data-rail-pinned") === "1")
    return false;
  scroller.scrollLeft = railXOf(el, scroller);
  return true;
}

/**
 * Size each part's text to the columns it fills. The text is a multi-column
 * block as tall as the track and, in CSS, as wide as the columns the view
 * fits; what does not fit flows into further columns to its right, which
 * overflow it. Its width is set to all of them, so the next part starts
 * after them. Measured from the content's own boxes as well as scrollWidth,
 * which engines report differently for overflowing columns, and in
 * fractions of a pixel: a width a hair short of n columns lays out n - 1.
 * The block may carry side padding of its own (a swipe page's gutters, with
 * box-sizing: content-box): the columns are counted inside it.
 */
export function fitRailColumns(scroller) {
  if (!scroller?.querySelectorAll) return;
  for (const el of scroller.querySelectorAll("[data-rail-columns]")) {
    el.style.width = "";
    const box = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const padLeft = parseFloat(style.paddingLeft) || 0;
    const padRight = parseFloat(style.paddingRight) || 0;
    const inner = box.width - padLeft - padRight;
    const one = parseFloat(style.columnWidth) || inner;
    if (!(one > 0)) continue;
    const gap = parseFloat(style.columnGap) || 0;
    const left = box.left + padLeft;
    let right = left + Math.max(inner, el.scrollWidth - padLeft - padRight);
    for (const node of el.querySelectorAll("*"))
      for (const rect of node.getClientRects())
        right = Math.max(right, rect.right);
    const columns = Math.max(1, Math.round((right - left + gap) / (one + gap)));
    const width = columns * one + (columns - 1) * gap;
    // Half a pixel over, never under: the columns absorb it.
    if (width > inner + 1) el.style.width = `${width + 0.5}px`;
  }
}

/**
 * Fit each picture on the track into the track's height. A figure is its
 * toolbar, its legend and its images (and a gallery's controls), and only
 * the images can give (a single image, or a gallery's stage box): where
 * the whole is taller than the track, their cap (--rp-img-max, RailPart's
 * CSS) comes down by the overflow.
 * A custom property on the figure, not a style on the image, so a gallery's
 * next slide (a new <img>) is capped too.
 */
export function fitRailFigures(scroller) {
  if (!scroller?.querySelectorAll) return;
  for (const fig of scroller.querySelectorAll("[data-rail-figure]")) {
    fig.style.removeProperty("--rp-img-max");
    const over = fig.scrollHeight - fig.clientHeight;
    if (!(over > 1)) continue;
    let tallest = 0;
    for (const el of fig.querySelectorAll("img, .figimg-stage--gallery")) {
      if (
        el.tagName === "IMG" &&
        el.closest(".figimg-stage--gallery, .figimg-thumbnails, .figimg-grid")
      )
        continue;
      tallest = Math.max(tallest, el.getBoundingClientRect().height);
    }
    if (!(tallest > 0)) continue;
    const cap = Math.max(64, Math.floor(tallest - over - 1));
    fig.style.setProperty("--rp-img-max", `${cap}px`);
  }
}

/** Undo fitRailColumns and fitRailFigures (the rail turned off). */
export function clearRailColumns(scroller) {
  for (const el of scroller?.querySelectorAll?.("[data-rail-columns]") || [])
    el.style.width = "";
  for (const el of scroller?.querySelectorAll?.("[data-rail-figure]") || [])
    el.style.removeProperty("--rp-img-max");
}
