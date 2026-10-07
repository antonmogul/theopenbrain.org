import { describe, it, expect } from "vitest";
import {
  PHRENOLOGY_VIEWS,
  PHRENOLOGY_CITATION,
  PHRENOLOGY_FACULTIES,
} from "@/mocks/phrenology";

describe("source-backed phrenology data", () => {
  it("uses the supplied 1815 source rather than placeholder chart copy", () => {
    expect(PHRENOLOGY_CITATION).toContain("The Physiognomical System");
    expect(PHRENOLOGY_CITATION).toContain("1815");
    expect(PHRENOLOGY_CITATION).not.toMatch(/Penfield|Auditory and Visual/);
  });
  it("shares one canonical source record across views", () => {
    for (const view of PHRENOLOGY_VIEWS)
      for (const region of view.regions) {
        expect(region).toBe(PHRENOLOGY_FACULTIES.find((f) => f.n === region.n));
        expect(region.quotes.length).toBeGreaterThan(0);
        expect(region.images.length).toBeGreaterThan(0);
      }
  });
});
