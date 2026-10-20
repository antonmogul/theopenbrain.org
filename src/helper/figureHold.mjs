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

/**
 * A figure's "room" (OPENBRAIN-143): `paragraphs.content.animationFlags.room`,
 * screens of reading room added below its paragraph in the two-column
 * reader, bound as data-figure-room and drawn by index.css as bottom padding
 * on the trigger. A hold can never outlast the next figure's trigger, so a
 * short paragraph followed straight by another figure (History's Fritsch &
 * Hitzig, Golgi's lab) was up for a few lines of scroll however it was held;
 * room moves the next trigger down instead, as Stuart asked (7 Oct: "add
 * some spacing to text so it stays up for a bit longer"). Absent = none.
 */
export const FIGURE_ROOMS = [0.5, 1];

/** The stored or attribute value as stored (0.5 | 1), or null for none. */
export function normalizeFigureRoom(raw) {
  const value =
    typeof raw === "string" && raw.trim() !== "" ? Number(raw) : raw;
  return typeof value === "number" && FIGURE_ROOMS.includes(value)
    ? value
    : null;
}
