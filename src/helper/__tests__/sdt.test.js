import { describe, it, expect } from "vitest";
import { erf, Phi, Phinv, pdf, sdtRates } from "../sdt";

describe("sdt maths helpers", () => {
  // ── erf ──────────────────────────────────────────────────────────────
  describe("erf", () => {
    it("erf(0) = 0", () => {
      expect(erf(0)).toBeCloseTo(0, 6);
    });

    it("erf(1) ≈ 0.8427", () => {
      expect(erf(1)).toBeCloseTo(0.8427, 3);
    });

    it("erf is odd: erf(−x) = −erf(x)", () => {
      expect(erf(-1.5)).toBeCloseTo(-erf(1.5), 6);
    });

    it("erf(∞) → 1", () => {
      expect(erf(6)).toBeCloseTo(1, 6);
    });
  });

  // ── Phi (normal CDF) ────────────────────────────────────────────────
  describe("Phi", () => {
    it("Phi(0) = 0.5 (median of the standard normal)", () => {
      expect(Phi(0)).toBeCloseTo(0.5, 6);
    });

    it("Phi(1.96) ≈ 0.975 (97.5th percentile)", () => {
      expect(Phi(1.96)).toBeCloseTo(0.975, 3);
    });

    it("Phi(−1.96) ≈ 0.025 (2.5th percentile)", () => {
      expect(Phi(-1.96)).toBeCloseTo(0.025, 3);
    });

    it("Phi(1) ≈ 0.8413", () => {
      expect(Phi(1)).toBeCloseTo(0.8413, 3);
    });

    it("Phi(−3) ≈ 0.00135", () => {
      expect(Phi(-3)).toBeCloseTo(0.00135, 4);
    });
  });

  // ── Phinv (inverse normal CDF) ─────────────────────────────────────
  describe("Phinv", () => {
    it("Phinv(0.5) = 0", () => {
      expect(Phinv(0.5)).toBeCloseTo(0, 4);
    });

    it("Phinv(0.975) ≈ 1.96", () => {
      expect(Phinv(0.975)).toBeCloseTo(1.96, 2);
    });

    it("Phinv(0.025) ≈ −1.96", () => {
      expect(Phinv(0.025)).toBeCloseTo(-1.96, 2);
    });

    it("round-trips: Phinv(Phi(x)) ≈ x", () => {
      for (const x of [-2, -1, 0, 0.5, 1, 2]) {
        expect(Phinv(Phi(x))).toBeCloseTo(x, 4);
      }
    });

    it("clamps at boundaries", () => {
      expect(Phinv(0)).toBe(-6);
      expect(Phinv(1)).toBe(6);
    });
  });

  // ── pdf ──────────────────────────────────────────────────────────────
  describe("pdf", () => {
    it("pdf(0) = 1/√(2π) ≈ 0.3989", () => {
      expect(pdf(0)).toBeCloseTo(1 / Math.sqrt(2 * Math.PI), 6);
    });

    it("pdf is symmetric: pdf(x) = pdf(−x)", () => {
      expect(pdf(1.5)).toBeCloseTo(pdf(-1.5), 6);
    });

    it("pdf(x) → 0 for large |x|", () => {
      expect(pdf(5)).toBeLessThan(1e-5);
    });
  });

  // ── sdtRates ─────────────────────────────────────────────────────────
  describe("sdtRates", () => {
    it("unbiased criterion at dp/2 gives c = 0", () => {
      const { criterion } = sdtRates(2, 1); // k = dp/2 = 1
      expect(criterion).toBeCloseTo(0, 6);
    });

    it("d′ = 0, k = 0: hit rate = false alarm rate = 0.5 (chance)", () => {
      const { hitRate, falseAlarmRate } = sdtRates(0, 0);
      expect(hitRate).toBeCloseTo(0.5, 6);
      expect(falseAlarmRate).toBeCloseTo(0.5, 6);
    });

    it("high d′ with unbiased criterion: high hit rate, low false alarm", () => {
      const { hitRate, falseAlarmRate } = sdtRates(3, 1.5);
      expect(hitRate).toBeGreaterThan(0.9);
      expect(falseAlarmRate).toBeLessThan(0.1);
    });

    it("passes through d′ value unchanged", () => {
      const { dPrime } = sdtRates(1.5, 0.75);
      expect(dPrime).toBe(1.5);
    });
  });
});
