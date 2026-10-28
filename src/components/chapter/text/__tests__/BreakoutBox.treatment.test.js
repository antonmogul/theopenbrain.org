/*
 * BreakoutBox treatment (OPENBRAIN-153, 157): the frame marks itself
 * data-treatment from the chapter TextComp provides and the box's slug,
 * a section's own treatment or the prop wins, and the pale card keeps its
 * badge while a panel drops it (the kicker carries the letter).
 *
 * The second half reads the component's own stylesheet: every treatment's
 * ground and ink, resolved through brand.css for each of the five ramps,
 * must reach AA (4.5:1) for text and 3:1 for the kicker and figure labels.
 * happy-dom applies no SFC CSS, so the rules are parsed, not computed.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postcss from "postcss";
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { computed } from "vue";
import BreakoutBox from "../BreakoutBox.vue";
import { extractTokens } from "../../../../../scripts/tokens/extract.mjs";
import { BOX_TREATMENTS } from "@/helper/breakoutTreatment";
import { RAMPS } from "@/helper/chapterTheme";
import { contrastRatio } from "@/helper/contrast";

const mountBox = ({ section, chapterSlug = null, props = {} } = {}) =>
  mount(BreakoutBox, {
    props: { section, label: "B", ...props },
    slots: { default: "<p>Body</p>" },
    global: {
      provide: { chapterSlug: computed(() => chapterSlug) },
      stubs: { Teleport: true },
    },
  });

describe("BreakoutBox treatment", () => {
  it("renders a History box as the dark panel, letter in the kicker only", () => {
    const w = mountBox({
      section: { id: "s1", slug: "box-descartes", title: "Descartes" },
      chapterSlug: "foundations-of-neuroscience",
    });
    const aside = w.find("aside.bx");
    expect(aside.attributes("data-treatment")).toBe("dark");
    expect(aside.classes()).toContain("bx--panel");
    expect(aside.classes()).toContain("bx--dark");
    expect(w.find(".bx-pause").attributes("data-treatment")).toBe("dark");
    expect(w.find(".bx-badge").exists()).toBe(false);
    expect(w.find(".bx-kicker").text()).toBe("Breakout box B");
    expect(w.find("h2").text()).toBe("Descartes");
  });

  it("keeps another chapter's box the pale card with its badge", () => {
    const w = mountBox({
      section: { id: "s2", slug: "box-descartes", title: "Elsewhere" },
      chapterSlug: "the-retina",
    });
    const aside = w.find("aside.bx");
    expect(aside.attributes("data-treatment")).toBe("pale");
    expect(aside.classes()).not.toContain("bx--panel");
    expect(aside.classes()).not.toContain("bx--dark");
    expect(w.find(".bx-badge").text()).toBe("B");
  });

  it("is pale with no chapter provided (stories, tests)", () => {
    const w = mount(BreakoutBox, {
      props: { section: { id: "s3", slug: "box-ngf", title: "NGF" } },
      global: { stubs: { Teleport: true } },
    });
    expect(w.find("aside.bx").attributes("data-treatment")).toBe("pale");
  });

  it("lets the section's own treatment and then the prop override the map", () => {
    const own = mountBox({
      section: {
        id: "s4",
        slug: "box-ngf",
        title: "NGF",
        treatment: "chapter",
      },
      chapterSlug: "foundations-of-neuroscience",
    });
    expect(own.find("aside.bx").attributes("data-treatment")).toBe("chapter");
    const prop = mountBox({
      section: { id: "s5", slug: "box-ngf", title: "NGF", treatment: "dark" },
      chapterSlug: "foundations-of-neuroscience",
      props: { treatment: "pale" },
    });
    expect(prop.find("aside.bx").attributes("data-treatment")).toBe("pale");
    expect(prop.find(".bx-badge").exists()).toBe(true);
  });

  it("marks the lighter dark plate as a dark panel and the chapter panel as a panel on colour", () => {
    const plate = mountBox({
      section: { id: "s6", slug: "box-x", title: "X", treatment: "plate" },
    });
    expect(plate.find("aside.bx").attributes("data-treatment")).toBe("plate");
    expect(plate.find("aside.bx").classes()).toContain("bx--panel");
    expect(plate.find("aside.bx").classes()).toContain("bx--dark");
    expect(plate.find(".bx-badge").exists()).toBe(false);
    const chapter = mountBox({
      section: { id: "s7", slug: "box-x", title: "X", treatment: "chapter" },
    });
    expect(chapter.find("aside.bx").attributes("data-treatment")).toBe(
      "chapter"
    );
    expect(chapter.find("aside.bx").classes()).toContain("bx--panel");
    expect(chapter.find("aside.bx").classes()).not.toContain("bx--dark");
  });

  it("reads the OPENBRAIN-153 name `violet` as the chapter panel", () => {
    const w = mountBox({
      section: { id: "s8", slug: "box-x", title: "X", treatment: "violet" },
    });
    expect(w.find("aside.bx").attributes("data-treatment")).toBe("chapter");
    const prop = mountBox({
      section: { id: "s9", slug: "box-x", title: "X" },
      props: { treatment: "violet" },
    });
    expect(prop.find("aside.bx").attributes("data-treatment")).toBe("chapter");
  });
});

// ---- the palette each treatment paints, read from the component's CSS ----

const root = resolve(__dirname, "../../../../..");
const read = (p) => readFileSync(resolve(root, p), "utf8");
const tokens = extractTokens(
  read("src/styles/brand.css"),
  read("src/index.css")
);
const sfc = read("src/components/chapter/text/BreakoutBox.vue");
const css = /<style scoped>([\s\S]*?)<\/style>/.exec(sfc)[1];

/** The --bx-* declarations of one rule, by selector. */
function declarations(selector) {
  const out = {};
  postcss.parse(css).walkRules((rule) => {
    if (rule.selector !== selector) return;
    rule.walkDecls((d) => {
      if (d.prop.startsWith("--bx-")) out[d.prop] = d.value.trim();
    });
  });
  return out;
}

