/*
 * npm run tokens:figma-expected — the values the Figma design system file's
 * variables must hold, from tokens/tokens.json (OPENBRAIN-117). Paste the
 * output into scripts/tokens/figma-check.js (run through the Figma MCP
 * `use_figma` tool) to list any drift. See docs/design-system/figma-sync.md.
 *
 * figma-check.js only checks what this lists, so every layout token in
 * tokens.json is either mapped to a Figma Layout variable (FIGMA_LAYOUT) or
 * named, with the reason, in LAYOUT_NOT_IN_FIGMA. src/__tests__/tokens.test.js
 * fails on a layout token that is in neither, so a new one can't slip past
 * the drift check (OPENBRAIN-131).
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** A rem or px length (or a bare number) in px. Anything else (an em, a
 *  clamp()) has no fixed px value for a Figma variable to hold, so throw
 *  rather than turn "0.75em" into 0.75. */
export function px(v) {
  const s = String(v).trim();
  const m = /^(-?[\d.]+)(rem|px)?$/.exec(s);
  if (!m) throw new Error(`figma-expected: "${s}" is not a px or rem length`);
  return m[2] === "rem" ? parseFloat(m[1]) * 16 : parseFloat(m[1]);
}

/** Figma Layout variable → tokens.json layout key. Single-mode variables:
 *  a token's 1024px or 1280px value is a variable of its own. */
export const FIGMA_LAYOUT = {
  "measure/reading": "reading-measure",
  "gutter/laptop": "reader-gutter-l",
  "gutter/desktop-left": "reader-gutter-l@1280",
  "gutter/desktop-right": "reader-gutter-r@1280",
  "topbar/height": "reader-topbar-h",
  "section-gap/one-column": "reader-section-gap",
  "section-gap/two-column": "reader-section-gap@1024",
};

/** Layout tokens that are in tokens.json but deliberately not Figma
 *  variables, and why (docs/design-system/figma-sync.md). */
export const LAYOUT_NOT_IN_FIGMA = {
  "reader-prose-w":
    "a clamp() of the viewport width, not one value; Figma frames show it at each breakpoint",
  "reader-gutter-r":
    "below 1280px it equals reader-gutter-l, which gutter/laptop holds",
  "reader-title-gap":
    "an em of the section title it follows; a Figma number variable has no em",
  "reader-subsection-gap":
    "an em of the subsection title it precedes; a Figma number variable has no em",
};

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

/** The EXP object figma-check.js compares the Figma file against. */
export function figmaExpected(t) {
  const L = t.color.light;
  const D = t.color.dark;
  return {
    theme: Object.fromEntries(THEME.map((k) => [k, [L[k], D[k] ?? L[k]]])),
    chapter: t.chapter,
    type: Object.fromEntries(
      Object.entries(t.type).map(([k, v]) => [k, [v.desktop, v.phone]])
    ),
    radius: px(t.radius.control),
    ui: t.ui,
    layout: Object.fromEntries(
      Object.entries(FIGMA_LAYOUT).map(([name, key]) => {
        if (!(key in t.layout))
          throw new Error(`figma-expected: tokens.json has no layout "${key}"`);
        return [name, px(t.layout[key])];
      })
    ),
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const t = JSON.parse(await readFile("tokens/tokens.json", "utf8"));
  console.log(JSON.stringify(figmaExpected(t)));
}
