/*
 * The stored values of a figure's "Stays" (OPENBRAIN-131):
 * `paragraphs.content.animationFlags.hold`, in screens, or "next" (until the
 * next figure); absent = Automatic. Framework-free and alias-free, like
 * chapterTransform.mjs, which normalises the stored value with it, so plain
 * `node` can import both. historyFigureTiming re-exports these.
 */

/** The stored values, in screens; "next" = until the next figure. */
export const FIGURE_HOLDS = [0, 0.5, 1, 2, "next"];

/**
 * A stored or attribute value as it is stored (0 | 0.5 | 1 | 2 | "next"), or
 * null for Automatic: absent, empty or malformed.
 */
export function normalizeFigureHold(raw) {
  if (raw === "next") return "next";
  const value =
    typeof raw === "string" && raw.trim() !== "" ? Number(raw) : raw;
  return typeof value === "number" && FIGURE_HOLDS.includes(value)
    ? value
    : null;
}
