import { describe, it, expect } from "vitest";
import {
  FIGURE_LINE,
  MIN_RUN,
  START_LINE,
  cardState,
  sectionCardFigure,
} from "@/helper/sectionCard";

/*
 * When a section's card is in the pane (OPENBRAIN-174). A 900px screen: the
 * card comes in when the last section's text passes 675 (START_LINE) and
 * leaves when the section's first figure reaches 450 (FIGURE_LINE, where
 * the pane's own trigger starts).
 */

const SCREEN = 900;
// A section 320 below the last one's text (the gap), its first figure 400
// below its top, the whole thing `y` down the screen.
const at = (y, run = 400) => ({
  gapStart: y,
  top: y + 320,
  end: y + 320 + run,
});

describe("cardState", () => {
  it("is off until the last section's text reaches the start line", () => {
    expect(cardState(at(SCREEN * START_LINE + 1), SCREEN).on).toBe(false);
    expect(cardState(at(SCREEN + 400), SCREEN)).toEqual({
      on: false,
      progress: 0,
    });
  });

  it("comes in at the start line, at progress 0", () => {
    const state = cardState(at(SCREEN * START_LINE), SCREEN);
    expect(state.on).toBe(true);
    expect(state.progress).toBe(0);
  });

  it("stays through the gap and the heading", () => {
    // The heading is at mid-screen: still the card's.
    const state = cardState(at(SCREEN * FIGURE_LINE - 320), SCREEN);
    expect(state.on).toBe(true);
    expect(state.progress).toBeGreaterThan(0.4);
    expect(state.progress).toBeLessThan(1);
  });

  it("leaves when the first figure reaches the figure line", () => {
    const line = SCREEN * FIGURE_LINE;
    expect(cardState(at(line - 720 + 1), SCREEN).on).toBe(true);
    expect(cardState(at(line - 720), SCREEN)).toEqual({
      on: false,
      progress: 1,
    });
    expect(cardState(at(-5000), SCREEN).on).toBe(false);
  });

  it("runs its progress evenly from arrival to leaving", () => {
    const start = SCREEN * START_LINE;
    const leave = SCREEN * FIGURE_LINE - 720;
    const half = cardState(at((start + leave) / 2), SCREEN);
    expect(half.progress).toBeCloseTo(0.5, 5);
  });

  it("skips a section whose first figure follows its heading at once", () => {
    // A figure held to the section's top would leave the card only this.
    expect(cardState(at(400, MIN_RUN - 1), SCREEN).on).toBe(false);
    expect(cardState(at(400, MIN_RUN), SCREEN).on).toBe(true);
  });

  it("is off for anything it cannot measure", () => {
    expect(cardState(null, SCREEN).on).toBe(false);
    expect(cardState(at(400), 0).on).toBe(false);
    expect(cardState({ gapStart: NaN, top: 100, end: 900 }, SCREEN).on).toBe(
      false
    );
  });
});

describe("sectionCardFigure", () => {
  const record = { id: "image-one", imageUrl: "/skull.webp" };
  it("matches the actual first still by exact source in any chapter", () => {
    expect(sectionCardFigure({ src: "/skull.webp" }, record)).toBe(record);
    for (const filename of [
      "fig01-skull-cutout.webp",
      "fig01-skull-cutout-v2.webp",
    ]) {
      const skull = {
        ...record,
        imageUrl: `/publicAssets/images/foundations/${filename}`,
      };
      expect(
        sectionCardFigure(
          {
            src: "/publicAssets/images/foundations/sections/where-is-my-mind.webp",
          },
          skull
        )
      ).toBe(skull);
      expect(sectionCardFigure({ src: "/replacement.webp" }, skull)).toBeNull();
    }
  });
  // OPENBRAIN-86: the brain of H.M. The figure's picture names the cover as
  // its own washed copy, so the cover and the figure are one picture.
  it("matches a figure whose picture names the section's art as its wash", () => {
    const cover =
      "/publicAssets/images/foundations/sections/closing-words-v2.webp";
    const brain = {
      id: "animationFoundationsClosingHM",
      fill: true,
      images: [
        {
          src: "/publicAssets/images/foundations/hm-brain-v3.webp",
          wash: cover,
        },
      ],
    };
    expect(sectionCardFigure({ src: cover }, brain)).toBe(brain);
    // Another cover, or a picture with no wash of its own, is not it.
    expect(sectionCardFigure({ src: "/other-cover.webp" }, brain)).toBeNull();
    expect(
      sectionCardFigure(
        { src: cover },
        { ...brain, images: [{ src: brain.images[0].src }] }
      )
    ).toBeNull();
  });
  it("keeps the separate card when the first figure or its media changes", () => {
    expect(sectionCardFigure({ src: "/other.webp" }, record)).toBeNull();
    for (const extra of [
      { widgetId: "skull" },
      { fullscreen: true },
      { scroll: true },
      { switch: true },
      { images: [{ src: "/skull.webp", youtube: "g4-6A8u8QBc" }] },
      { images: ["/skull.webp", "/other.webp"] },
    ]) {
      expect(
        sectionCardFigure({ src: "/skull.webp" }, { ...record, ...extra })
      ).toBeNull();
    }
    expect(
      sectionCardFigure({ src: "/skull.webp", placeholder: true }, record)
    ).toBeNull();
  });
});
