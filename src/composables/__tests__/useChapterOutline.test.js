import { describe, it, expect } from "vitest";
import { buildOutline, sectionStats } from "@/composables/useChapterOutline";

/*
 * The opener's TOC (OPENBRAIN-32) is derived from the same transformed
 * chapter the reader renders, so these tests pin the contract that matters:
 * numbering matches the reader (intro 0, sections 1..n, boxes A..), and
 * anchors point at ids the reader actually emits.
 */

const text = {
  intro: [
    {
      id: "intro-id",
      title: "The Retina", // module title, what the old h1 printed
      sectionTitle: "Introduction",
      paragraphs: [{ text: "one two three" }],
    },
  ],
  sections: [
    {
      id: "s1",
      slug: "story-of-the-eye",
      kind: "section",
      title: "Story of the eye",
      paragraphs: [
        { text: "<p>word ".repeat(400) + "</p>", animation: { id: "a1" } },
        {
          subSection: [
            { id: "sub1", title: "Intromission", paragraphs: [] },
            { id: "sub2", title: "Extramission", paragraphs: [] },
          ],
        },
      ],
    },
    {
      id: "b1",
      slug: "box-descartes",
      kind: "box",
      title: "Descartes and dualism",
      paragraphs: [],
    },
    {
      id: "s2",
      slug: "photoreceptors",
      kind: "section",
      title: "Photoreceptors",
      paragraphs: [{ text: "short", img: "x.png" }],
    },
    {
      id: "b2",
      slug: "box-penfield",
      kind: "box",
      title: "Penfield",
      paragraphs: [],
    },
  ],
};

describe("buildOutline", () => {
  const outline = buildOutline(text);

  it("puts the intro first as 0 with the section's own title, not the module's", () => {
    expect(outline[0]).toMatchObject({
      kind: "intro",
      label: "0",
      title: "Introduction",
      anchor: "#intro-id",
    });
  });

  it("numbers sections from 1 and letters boxes from A, independently", () => {
    expect(outline.map((e) => [e.label, e.kind])).toEqual([
      ["0", "intro"],
      ["1", "section"],
      ["A", "box"],
      ["2", "section"],
      ["B", "box"],
    ]);
  });

  it("links every entry to the section id the reader renders", () => {
    expect(outline.map((e) => e.anchor)).toEqual([
      "#intro-id",
      "#s1",
      "#b1",
      "#s2",
      "#b2",
    ]);
  });

  it("collects subsection headers with the reader's slug anchors", () => {
    expect(outline[1].subsections).toEqual([
      { id: "sub1", title: "Intromission", anchor: "#intromission" },
      { id: "sub2", title: "Extramission", anchor: "#extramission" },
    ]);
    expect(outline[3].subsections).toEqual([]);
  });

  it("is empty-safe", () => {
    expect(buildOutline(null)).toEqual([]);
    expect(buildOutline({})).toEqual([]);
    expect(buildOutline({ sections: [null] })).toEqual([]);
  });
});

describe("sectionStats", () => {
  it("counts figures and estimates minutes at 200 wpm, minimum 1", () => {
    const s1 = sectionStats(text.sections[0]);
    expect(s1.figures).toBe(1);
    expect(s1.mins).toBe(2); // 400 words
    const s2 = sectionStats(text.sections[2]);
    expect(s2.figures).toBe(1); // img counts
    expect(s2.mins).toBe(1);
    expect(sectionStats(null)).toEqual({ figures: 0, mins: 1 });
  });
});
