/*
 * content.explore (OPENBRAIN-142): a paragraph folded behind an "Explore
 * more" card. exploreFor normalises what the row carries; transformParagraph
 * puts the result on the paragraph beside its figure, so a card's text,
 * figure and images open together.
 */
import { describe, expect, it } from "vitest";
import { exploreFor, transformParagraph } from "../chapterTransform.mjs";

const full = {
  title: " Humoral theory ",
  prompt: "Explore more about humoral theory",
  image: { src: "/publicAssets/images/foundations/x.jpg", alt: "A woodcut." },
  legend: "Woodcut, 1574. ",
};

describe("exploreFor", () => {
  it("keeps title, prompt, image and legend, trimmed", () => {
    expect(exploreFor({ explore: full })).toEqual({
      title: "Humoral theory",
      prompt: "Explore more about humoral theory",
      image: {
        src: "/publicAssets/images/foundations/x.jpg",
        alt: "A woodcut.",
      },
      legend: "Woodcut, 1574.",
    });
  });

  it("writes the prompt from the title when none is given (case kept: names)", () => {
    expect(exploreFor({ explore: { title: "Hippocrates’ view" } })).toEqual({
      title: "Hippocrates’ view",
      prompt: "Explore more about Hippocrates’ view",
    });
  });

  it("drops an image without a src and a blank legend", () => {
    expect(
      exploreFor({ explore: { title: "T", image: { alt: "x" }, legend: " " } })
    ).toEqual({ title: "T", prompt: "Explore more about T" });
  });

  it.each([undefined, null, "yes", [], {}, { title: "" }, { title: 3 }])(
    "is null for %j",
    (explore) => {
      expect(exploreFor({ explore })).toBeNull();
      expect(exploreFor(undefined)).toBeNull();
    }
  );
});

describe("transformParagraph with content.explore", () => {
  const row = (explore) => ({
    id: "p1",
    animation_id: "a-uuid",
    animation_key: "animationFoundationsFigK",
    content: {
      blocks: [{ type: "text", content: "In ancient Greece…" }],
      animationFlags: { hold: 1 },
      ...(explore !== undefined ? { explore } : {}),
    },
  });

  it("carries the card beside the paragraph's figure", () => {
    const para = transformParagraph(row(full));
    expect(para.explore).toEqual(exploreFor({ explore: full }));
    expect(para.animation).toMatchObject({
      id: "animationFoundationsFigK",
      hold: 1,
    });
    expect(para.text).toBe("In ancient Greece…");
  });

  it("leaves a plain paragraph without the key", () => {
    expect("explore" in transformParagraph(row(undefined))).toBe(false);
    expect("explore" in transformParagraph(row({ title: "" }))).toBe(false);
  });
});
