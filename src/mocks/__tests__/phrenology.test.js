import { describe, it, expect } from "vitest";
import { PHRENOLOGY_VIEWS, PHRENOLOGY_CITATION } from "@/mocks/phrenology";

/*
 * The 3D hotspot coordinates were harvested from the shipping skull.glb
 * (OPENBRAIN-7) — these tests pin them to that mesh's bounding box so a
 * regression back to off-surface guesses (or a GLB swap without a re-harvest)
 * fails loudly instead of rendering floating dots.
 *
 * skull.glb bounds: x ±0.10208, y 0..0.25278, z ±0.16969 (gltf-transform
 * inspect). Tolerance covers quantization + surface rounding.
 */
const BBOX = { x: 0.105, yMin: -0.005, yMax: 0.256, z: 0.172 };

const parseTriplet = (s) => {
  const m = String(s).match(/^(-?[\d.]+)m (-?[\d.]+)m (-?[\d.]+)m$/);
  return m ? { x: +m[1], y: +m[2], z: +m[3] } : null;
};

const allRegions = PHRENOLOGY_VIEWS.flatMap((v) => v.regions);

describe("phrenology mock data", () => {
  it("every region has pos/normal in model-viewer triplet format", () => {
    for (const r of allRegions) {
      expect(parseTriplet(r.pos), `pos of ${r.n} ${r.name}`).toBeTruthy();
      expect(parseTriplet(r.normal), `normal of ${r.n} ${r.name}`).toBeTruthy();
    }
  });

  it("every hotspot position lies within the skull.glb bounding box", () => {
    for (const r of allRegions) {
      const p = parseTriplet(r.pos);
      expect(Math.abs(p.x), `x of ${r.n} ${r.name}`).toBeLessThanOrEqual(
        BBOX.x
      );
      expect(p.y, `y of ${r.n} ${r.name}`).toBeGreaterThanOrEqual(BBOX.yMin);
      expect(p.y, `y of ${r.n} ${r.name}`).toBeLessThanOrEqual(BBOX.yMax);
      expect(Math.abs(p.z), `z of ${r.n} ${r.name}`).toBeLessThanOrEqual(
        BBOX.z
      );
    }
  });

  it("a faculty appearing in multiple views carries identical 3D coords", () => {
    // The 3D view de-duplicates by n — divergent coords would silently pick one.
    const byN = new Map();
    for (const r of allRegions) {
      if (byN.has(r.n)) {
        expect(r.pos, `pos of duplicate ${r.n}`).toBe(byN.get(r.n).pos);
        expect(r.normal, `normal of duplicate ${r.n}`).toBe(
          byN.get(r.n).normal
        );
      } else {
        byN.set(r.n, r);
      }
    }
  });

  it("exports the shared footer citation", () => {
    expect(PHRENOLOGY_CITATION).toMatch(/Excerpts from/);
  });
});
