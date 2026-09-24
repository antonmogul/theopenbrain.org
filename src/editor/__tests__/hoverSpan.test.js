import { describe, expect, it } from "vitest";
import { blocksToDoc, docToBlocks } from "@/editor/blocks";

// OPENBRAIN-70 D1: a hover link keeps its picture and note through an edit,
// and older id-based hover links are untouched.
describe("hover links", () => {
  it("round-trip with their picture and note", () => {
    const blocks = [
      {
        type: "text",
        content:
          'The <span class="hoverImg" data-hover-src="/img/eye.jpg" data-hover-text="The eye.">retina</span> sees.',
      },
    ];
    expect(docToBlocks(blocksToDoc(blocks))).toEqual(blocks);
  });

  it("keep older id-based links as they were", () => {
    const blocks = [
      {
        type: "text",
        content: 'by <span id="alcmeon" class="hoverImg">Alcmeon</span>.',
      },
    ];
    expect(docToBlocks(blocksToDoc(blocks))).toEqual(blocks);
  });
});
