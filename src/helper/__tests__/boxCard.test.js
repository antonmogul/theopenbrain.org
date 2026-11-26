import { describe, it, expect } from "vitest";
import {
  followBoxMotion,
  normalizeBoxCard,
  layerTransform,
} from "../boxCard.mjs";
describe("box card motion and data", () => {
  it("follows a step without overshoot and converges at different frame rates", () => {
    for (const hz of [30, 60, 120]) {
      let position = 0,
        velocity = 0;
      for (let i = 0; i < hz; i++) {
        const next = followBoxMotion(position, velocity, 100, 1 / hz);
        expect(next.position).toBeGreaterThanOrEqual(position);
        expect(next.position).toBeLessThanOrEqual(100);
        ({ position, velocity } = next);
      }
      expect(position).toBeCloseTo(100, 1);
    }
  });
  it("rejects unsafe sources, clamps depth and keeps authored empty quotes", () => {
    expect(
      normalizeBoxCard({
        image: { src: "javascript:bad" },
        layers: [
          { src: "/a.webp", depth: 5 },
          { src: "bad", depth: 0 },
        ],
        quote: "",
      })
    ).toEqual({ layers: [{ src: "/a.webp", depth: 1, alt: "" }], quote: "" });
    expect(normalizeBoxCard(null)).toBeNull();
  });
  it("moves foreground more and returns layers to alignment at handoff", () => {
    expect(layerTransform(1, 0.5)).toContain("-28.00px");
    expect(layerTransform(0.1, 0.5)).toContain("-2.80px");
    expect(layerTransform(1, 1)).toContain("scale(1.0000)");
  });
});
