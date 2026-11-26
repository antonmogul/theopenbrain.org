/*
 * boxTitleCard (OPENBRAIN-77): which picture a sideways box opens on, the
 * words it quotes, and what the card shows through its scroll.
 */
import { describe, expect, it } from "vitest";
import {
  CARD_COPY_OUT,
  CARD_EXCERPT_MAX,
  CARD_HOLD,
  cardExcerpt,
  cardExcerptOf,
  cardFrame,
  cardLeadFigureId,
  cardLeadIsPlate,
  cardLeadPicture,
  cardRect,
} from "../boxTitleCard";
import { railLayoutOf } from "../exploreRail";

const box = (paragraphs) => railLayoutOf({ kind: "box", paragraphs });

describe("cardLeadPicture", () => {
  it("is the first part's Explore picture", () => {
    const layout = box([
      {
        id: "p1",
        explore: {
          title: "Epilepsy",
          image: { src: "/img/bust.jpg", alt: "A bust" },
        },
      },
      { id: "p2", explore: { title: "Humours" } },
    ]);
    expect(cardLeadPicture(layout)).toEqual({
      src: "/img/bust.jpg",
      alt: "A bust",
    });
    expect(cardLeadFigureId(layout)).toBe("");
  });

  it("is else the first image of the first part's first figure", () => {
    const layout = box([{ id: "p1", animation: { id: "figG" } }, { id: "p2" }]);
    expect(cardLeadFigureId(layout)).toBe("figG");
    expect(cardLeadPicture(layout, null)).toBeNull(); // not resolved yet
    expect(
      cardLeadPicture(layout, {
        images: [{ src: "/img/g.jpg", alt: "A drawing" }, "/img/g2.jpg"],
      })
    ).toEqual({ src: "/img/g.jpg", alt: "A drawing" });
  });

  it("is nothing for a video's poster, a widget, or a part with no picture", () => {
    const withFigure = box([{ id: "p1", animation: { id: "v" } }]);
    expect(
      cardLeadPicture(withFigure, {
        images: [{ src: "/poster.jpg", youtube: "WgkAR-vrJpM" }],
      })
    ).toBeNull();
    expect(
      cardLeadPicture(withFigure, { widgetId: "sdt", images: ["/a.jpg"] })
    ).toBeNull();
    // The picture comes later in the box: today's opening stays.
    const later = box([{ id: "p1" }, { id: "p2", animation: { id: "f" } }]);
    expect(cardLeadFigureId(later)).toBe("");
    expect(cardLeadPicture(later, { images: ["/a.jpg"] })).toBeNull();
    expect(cardLeadPicture(null)).toBeNull();
  });
});

describe("cardExcerpt", () => {
  it("takes one sentence that can stand alone", () => {
    const long =
      "January 26, 1874. A 30-year-old woman, Mary Rafferty, is admitted to the Good Samaritan Hospital in Cincinnati, where she will stay for weeks. She presents with an ulcer.";
    expect(cardExcerpt(`<p>${long}</p>`)).toBe(
      "January 26, 1874. A 30-year-old woman, Mary Rafferty, is admitted to the Good Samaritan Hospital in Cincinnati, where she will stay for weeks."
    );
  });

  it("does not stop at an abbreviation or an initial", () => {
    expect(
      cardExcerpt(
        "The first psychosurgeries were performed between 1888 and 1891 by Dr. Gottlieb Burckhardt, a Swiss psychiatrist working in Neuchâtel. He was a localizationalist."
      )
    ).toBe(
      "The first psychosurgeries were performed between 1888 and 1891 by Dr. Gottlieb Burckhardt, a Swiss psychiatrist working in Neuchâtel."
    );
    expect(cardExcerpt("Patient H. M. could not form memories. More.")).toBe(
      "Patient H. M. could not form memories. More."
    );
  });

  it("drops markup and citations, and cuts a long sentence at a word", () => {
    const text = `<em>Wilder</em> Penfield<sup class="citation-ref">12</sup> ${"was a neurosurgeon who mapped the cortex and ".repeat(8)}more.`;
    const out = cardExcerpt(text);
    expect(out.startsWith("Wilder Penfield was a neurosurgeon")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(CARD_EXCERPT_MAX);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/\s…$/);
  });

  it("reads the first paragraph of the first part", () => {
    const layout = box([
      {
        id: "p1",
        text: "<p>The opening sentence of the box, long enough to stand on its own as the quotation on the card, we hope.</p>",
      },
      { id: "p2", text: "<p>Later.</p>" },
    ]);
    expect(cardExcerptOf(layout)).toMatch(/^The opening sentence/);
    expect(cardExcerptOf(null)).toBe("");
    expect(cardExcerpt("")).toBe("");
  });
});

describe("cardFrame", () => {
  it("holds, then lets the words go, then lands the picture", () => {
    expect(cardFrame(0)).toEqual({
      copy: 0,
      move: 0,
      scrim: 1,
      ground: 1,
      done: false,
    });
    const held = cardFrame(CARD_HOLD);
    expect(held.copy).toBe(1);
    expect(held.move).toBe(0);
    const wordsGone = cardFrame(CARD_COPY_OUT);
    expect(wordsGone.copy).toBeCloseTo(0);
    expect(wordsGone.move).toBeGreaterThan(0);
    expect(wordsGone.move).toBeLessThan(1);
    // The track stays hidden until the picture is well on its way.
    expect(wordsGone.ground).toBeGreaterThan(0.5);
    expect(cardFrame(1)).toEqual({
      copy: 0,
      move: 1,
      scrim: 0,
      ground: 0,
      done: true,
    });
  });

  it("is monotonic and clamped", () => {
    let last = cardFrame(-1);
    expect(last.move).toBe(0);
    for (let p = 0; p <= 1.2; p += 0.05) {
      const f = cardFrame(p);
      expect(f.move).toBeGreaterThanOrEqual(last.move);
      if (p > CARD_HOLD) expect(f.copy).toBeLessThanOrEqual(last.copy);
      expect(f.ground).toBeLessThanOrEqual(last.ground);
      last = f;
    }
    expect(cardFrame(5).done).toBe(true);
  });
});

describe("cardRect", () => {
  it("goes from the whole box to the picture's place", () => {
    const from = { left: 0, top: 0, width: 1000, height: 800 };
    const to = { left: 60, top: 200, width: 300, height: 400 };
    expect(cardRect(from, to, 0)).toEqual(from);
    expect(cardRect(from, to, 1)).toEqual(to);
    expect(cardRect(from, to, 0.5)).toEqual({
      left: 30,
      top: 100,
      width: 650,
      height: 600,
    });
  });

  describe("cardLeadIsPlate", () => {
    it("says whether a still card can take the lead picture off the track", () => {
      const explore = box([
        { id: "p1", explore: { title: "E", image: { src: "/img/b.jpg" } } },
      ]);
      expect(cardLeadIsPlate(explore)).toBe(true);
      const figure = box([{ id: "p1", animation: { id: "f" } }]);
      expect(cardLeadIsPlate(figure, { images: ["/a.jpg", "/b.jpg"] })).toBe(
        true
      );
      // A larger set is the figure shell's: it cannot give one image up.
      expect(
        cardLeadIsPlate(figure, {
          images: ["/1.jpg", "/2.jpg", "/3.jpg", "/4.jpg"],
        })
      ).toBe(false);
      expect(cardLeadIsPlate(figure, null)).toBe(false);
      expect(cardLeadIsPlate(null)).toBe(false);
    });
  });
});
