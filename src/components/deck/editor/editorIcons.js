/**
 * The deck editor's small interface glyphs (OPENBRAIN-129): problem markers,
 * list and rail actions. Plain render functions rather than .vue files, so
 * they need no story of their own. Always decorative (aria-hidden): every
 * button that shows one also has a text label.
 */
import { h } from "vue";

const icon = (shapes) => {
  const Icon = () =>
    h(
      "svg",
      {
        viewBox: "0 0 24 24",
        width: 16,
        height: 16,
        fill: "none",
        stroke: "currentColor",
        "stroke-width": 2,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        "aria-hidden": "true",
        focusable: "false",
      },
      shapes.map(([tag, attrs]) => h(tag, attrs))
    );
  return Icon;
};

export const IconError = icon([
  ["circle", { cx: 12, cy: 12, r: 10 }],
  ["line", { x1: 12, y1: 7, x2: 12, y2: 13 }],
  ["line", { x1: 12, y1: 17, x2: 12.01, y2: 17 }],
]);

export const IconWarn = icon([
  [
    "path",
    {
      d: "M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
    },
  ],
  ["line", { x1: 12, y1: 9, x2: 12, y2: 13 }],
  ["line", { x1: 12, y1: 17, x2: 12.01, y2: 17 }],
]);

export const IconEyeOff = icon([
  [
    "path",
    {
      d: "M17.9 17.9A10.1 10.1 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.1-5.9M9.9 4.2A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2",
    },
  ],
  ["line", { x1: 1, y1: 1, x2: 23, y2: 23 }],
]);

export const IconUp = icon([["polyline", { points: "18 15 12 9 6 15" }]]);
export const IconDown = icon([["polyline", { points: "6 9 12 15 18 9" }]]);

export const IconCopy = icon([
  ["rect", { x: 9, y: 9, width: 13, height: 13 }],
  ["path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" }],
]);

export const IconTrash = icon([
  ["polyline", { points: "3 6 5 6 21 6" }],
  ["path", { d: "M19 6l-1 14H6L5 6m5 0V3h4v3" }],
]);

export const IconMore = icon([
  ["circle", { cx: 5, cy: 12, r: 1 }],
  ["circle", { cx: 12, cy: 12, r: 1 }],
  ["circle", { cx: 19, cy: 12, r: 1 }],
]);

export const IconPlus = icon([
  ["line", { x1: 12, y1: 5, x2: 12, y2: 19 }],
  ["line", { x1: 5, y1: 12, x2: 19, y2: 12 }],
]);

export const IconChevron = icon([["polyline", { points: "9 6 15 12 9 18" }]]);
