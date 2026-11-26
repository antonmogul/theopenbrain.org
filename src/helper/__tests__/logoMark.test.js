import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { brainOutline, curveRuns } from "../logoMark";

const logo = readFileSync(
  resolve(__dirname, "../../../public/publicAssets/images/logo.svg"),
  "utf8"
);

// Every coordinate pair of an absolute M/C path, as [x, y].
const points = (d) => {
  const nums = (d.match(/-?\d+\.?\d*/g) || []).map(Number);
  const out = [];
  for (let i = 0; i + 1 < nums.length; i += 2) out.push([nums[i], nums[i + 1]]);
  return out;
};

describe("curveRuns", () => {
  it("keeps a run of curves as an absolute path and drops the lines around it", () => {
    // A line, two relative curves, a line.
    const runs = curveRuns("M10,10 L20,10 c2,0 4,2 4,4 s2,4 4,4 V40");
    expect(runs).toEqual(["M20,10C22,10,24,12,24,14C24,16,26,18,28,18"]);
  });

  it("starts a new run after a line", () => {
    const runs = curveRuns("M0,0 c5,0 5,5 5,5 l10,0 c5,0 5,5 5,5");
    expect(runs).toHaveLength(2);
    expect(runs[1].startsWith("M15,5")).toBe(true);
  });

  it("drops the specks a shape builder leaves", () => {
    expect(curveRuns("M64.1,68.5v-0.1C63.9,68.3,64,68.6,64.1,68.5z")).toEqual(
      []
    );
  });

  it("reads nothing from nothing", () => {
    expect(curveRuns("")).toEqual([]);
    expect(curveRuns(undefined)).toEqual([]);
  });
});

describe("brainOutline", () => {
  const d = brainOutline(logo);

  it("finds the brain in the designers' logo", () => {
    expect(d.startsWith("M")).toBe(true);
    // Only moves and curves: the book's straight edges are not in it.
    expect(d).toMatch(/^[MC\d.,-]+$/);
  });

  it("stays inside the book's inner pages and off the words", () => {
    const xs = points(d).map(([x]) => x);
    const ys = points(d).map(([, y]) => y);
    // The brain spans the two inner pages (x 35 to 93) and overhangs them
    // on both sides, short of the book's outer edges (6 and 122); the mark
    // is 125 wide and the words start beyond it.
    expect(Math.min(...xs)).toBeGreaterThan(15);
    expect(Math.max(...xs)).toBeLessThan(115);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(55);
    expect(Math.min(...ys)).toBeGreaterThan(15);
    expect(Math.max(...ys)).toBeLessThan(90);
  });

  it("gives nothing for an artwork it cannot read", () => {
    expect(brainOutline("")).toBe("");
    expect(brainOutline("<svg><rect width='4' height='4'/></svg>")).toBe("");
  });
});
