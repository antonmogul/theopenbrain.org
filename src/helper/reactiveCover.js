/*
 * Reactive cover maths (OPENBRAIN-146): pure, so the opener's cursor
 * mapping can be tested without a browser or lottie-web. ReactiveCover.vue
 * turns a pointer or an idle clock into a 0..1 position, eases towards it,
 * and parks the Lottie on the matching frame with goToAndStop.
 */

/** Idle sweep: how long after the last pointer input it starts. */
export const IDLE_AFTER_MS = 2500;
/** Half the width of the idle sweep, in 0..1 position units. */
export const IDLE_AMPLITUDE = 0.35;
/** Per-frame easing towards the goal (fraction of the remaining distance). */
export const EASE = 0.12;

const clamp01 = (v) => Math.min(1, Math.max(0, v));

/**
 * Where the pointer is across the viewport on the chosen axis, 0..1. The
 * 2023 EyeStart mapped mouse x over window.innerWidth; `reverse` flips it.
 */
export function pointerPosition(
  { clientX = 0, clientY = 0 } = {},
  { width = 1, height = 1 } = {},
  { axis = "x", reverse = false } = {}
) {
  const span = axis === "y" ? height : width;
  const along = axis === "y" ? clientY : clientX;
  const t = span > 0 ? clamp01(along / span) : 0.5;
  return reverse ? 1 - t : t;
}

/**
 * The idle sweep: a slow sine around the middle, one full cycle every
 * `periodSec`, starting at the middle so it never jumps in. `periodSec`
 * 0 (or less) means no sweep: stay in the middle.
 */
export function idlePosition(elapsedMs, periodSec) {
  if (!(periodSec > 0)) return 0.5;
  const phase = (elapsedMs / (periodSec * 1000)) * Math.PI * 2;
  return 0.5 + Math.sin(phase) * IDLE_AMPLITUDE;
}

/** A 0..1 position as a Lottie frame on [0, totalFrames - 1]. */
export function frameFor(position, totalFrames) {
  const last = Math.max(0, (Number(totalFrames) || 1) - 1);
  return clamp01(position) * last;
}

/** One easing step: `current` moved a fraction of the way to `goal`. */
export function ease(current, goal, factor = EASE) {
  return current + (goal - current) * factor;
}
