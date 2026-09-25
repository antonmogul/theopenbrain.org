import { describe, expect, it } from "vitest";
import { bookParts, outlineSections } from "../useBookContents.js";

// The book's contents: five subject parts, chapters in order, each with its
// outline sections (OPENBRAIN-104).
describe("bookParts", () => {
  const modules = [
    {
      id: "r",
      order_index: 2,
      slug: "the-retina",
      title: "The Retina",
      ramp: "perc",
    },
    {
      id: "h",
      order_index: 1,
      slug: "foundations-of-neuroscience",
      title: "Foundations",
      ramp: "fund",
    },
  ];
  const sections = [
    {
      id: "1",
      module_id: "r",
      title: "The Retina",
      slug: "intro",
      order_index: 0,
    },
    {
      id: "2",
      module_id: "r",
      title: "Photoreceptors",
      slug: "photoreceptors",
      order_index: 2,
    },
    {
      id: "3",
      module_id: "r",
      title: "Story of the eye",
      slug: "story",
      order_index: 1,
    },
    {
      id: "4",
      module_id: "r",
      title: "Box",
      slug: "box-blind-spot",
      order_index: 3,
    },
    {
      id: "5",
      module_id: "r",
      title: "References",
      slug: "references",
      order_index: 9,
    },
    {
      id: "6",
      module_id: "r",
      title: "Sub",
      slug: "sub",
      order_index: 4,
      parent_section_id: "2",
    },
  ];

  it("has the five parts in the book's order, empty ones included", () => {
    const parts = bookParts(modules, sections);
    expect(parts.map((p) => p.ramp)).toEqual([
      "fund",
      "perc",
      "move",
      "lear",
      "deve",
    ]);
    expect(parts[0].chapters.map((c) => c.module.id)).toEqual(["h"]);
    expect(parts[2].chapters).toEqual([]);
  });

  it("lists a chapter's outline: in order, no boxes, back matter or repeated title", () => {
    expect(
      outlineSections(sections, "r", "The Retina").map((s) => s.title)
    ).toEqual(["Story of the eye", "Photoreceptors"]);
  });
});
