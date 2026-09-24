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
