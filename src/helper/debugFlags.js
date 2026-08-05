/*
 * debugFlags — query-string gates for animation tuning tools.
 *
 * Prototype views (Case Cabinet, Phrenology) carry dev affordances: an on-screen
 * timeline scrubber and a global slow-mo multiplier. Those used to be hardcoded
 * constants, which meant shipping whatever value was last used for tuning — the
 * cabinet sat at SPEED = 3 (one-third speed) with the scrubber visible.
 *
 * Gating them on the URL instead means the default is always demo-clean and the
 * tuning tools are one query param away:
 *
 *   /case-cabinet            → ship speed, no scrubber
 *   /case-cabinet?slow=3     → 3x slow-mo
 *   /case-cabinet?scrub=1    → scrubber panel
 *
 * Pure functions over a search string so they're testable without a browser.
 */

/*
 * Slow-motion multiplier. Every duration in a timeline is multiplied by this, so
 * 1 is ship speed and the timings under review are the ones that ship.
 *
 * Invalid, missing, zero and negative values all fall back to 1 — a broken param
 * should never silently freeze or reverse an animation.
 */
export function readSpeed(search = "") {
  const raw = new URLSearchParams(search).get("slow");
  if (raw === null) return 1;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/* Whether the on-screen scrubber panel should render. Presence of the key is
 * enough (`?scrub`), but `?scrub=0` reads as an explicit opt-out. */
export function readScrub(search = "") {
  const params = new URLSearchParams(search);
  if (!params.has("scrub")) return false;
  return params.get("scrub") !== "0";
}
