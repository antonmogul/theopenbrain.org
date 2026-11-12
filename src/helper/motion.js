/*
 * Reduced-motion duration multiplier — the project's `K` convention, shared by
 * the Case Cabinet and both Phrenology views.
 * Multiply every GSAP duration by K: 1 normally, ~0 when the
 * user asked for reduced motion, so timelines still complete (callbacks,
 * onComplete state changes) instead of being skipped.
 *
 * Sources, the reader's own first:
 *   • data-reduce-motion on <html> (usePreferences): "1" reduces, "0" asks
 *     for motion whatever the device says (OPENBRAIN-189)
 *   • otherwise the OS-level prefers-reduced-motion media query
 *
 * Injectable args so the decision is unit-testable without a real DOM.
 */
export function reducedMotionK(
  dataset = document.documentElement.dataset,
  prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
) {
  if (dataset.reduceMotion === "1") return 0.001;
  if (dataset.reduceMotion === "0") return 1;
  return prefersReduced ? 0.001 : 1;
}
