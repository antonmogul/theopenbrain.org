#!/usr/bin/env node
/*
 * Papyrus art from Figma (OPENBRAIN-176): turns the designers' SVG exports of
 * the four parts of case 20 into the files PapyrusCase.vue draws.
 *
 *   node scripts/figures/prepare-papyrus-art.mjs <dir with the exports>
 *
 * The exports are the four frames under "FInal assets" in Open-Brain-Chapters
 * (Yv7WvZSoabK2t5fNtsChvf): OB_Fig4_1_white 2878:65627 (title),
 * OB_Fig4_2_white 2878:65736 (examination), OB_Fig4_3_white 2878:67004
 * (diagnosis) and OB_Fig4_4_white 2878:66706 (treatment), saved as
 * title.svg, examination.svg, diagnosis.svg and treatment.svg.
 *
 * Nothing is redrawn. Each file keeps only the frame's own group (Figma
 * wraps it in the page's and the section's grounds), with:
 *  - the layer ids dropped (four files are inlined on one page);
 *  - the stroke every line shares set once on the root group, and
 *    `stroke="none"` on the shapes that are filled only;
 *  - `pathLength="1"` on every stroked path, so the widget can draw each
 *    line in with one dash whatever its length;
 *  - coordinates rounded to 0.01 of a unit.
 * The layer groups stay: one group, or one loose path, is one sign or one
 * stroke of it, which is what the draw-in staggers.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PARTS = ["title", "examination", "diagnosis", "treatment"];
const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../../src/widgets/figures/papyrus/art");
const from = process.argv[2];
if (!from) {
  console.error("usage: prepare-papyrus-art.mjs <dir with the four exports>");
  process.exit(1);
}

/* What the root group sets, with SVG's own default for each: a path that
   states one of these keeps it only where it differs from the root, and a
   stroked path that leaves one out gets SVG's default written in, so nothing
   changes by inheriting. */
const ROOT = {
  stroke: ["white", "none"],
  "stroke-width": ["0.5", "1"],
  "stroke-linecap": ["round", "butt"],
  "stroke-linejoin": ["round", "miter"],
};

/** The `<g id="OB_Fig4…">` element's inner markup. */
function frameGroup(svg) {
  const open = /<g id="OB_Fig4[^"]*">/.exec(svg);
  if (!open) throw new Error("no OB_Fig4 group in the export");
  let depth = 1;
  const tag = /<g\b[^>]*>|<\/g>/g;
  tag.lastIndex = open.index + open[0].length;
  for (let m; (m = tag.exec(svg));) {
    depth += m[0] === "</g>" ? -1 : 1;
    if (depth === 0) return svg.slice(open.index + open[0].length, m.index);
  }
  throw new Error("unclosed OB_Fig4 group");
}

const round = (d) =>
  d.replace(/-?\d*\.\d+/g, (n) => String(Number(Number(n).toFixed(2))));

for (const part of PARTS) {
  const svg = readFileSync(join(from, `${part}.svg`), "utf8");
  const box = /viewBox="([^"]+)"/.exec(svg)[1];
  let odd = 0;
  const body = frameGroup(svg)
    .replace(/\sid="[^"]*"/g, "")
    .replace(/<path\b[^>]*\/>/g, (el) => {
      const attrs = {};
      for (const [, k, v] of el.matchAll(/\s([\w-]+)="([^"]*)"/g)) attrs[k] = v;
      const { d, fill, ...rest } = attrs;
      const stroked = !!rest.stroke && rest.stroke !== "none";
      const plain =
        stroked &&
        Object.keys(ROOT).every((k) => rest[k] === ROOT[k][0]) &&
        Object.keys(rest).length === 4;
      const own = [];
      if (!stroked) {
        own.push('stroke="none"');
        delete rest.stroke;
      } else {
        own.push('pathLength="1"');
        for (const [k, [root, initial]] of Object.entries(ROOT)) {
          const v = rest[k] ?? initial;
          if (v !== root) own.push(`${k}="${v}"`);
          delete rest[k];
        }
      }
      for (const [k, v] of Object.entries(rest)) own.push(`${k}="${v}"`);
      if (fill) own.push(`fill="${fill === "white" ? "#fff" : fill}"`);
      // Counted so a changed export is noticed: lines that are not the
      // shared stroke, and shapes with neither a stroke nor a fill.
      if ((stroked && !plain) || (!stroked && !fill)) odd += 1;
      return `<path ${own.join(" ")} d="${round(d)}"/>`;
    })
    .replace(/\n\s*/g, "");
  writeFileSync(
    join(out, `${part}.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="${box}">` +
      `<g stroke="#fff" stroke-width=".5" stroke-linecap="round" stroke-linejoin="round">` +
      body +
      `</g></svg>\n`
  );
  console.log(
    `${part}: ${(body.match(/<path/g) || []).length} paths, ${odd} unusual`
  );
}
