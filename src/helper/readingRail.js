/*
 * The reading rail (OPENBRAIN-175): the marks on the line between the figure
 * pane and the text, from 1024px. Three things, one system:
 *
 * - a mark at every paragraph that brings something into the pane, on the
 *   line where its figure comes on (so it fills as it meets the reading
 *   point, OPENBRAIN-73): a pointer towards the pane, which fills with colour while its figure is
 *   on, one colour for a figure the reader looks at and another for one the
 *   reader operates (a widget, a film). Its name ("Figure 6: The cell
 *   doctrine, a gallery of 10 images") is its accessible name and the
 *   tooltip a pointer or the keyboard brings up,
 * - a ribbon down the line while that figure is on, as long as the figure
 *   stays (the span figureEnd gives the pane's own trigger),
 * - the reading point at mid-screen, where the pane changes.
 *
 * The marks first read "FIG 05", "TRY IT", "WATCH". Stuart, 11 Nov: "maybe
 * remove the word fig, and just replace it with a left-pointing arrow, and
 * the area changes color once the element appears. With one color for
 * non-interactive elements, and a second color for interactive elements";
 * and 13 Nov, of a gallery: "the cell doctrine has a bunch of figures, but
 * this labels them all as 'fig 6'" (OPENBRAIN-195). So the mark carries no
 * words, and the name says when a figure is a set.
 *
 * It replaces the 24 Sep ticks (a 1rem line per trigger, OPENBRAIN-91),
 * which said that something changes here but not what, nor for how long.
 * Pure functions; components/chapter/ReadingRail.vue measures and draws.
 */
import { figureImages } from "./figureCycle";
import { figureWidgetFor } from "@/widgets/figures/registry";

/** "Figure 5" / "Figure A" / "Figure", for the name. */
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
 * - `kind` is "figure" | "widget" | "video" | "plain" (the Retina's 2023
 *   figures, which have no label in the pane either);
 * - `interactive` says the reader operates it: a widget (an embed, or a
 *   figure rebuilt as a figure widget, such as History's trepanation and
 *   papyrus) or a film. A gallery is pictures: it turns on its own, and its
 *   arrows only choose which picture to look at;
 * - `tip` is its name, for the tooltip; `name` the accessible name.
 */
export function railMarkFor(record) {
  if (!record || record.fullscreen || record.isTransition) return null;
  const title = String(record.title || "").trim();
  const numbered =
    record.figureNumber !== undefined &&
    record.figureNumber !== null &&
    record.figureNumber !== "";
  const video = !!(record.youtubeID || record.videoUrl);
  const widget = !!(record.widgetId || figureWidgetFor(record.id));
  const interactive = video || widget;
  const images = figureImages(record).length;
  const mark = (kind, what) => {
    let tip = `${what}${title ? `: ${title}` : ""}`;
    if (images > 1 && !interactive) tip += `, a gallery of ${images} images`;
    // A numbered figure keeps its number (History's trepanation and papyrus
    // are Fig 2 and Fig 4 in the text), so the name says it is one to use.
    else if (interactive && kind === "figure") tip += ", interactive";
    return {
      kind,
      interactive,
      tip,
      name: `${tip}, shown beside this paragraph`,
    };
  };
  if (numbered) return mark("figure", figureName(record.figureNumber));
  if (video) return mark("video", "Video");
  if (widget) return mark("widget", "Interactive");
  if (images || record.placeholder) return mark("figure", "Figure");
  return mark("plain", "Figure");
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
