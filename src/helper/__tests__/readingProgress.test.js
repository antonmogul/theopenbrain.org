import { describe, expect, it } from "vitest";
import {
  clampReadingPercent,
  readingPercentForScroll,
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
});
