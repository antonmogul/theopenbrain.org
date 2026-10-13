/*
 * The phone timeline scrubber's maths (OPENBRAIN-137), SoundCloud style: the
 * waveform is wider than the screen and slides under a fixed playhead in the
 * middle. Pure, so the gesture is testable without a browser.
 *
 * `centers` are the bars' x centres in the track (TimelineBars.centerOf),
 * ascending; `x` is the track position under the playhead.
 */

/** Pixels of track per item: wide enough that one bar is easy to land on. */
export const SCRUB_PX_PER_ITEM = 8;
/** A finger still for this long, while down, shows the preview. */
export const SCRUB_HOLD_MS = 350;
/** Movement under this (px) is a tap or a tremble, not a drag. */
export const SCRUB_SLOP = 6;

/** The index of the bar whose centre is nearest x (binary search). */
export function nearestIndex(centers, x) {
  const n = centers.length;
  if (!n) return -1;
  if (x <= centers[0]) return 0;
  if (x >= centers[n - 1]) return n - 1;
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (centers[mid] <= x) lo = mid;
    else hi = mid;
  }
  return x - centers[lo] <= centers[hi] - x ? lo : hi;
}

/**
 * Where a drag puts the playhead: the finger moves the track, so dragging
 * left (negative dx) moves forward through the chapter. Clamped to the bars.
 */
export function scrubX(startX, dx, centers) {
  const n = centers.length;
  if (!n) return 0;
  return Math.min(centers[n - 1], Math.max(centers[0], startX - dx));
}

/**
 * The track's translateX that puts track position x under a playhead at
 * `viewportCenter` (the middle of the visible strip).
 */
export function trackOffset(x, viewportCenter) {
  return Math.round((viewportCenter - x) * 10) / 10;
}

/** A fractional item index for track position x (for the played fill). */
export function fractionalIndex(centers, x) {
  const n = centers.length;
  if (!n) return 0;
  const i = nearestIndex(centers, x);
  const prev = centers[i - 1];
  const next = centers[i + 1];
  const here = centers[i];
  if (x >= here && next != null) return i + 0.5 + (x - here) / (next - here);
  if (x < here && prev != null) return i + 0.5 - (here - x) / (here - prev);
  return i + 0.5;
}
