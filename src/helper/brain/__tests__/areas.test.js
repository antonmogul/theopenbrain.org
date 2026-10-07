import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  AREAS,
  CHAPTER_PARTS,
  SURFACE,
  areaById,
  areaHex,
  bookChapters,
  chapterForArea,
  rampHex,
  unclaimedAreas,
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

const HEX = /^#[0-9A-F]{6}$/i;

describe("brain atlas areas", () => {
  it("describes exactly the areas the model is labelled with", () => {
    const ids = modelAreaIds();
    expect(ids[0]).toBe(""); // index 0 = unlabelled medial wall
    expect([...ids.slice(1)].sort()).toEqual(AREAS.map((a) => a.id).sort());
  });

  it("puts every area in a book subject and has surface colours", () => {
    for (const area of AREAS) expect(RAMPS).toContain(area.system);
    expect(SURFACE.gyrus).toMatch(HEX);
    expect(SURFACE.sulcus).toMatch(HEX);
  });
});

describe("chapters as parts of the brain", () => {
  it("gives every chapter real areas, and no area to two chapters", () => {
    const owned = CHAPTER_PARTS.flatMap((c) => c.areas);
    for (const id of owned) expect(areaById(id)).not.toBeNull();
    expect(new Set(owned).size).toBe(owned.length);
    for (const c of CHAPTER_PARTS) {
      expect(c.areas.length).toBeGreaterThan(0);
      expect(RAMPS).toContain(c.ramp);
      expect(c.why).toBeTruthy();
    }
  });

  it("takes title, ramp, number and route from the catalog row when it has one", () => {
    const catalog = [
      {
        slug: "the-retina",
        order_index: 2,
        title: "The Retina (catalog)",
        ramp: "perc",
      },
      {
        slug: "foundations-of-neuroscience",
        order_index: 1,
        title: "Foundations",
      },
    ];
    const chapters = bookChapters(catalog);
    expect(chapters.map((c) => c.slug)).toEqual([
      "foundations-of-neuroscience",
      "the-retina",
      "attention-and-working-memory",
      "stress",
    ]);
    expect(chapters[1]).toMatchObject({
      title: "The Retina (catalog)",
      number: 2,
      to: "/chapter/2/the-retina",
    });
    // Not in the public catalog: a draft, no number, no route.
    expect(chapters[3]).toMatchObject({
      slug: "stress",
      title: "Understanding Stress",
      number: null,
      to: null,
      ramp: "deve",
    });
  });

  it("finds an area's chapter, and the areas no chapter owns", () => {
    const chapters = bookChapters([]);
    expect(chapterForArea(chapters, "parietal")?.slug).toBe(
      "attention-and-working-memory"
    );
    expect(chapterForArea(chapters, "motor")).toBeNull();
    const unclaimed = unclaimedAreas(chapters).map((a) => a.id);
    expect(unclaimed).toContain("motor");
    expect(unclaimed).not.toContain("occipital");
    expect(
      unclaimed.length + CHAPTER_PARTS.flatMap((c) => c.areas).length
    ).toBe(AREAS.length);
  });

  it("colours an area by its chapter's ramp, or by its subject when unclaimed", () => {
    const chapters = bookChapters([]);
    expect(areaHex("occipital", chapters)).toBe(rampHex("perc"));
    expect(areaHex("prefrontal", chapters)).toBe(rampHex("lear"));
    expect(areaHex("motor", chapters)).toBe(rampHex("move"));
    expect(areaHex("nope", chapters)).toBeNull();
    for (const area of AREAS) expect(areaHex(area.id, chapters)).toMatch(HEX);
  });
});
