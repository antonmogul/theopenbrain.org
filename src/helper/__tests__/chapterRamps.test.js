/*
 * One ramp table (OPENBRAIN-157). RAMP_HEX in helper/chapterTheme.js is the
 * five subject ramps as hex with their `on` ink; brand.css paints the same
 * values as --color-chapter{,-deep,-soft,-pale,-on,-ground}, the widget kit
 * hands them to uploaded widgets as --ob-*, and a breakout box in the
 * chapter's colour reads its ground and ink from the tokens. This holds
 * them equal, so a ramp can't change in one place and not the others.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { extractTokens } from "../../../scripts/tokens/extract.mjs";
import { AA_TEXT, RAMPS, RAMP_HEX, rampGround } from "@/helper/chapterTheme";
import { contrastRatio } from "@/helper/contrast";
import { widgetTokens } from "@/widgets/uploaded/widgetHost";

const read = (p) => readFileSync(resolve(__dirname, "../../..", p), "utf8");
const tokens = extractTokens(
  read("src/styles/brand.css"),
  read("src/index.css")
);
const up = (hex) => hex.toUpperCase();

describe("RAMP_HEX, the one ramp table", () => {
  it("names the five ramps, each with the four Figma steps and an `on` ink", () => {
    expect(Object.keys(RAMP_HEX)).toEqual([...RAMPS]);
    for (const ramp of RAMPS) {
      expect(Object.keys(RAMP_HEX[ramp]).sort()).toEqual([
        "deep",
        "main",
        "on",
        "pale",
        "soft",
      ]);
      for (const v of Object.values(RAMP_HEX[ramp]))
        expect(v).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
    expect(Object.isFrozen(RAMP_HEX)).toBe(true);
  });

  it("matches brand.css step for step, ink and ground included", () => {
    for (const ramp of RAMPS) {
      const css = tokens.chapter[ramp];
      const hex = RAMP_HEX[ramp];
      expect(css.chapter, ramp).toBe(up(hex.main));
      expect(css["chapter-deep"], ramp).toBe(up(hex.deep));
      expect(css["chapter-soft"], ramp).toBe(up(hex.soft));
      expect(css["chapter-pale"], ramp).toBe(up(hex.pale));
      expect(css["chapter-on"], ramp).toBe(up(hex.on));
      expect(css["chapter-ground"], ramp).toBe(up(hex[rampGround(ramp)]));
    }
  });

  it("grounds a text panel on the main step, or the deep one where main can't carry its ink at AA (move, 4.44:1)", () => {
    expect(rampGround("move")).toBe("deep");
    for (const ramp of ["fund", "perc", "lear", "deve"])
      expect(rampGround(ramp), ramp).toBe("main");
    expect(rampGround("nope")).toBe(rampGround("fund"));
    for (const ramp of RAMPS) {
      const ratio = contrastRatio(
        RAMP_HEX[ramp][rampGround(ramp)],
        RAMP_HEX[ramp].on
      );
      expect(ratio, ramp).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it("is what the widget kit hands uploaded widgets, plate included", () => {
    for (const ramp of RAMPS) {
      const t = widgetTokens(ramp);
      expect(t["--ob-accent"], ramp).toBe(RAMP_HEX[ramp].main);
      expect(t["--ob-accent-deep"], ramp).toBe(RAMP_HEX[ramp].deep);
      expect(t["--ob-on-accent"], ramp).toBe(RAMP_HEX[ramp].on);
    }
    expect(up(widgetTokens("fund")["--ob-plate"])).toBe(
      tokens.color.light["dark-surface"]
    );
    expect(up(widgetTokens("fund")["--ob-plate-2"])).toBe(
      tokens.color.light["dark-surface-2"]
    );
  });
});

describe("contrastRatio (WCAG 2)", () => {
  it("is 21 for black on white, 1 for a colour on itself, and symmetric", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBe(21);
    expect(contrastRatio("#fff", "#000")).toBe(21);
    expect(contrastRatio("#8D4CF6", "#8D4CF6")).toBe(1);
    expect(contrastRatio("#8D4CF6", "#ffffff")).toBe(
      contrastRatio("#ffffff", "#8D4CF6")
    );
  });

  it("gives the measured ratios the treatments were chosen on", () => {
    expect(contrastRatio("#8D4CF6", "#ffffff")).toBeCloseTo(4.67, 2);
    expect(contrastRatio("#1A72F2", "#ffffff")).toBeCloseTo(4.44, 2);
    expect(contrastRatio("#0E61C4", "#ffffff")).toBeCloseTo(5.96, 2);
    expect(contrastRatio("#39D8BA", "#1c1c1c")).toBeCloseTo(9.5, 1);
    expect(contrastRatio("#2A2A2A", "#ffffff")).toBeCloseTo(14.35, 2);
  });

  it("refuses anything that isn't a hex colour", () => {
    expect(() => contrastRatio("red", "#fff")).toThrow(/hex/);
    expect(() => contrastRatio("#12345", "#fff")).toThrow(/hex/);
  });
});
