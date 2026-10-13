import { describe, expect, it } from "vitest";
import {
  fractionalIndex,
  nearestIndex,
  scrubX,
  trackOffset,
} from "../timelineScrub";

const centers = [4, 12, 20, 34, 42]; // a section gap between 20 and 34

describe("timeline scrubber maths", () => {
  it("finds the nearest bar, clamped to the ends", () => {
    expect(nearestIndex(centers, -50)).toBe(0);
    expect(nearestIndex(centers, 15)).toBe(1);
    expect(nearestIndex(centers, 17)).toBe(2);
    expect(nearestIndex(centers, 28)).toBe(3);
    expect(nearestIndex(centers, 999)).toBe(4);
    expect(nearestIndex([], 10)).toBe(-1);
  });

  it("dragging left moves forward, and stops at the ends", () => {
    expect(scrubX(12, -10, centers)).toBe(22);
    expect(scrubX(12, 10, centers)).toBe(4);
    expect(scrubX(12, -500, centers)).toBe(42);
  });

  it("offsets the track so x sits under the playhead", () => {
    expect(trackOffset(20, 195)).toBe(175);
    expect(trackOffset(400, 195)).toBe(-205);
  });

  it("gives a fractional index for the played fill", () => {
    expect(fractionalIndex(centers, 12)).toBeCloseTo(1.5);
    expect(fractionalIndex(centers, 16)).toBeCloseTo(2);
    expect(fractionalIndex(centers, 4)).toBeCloseTo(0.5);
    expect(fractionalIndex([], 4)).toBe(0);
  });
});
