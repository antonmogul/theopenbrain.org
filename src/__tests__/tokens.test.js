/*
 * tokens/tokens.json must match the CSS it is generated from (OPENBRAIN-117).
 * If this fails you changed brand.css or a .t-* class: run
 * `npm run tokens:export`, commit tokens/tokens.json, and update the Figma
 * design system file's variables (docs/design-system/figma-sync.md).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { extractTokens } from "../../scripts/tokens/extract.mjs";

const read = (p) => readFileSync(resolve(__dirname, "../..", p), "utf8");
const current = () =>
  extractTokens(read("src/styles/brand.css"), read("src/index.css"));

describe("design tokens (tokens/tokens.json)", () => {
  it("is up to date with brand.css and index.css", () => {
    const committed = JSON.parse(read("tokens/tokens.json"));
    expect(current()).toEqual(committed);
  });

  it("covers the five chapter ramps with all four steps", () => {
    const { chapter } = current();
    expect(Object.keys(chapter)).toEqual([
      "fund",
      "perc",
      "move",
      "lear",
      "deve",
    ]);
    for (const ramp of Object.values(chapter))
      for (const step of Object.values(ramp))
        expect(step).toMatch(/^#[0-9A-F]{6}$/);
  });

  it("has the fixed UI sizes the components use (OPENBRAIN-118)", () => {
    const { ui } = current();
    expect(Object.keys(ui)).toEqual([
      "10",
      "11",
      "12",
      "13",
      "14",
      "15",
      "16",
      "18",
      "20",
      "32",
    ]);
    for (const [n, px] of Object.entries(ui)) expect(px).toBe(Number(n));
  });

  it("has a desktop and phone size, weight and font for every type role", () => {
    const { type } = current();
    expect(Object.keys(type)).toHaveLength(10);
    for (const [role, t] of Object.entries(type)) {
      expect(t.desktop, role).toBeGreaterThan(0);
      expect(t.phone, role).toBeGreaterThan(0);
      expect(t.phone, role).toBeLessThanOrEqual(t.desktop);
      expect(t.weight, role).toBeGreaterThan(0);
      expect(["body", "ui", "mono"], role).toContain(t.font);
    }
  });
});
