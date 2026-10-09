/*
 * figureFor carries a figure's authored hold (OPENBRAIN-131): the chapter
 * editor's "Stays", stored as content.animationFlags.hold, reaches the
 * reader's figure object so the templates can bind data-figure-hold.
 */
import { describe, expect, it } from "vitest";
import {
  figureFor,
  transformParagraph,
  transformSectionParagraphs,
} from "../chapterTransform.mjs";

const row = (flags, extra = {}) => ({
  id: "p1",
  animation_id: "a-uuid",
  animation_key: "animationAttentionV2Fig1",
  animation_trigger: "auto",
  content: {
    blocks: [{ type: "text", content: "Figure 1." }],
    ...(flags ? { animationFlags: flags } : {}),
  },
  ...extra,
});

describe("figureFor: the figure's hold", () => {
  it.each([0, 0.5, 1, 2, "next"])("carries hold %j", (hold) => {
    expect(figureFor(row({ hold })).hold).toBe(hold);
  });

  it("keeps an authored 0 (with its paragraph), which is not Automatic", () => {
    const figure = figureFor(row({ hold: 0 }));
    expect(figure).toHaveProperty("hold", 0);
  });

  it("leaves Automatic out: no flags, no hold, or a null hold", () => {
    for (const flags of [null, {}, { hold: null }, { transition: true }])
      expect(figureFor(row(flags))).not.toHaveProperty("hold");
  });

  // A hand-edited row: the editor reads these as Automatic, so the reader
  // must too. An array would otherwise reach data-figure-hold as "1".
  it.each([[[1]], [["next"]], [[0.5]], [7], [-1], ["forever"], [true], [{}]])(
    "leaves a malformed hold (%j) out, as Automatic",
    (hold) => {
      expect(figureFor(row({ hold }))).not.toHaveProperty("hold");
    }
  );

  it("stores what the editor would: a numeric string as its number", () => {
    expect(figureFor(row({ hold: "2" })).hold).toBe(2);
    expect(figureFor(row({ hold: "0" })).hold).toBe(0);
  });

  it("keeps the other flags beside it", () => {
    const figure = figureFor(row({ hold: 1, transition: true, start: true }));
    expect(figure).toMatchObject({
      id: "animationAttentionV2Fig1",
      name: "AttentionV2Fig1",
      transition: true,
      start: true,
      hold: 1,
    });
  });

  it("reaches paragraphs and subsection headers through the transform", () => {
    expect(transformParagraph(row({ hold: 2 })).animation.hold).toBe(2);
    const [wrapper] = transformSectionParagraphs([
      {
        ...row({ hold: "next" }),
        id: "h1",
        order_index: 0,
        is_subsection_header: true,
        subsection_level: 1,
        content_text: "A subsection",
      },
      {
        ...row({ hold: 0 }),
        id: "s1",
        order_index: 1,
        subsection_level: 1,
        animation_key: "animationSubFig",
      },
    ]);
    const [subsection] = wrapper.subSection;
    expect(subsection.animation.hold).toBe("next");
    expect(subsection.paragraphs[0].animation.hold).toBe(0);
  });
});
