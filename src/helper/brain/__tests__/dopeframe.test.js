import { describe, expect, it } from "vitest";
import {
  ATLAS_DOPEFRAME,
  DOPEFRAME_COLUMNS,
  angleDelta,
  dopeframeDuration,
  sampleDopeframe,
} from "../dopeframe";
import { areaById } from "../areas";

const ROWS = [
  {
    t: 0,
    azimuth: 350,
    elevation: 0,
    distance: 100,
    open: 0,
    area: "",
    ease: "linear",
  },
  {
    t: 10,
    azimuth: 370,
    elevation: 40,
    distance: 50,
    open: 1,
    area: "motor",
    ease: "linear",
  },
  {
    t: 20,
    azimuth: 350,
    elevation: 0,
    distance: 100,
    open: 0,
    area: "",
    ease: "inOut",
  },
];

describe("sampleDopeframe", () => {
  it("returns the keys' values at the keys", () => {
    expect(sampleDopeframe(ROWS, 0)).toMatchObject({
      elevation: 0,
      open: 0,
      area: "",
    });
    expect(sampleDopeframe(ROWS, 10)).toMatchObject({
      elevation: 40,
      open: 1,
      area: "motor",
    });
  });

  it("interpolates numbers with the arriving key's ease and steps the area", () => {
    const mid = sampleDopeframe(ROWS, 5);
    expect(mid.elevation).toBeCloseTo(20);
    expect(mid.distance).toBeCloseTo(75);
    expect(mid.area).toBe("");
    // inOut is symmetric, so the midpoint of an inOut segment is half way too…
    expect(sampleDopeframe(ROWS, 15).elevation).toBeCloseTo(20);
    // …but it starts slower than linear.
    expect(sampleDopeframe(ROWS, 11).elevation).toBeGreaterThan(39);
    expect(sampleDopeframe(ROWS, 15).area).toBe("motor");
  });

  it("wraps time around the loop and azimuth into [0, 360)", () => {
    expect(sampleDopeframe(ROWS, 25)).toEqual(sampleDopeframe(ROWS, 5));
    expect(sampleDopeframe(ROWS, -15)).toEqual(sampleDopeframe(ROWS, 5));
    expect(sampleDopeframe(ROWS, 10).azimuth).toBeCloseTo(10);
    expect(sampleDopeframe(ROWS, 5).azimuth).toBeCloseTo(0);
  });

  it("handles an empty or single-row table", () => {
    expect(sampleDopeframe([], 3)).toBeNull();
    expect(sampleDopeframe([ROWS[1]], 3)).toMatchObject({
      elevation: 40,
      area: "motor",
    });
  });
});

describe("angleDelta", () => {
  it("takes the short way round", () => {
    expect(angleDelta(350, 10)).toBe(20);
    expect(angleDelta(10, 350)).toBe(-20);
    expect(angleDelta(0, 180)).toBe(180);
    expect(angleDelta(90, 90)).toBe(0);
  });
});

describe("ATLAS_DOPEFRAME", () => {
  it("has every column, in time order", () => {
    for (const row of ATLAS_DOPEFRAME)
      expect(Object.keys(row)).toEqual(DOPEFRAME_COLUMNS);
    const times = ATLAS_DOPEFRAME.map((r) => r.t);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(dopeframeDuration(ATLAS_DOPEFRAME)).toBeGreaterThan(0);
  });

  it("only highlights areas the atlas knows", () => {
    for (const { area } of ATLAS_DOPEFRAME)
      if (area) expect(areaById(area)).not.toBeNull();
  });

  it("closes the loop: the last key repeats the first", () => {
    const first = ATLAS_DOPEFRAME[0];
    const last = ATLAS_DOPEFRAME[ATLAS_DOPEFRAME.length - 1];
    expect(angleDelta(first.azimuth, last.azimuth)).toBe(0);
    for (const key of ["elevation", "distance", "open", "area"])
      expect(last[key]).toBe(first[key]);
  });

  it("keeps the camera above the brain and the book within 0..1", () => {
    for (const row of ATLAS_DOPEFRAME) {
      expect(row.elevation).toBeGreaterThanOrEqual(0);
      expect(row.elevation).toBeLessThanOrEqual(85);
      expect(row.open).toBeGreaterThanOrEqual(0);
      expect(row.open).toBeLessThanOrEqual(1);
    }
  });
});
