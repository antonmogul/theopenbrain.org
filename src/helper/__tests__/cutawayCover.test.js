import { describe, it, expect } from "vitest";
import {
  LIFT_START,
  REACH_END,
  REST,
  SETTLE,
  coverBox,
  cutoutCss,
  polygonCss,
  poseFor,
  segment,
  settle,
} from "@/helper/cutawayCover";

describe("skull-cutaway cover maths (OPENBRAIN-156)", () => {
  it("rests closed: the cap down and the hand out of the picture", () => {
    expect(REST).toBe(0);
    expect(poseFor(REST)).toEqual({ reach: 0, lift: 0 });
    expect(poseFor(-1)).toEqual({ reach: 0, lift: 0 });
    expect(poseFor(undefined)).toEqual({ reach: 0, lift: 0 });
  });

  it("reaches the hand in before the cap lifts, and has both in by 1", () => {
    expect(poseFor(REACH_END)).toMatchObject({ reach: 1 });
    expect(poseFor(LIFT_START)).toMatchObject({ lift: 0 });
    expect(LIFT_START).toBeLessThan(REACH_END);
    const mid = poseFor((LIFT_START + 1) / 2);
    expect(mid.lift).toBeCloseTo(0.5);
    expect(mid.reach).toBe(1);
    expect(poseFor(1)).toEqual({ reach: 1, lift: 1 });
    expect(poseFor(7)).toEqual({ reach: 1, lift: 1 });
  });

  it("segments a position through a window", () => {
    expect(segment(0.1, 0.2, 0.6)).toBe(0);
    expect(segment(0.4, 0.2, 0.6)).toBeCloseTo(0.5);
    expect(segment(0.9, 0.2, 0.6)).toBe(1);
    // A degenerate window is a step.
    expect(segment(0.5, 0.5, 0.5)).toBe(1);
    expect(segment(0.4, 0.5, 0.5)).toBe(0);
  });

  it("eases shut and lands exactly on the goal, so the frame loop can stop", () => {
    let position = 1;
    const steps = [];
    while (position !== REST && steps.length < 200) {
      position = settle(position, REST);
      steps.push(position);
    }
    expect(steps[0]).toBeCloseTo(0.88); // the first step is ease()'s
    expect(steps.every((p, i) => i === 0 || p < steps[i - 1])).toBe(true);
    expect(position).toBe(REST); // exactly, not within epsilon
    expect(steps.length).toBeGreaterThan(20);
    expect(steps.length).toBeLessThan(100);
    expect(settle(REST + SETTLE / 2, REST)).toBe(REST);
    expect(settle(0.5, 1, 0.5)).toBe(0.75);
  });

  it("writes polygons as CSS percentages, trimmed", () => {
    const tri = [
      [0, 0],
      [0.5, 0.123456],
      [1, 1],
    ];
    expect(polygonCss(tri)).toBe("polygon(0% 0%, 50% 12.346%, 100% 100%)");
    expect(cutoutCss(tri)).toBe(
      "polygon(evenodd, 0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 0% 0%, 50% 12.346%, 100% 100%, 0% 0%, 0% 0%)"
    );
    expect(polygonCss([[-0.000001, 0.2]])).toBe("polygon(0% 20%)");
  });

  it("sizes the canvas like background-size: cover at center 20%", () => {
    const ratio = 1728 / 1116;
    // Wider than the drawing: width-bound, the overflow a fifth above.
    const wide = coverBox({ width: 1920, height: 1080 }, ratio);
    expect(wide.width).toBe(1920);
    expect(wide.height).toBeCloseTo(1240);
    expect(wide.left).toBe(0);
    expect(wide.top).toBeCloseTo(-32);
    // A phone: height-bound, centred across.
    const phone = coverBox({ width: 390, height: 844 }, ratio);
    expect(phone.height).toBe(844);
    expect(phone.width).toBeCloseTo(1306.8, 0);
    expect(phone.left).toBeCloseTo(-458.4, 0);
    expect(phone.top).toBe(0);
    expect(coverBox()).toEqual({ width: 0, height: 0, left: 0, top: 0 });
  });
});
