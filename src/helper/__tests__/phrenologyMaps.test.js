import { describe, expect, it } from "vitest";
import { decodeId, parseRegionId } from "../phrenologyMaps";

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
});
