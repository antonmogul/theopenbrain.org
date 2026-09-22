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
  it("scales with caption length, clamped to a 4–12 s window", () => {
    // No caption → floor (4 s).
    expect(slideDurationMs({ src: "/a.jpg" }, "")).toBe(4000);
    // Short shared legend → still at the floor.
    expect(slideDurationMs({ src: "/a.jpg", caption: "" }, "Short.")).toBe(
      4000
    );
    // Long caption (500 chars ÷ 18 cps ≈ 27.8 s) → ceiling (12 s).
    expect(
      slideDurationMs({ src: "/a.jpg", caption: "x".repeat(500) }, "")
    ).toBe(12000);
    // Medium caption (180 chars ÷ 18 cps = 10 s) → 10 000 ms.
    expect(
      slideDurationMs({ src: "/a.jpg", caption: "x".repeat(180) }, "")
    ).toBe(10000);
  });
});
