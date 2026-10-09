import { describe, it, expect } from "vitest";
import { figureImages, usesFigureShell, stepIndex } from "../figureCycle";

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

describe("gallery video items", () => {
  it("keeps a valid YouTube id on an item and drops an invalid one", async () => {
    const out = figureImages({
      images: [
        { src: "/still.jpg", youtube: "OmmH4Rp9-to" },
        { src: "/b.jpg", youtube: "not an id" },
      ],
    });
    expect(out[0].youtube).toBe("OmmH4Rp9-to");
    expect(out[1]).not.toHaveProperty("youtube");
  });

  it("builds a muted, looping, privacy-enhanced embed URL", async () => {
    const { youtubeLoopUrl } = await import("../figureCycle");
    const url = youtubeLoopUrl("OmmH4Rp9-to");
    expect(url).toMatch(
      /^https:\/\/www\.youtube-nocookie\.com\/embed\/OmmH4Rp9-to\?/
    );
    expect(url).toContain("mute=1");
    expect(url).toContain("loop=1&playlist=OmmH4Rp9-to");
    expect(youtubeLoopUrl("x")).toBe("");
  });
});
