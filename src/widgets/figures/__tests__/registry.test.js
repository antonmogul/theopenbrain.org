import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { FIGURE_WIDGETS, figureWidgetFor } from "../registry.js";

describe("figure widget registry", () => {
  it.each(Object.entries(FIGURE_WIDGETS))(
    "%s: its schema names the key it's registered under",
    (key, { schema }) => {
      expect(schema.animationKey).toBe(key);
      expect(schema.id).toMatch(/^[a-z0-9-]+$/);
    }
  );

  it.each(Object.entries(FIGURE_WIDGETS))(
    "%s: every field has a default",
    (key, { schema }) => {
      for (const f of schema.fields) {
        expect(schema.defaults, `${key}.${f.key}`).toHaveProperty(f.key);
        if (f.type === "group")
          for (const sub of f.fields)
            expect(schema.defaults[f.key]).toHaveProperty(sub.key);
        if (f.type === "list" && f.itemLabels)
          expect(f.itemLabels).toHaveLength(schema.defaults[f.key].length);
      }
    }
  );

  it("returns null for figures that aren't widgets", () => {
    expect(figureWidgetFor("animationEyeStructur")).toBeNull();
    expect(figureWidgetFor(undefined)).toBeNull();
    expect(figureWidgetFor("constructor")).toBeNull();
  });
});

// Figure widgets style themselves. The site's legacy colour aliases (bg-light,
// violet, magenta…) are what the design-system migration quietly repointed,
// and the global accent is the interaction pink, not the chapter's colour.
describe("figure widgets use only their own colours", () => {
  const root = join(__dirname, "..");
  const files = [];
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        if (name !== "__tests__") walk(p);
      } else if (p.endsWith(".vue")) files.push(p);
    }
  })(root);

  const LEGACY =
    /\b(?:bg|text|border|fill|stroke|from|to|ring|outline)-(?:lightest|lighter|light|med|dark|darker|lightDark|magenta|violet|green)\b|--color-accent\b/;

  it("finds the widgets", () => expect(files.length).toBeGreaterThan(0));

  it.each(files.map((f) => [relative(root, f), f]))("%s", (_, file) => {
    const hit = readFileSync(file, "utf8")
      .split("\n")
      .findIndex((line) => LEGACY.test(line));
    expect(hit, `line ${hit + 1}`).toBe(-1);
  });
});

// A step-through schema is bound to its artwork: its last frame is the
// Lottie's end, its icons exist, and each legend item lights up a layer the
// Lottie has. This is what catches the live site's dead "α subunit" key.
describe("step-through figures match their artwork", () => {
  const pub = join(__dirname, "../../../../public");
  const stepThrough = Object.values(FIGURE_WIDGETS)
    .map((w) => w.schema)
    .filter((s) => s.frames);

  function layerClasses(lottie) {
    const out = new Set();
    const walk = (layers = []) => {
      for (const l of layers) {
        for (const c of `${l.cl || ""} ${(l.nm || "").split(".").join(" ")}`
          .split(/\s+/)
          .filter(Boolean))
          out.add(c);
        walk(l.layers);
      }
    };
    walk(lottie.layers);
    for (const a of lottie.assets || []) walk(a.layers);
    return out;
  }

  it.each(stepThrough.map((s) => [s.id, s]))("%s", (_, schema) => {
    const lottie = JSON.parse(
      readFileSync(
        join(pub, "publicAssets/animations", `${schema.animationKey}.json`),
        "utf8"
      )
    );
    expect(schema.frames.at(-1)).toBe(lottie.op);
    expect(schema.defaults.states).toHaveLength(schema.frames.length - 1);
    expect(schema.legendArt).toHaveLength(schema.defaults.legend.length);
    const classes = layerClasses(lottie);
    for (const art of schema.legendArt) {
      expect(classes, art.highlight).toContain(art.highlight);
      expect(statSync(join(pub, art.icon)).isFile(), art.icon).toBe(true);
    }
  });
});

// A switch schema is bound to its artwork too: one Lottie per switch, every
// legend symbol on disk.
describe("switch figures match their artwork", () => {
  const pub = join(__dirname, "../../../../public");
  const switches = Object.values(FIGURE_WIDGETS)
    .map((w) => w.schema)
    .filter((s) => s.variants);

  it("finds them", () => expect(switches.length).toBe(4));

  it.each(switches.map((s) => [s.id, s]))("%s", (_, schema) => {
    expect(schema.variants).toHaveLength(schema.defaults.switches.length);
    expect(schema.legendArt).toHaveLength(schema.defaults.legend.length);
    for (const v of schema.variants) {
      const lottie = JSON.parse(readFileSync(join(pub, v.file), "utf8"));
      expect(lottie.op, v.file).toBeGreaterThan(0);
    }
    for (const art of schema.legendArt)
      expect(statSync(join(pub, art.icon)).isFile(), art.icon).toBe(true);
    // Their labels are the drawing's, not the database's older ones.
    for (const key of ["switches", "legend"])
      expect(schema.fields.find((f) => f.key === key).artwork).toBe(true);
  });
});
