import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  AREAS,
  SURFACE,
  areaById,
  areaHex,
  chapterLinks,
  rampHex,
  systemsWithAreas,
} from "../areas";
import { RAMPS } from "@/helper/chapterTheme";

/* The area ids stored in the model's scene extras (GLB JSON chunk). */
function modelAreaIds() {
  const glb = readFileSync(
    path.resolve(
      __dirname,
      "../../../../public/publicAssets/models/brain/brain-v1.glb"
    )
  );
  const jsonLength = glb.readUInt32LE(12);
  const json = JSON.parse(glb.subarray(20, 20 + jsonLength).toString("utf8"));
  return json.scenes[0].extras.areas;
}

describe("brain atlas areas", () => {
  it("describes exactly the areas the model is labelled with", () => {
    const ids = modelAreaIds();
    expect(ids[0]).toBe(""); // index 0 = unlabelled medial wall
    expect([...ids.slice(1)].sort()).toEqual(AREAS.map((a) => a.id).sort());
  });

  it("colours every area from a book ramp", () => {
    for (const area of AREAS) {
      expect(RAMPS).toContain(area.system);
      expect(areaHex(area)).toMatch(/^#[0-9A-F]{6}$/i);
    }
    expect(SURFACE.gyrus).toMatch(/^#[0-9A-F]{6}$/i);
    expect(SURFACE.sulcus).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it("groups areas by system in ramp order, leaving out empty systems", () => {
    const systems = systemsWithAreas();
    expect(systems.map((s) => s.ramp)).toEqual(
      RAMPS.filter((r) => AREAS.some((a) => a.system === r))
    );
    expect(systems.flatMap((s) => s.areas)).toHaveLength(AREAS.length);
    expect(systems[0].hex).toBe(rampHex(systems[0].ramp));
  });

  it("links published chapters from the module row and lists drafts as in preparation", () => {
    const area = areaById("prefrontal");
    const catalog = {
      "attention-and-working-memory": {
        slug: "attention-and-working-memory",
        order_index: 7,
        title: "Attention & Working Memory",
      },
    };
    const links = chapterLinks(area, (slug) => catalog[slug] || null);
    expect(links[0]).toEqual({
      slug: "attention-and-working-memory",
      title: "Attention & Working Memory",
      to: "/chapter/7/attention-and-working-memory",
    });
    expect(links[1]).toMatchObject({ slug: "stress", to: null });
    expect(chapterLinks(null, () => null)).toEqual([]);
  });
});
