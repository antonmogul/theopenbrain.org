import { describe, expect, it } from "vitest";
import {
  TINT_MAX_SCREENS,
  imageTakesTint,
  tintAt,
  tintTables,
  wantsTintFade,
} from "../figureTint";
import { figureImages } from "../figureCycle";
import { RAMPS } from "../chapterTheme";

describe("wantsTintFade", () => {
  it("is on only for a stored true", () => {
    expect(wantsTintFade({ tintFade: true })).toBe(true);
    for (const value of [undefined, false, "true", 1, {}, null])
      expect(wantsTintFade({ tintFade: value })).toBe(false);
    expect(wantsTintFade(null)).toBe(false);
  });
});

describe("imageTakesTint", () => {
  it("takes plain stills and leaves videos, loops and opt-outs", () => {
    const [still, poster, loop, baked] = figureImages({
      images: [
        "/photo.jpg",
        { src: "/poster.webp", youtube: "g4-6A8u8QBc", play: "player" },
        { src: "/loop.webp", loop: { mp4: "/publicAssets/video/a.mp4" } },
        { src: "/duotone.webp", tint: false },
      ],
    });
    expect(imageTakesTint(still)).toBe(true);
    expect(imageTakesTint(poster)).toBe(false);
    expect(imageTakesTint(loop)).toBe(false);
    expect(baked.tint).toBe(false);
    expect(imageTakesTint(baked)).toBe(false);
    expect(imageTakesTint(null)).toBe(false);
  });

  it("figureImages keeps only an explicit opt-out", () => {
    const [a, b] = figureImages({
      images: [{ src: "/a.jpg", tint: true }, { src: "/b.jpg" }],
    });
    expect("tint" in a).toBe(false);
    expect("tint" in b).toBe(false);
  });
});

describe("tintAt", () => {
  it("is full at the window's start and gone halfway through", () => {
    expect(tintAt(1000, 1000, 2000)).toBe(1);
    expect(tintAt(1250, 1000, 2000)).toBeCloseTo(0.5);
    expect(tintAt(1500, 1000, 2000)).toBe(0);
    expect(tintAt(1900, 1000, 2000)).toBe(0);
  });

  it("clamps outside the window", () => {
    expect(tintAt(0, 1000, 2000)).toBe(1);
    expect(tintAt(9000, 1000, 2000)).toBe(0);
  });

  it("clears within a screen and a half on a long hold", () => {
    const viewport = 900;
    const run = viewport * TINT_MAX_SCREENS;
    expect(tintAt(1000 + run, 1000, 11000, viewport)).toBe(0);
    expect(tintAt(1000 + run / 2, 1000, 11000, viewport)).toBeCloseTo(0.5);
    // A short window is still halfway.
    expect(tintAt(1200, 1000, 1800, viewport)).toBeCloseTo(0.5);
  });

  it("is no wash for a window that isn't one", () => {
    expect(tintAt(10, 100, 100)).toBe(0);
    expect(tintAt(10, 200, 100)).toBe(0);
    expect(tintAt(NaN, 0, 100)).toBe(0);
    expect(tintAt(10, undefined, 100)).toBe(0);
  });
});

describe("tintTables", () => {
  it("gives every ramp three rising stops per channel", () => {
    for (const ramp of RAMPS) {
      const tables = tintTables(ramp);
      for (const channel of ["r", "g", "b"]) {
        const stops = tables[channel].split(" ").map(Number);
        expect(stops).toHaveLength(3);
        for (const stop of stops) {
          expect(stop).toBeGreaterThanOrEqual(0);
          expect(stop).toBeLessThanOrEqual(1);
        }
        // Shadows darker than highlights, so the picture keeps its tones.
        expect(stops[0]).toBeLessThan(stops[2]);
      }
    }
  });

  it("has the chapter's main step in the middle", () => {
    // fund main #8D4CF6
    expect(tintTables("fund").r.split(" ")[1]).toBe((0x8d / 255).toFixed(4));
    expect(tintTables("fund").b.split(" ")[1]).toBe((0xf6 / 255).toFixed(4));
  });

  it("is null without a chapter colour", () => {
    expect(tintTables(undefined)).toBeNull();
    expect(tintTables("nope")).toBeNull();
  });
});
