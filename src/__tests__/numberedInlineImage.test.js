// OPENBRAIN-79: an image block in the text may carry `figureNumber` and
// `title`. They survive an edit in the chapter editor, reach the reader as
// paragraph.imgNumber / imgTitle, and name the image in search and on the
// timeline the way a pane figure is named.
import { describe, expect, it } from "vitest";
import { blocksToDoc, docToBlocks } from "@/editor/blocks";
import { dashboardLockReason } from "@/editor/editability.mjs";
import { transformParagraph } from "@/composables/chapterTransform.mjs";
import { buildSearchIndex } from "@/helper/chapterSearch";
import { buildTimeline } from "@/helper/chapterTimeline";

const block = {
  type: "image",
  src: "waveLength",
  caption: "The normalized absorption spectra of rods and cones.",
  closed: true,
  figureNumber: 9,
  title: "Absorption spectra",
};
const chapterWith = (paragraph) => ({
  sections: [
    {
      id: "s1",
      title: "Photoreceptors",
      slug: "photoreceptors",
      paragraphs: [
        { id: "p1", text: "Photoreceptors detect light.", ...paragraph },
      ],
    },
  ],
});

describe("numbered images in the text", () => {
  it("keep their number and title through the chapter editor", () => {
    expect(docToBlocks(blocksToDoc([block]))).toEqual([block]);
  });

  it("lock the dashboard editor, whose converter would drop them", () => {
    expect(
      dashboardLockReason({
        blocks: [{ type: "image", src: "a.png", figureNumber: 9 }],
      })
    ).toBeTruthy();
    expect(
      dashboardLockReason({ blocks: [{ type: "image", src: "a.png" }] })
    ).toBeNull();
  });

  it("reach the reader as imgNumber and imgTitle", () => {
    const p = transformParagraph({ id: "p", content: { blocks: [block] } });
    expect(p.imgNumber).toBe(9);
    expect(p.imgTitle).toBe("Absorption spectra");
    const plain = transformParagraph({
      id: "p",
      content: {
        blocks: [{ type: "image", src: "a", figureNumber: null, title: "" }],
      },
    });
    expect(plain.imgNumber).toBeUndefined();
    expect(plain.imgTitle).toBeUndefined();
  });

  it("are found in search as Fig 09 by title, with or without a legend", () => {
    const numbered = { img: "waveLength", imgNumber: 9, imgTitle: block.title };
    for (const paragraph of [
      numbered,
      { ...numbered, imgCap: block.caption },
    ]) {
      const figures = buildSearchIndex(chapterWith(paragraph)).filter(
        (e) => e.kind === "figure"
      );
      expect(figures).toHaveLength(1);
      expect(figures[0]).toMatchObject({
        tag: "Fig 09",
        title: "Absorption spectra",
      });
    }
    const [unnumbered] = buildSearchIndex(
      chapterWith({ img: "waveLength", imgCap: block.caption })
    ).filter((e) => e.kind === "figure");
    expect(unnumbered).toMatchObject({ tag: "Fig", title: "" });
  });

  it("are named by their title on the timeline", () => {
    const marks = (paragraph) =>
      buildTimeline(chapterWith(paragraph))
        .items.flatMap((item) => item.marks || [])
        .filter((mark) => mark.type === "image");
    expect(
      marks({ img: "waveLength", imgCap: block.caption, imgTitle: block.title })
    ).toEqual([{ type: "image", title: "Absorption spectra" }]);
    expect(marks({ img: "waveLength", imgCap: "A caption" })).toEqual([
      { type: "image", title: "A caption" },
    ]);
  });
});
