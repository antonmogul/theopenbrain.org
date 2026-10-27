/*
 * Skull-cutaway cover maths (OPENBRAIN-156): pure, so the History opener's
 * reveal can be tested without a browser or the artwork. CutawayCover.vue
 * maps the pointer to a 0..1 position with helper/reactiveCover's
 * pointerPosition (no easing on the way in, as the 2023 Retina eye did);
 * this turns that position into a pose — how far the hand has reached in,
 * how far the skull cap has lifted — and, once the pointer has left, walks
 * the position back to REST.
 *
 * Closed is the resting state (Anton, 27 Oct): the brain is a reward for
 * exploring, so on leave the cover eases shut rather than snapping or
 * staying open, and there is no idle sweep. Reduced motion rests closed too.
 */
import { EASE, ease } from "@/helper/reactiveCover";

/** The resting position: cap on, hand out of the picture. */
export const REST = 0;
/** The hand has reached in by this position; the cap lifts from LIFT_START.
    They overlap so the hand is already there when the cap starts to move. */
export const REACH_END = 0.45;
export const LIFT_START = 0.3;
/** Closer than this to the goal counts as arrived, so the frame loop can stop. */
export const SETTLE = 0.0005;

const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** Progress of `t` through [from, to]: 0 before, 1 after. */
export function segment(t, from, to) {
  if (!(to > from)) return t >= to ? 1 : 0;
  return clamp01((t - from) / (to - from));
}

/** The pose at a 0..1 position: `reach` of the hand and `lift` of the cap, both 0..1. */
export function poseFor(position) {
  const t = clamp01(Number(position) || 0);
  return { reach: segment(t, 0, REACH_END), lift: segment(t, LIFT_START, 1) };
}

/**
 * One eased step towards `goal` that lands exactly on it once within
 * SETTLE: ease() alone never arrives, and the loop needs to know when to
 * stop.
 */
export function settle(current, goal, factor = EASE) {
  const next = ease(current, goal, factor);
  return Math.abs(goal - next) < SETTLE ? goal : next;
}

const pct = (v) => {
  const s = (v * 100).toFixed(3).replace(/\.?0+$/, "");
  return `${s === "-0" ? "0" : s}%`;
};
const ring = (points) => points.map(([x, y]) => `${pct(x)} ${pct(y)}`);

/** Points in fractions of the box as a CSS polygon(). */
export function polygonCss(points) {
  return `polygon(${ring(points).join(", ")})`;
}

/**
 * Everything in the box but the polygon: the outer rectangle and the
 * polygon as one evenodd ring, joined by a seam from the corner that is
 * walked both ways and so has no area. The base drawing is clipped with
 * this and the cap with polygonCss of the same points, so at rest the two
 * add up to the untouched drawing and nothing is drawn twice.
 */
export function cutoutCss(points) {
  const inner = ring(points);
  return `polygon(evenodd, 0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, ${inner.join(", ")}, ${inner[0]}, 0% 0%)`;
}

/**
 * The box an image of `ratio` (width / height) fills by `object-fit: cover`
 * inside `stage`, anchored like the opener's `background-position: center
 * 20%`: centred across, and a fifth of any vertical overflow above.
 */
export function coverBox(
  { width = 0, height = 0 } = {},
  ratio = 1,
  focusY = 0.2
) {
  const w = Math.max(width, height * ratio);
  const h = w / ratio;
  return {
    width: w,
    height: h,
    left: (width - w) / 2,
    top: (height - h) * focusY,
  };
}
