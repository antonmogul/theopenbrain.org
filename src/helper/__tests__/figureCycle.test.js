import { describe, it, expect } from "vitest";
import {
  figureImages,
  usesFigureShell,
  stepIndex,
  slideDurationMs,
} from "../figureCycle";

describe("figureImages", () => {
  it("normalises objects and bare strings, dropping entries without a src", () => {
    expect(
      figureImages({
        images: ["/a.jpg", { src: "/b.jpg", caption: "B" }, {}, null, ""],
      })
    ).toEqual([
      { src: "/a.jpg", caption: "", alt: "" },
      { src: "/b.jpg", caption: "B", alt: "" },
    ]);
  });

  it("falls back to the row's single image_file_url (imageUrl)", () => {
    expect(figureImages({ imageUrl: "/one.jpg" })).toEqual([
      { src: "/one.jpg", caption: "", alt: "" },
    ]);
  });

  it("prefers config.images over imageUrl, and is empty for a bare slot", () => {
    expect(
      figureImages({ images: ["/set.jpg"], imageUrl: "/one.jpg" })[0].src
    ).toBe("/set.jpg");
    expect(figureImages({ placeholder: true })).toEqual([]);
    expect(figureImages({ images: [] })).toEqual([]);
    expect(figureImages(null)).toEqual([]);
  });
});

describe("usesFigureShell", () => {
  it("routes pending slots and image figures to the shell, and nothing else", () => {
    expect(usesFigureShell({ placeholder: true })).toBe(true);
    expect(usesFigureShell({ images: ["/a.jpg"] })).toBe(true);
    expect(usesFigureShell({ imageUrl: "/a.jpg" })).toBe(true);
    // A Chapter 1 Lottie figure must keep its own renderer.
    expect(usesFigureShell({ id: "animationEyeStructur", states: [] })).toBe(
      false
    );
    expect(usesFigureShell(undefined)).toBe(false);
  });
});

describe("stepIndex", () => {
  it("wraps in both directions and survives an empty set", () => {
    expect(stepIndex(0, 4, 1)).toBe(1);
    expect(stepIndex(3, 4, 1)).toBe(0);
    expect(stepIndex(0, 4, -1)).toBe(3);
    expect(stepIndex(0, 0, 1)).toBe(0);
  });
});

describe("slideDurationMs", () => {
  it("returns a usable pace for captioned, legend-only and bare images", () => {
    for (const args of [
      [{ src: "/a.jpg", caption: "x".repeat(500) }, ""],
      [{ src: "/a.jpg", caption: "" }, "One shared legend."],
      [{ src: "/a.jpg" }, ""],
    ]) {
      const ms = slideDurationMs(...args);
      // Infinity is allowed (manual-only); anything finite must be a real wait.
      expect(ms === Infinity || (Number.isFinite(ms) && ms >= 1000)).toBe(true);
    }
  });
});
