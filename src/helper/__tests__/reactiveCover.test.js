import { describe, it, expect } from "vitest";
import {
  IDLE_AMPLITUDE,
  ease,
  frameFor,
  idlePosition,
  pointerPosition,
} from "@/helper/reactiveCover";

describe("reactive cover maths (OPENBRAIN-146)", () => {
  const vp = { width: 1280, height: 800 };

  it("maps pointer x across the viewport to 0..1, as the 2023 eye did", () => {
    expect(pointerPosition({ clientX: 0 }, vp)).toBe(0);
    expect(pointerPosition({ clientX: 640 }, vp)).toBe(0.5);
    expect(pointerPosition({ clientX: 1280 }, vp)).toBe(1);
    expect(pointerPosition({ clientX: 5000 }, vp)).toBe(1);
    expect(pointerPosition({ clientX: -20 }, vp)).toBe(0);
  });

  it("can follow y instead, and run in reverse", () => {
    expect(pointerPosition({ clientY: 200 }, vp, { axis: "y" })).toBe(0.25);
    expect(pointerPosition({ clientX: 320 }, vp, { reverse: true })).toBe(0.75);
  });

  it("sits in the middle when the viewport has no size", () => {
    expect(pointerPosition({ clientX: 10 }, { width: 0, height: 0 })).toBe(0.5);
  });

  it("idles as a slow sine around the middle, starting there", () => {
    expect(idlePosition(0, 14)).toBeCloseTo(0.5);
    expect(idlePosition(14000 / 4, 14)).toBeCloseTo(0.5 + IDLE_AMPLITUDE);
    expect(idlePosition((14000 * 3) / 4, 14)).toBeCloseTo(0.5 - IDLE_AMPLITUDE);
    expect(idlePosition(14000, 14)).toBeCloseTo(0.5);
    // No period: no sweep.
    expect(idlePosition(9999, 0)).toBe(0.5);
  });

  it("turns a position into a frame on [0, totalFrames - 1]", () => {
    expect(frameFor(0, 67)).toBe(0);
    expect(frameFor(1, 67)).toBe(66);
    expect(frameFor(0.5, 67)).toBe(33);
    expect(frameFor(2, 67)).toBe(66);
    expect(frameFor(0.5, undefined)).toBe(0);
  });

  it("eases a fraction of the way each step", () => {
    expect(ease(0, 1, 0.25)).toBe(0.25);
    expect(ease(1, 1)).toBe(1);
  });
});
