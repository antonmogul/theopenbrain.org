/*
 * Reduced-motion duration multiplier — the project's `K` convention, shared by
 * the Case Cabinet and both Phrenology views.
 * Multiply every GSAP duration by K: 1 normally, ~0 when the
 * user asked for reduced motion, so timelines still complete (callbacks,
 * onComplete state changes) instead of being skipped.
 *
 * Sources, either of which opts in:
 *   • data-reduce-motion="1" on <html> — the app's own Settings toggle
 *   • the OS-level prefers-reduced-motion media query
 *
 * Injectable args so the decision is unit-testable without a real DOM.
 */
export function reducedMotionK(
  dataset = document.documentElement.dataset,
  prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
) {
  return dataset.reduceMotion === "1" || prefersReduced ? 0.001 : 1;
}
