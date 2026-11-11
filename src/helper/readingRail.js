/*
 * The reading rail (OPENBRAIN-175): the marks on the line between the figure
 * pane and the text, from 1024px. Three things, one system:
 *
 * - a mark at every paragraph that brings something into the pane, saying
 *   what it is ("FIG 05", "TRY IT", "WATCH"; a bare pointer for the Retina's
 *   2023 figures, which have no label in the pane either),
 * - a ribbon down the line while that figure is on, as long as the figure
 *   stays (the span figureEnd gives the pane's own trigger),
 * - the reading point at mid-screen, where the pane changes.
 *
 * It replaces the 24 Sep ticks (a 1rem line per trigger, OPENBRAIN-91),
 * which said that something changes here but not what, nor for how long.
 * Pure functions; components/chapter/ReadingRail.vue measures and draws.
 */
import { usesFigureShell } from "./figureCycle";

/** "FIG 05" / "FIG A" / "FIG": the pane toolbar's label for a figure number. */
export function figureLabel(number) {
  if (number === undefined || number === null || number === "") return "FIG";
  const text = String(number).trim();
  return `FIG ${/^\d+$/.test(text) ? text.padStart(2, "0") : text}`;
}

/** "Figure 5" / "Figure A" / "Figure", for a screen reader. */
function figureName(number) {
  if (number === undefined || number === null || number === "") return "Figure";
  return `Figure ${String(number)
    .trim()
    .replace(/^0+(?=\d)/, "")}`;
}

/**
 * The mark for the figure a trigger names, or null when it brings nothing
 * into the pane: no record (the Retina's blank "placeholder" trigger, which
 * only clears the pane), a full-screen figure (it draws in the text column)
 * or a section's entrance transition (scroll plays it over a blank spacer).
 *
 * `kind` is "figure" | "widget" | "video" | "plain"; `label` is what the
 * mark reads ("" for plain) and `name` its accessible name.
 */
export function railMarkFor(record) {
  if (!record || record.fullscreen || record.isTransition) return null;
  const title = String(record.title || "").trim();
  const named = (what) =>
    `${what}${title ? `: ${title}` : ""}, shown beside this paragraph`;
  const numbered =
    record.figureNumber !== undefined &&
    record.figureNumber !== null &&
    record.figureNumber !== "";
  // A numbered figure is "FIG 05" whatever draws it (History's trepanation
  // and papyrus are interactive and still Fig 2 and Fig 4 in the text).
  if (numbered)
    return {
      kind: "figure",
      label: figureLabel(record.figureNumber),
      name: named(figureName(record.figureNumber)),
    };
  if (record.youtubeID || record.videoUrl)
    return { kind: "video", label: "WATCH", name: named("Video") };
  if (record.widgetId)
    return { kind: "widget", label: "TRY IT", name: named("Interactive") };
  if (usesFigureShell(record))
    return { kind: "figure", label: "FIG", name: named("Figure") };
  return { kind: "plain", label: "", name: named("Figure") };
}

/**
 * The trigger that decides the pane, among those that are on: the last in
 * reading order, as IllustrationsComp's updateActiveFigure has it (a
 * paragraph's figure wins over the container figure it sits in). `active`
 * is one boolean per trigger. -1 when none is on.
 */
export function showingIndex(active = []) {
  for (let i = active.length - 1; i >= 0; i -= 1) if (active[i]) return i;
  return -1;
}

/**
 * [start, end) without the `bands` ([top, bottom] pairs): the stretches of a
 * figure's span where the line is there to carry a ribbon. A full-width band
 * (a breakout box, a widget stage) covers the line, and a container figure's
 * span runs straight through the bands inside it. Pieces shorter than `min`
 * are dropped.
 */
export function cutSpan(start, end, bands = [], min = 8) {
  let pieces = start < end ? [[start, end]] : [];
  for (const [top, bottom] of bands) {
    if (!(bottom > top)) continue;
    pieces = pieces.flatMap(([a, b]) => {
      if (bottom <= a || top >= b) return [[a, b]];
      const kept = [];
      if (top > a) kept.push([a, top]);
      if (bottom < b) kept.push([bottom, b]);
      return kept;
    });
  }
  return pieces.filter(([a, b]) => b - a >= min);
}

/**
 * Where an arrow key moves focus among `count` marks from `index`: +1 / -1,
 * or to the first / last ("Home" / "End"); it stops at the ends.
 */
export function stepMark(index, count, key) {
  if (!count) return -1;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  const step = key === "ArrowDown" || key === "ArrowRight" ? 1 : -1;
  return Math.min(count - 1, Math.max(0, index + step));
}
