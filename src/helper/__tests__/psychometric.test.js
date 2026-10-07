import { describe, it, expect } from "vitest";
import { PRESETS, halfPoint, psi } from "../psychometric";

describe("psychometric function (psi)", () => {
  it("sits halfway between floor and ceiling at the threshold alpha", () => {
    for (const p of Object.values(PRESETS)) {
      const mid = p.gamma + (1 - p.gamma - p.lambda) / 2;
      expect(psi(p.alpha, p)).toBeCloseTo(mid, 10);
      expect(halfPoint(p)).toBeCloseTo(mid, 10);
    }
  });

  it("is bounded by the guess rate below and 1 − lapse above", () => {
    const p = { alpha: 50, beta: 6, gamma: 0.1, lambda: 0.2 };
    expect(psi(-1e4, p)).toBeCloseTo(0.1, 10);
    expect(psi(1e4, p)).toBeCloseTo(0.8, 10);
    for (let x = 0; x <= 100; x += 5) {
      expect(psi(x, p)).toBeGreaterThanOrEqual(0.1);
      expect(psi(x, p)).toBeLessThanOrEqual(0.8);
    }
  });

  it("is monotonic, and a smaller beta is steeper at the threshold", () => {
    const p = PRESETS.baseline;
    for (let x = 0; x < 100; x += 0.5) {
      expect(psi(x + 0.5, p)).toBeGreaterThan(psi(x, p));
    }
    const steep = { ...p, beta: 3 };
    const slopeAt = (q) => psi(q.alpha + 0.01, q) - psi(q.alpha - 0.01, q);
    expect(slopeAt(steep)).toBeGreaterThan(slopeAt(p));
  });

  it("is symmetric about the threshold (logistic core)", () => {
    const p = PRESETS.baseline;
    const mid = halfPoint(p);
    expect(psi(p.alpha + 7, p) - mid).toBeCloseTo(
      mid - psi(p.alpha - 7, p),
      10
    );
  });
});

describe("the author's presets", () => {
  it("lower threshold shifts the curve left and keeps the floor", () => {
    expect(PRESETS.threshold.alpha).toBeLessThan(PRESETS.baseline.alpha);
    expect(psi(0, PRESETS.threshold)).toBeLessThan(0.03);
    expect(psi(40, PRESETS.threshold)).toBeGreaterThan(
      psi(40, PRESETS.baseline)
    );
  });

  it("liberal bias says yes on a quarter of no-stimulus trials", () => {
    expect(psi(0, PRESETS.bias)).toBeCloseTo(0.25, 2);
  });

  it("high lapse never reaches the ceiling", () => {
    expect(psi(100, PRESETS.lapse)).toBeCloseTo(0.78, 2);
    expect(psi(100, PRESETS.lapse)).toBeLessThan(1 - PRESETS.lapse.lambda);
  });

  it("threshold and bias curves nearly superimpose from 30 up, but not at 0", () => {
    for (let x = 30; x <= 100; x += 1) {
      expect(
        Math.abs(psi(x, PRESETS.threshold) - psi(x, PRESETS.bias))
      ).toBeLessThan(0.02);
    }
    expect(psi(0, PRESETS.bias) - psi(0, PRESETS.threshold)).toBeGreaterThan(
      0.2
    );
  });
});
