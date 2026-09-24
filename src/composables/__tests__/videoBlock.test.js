import { describe, expect, it } from "vitest";
import { transformParagraph } from "@/composables/chapterTransform.mjs";
import { blocksToDoc, docToBlocks } from "@/editor/blocks";

// OPENBRAIN-70 D2: a { type: "video" } block reaches the reader and
// survives an edit unchanged.
const video = {
  type: "video",
  provider: "youtube",
  youtubeId: "g4-6A8u8QBc",
  url: "https://youtu.be/g4-6A8u8QBc?t=90",
  title: "A history of neuroscience",
  start: 90,
};

describe("video blocks", () => {
  it("become paragraph.video for VideoEmbed", () => {
    const p = transformParagraph({
      id: "p1",
      content: { blocks: [{ type: "text", content: "Watch:" }, video] },
    });
    expect(p.video).toEqual({
      youtubeId: "g4-6A8u8QBc",
      title: "A history of neuroscience",
      start: 90,
    });
    expect(p.text).toContain("Watch:");
  });

  it("round-trip through the editor losslessly", () => {
    const blocks = [{ type: "text", content: "Watch:" }, video];
    expect(docToBlocks(blocksToDoc(blocks))).toEqual(blocks);
  });
});
