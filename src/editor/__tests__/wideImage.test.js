import { describe, expect, it } from "vitest";
import { blocksToDoc, docToBlocks } from "@/editor/blocks";
import { transformParagraph } from "@/composables/chapterTransform.mjs";

// OPENBRAIN-72: a full-width image keeps its flag through an edit and
// reaches the reader as paragraph.imgWide.
const wide = {
  type: "image",
  src: "/img/fig4.jpg",
  alt: "Papyrus",
  caption: "Case 20",
  wide: true,
};

describe("full-width images", () => {
  it("round-trip with the wide flag", () => {
    expect(docToBlocks(blocksToDoc([wide]))).toEqual([wide]);
    const narrow = { ...wide };
    delete narrow.wide;
    expect(docToBlocks(blocksToDoc([narrow]))).toEqual([narrow]);
  });
  it("mark the paragraph for FullBleed", () => {
    expect(
      transformParagraph({ id: "p", content: { blocks: [wide] } }).imgWide
    ).toBe(true);
    const plain = transformParagraph({
      id: "p",
      content: { blocks: [{ type: "image", src: "/a.jpg" }] },
    });
    expect(plain.imgWide).toBeUndefined();
  });
});
