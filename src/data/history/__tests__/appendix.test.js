import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import cases from "../penfieldAppendix.json";
import faculties from "../phrenologyAppendix.json";
import anchors from "../phrenologyLabelAnchors.json";
import proof from "./fixtures/appendixSourceHashes.json";
import { CASE_FILES } from "@/mocks/caseFiles";
import { PHRENOLOGY_FACULTIES, PHRENOLOGY_VIEWS } from "@/mocks/phrenology";
import { regionShapes, facultyInfoByNumber } from "@/helper/phrenologyMaps";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const sourceCase = (id) => cases.cases.find((c) => c.id === id);
const faculty = (n) => faculties.faculties.find((f) => f.n === n);

describe("History appendix source fidelity", () => {
  it("pins every case number and preserves all 82 separate stimulation events", () => {
    expect(cases.source.sha256).toBe(proof.sourceSha256);
    expect(Object.fromEntries(CASE_FILES.map((c) => [c.id, c.caseNo]))).toEqual(
      { rw: 3, abra: 4, yn: 12, gp: 24, sbe: 29, nc: 31, ge: 32 }
    );
    const events = cases.cases.flatMap((c) =>
      c.points.flatMap((p) => p.events)
    );
    expect(events).toHaveLength(82);
    expect(new Set(events.map((e) => e.id)).size).toBe(82);
    expect(cases.cases.flatMap((c) => c.points)).toHaveLength(47);
    for (const event of events)
      expect(hash(event.text), `source block ${event.sourceBlock}`).toBe(
        proof.paragraphSha256[event.sourceBlock]
      );
    expect(
      sourceCase("rw").points.find((p) => p.id === "24").events[0].text
    ).toBe('24. "Yes, the robbers, they are coming after me." ');
    const christmas = sourceCase("abra").points.find(
      (p) => p.id === "15"
    ).events;
    expect(christmas.map((e) => e.sourceBlock)).toEqual([994, 996, 1010]);
    expect(christmas[1].text).toContain('"Yes, it is White Christmas."');
    expect(
      sourceCase("rw")
        .points.flatMap((p) => p.events)
        .some((e) => /White Christmas/.test(e.text))
    ).toBe(false);
    expect(sourceCase("ge").points.map((p) => p.id)).toEqual([
      "1b",
      "1c",
      "2b",
      "3",
      "4",
      "16",
    ]);
  });

  it("pins every quote and image to its own patient or faculty, not just the global source", () => {
    for (const expected of proof.caseAssignments) {
      const actual = cases.cases.find((c) => c.caseNo === expected.caseNo);
      expect(actual.sourceBlock).toBe(expected.headingBlock);
      expect(actual.image.sha256).toBe(expected.imageSha256);
      expect(
        Object.fromEntries(
          actual.points.map((p) => [p.id, p.events.map((e) => e.sourceBlock)])
        )
      ).toEqual(expected.pointBlocks);
    }
    for (const expected of proof.facultyAssignments) {
      const actual = faculty(expected.number);
      expect(actual.sourceBlock).toBe(expected.headingBlock);
      expect(actual.quotes.map((q) => q.sourceBlock)).toEqual(
        expected.quoteBlocks
      );
      expect(actual.images.map((image) => image.sha256)).toEqual(
        expected.imageSha256
      );
    }
  });

  it("keeps the original images byte-identical and every case correctly paired", () => {
    for (const [filename, expected] of Object.entries(proof.imageSha256)) {
      expect(
        hash(
          readFileSync(
            path.resolve(
              "public/publicAssets/images/foundations/appendix",
              filename
            )
          )
        ),
        filename
      ).toBe(expected);
    }
    expect(cases.cases.map((c) => c.image.src.split("/").at(-1))).toEqual([
      "image79.png",
      "image80.png",
      "image81.png",
      "image82.png",
      "image83.png",
      "image84.png",
      "image85.png",
    ]);
    for (const record of CASE_FILES)
      expect(record.illustration).toBe(record.image.src);
  });

  it("provides only the 45 verified printed-label targets and no invented mappings", () => {
    const points = cases.cases.flatMap((c) => c.points);
    expect(points.flatMap((p) => p.hotspots)).toHaveLength(45);
    expect(sourceCase("gp").points.find((p) => p.id === "16").hotspots).toEqual(
      []
    );
    expect(
      sourceCase("gp").points.find((p) => p.id === "16").mapNote
    ).toContain("17d");
    expect(sourceCase("ge").points.find((p) => p.id === "4").hotspots).toEqual(
      []
    );
    for (const c of cases.cases)
      for (const p of c.points)
        for (const spot of p.hotspots) {
          expect(spot.x).toBeCloseTo(
            (100 * spot.sourcePixel.x) / c.image.width,
            3
          );
          expect(spot.y).toBeCloseTo(
            (100 * spot.sourcePixel.y) / c.image.height,
            3
          );
          expect(spot.x).toBeGreaterThan(0);
          expect(spot.x).toBeLessThan(100);
          expect(spot.y).toBeGreaterThan(0);
          expect(spot.y).toBeLessThan(100);
        }
  });

  it("preserves all 33 original faculty identities and every quote paragraph", () => {
    expect(faculties.source.sha256).toBe(proof.sourceSha256);
    expect(PHRENOLOGY_FACULTIES.map((f) => f.n)).toEqual(
      Array.from({ length: 33 }, (_, i) => i + 1)
    );
    for (const f of PHRENOLOGY_FACULTIES)
      for (const q of f.quotes)
        expect(hash(q.text), `faculty ${f.n}, block ${q.sourceBlock}`).toBe(
          proof.paragraphSha256[q.sourceBlock]
        );
    expect(
      [8, 10, 16, 19, 22, 23, 26, 30, 31].map((n) => faculty(n).name)
    ).toEqual([
      "Covetiveness",
      "Self-love",
      "Ideality",
      "Individuality",
      "Weight",
      "Colour",
      "Time",
      "Comparison",
      "Causality",
    ]);
    expect(faculty(22).mapped).toBe(false);
    expect(faculty(22).images).toEqual([]);
    expect(faculty(22).quotes[0].sourceBlock).toBe(726);
    expect(faculties.faculties.flatMap((f) => f.images)).toHaveLength(35);
    expect(faculty(6).editorialNotes[0]).toContain("combativeness");
    expect(faculty(11).editorialNotes[0]).toContain("self-love");
  });

  it("covers every real SVG region with its source faculty and a non-stale number anchor", () => {
    const info = facultyInfoByNumber(PHRENOLOGY_VIEWS);
    const numbers = new Set();
    for (const view of ["front", "side", "back"]) {
      const svg = readFileSync(
        path.resolve(
          `public/publicAssets/images/phrenology/regions-${view}.svg`
        ),
        "utf8"
      );
      expect(hash(svg)).toBe(anchors[view].sourceSvgSha256);
      const shapes = regionShapes(svg);
      expect(Object.keys(anchors[view].anchors).sort()).toEqual(
        shapes.map((s) => s.key).sort()
      );
      for (const shape of shapes) {
        numbers.add(shape.n);
        expect(info.get(shape.n)).toEqual(faculty(shape.n));
        expect(anchors[view].anchors[shape.key].x).toBeGreaterThanOrEqual(0);
        expect(anchors[view].anchors[shape.key].y).toBeGreaterThanOrEqual(0);
      }
    }
    expect([...numbers].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 33 }, (_, i) => i + 1).filter((n) => n !== 22)
    );
  });
});
