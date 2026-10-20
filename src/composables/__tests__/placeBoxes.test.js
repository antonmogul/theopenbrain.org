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

// OPENBRAIN-142 (Stuart, 7 Oct: "reletter them in order (e.g., Descartes is
// A, but it comes in middle of chapter)"): a parent's boxes come out in the
// order the reader meets them, and the letters follow that order.
describe("reading order", () => {
  it("orders a section's boxes by their anchor paragraph, unanchored last", () => {
    const list = [
      sec("s1", 1),
      box("late", 2, "s1", "s1-p2"), // authored first, anchored later
      box("early", 3, "s1", "s1-p1"),
      box("loose", 4, "s1"), // no anchor: after the anchored ones
      box("loose2", 5, "s1", "elsewhere-p9"), // anchor not in s1: same
    ];
    const out = placeBoxes(list);
    expect(out.map((s) => s.id)).toEqual([
      "s1",
      "early",
      "late",
      "loose",
      "loose2",
    ]);
    expect(out.map((s) => s.anchored)).toEqual([
      undefined,
      true,
      true,
      false,
      false,
    ]);
  });

  it("letters boxes in reading order and numbers sections in authored order", () => {
    // History as seeded: Descartes was authored first (order_index 6) but
    // sits in section 2; the Hippocrates box is anchored in section 1.
    const list = [
      sec("s1", 1),
      sec("s2", 2),
      box("descartes", 6, "s2", "s2-p1"),
      box("rete", 7, "s1", "s1-p2"),
      box("penfield", 10, "s2", "s2-p2"),
      box("hippocrates", 12, "s1", "s1-p1"),
    ];
    const labels = sectionLabelMap(placeBoxes(list));
    expect(labels).toEqual({
      s1: "1",
      s2: "2",
      hippocrates: "A",
      rete: "B",
      descartes: "C",
      penfield: "D",
    });
  });

  it("keeps section numbers by orderIndex when boxes sit between them", () => {
    // placeBoxes puts boxes after their parent; numbering must skip them.
    const labels = sectionLabelMap([
      sec("s1", 1),
      box("b", 5, "s1", "s1-p1"),
      sec("s2", 2),
    ]);
    expect(labels).toEqual({ s1: "1", b: "A", s2: "2" });
  });
});

describe("contents with placed boxes", () => {
  it("lists placed boxes under their section, lettered in reading order", () => {
    const sections = placeBoxes(chapter());
    const outline = buildOutline({ sections });
    expect(outline.map((e) => e.id)).toEqual(["s1", "s2", "boxB"]);
    expect(outline[0].subsections.map((s) => s.id)).toEqual(["boxG", "boxH"]);
    expect(outline[1].subsections.map((s) => s.id)).toEqual(["boxA"]);
    const labels = sectionLabelMap(sections);
    expect([labels.boxG, labels.boxH, labels.boxA, labels.boxB]).toEqual([
      "A",
      "B",
      "C",
      "D",
    ]);
    expect([labels.s1, labels.s2]).toEqual(["1", "2"]);
  });
});
