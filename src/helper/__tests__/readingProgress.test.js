import { describe, expect, it, vi } from "vitest";
import {
  clampReadingPercent,
  readingOffset,
  readingPercentForScroll,
  restoreAfterLayout,
  scrollTopForReadingPercent,
} from "@/helper/readingProgress";

describe("reading progress geometry", () => {
  it("uses the scrollable document height as the single progress scale", () => {
    expect(readingPercentForScroll(900, 2600, 800)).toBe(50);
    expect(scrollTopForReadingPercent(50, 2600, 800)).toBe(900);
  });

  it("clamps persisted and measured values to a valid percentage", () => {
    expect(clampReadingPercent(-4)).toBe(0);
    expect(clampReadingPercent(140)).toBe(100);
    expect(clampReadingPercent("not-a-number")).toBe(0);
  });

  it("treats a document with no scroll range as fully read", () => {
    expect(readingPercentForScroll(0, 800, 800)).toBe(100);
    expect(scrollTopForReadingPercent(75, 800, 800)).toBe(0);
  });

  it.each([
    ["reader identity", (state) => (state.identity = "reader-b")],
    ["course", (state) => (state.courseId = "course-2")],
  ])(
    "invalidates a pending restore when %s changes during layout wait",
    async (_label, invalidate) => {
      let finishLayout;
      const layout = new Promise((resolve) => {
        finishLayout = resolve;
      });
      const state = { identity: "reader-a", courseId: "course-1" };
      const restore = vi.fn();

      const pending = restoreAfterLayout({
        waitForLayout: () => layout,
        isCurrent: () =>
          state.identity === "reader-a" && state.courseId === "course-1",
        restore,
      });

      invalidate(state);
      finishLayout();

      await expect(pending).resolves.toBe(false);
      expect(restore).not.toHaveBeenCalled();
    }
  );
});

/*
 * OPENBRAIN-32: progress is measured over the reading body. The opener
 * (cover + TOC) above the prose is excluded via an offset so its height —
 * which varies per chapter and viewport — cannot shift saved positions.
 */
describe("reading progress with an opener offset", () => {
  it("reads 0% anywhere inside the opener and 100% at the end of the prose", () => {
    // doc 10000, viewport 1000, opener 2000 → prose scrollable = 7000
    expect(readingPercentForScroll(0, 10000, 1000, 2000)).toBe(0);
    expect(readingPercentForScroll(1500, 10000, 1000, 2000)).toBe(0);
    expect(readingPercentForScroll(2000, 10000, 1000, 2000)).toBe(0);
    expect(readingPercentForScroll(5500, 10000, 1000, 2000)).toBe(50);
    expect(readingPercentForScroll(9000, 10000, 1000, 2000)).toBe(100);
  });

  it("restores into the prose by adding the offset back", () => {
    expect(scrollTopForReadingPercent(0, 10000, 1000, 2000)).toBe(2000);
    expect(scrollTopForReadingPercent(50, 10000, 1000, 2000)).toBe(5500);
    expect(scrollTopForReadingPercent(100, 10000, 1000, 2000)).toBe(9000);
  });

  it("round-trips through the opener offset", () => {
    for (const p of [0, 12.5, 37, 80, 100]) {
      const top = scrollTopForReadingPercent(p, 20000, 900, 2791);
      expect(readingPercentForScroll(top, 20000, 900, 2791)).toBeCloseTo(p, 6);
    }
  });

  it("is unchanged when no offset is given (pre-opener behaviour)", () => {
    expect(readingPercentForScroll(4500, 10000, 1000)).toBe(50);
    expect(scrollTopForReadingPercent(50, 10000, 1000)).toBe(4500);
  });

  it("readingOffset parses --opener-h from the root style and defaults to 0", () => {
    const root = { style: { getPropertyValue: () => "2791px" } };
    expect(readingOffset(root)).toBe(2791);
    expect(readingOffset({ style: { getPropertyValue: () => "" } })).toBe(0);
    expect(readingOffset({ style: { getPropertyValue: () => "junk" } })).toBe(
      0
    );
    expect(readingOffset(null)).toBe(0);
  });
});
