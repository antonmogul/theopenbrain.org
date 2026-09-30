/*
 * npm run tokens:figma-expected — the values the Figma design system file's
 * variables must hold, from tokens/tokens.json (OPENBRAIN-117). Paste the
 * output into scripts/tokens/figma-check.js (run through the Figma MCP
 * `use_figma` tool) to list any drift. See docs/design-system/figma-sync.md.
 */
import { readFile } from "node:fs/promises";

const t = JSON.parse(await readFile("tokens/tokens.json", "utf8"));
const L = t.color.light;
const D = t.color.dark;
const px = (v) =>
  String(v).endsWith("rem") ? parseFloat(v) * 16 : parseFloat(String(v));
const THEME = [
  "bg",
  "paper",
  "ink",
  "mute",
  "line",
  "accent",
  "complete",
  "warn",
  "dark-surface",
  "support-yellow",
  "support-pink",
];
const expected = {
  theme: Object.fromEntries(THEME.map((k) => [k, [L[k], D[k] ?? L[k]]])),
  chapter: t.chapter,
  type: Object.fromEntries(
    Object.entries(t.type).map(([k, v]) => [k, [v.desktop, v.phone]])
  ),
  radius: px(t.radius.control),
  ui: t.ui,
  layout: {
    "measure/reading": px(t.layout["reading-measure"]),
    "gutter/laptop": px(t.layout["reader-gutter-l"]),
    "gutter/desktop-left": px(t.layout["reader-gutter-l@1280"]),
    "gutter/desktop-right": px(t.layout["reader-gutter-r@1280"]),
    "topbar/height": px(t.layout["reader-topbar-h"]),
  },
};
console.log(JSON.stringify(expected));
