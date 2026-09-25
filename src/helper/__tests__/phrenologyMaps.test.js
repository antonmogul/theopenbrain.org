import { describe, expect, it } from "vitest";
import {
  MAP_FIT,
  VIEW_MAP,
  decodeId,
  facultyInfoByNumber,
  fitTransform,
  mapOutlines,
  parseRegionId,
  regionShapes,
} from "../phrenologyMaps";

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 725">
  <g id="Side">
    <path id="OB2_W1_Side_14" d="M0 0L10 0L10 10Z"/>
    <g id="OB2_W1_Side_11_L"><path id="Vector" d="M1 1H2"/><path d="M3 3H4"/></g>
    <path id="OB2_W1_Side_empty" d="M5 5H6"/>
    <path id="Vector_9" d="M7 7H8"/>
  </g>
</svg>`;

describe("phrenologyMaps", () => {
  it("reads the faculty number and half from the Figma layer names", () => {
    expect(parseRegionId("OB2_W1_Side_12")).toEqual({ n: 12, part: 0 });
    expect(parseRegionId("OB2_W1_Front_33_L")).toEqual({ n: 33, part: 1 });
    expect(parseRegionId("OB2_W1_Back_04_R")).toEqual({ n: 4, part: 2 });
  });

  it("ignores the empty shapes and unnamed vectors", () => {
    expect(parseRegionId("OB2_W1_Side_empty")).toBeNull();
    expect(parseRegionId("OB2_W1_Back_empty_01_R")).toBeNull();
    expect(parseRegionId("Vector_3")).toBeNull();
    expect(parseRegionId(null)).toBeNull();
  });

  it("decodes an id-map pixel, with red 0 meaning no region", () => {
    expect(decodeId(8, 0)).toEqual({ n: 8, part: 0 });
    expect(decodeId(0, 0)).toBeNull();
  });

  it("lists a map's named regions with their shapes, both halves included", () => {
    expect(regionShapes(SVG)).toEqual([
      { key: "OB2_W1_Side_14", n: 14, part: 0, d: ["M0 0L10 0L10 10Z"] },
      { key: "OB2_W1_Side_11_L", n: 11, part: 1, d: ["M1 1H2", "M3 3H4"] },
    ]);
  });

  it("draws every outline, named or not", () => {
    expect(mapOutlines(SVG)).toHaveLength(5);
  });

  it("names faculties 1–18 only, where the map follows Spurzheim", () => {
    const info = facultyInfoByNumber([
      {
        regions: [
          { n: 14, name: "Veneration", blurb: "a" },
          { n: 19, name: "Ideality", blurb: "b" },
          { n: 14, name: "Duplicate", blurb: "c" },
        ],
      },
    ]);
    expect(info.get(14)).toEqual({ name: "Veneration", blurb: "a" });
    expect(info.has(19)).toBe(false);
  });

  it("has a fit for every view, as an SVG transform about the centre", () => {
    for (const key of Object.values(VIEW_MAP))
      expect(MAP_FIT[key]).toBeTruthy();
    expect(fitTransform({ sx: 1, sy: 1, tx: 0, ty: 0 })).toBe(
      "translate(375 362.5) scale(1 1) translate(-375 -362.5)"
    );
  });
});