/** --color-* tokens as hex for one ramp: the theme plus that ramp's steps. */
function tokensFor(ramp) {
  const vars = {};
  for (const [k, v] of Object.entries(tokens.color.light))
    vars[`color-${k}`] = v;
  for (const [k, v] of Object.entries(tokens.chapter[ramp]))
    vars[`color-${k}`] = v;
  return vars;
}

const hexToRgb = (hex) => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};
const rgbToHex = (rgb) =>
  "#" + rgb.map((n) => Math.round(n).toString(16).padStart(2, "0")).join("");

/** An rgb() argument (a token, a fallback, a triplet or a hex) as [r,g,b]. */
function triplet(expr, vars) {
  const e = expr.trim();
  const m = /^var\(--([a-z0-9-]+)(?:,\s*(.+))?\)$/.exec(e);
  if (m) {
    if (vars[`${m[1]}`]) return hexToRgb(vars[m[1]]);
    if (m[2]) return triplet(m[2], vars);
    throw new Error(`no token --${m[1]}`);
  }
  if (e.startsWith("#")) return hexToRgb(e);
  const n = e.split(/\s+/).map(Number);
  if (n.length === 3 && n.every(Number.isFinite)) return n;
  throw new Error(`can't read colour ${expr}`);
}

/** A CSS colour as hex; a translucent one is laid over `ground`. */
function paint(value, vars, ground) {
  if (value === "transparent") return ground;
  if (value.startsWith("#")) return rgbToHex(hexToRgb(value));
  const m = /^rgb\((.+)\)$/.exec(value);
  if (!m) throw new Error(`can't read colour ${value}`);
  const slash = m[1].lastIndexOf("/");
  const colour = slash < 0 ? m[1] : m[1].slice(0, slash);
  const alpha = slash < 0 ? 1 : Number(m[1].slice(slash + 1));
  const rgb = triplet(colour, vars);
  if (alpha === 1) return rgbToHex(rgb);
  const under = hexToRgb(ground);
  return rgbToHex(rgb.map((c, i) => c * alpha + under[i] * (1 - alpha)));
}

