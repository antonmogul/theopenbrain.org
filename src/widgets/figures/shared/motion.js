/*
 * Whether a figure widget should hold still (OPENBRAIN-82): the reader's own
 * "Reduce motion" setting wins (data-reduce-motion="1" on, "0" off, set by
 * usePreferences), otherwise the operating system's.
 */
export function prefersReducedMotion() {
  if (typeof document !== "undefined") {
    const v = document.documentElement.dataset.reduceMotion;
    if (v === "1") return true;
    if (v === "0") return false;
  }
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}
