import { describe, expect, it } from "vitest";
import { placeBoxes } from "@/composables/chapterTransform.mjs";
import { buildOutline, sectionLabelMap } from "@/composables/useChapterOutline";

// OPENBRAIN-70 A3, A4: boxes placed under their sections.
const sec = (id, orderIndex, extra = {}) => ({
  id,
  kind: "section",
  title: id,
  orderIndex,
  parentId: null,
  anchorParagraphId: null,
  paragraphs: [{ id: `${id}-p1` }, { id: `${id}-p2` }],
  ...extra,
});
const box = (id, orderIndex, parentId, anchorParagraphId = null) =>
  sec(id, orderIndex, { kind: "box", parentId, anchorParagraphId });

const chapter = () => [
  sec("s1", 1),
  sec("s2", 2),
  box("boxA", 3, "s2"), // Descartes, under section 2
  box("boxB", 4, null), // not placed yet
  box("boxG", 5, "s1", "s1-p1"), // Hippocrates, after s1's first paragraph
  box("boxH", 6, "s1"),
];

describe("placeBoxes", () => {
  it("moves placed boxes after their section, keeping unplaced ones", () => {
    const out = placeBoxes(chapter());
    expect(out.map((s) => s.id)).toEqual([
      "s1",
      "boxG",
      "boxH",
      "s2",
      "boxA",
      "boxB",
    ]);
  });

  it("anchors a box only to a paragraph of its own section", () => {
    const list = chapter();
    list[5].anchorParagraphId = "s2-p1"; // H points into another section
    const out = placeBoxes(list);
    expect(out.find((s) => s.id === "boxG").anchored).toBe(true);
    expect(out.find((s) => s.id === "boxH").anchored).toBe(false);
  });

  it("ignores a parent that is missing or itself a box", () => {
    const list = [sec("s1", 1), box("x", 2, "gone"), box("y", 3, "x")];
    expect(placeBoxes(list).map((s) => s.id)).toEqual(["s1", "x", "y"]);
  });
});

describe("contents with placed boxes", () => {
  it("lists placed boxes under their section and keeps authored letters", () => {
    const sections = placeBoxes(chapter());
    const outline = buildOutline({ sections });
    expect(outline.map((e) => e.id)).toEqual(["s1", "s2", "boxB"]);
    expect(outline[0].subsections.map((s) => s.id)).toEqual(["boxG", "boxH"]);
    expect(outline[1].subsections.map((s) => s.id)).toEqual(["boxA"]);
    const labels = sectionLabelMap(sections);
    expect([labels.boxA, labels.boxB, labels.boxG, labels.boxH]).toEqual([
      "A",
      "B",
      "C",
      "D",
    ]);
    expect([labels.s1, labels.s2]).toEqual(["1", "2"]);
  });
});
