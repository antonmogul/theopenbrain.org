/*
 * tokens/tokens.json must match the CSS it is generated from (OPENBRAIN-117).
 * If this fails you changed brand.css or a .t-* class: run
 * `npm run tokens:export`, commit tokens/tokens.json, and update the Figma
 * design system file's variables (docs/design-system/figma-sync.md). A new
 * layout token also needs a Figma variable in figma-expected.mjs (or a reason
 * it has none), or the last block fails.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { extractTokens } from "../../scripts/tokens/extract.mjs";
import {
  FIGMA_LAYOUT,
  LAYOUT_NOT_IN_FIGMA,
  figmaExpected,
  px,
} from "../../scripts/tokens/figma-expected.mjs";

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

/*
 * The Figma drift check (scripts/tokens/figma-check.js) compares only what
 * figma-expected.mjs lists, so a layout token it leaves out is never checked
 * and the check reports no drift whether or not Figma has it (OPENBRAIN-131:
 * the section gap). Every layout token is mapped to a Figma variable or
 * excluded by name with a reason.
 */
describe("Figma drift check (scripts/tokens/figma-expected.mjs)", () => {
  it("maps or deliberately excludes every layout token", () => {
    const { layout } = current();
    const mapped = Object.values(FIGMA_LAYOUT);
    const excluded = Object.keys(LAYOUT_NOT_IN_FIGMA);
    expect(mapped.filter((k) => excluded.includes(k))).toEqual([]);
    expect([...mapped, ...excluded].sort()).toEqual(Object.keys(layout).sort());
    for (const [key, why] of Object.entries(LAYOUT_NOT_IN_FIGMA))
      expect(why, key).toMatch(/\S{8}/);
  });

  it("checks the section gap in both layouts, in px", () => {
    const { layout } = figmaExpected(current());
    expect(layout["section-gap/one-column"]).toBe(96);
    expect(layout["section-gap/two-column"]).toBe(320);
    for (const [name, value] of Object.entries(layout))
      expect(Number.isFinite(value), name).toBe(true);
  });

  it("refuses a length with no fixed px value instead of misreading it", () => {
    expect(px("6rem")).toBe(96);
    expect(px("780px")).toBe(780);
    expect(px("0px")).toBe(0);
    expect(() => px("0.75em")).toThrow(/not a px or rem length/);
    expect(() => px("clamp(35rem, 50vw, 890px)")).toThrow();
  });

  it("fails loudly when a mapped token is missing from tokens.json", () => {
    const tokens = current();
    delete tokens.layout["reader-section-gap@1024"];
    expect(() => figmaExpected(tokens)).toThrow(/reader-section-gap@1024/);
  });
});
