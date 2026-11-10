import { describe, expect, it } from "vitest";
import { transformParagraph } from "@/composables/chapterTransform.mjs";
import { blocksToDoc, docToBlocks } from "@/editor/blocks";
import { fullScreenOf } from "@/widgets/placements";

// OPENBRAIN-168: a widget block says itself that it is one screen of the
// chapter, so the setting lives in the database with the block and no
// longer depends on a code placement of the same id.
const block = {
  type: "widget",
  widgetId: "upload:history-penfield-binder",
  kind: "inline",
  title: "Find out what it was like to be Dr. Wilder Penfield",
  placementId: "foundations-case-cabinet",
  fullScreen: true,
};

describe("a widget block's fullScreen", () => {
  it("reaches the reader's paragraph", () => {
    const p = transformParagraph({ id: "p1", content: { blocks: [block] } });
    expect(p.widget.fullScreen).toBe(true);
    // No code placements at all: the block's own flag is enough.
    expect(fullScreenOf(p.widget, [])).toBe(true);
  });

  it("is left out when the block doesn't say, so the placement's still applies", () => {
    const rest = { ...block };
    delete rest.fullScreen;
    const p = transformParagraph({ id: "p1", content: { blocks: [rest] } });
    expect(p.widget).not.toHaveProperty("fullScreen");
    expect(
      fullScreenOf(p.widget, [
        { id: "foundations-case-cabinet", fullScreen: true },
      ])
    ).toBe(true);
  });

  it("survives an edit in the block editor", () => {
    expect(docToBlocks(blocksToDoc([block]))).toEqual([block]);
  });
});
