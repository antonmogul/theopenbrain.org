/*
 * exploreRail — a breakout box read sideways (OPENBRAIN-163).
 *
 * A box made only of "Explore more" paragraphs (ExploreCard) can lay them
 * side by side on one horizontal track instead of folding each behind a
 * button: Anton, 9 Nov, on the Hippocrates box, "turning it into side
 * scroll … when the user is actually scrolling down it just scrolls
 * horizontally, or can just click a right button to go right, so it would
 * replace the open and have them next to each other."
 *
 * How it moves. The box already pins below the top bar while a spacer in
 * its colour scrolls past (BreakoutBox, the pause). In a rail that spacer is
 * as long as the track is wide, and the page's scroll position inside it is
 * the track's scrollLeft: one pixel down is one pixel across, after a short
 * lead-in (RAIL_LEAD of the screen) and with the same again before the box
 * lets go. The track is a real horizontal scroll container, so a sideways
 * swipe, the arrow keys and keyboard focus move it natively; the page then
 * follows the track, so the two never disagree.
 *
 * This file is the part with no framework in it: which boxes are rails, the
 * arithmetic between the two scroll positions, and the DOM contract other
 * code reads (readerJump lands on a paragraph in the second part; the
 * chapter timeline places it). composables/useExploreRail.js drives it.
 *
 * DOM contract, written by BreakoutBox while the rail is on:
 *   [data-rail-pause]     the pinned box's frame (.bx-pause)
 *   [data-rail-scroller]  the track, with
 *     data-rail-pinned    "1" while the page's scroll drives it
 *     data-rail-lead      px of page scroll before the track starts moving
 *     data-rail-top       px below the viewport top where the box pins
 *   [data-explore]        one part (ExploreCard's root)
 *   [data-rail-columns]   a part's text, flowed in columns as tall as the
 *                         track (fitRailColumns sizes it to its columns)
 */

/**
 * Which boxes read sideways, by chapter slug then box slug (box slugs are
 * only unique within a module, as in breakoutTreatment.js). Opt-in while the
 * format is on trial: add a slug to try another box, remove it to go back
 * to the fold-out cards. The box must also be made only of Explore
 * paragraphs (boxIsRail).
 */
export const RAIL_BOXES_BY_SLUG = Object.freeze({
  "foundations-of-neuroscience": Object.freeze([
    "box-sacred-disease",
    // Box B, the rete mirabile and the hippocampus minor (Anton, 11 Nov).
    "box-rete-mirabile",
  ]),
});

/** The rail needs this much screen height: under it the track would be a
 *  few lines tall, and the box stays fold-out cards. */
export const RAIL_MIN_HEIGHT_QUERY = "(min-height: 560px)";
/** Screens of page scroll before the track moves, and after it stops. */
export const RAIL_LEAD = 0.2;
/** How far Previous / Next move inside a part wider than the screen. */
export const RAIL_PAGE = 0.8;

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));

/**
 * Whether a box reads sideways: listed for its chapter, and nothing in it
 * but two or more Explore paragraphs. Prose between the cards has no place
 * on the track, so a box with any keeps the fold-out cards.
 * @param {{ kind?: string, slug?: string, paragraphs?: object[] } | null} section
 * @param {string | null | undefined} chapterSlug the module's slug
 */
export function boxIsRail(section, chapterSlug) {
  if (section?.kind !== "box") return false;
  const paragraphs = section.paragraphs || [];
  if (paragraphs.length < 2 || !paragraphs.every((p) => p?.explore))
    return false;
  const listed = chapterSlug ? RAIL_BOXES_BY_SLUG[chapterSlug] : null;
  return !!listed?.includes(section.slug);
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

/** The stop after (`dir` 1) or before (-1) `x`; `x`'s own side's end if none. */
export function railNextStop(stops, x, dir = 1) {
  const list = stops?.length ? stops : [0];
  const at = Number(x) || 0;
  if (dir >= 0) return list.find((stop) => stop > at + 2) ?? list.at(-1);
  return [...list].reverse().find((stop) => stop < at - 2) ?? list[0];
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
  const part = el.closest?.("[data-explore]");
  if (part && scroller.contains(part)) {
    const start = at(part);
    if (x - start < scroller.clientWidth * 0.6) x = start;
  }
  return clamp(x, 0, max);
}

/** The track `el` is on, or null. */
export const railOf = (el) => el?.closest?.("[data-rail-scroller]") || null;

/**
 * The page scrollY that shows `el`: the box pinned and its track moved to
 * `el`. Null when `el` is not on a track, or the track is not driven by the
 * page (reduced motion: see revealInRail).
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
 * Bring `el` into view on a track the page does not drive (reduced motion:
 * the box is not pinned and the track only scrolls by itself). Returns
 * whether it moved a track.
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
 */
export function fitRailColumns(scroller) {
  if (!scroller?.querySelectorAll) return;
  for (const el of scroller.querySelectorAll("[data-rail-columns]")) {
    el.style.width = "";
    const box = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const one = parseFloat(style.columnWidth) || box.width;
    if (!(one > 0)) continue;
    const gap = parseFloat(style.columnGap) || 0;
    let right = box.left + Math.max(box.width, el.scrollWidth);
    for (const child of el.children)
      for (const rect of child.getClientRects())
        right = Math.max(right, rect.right);
    const columns = Math.max(
      1,
      Math.round((right - box.left + gap) / (one + gap))
    );
    const width = columns * one + (columns - 1) * gap;
    // Half a pixel over, never under: the columns absorb it.
    if (width > box.width + 1) el.style.width = `${width + 0.5}px`;
  }
}

/** Undo fitRailColumns (the rail turned off). */
export function clearRailColumns(scroller) {
  for (const el of scroller?.querySelectorAll?.("[data-rail-columns]") || [])
    el.style.width = "";
}
