import { describe, it, expect } from "vitest";
import { reducedMotionK } from "@/helper/motion";

/*
 * K must be ~0 (not 0) under reduced motion: a 0 duration can make GSAP fire
 * callbacks in a different order than a finite one, and the views rely on
 * onComplete to release `animating` locks.
 */

describe("reducedMotionK", () => {
  it("returns 1 when neither source asks for reduced motion", () => {
    expect(reducedMotionK({}, false)).toBe(1);
  });

  it("collapses to ~0 for the app's data-reduce-motion toggle", () => {
    expect(reducedMotionK({ reduceMotion: "1" }, false)).toBe(0.001);
  });

  it("collapses to ~0 for the OS prefers-reduced-motion query", () => {
    expect(reducedMotionK({}, true)).toBe(0.001);
  });

  it("ignores stale dataset values", () => {
    expect(reducedMotionK({ reduceMotion: "0" }, false)).toBe(1);
    expect(reducedMotionK({ reduceMotion: "" }, false)).toBe(1);
    expect(reducedMotionK({ reduceMotion: "" }, true)).toBe(0.001);
  });

  // "Turn animations on" (OPENBRAIN-189) writes "0": the reader's choice
  // wins over a device that asks for less motion.
  it("runs at full speed when the reader asked for motion over the OS", () => {
    expect(reducedMotionK({ reduceMotion: "0" }, true)).toBe(1);
  });
});
