import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  MAP_FIT,
  VIEW_MAP,
  decodeId,
  facultyInfoByNumber,
  fitTransform,
  idMarkup,
  mapOutlines,
  parseRegionId,
  regionShapes,
} from "../phrenologyMaps";

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 725">
  <g id="Side">
    <path id="OB2_W1_Side_14" d="M0 0L10 0L10 10Z" fill="#E8DEFC"/>
    <g id="OB2_W1_Side_11_L"><path id="Vector" d="M1 1H2" fill="#E8DEFC"/><path d="M3 3H4" fill="#E8DEFC"/><g><path d="M1 1Q2 3 4 1" stroke="purple"/></g></g>
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
    expect(mapOutlines(SVG)).toHaveLength(6);
  });

  it.each([
    ["side", 31, 1],
    ["back", 5, 2],
    ["back", 2, 1],
    ["back", 4, 2],
    ["back", 3, 1],
    ["back", 11, 2],
    ["back", 10, 1],
  ])("fills only source regions for %s organ %i", (view, n, count) => {
    const svg = readFileSync(
      `public/publicAssets/images/phrenology/regions-${view}.svg`,
      "utf8"
    );
    const source = new DOMParser().parseFromString(svg, "image/svg+xml");
    const expected = [...source.querySelectorAll("path[fill]")]
      .filter((p) => {
        const region = p.closest('[id^="OB2_W1_"]');
        return parseRegionId(region?.id)?.n === n;
      })
      .map((p) => p.getAttribute("d"));
    expect(expected).toHaveLength(count);
    expect(
      regionShapes(svg)
        .filter((r) => r.n === n)
        .flatMap((r) => r.d)
    ).toEqual(expected);
    const picking = new DOMParser().parseFromString(
      idMarkup(svg),
      "image/svg+xml"
    );
    const picked = [...picking.querySelectorAll("path")].filter((p) =>
      p.getAttribute("fill")?.startsWith(`rgb(${n},`)
    );
    expect(picked.map((p) => p.getAttribute("d"))).toEqual(expected);
    // All decorative strokes stay transparent in the ID texture.
    for (const p of source.querySelectorAll("path[stroke]:not([fill])")) {
      expect(picking.getElementById(p.id).getAttribute("fill")).toBe("none");
    }
  });

  it("keeps source-numbered records above 18 and de-duplicates shared views", () => {
    const info = facultyInfoByNumber([
      {
        regions: [
          { n: 14, name: "Veneration", blurb: "a" },
          { n: 19, name: "Individuality", blurb: "b" },
          { n: 14, name: "Duplicate", blurb: "c" },
        ],
      },
    ]);
    expect(info.get(14)).toEqual({ n: 14, name: "Veneration", blurb: "a" });
    expect(info.get(19)).toEqual({ n: 19, name: "Individuality", blurb: "b" });
  });

  it("has a fit for every view, as an SVG transform about the centre", () => {
    for (const key of Object.values(VIEW_MAP))
      expect(MAP_FIT[key]).toBeTruthy();
    expect(fitTransform({ sx: 1, sy: 1, tx: 0, ty: 0 })).toBe(
      "translate(375 362.5) scale(1 1) translate(-375 -362.5)"
    );
  });

  it("keeps the front and side maps on the skull (OPENBRAIN-147)", () => {
    // Measured against the engravings' alpha in the 750 × 725 frame: the
    // skull's top is at y 39 on the front view, its face ends at x 703 on
    // the side view. The maps' own extents (y 34 → 501 drawn at the old
    // front fit, x 78 → 714 at the old side fit) must land inside.
    const edge = (fit, v, axis) => {
      const c = axis === "x" ? 375 : 362.5;
      const s = axis === "x" ? fit.sx : fit.sy;
      const t = axis === "x" ? fit.tx : fit.ty;
      return c + t + (v - c) * s;
    };
    // Front map top edge, in the unfitted SVG: 34 was drawn at sy .954,
    // ty -8.5 → back-solve to the source edge, then apply the new fit.
    const frontTopSrc = (34 - 362.5 + 8.5) / 0.954 + 362.5;
    expect(edge(MAP_FIT.front, frontTopSrc, "y")).toBeGreaterThanOrEqual(39);
    const sideFrontSrc = (714 - 375 - 29.5) / 0.94 + 375;
    expect(edge(MAP_FIT.side, sideFrontSrc, "x")).toBeLessThanOrEqual(703);
    // …without sliding the back of the side map off the skull (x 46).
    const sideBackSrc = (78 - 375 - 29.5) / 0.94 + 375;
    expect(edge(MAP_FIT.side, sideBackSrc, "x")).toBeGreaterThanOrEqual(46);
  });
});
