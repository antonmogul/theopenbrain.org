/*
 * The maths of a bottom sheet with detents (OPENBRAIN-160): the phrenology
 * widget's source-text sheet below 760px. Pure, so the gesture is testable
 * without a browser; useSheetDetents wires it to pointer events.
 *
 * A sheet's size is a `fraction` of its container's height, 0 (closed) to
 * `full`. It rests at one of two detents, `half` and `full`; below `half`
 * it is dismissed.
 */

/** From this width the phrenology card sits beside the skull; below it the
 * card is a sheet (the CSS repeats it as `max-width: 759.98px`). */
export const SHEET_BREAKPOINT = 760;

/** The media query for the sheet, matching that CSS exactly. */
export const SHEET_MEDIA_QUERY = `(max-width: ${SHEET_BREAKPOINT - 0.02}px)`;

/** The resting sizes, as fractions of the container's height. */
export const SHEET_DETENTS = Object.freeze({ half: 0.5, full: 0.9 });

/** The least the half detent shrinks to so a low region stays uncovered. */
export const SHEET_HALF_MIN = 0.3;

/** A release faster than this (fractions per second, about 500 px/s on a
 * phone's body) is a flick. */
export const SHEET_FLICK = 0.8;

/** A release this close under `half` still snaps back to it, not closed. */
export const SHEET_DISMISS_SLACK = 0.04;

/** Only move samples younger than this feed the release velocity. */
export const SHEET_VELOCITY_WINDOW_MS = 120;

/** Movement under this (px) is a tap on the handle, not a drag. */
export const SHEET_SLOP = 4;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * The half detent for a selected region: `base`, lowered so the sheet's top
 * stays `margin` px below the region's label, but never under `min`.
 * All positions are px from the container's top; `labelBottom` null or
 * unknown keeps `base`.
 */
export function fitHalfDetent({
  containerHeight,
  labelBottom = null,
  margin = 12,
  base = SHEET_DETENTS.half,
  min = SHEET_HALF_MIN,
}) {
  if (
    !(containerHeight > 0) ||
    labelBottom == null ||
    !Number.isFinite(labelBottom)
  )
    return base;
  const room = (containerHeight - labelBottom - margin) / containerHeight;
  return clamp(Math.min(base, room), min, base);
}

/**
 * Where a drag puts the sheet: the finger moves the top edge, so dragging up
 * (negative dy) grows it. Clamped to [0, full].
 */
export function dragFraction(
  startFraction,
  dy,
  containerHeight,
  full = SHEET_DETENTS.full
) {
  if (!(containerHeight > 0)) return startFraction;
  return clamp(startFraction - dy / containerHeight, 0, full);
}

/**
 * Release velocity in fractions per second from `[{ t, fraction }]` move
 * samples (ascending t, ms): the change over the samples inside the window.
 * Positive is upward (growing). Fewer than two samples give 0.
 */
export function releaseVelocity(samples, windowMs = SHEET_VELOCITY_WINDOW_MS) {
  if (!samples?.length) return 0;
  const last = samples[samples.length - 1];
  let first = last;
  for (let i = samples.length - 2; i >= 0; i--) {
    if (last.t - samples[i].t > windowMs) break;
    first = samples[i];
  }
  const dt = last.t - first.t;
  if (dt <= 0) return 0;
  return ((last.fraction - first.fraction) / dt) * 1000;
}

/**
 * The detent a released sheet snaps to: `"full"`, `"half"` or `"closed"`.
 * A flick up opens full; a flick down drops one detent from the one the
 * drag started at (`from`): full → half while still above half, otherwise
 * closed. Without a flick, under `half` (minus a little slack) is
 * dismissed, and the nearer of `half` and `full` wins above it.
 */
export function snapDetent(
  fraction,
  velocity,
  detents = SHEET_DETENTS,
  { flick = SHEET_FLICK, slack = SHEET_DISMISS_SLACK, from = "half" } = {}
) {
  const { half, full } = detents;
  if (velocity >= flick) return "full";
  if (velocity <= -flick)
    return from === "full" && fraction > half ? "half" : "closed";
  if (fraction < half - slack) return "closed";
  return fraction - half <= full - fraction ? "half" : "full";
}

/**
 * The detent a key moves to from `current`: up/right grows, down/left shrinks
 * (half → closed dismisses), Home is half, End is full. Null for other keys.
 */
export function keyDetent(key, current) {
  switch (key) {
    case "ArrowUp":
    case "ArrowRight":
      return current === "half" ? "full" : null;
    case "ArrowDown":
    case "ArrowLeft":
      return current === "full" ? "half" : "closed";
    case "Home":
      return "half";
    case "End":
      return "full";
    default:
      return null;
  }
}
