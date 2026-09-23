import { describe, expect, it } from "vitest";
import { folderPath } from "../folderPath";

describe("folderPath", () => {
  const base = { w: 1000, h: 600, a: 300, b: 600, tab: 90, r: 40 };

  it("draws a closed outline whose tab rises from the body's top edge to y=0", () => {
    const d = folderPath(base);
    expect(d.startsWith("M0 ")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
    // The tab's top edge runs at y=0 between the tab's rounded corners.
    expect(d).toMatch(/L5\d\d(\.\d)? 0/);
    // The body's top edge is the tab height.
    expect(d).toContain("L0 130");
  });

  it("keeps corner radii inside a small folder instead of overshooting", () => {
    const d = folderPath({ w: 80, h: 60, a: 20, b: 50, tab: 20, r: 200 });
    const nums = d.match(/-?\d+(\.\d+)?/g).map(Number);
    expect(Math.min(...nums)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...nums)).toBeLessThanOrEqual(80);
    expect(nums.every(Number.isFinite)).toBe(true);
  });
});