const AA = 4.5;
const AA_LARGE = 3;
// Pre-existing, outside OPENBRAIN-157: the pale card's figure label is
// --color-mute, 2.85:1 on the Movement ramp's pale tint (#9AC0EF). No live
// chapter is on `move`, and changing the card would change the Retina and
// Attention boxes, which this ticket leaves alone. Held to its value so a
// fix, or a worse value, shows up here.
const KNOWN_GAPS = { "pale/move/figure label": 2.85 };

describe("BreakoutBox palette: every treatment reads on every ramp", () => {
  const base = declarations(".bx-pause");

  it("has a palette rule for each treatment the resolver can name", () => {
    for (const t of BOX_TREATMENTS.filter((t) => t !== "pale"))
      expect(
        Object.keys(declarations(`.bx-pause[data-treatment="${t}"]`)),
        t
      ).toContain("--bx-bg");
  });

  for (const treatment of BOX_TREATMENTS) {
    const own =
      treatment === "pale"
        ? {}
        : declarations(`.bx-pause[data-treatment="${treatment}"]`);
    const rule = { ...base, ...own };
    for (const ramp of RAMPS) {
      it(`${treatment} on ${ramp}: body 4.5:1, kicker and figure label 3:1`, () => {
        const vars = tokensFor(ramp);
        const bg = paint(rule["--bx-bg"], vars, "#ffffff");
        const ink = paint(rule["--bx-ink"], vars, bg);
        const soft = paint(rule["--bx-ink-soft"], vars, bg);
        const kicker = paint(rule["--bx-kicker"], vars, bg);
        const label = paint(rule["--bx-fig-label"], vars, bg);
        expect(contrastRatio(bg, ink), `ink on ${bg}`).toBeGreaterThanOrEqual(
          AA
        );
        expect(
          contrastRatio(bg, soft),
          `soft ink on ${bg}`
        ).toBeGreaterThanOrEqual(AA);
        expect(
          contrastRatio(bg, kicker),
          `kicker on ${bg}`
        ).toBeGreaterThanOrEqual(AA_LARGE);
        const known = KNOWN_GAPS[`${treatment}/${ramp}/figure label`];
        if (known) expect(contrastRatio(bg, label)).toBe(known);
        else
          expect(
            contrastRatio(bg, label),
            `figure label on ${bg}`
          ).toBeGreaterThanOrEqual(AA_LARGE);
      });
    }
  }

  it("paints the plate on --color-dark-surface-2 and the chapter panel on the ramp's ground and ink", () => {
    const plate = declarations('.bx-pause[data-treatment="plate"]');
    expect(plate["--bx-bg"]).toBe("rgb(var(--color-dark-surface-2))");
    expect(paint(plate["--bx-ink"], tokensFor("fund"), "#000000")).toBe(
      "#ffffff"
    );
    const chapter = declarations('.bx-pause[data-treatment="chapter"]');
    expect(chapter["--bx-bg"]).toMatch(/var\(--color-chapter-ground/);
    expect(chapter["--bx-ink"]).toMatch(/var\(--color-chapter-on/);
    // move's ground is its deep step (white on #1A72F2 is 4.44:1).
    expect(paint(chapter["--bx-bg"], tokensFor("move"), "#ffffff")).toBe(
      "#0e61c4"
    );
    expect(paint(chapter["--bx-bg"], tokensFor("fund"), "#ffffff")).toBe(
      "#8d4cf6"
    );
    expect(paint(chapter["--bx-ink"], tokensFor("perc"), "#000000")).toBe(
      "#1c1c1c"
    );
  });

  it("keeps citations in the panel's ink, never magenta (1.1:1 on violet)", () => {
    const rules = [];
    postcss.parse(css).walkRules((r) => rules.push(r));
    const citation = rules.find((r) =>
      /\.bx--panel :deep\(\.citation-ref\)/.test(r.selector)
    );
    expect(citation).toBeDefined();
    expect(citation.toString()).toContain("color: var(--bx-ink)");
  });
});
