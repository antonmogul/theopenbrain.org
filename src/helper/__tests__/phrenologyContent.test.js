import { describe, expect, it } from "vitest";
import appendix from "@/data/history/phrenologyAppendix.json";
import { presentFaculty } from "../phrenologyContent";

describe("phrenology display repairs", () => {
  it.each([
    [12, 0, [583, 584], 2],
    [24, 1, [788, 789, 790], 3],
  ])(
    "joins only the requested paragraph for organ %i",
    (n, index, blocks, count) => {
      const original = appendix.faculties.find((f) => f.n === n);
      const saved = JSON.stringify(original);
      const display = presentFaculty(original);
      expect(display.quotes).toHaveLength(count);
      expect(display.quotes[index].sourceBlocks).toEqual(blocks);
      expect(display.quotes[index].text).toBe(
        original.quotes
          .filter((q) => blocks.includes(q.sourceBlock))
          .map((q) => q.text)
          .join(" ")
      );
      expect(display.quotes.flatMap((q) => q.sourceBlocks)).toEqual(
        original.quotes.map((q) => q.sourceBlock)
      );
      expect(display.quotes.map((q) => q.text).join(" ")).toBe(
        original.quotes.map((q) => q.text).join(" ")
      );
      expect(JSON.stringify(original)).toBe(saved);
      expect(display.images).toBe(original.images);
    }
  );

  it("hides the two requested editorial notes without erasing source evidence", () => {
    for (const n of [6, 11]) {
      const original = appendix.faculties.find((f) => f.n === n);
      expect(presentFaculty(original).editorialNotes).toEqual([]);
      expect(original.editorialNotes).toHaveLength(1);
      expect(presentFaculty(original).quotes.map((q) => q.text)).toEqual(
        original.quotes.map((q) => q.text)
      );
    }
  });

  it("uses the exact Weight note and retains its unmapped status", () => {
    const original = appendix.faculties.find((f) => f.n === 22);
    expect(presentFaculty(original).editorialNotes).toEqual([
      "Region not labelled by Spurzheim in an image plate nor on the manuscript's frontispiece. No skull position is assigned here.",
    ]);
    expect(presentFaculty(original).mapped).toBe(false);
    expect(presentFaculty(original).images).toEqual([]);
    expect(original.editorialNotes[0]).toContain("The manuscript states");
  });
});
