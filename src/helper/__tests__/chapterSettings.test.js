import { describe, expect, it } from "vitest";
import {
  coverForModule,
  reactiveCoverForModule,
  HISTORY_HEAD,
} from "../chapterCover";
import { creditsForModule } from "../chapterCredits";
import { authorsForModule, authorCardsForModule } from "../chapterAuthors";
import { sectionArtFor, sectionArtForChapter } from "../sectionArt";
import { boxIsRail } from "../exploreRail";
import { boxTreatmentFor } from "../breakoutTreatment";
import { rampForModule } from "../chapterTheme";
import { transformModuleToChapterFormat } from "../../composables/chapterTransform.mjs";
import { buildOutline } from "../../composables/useChapterOutline";

const slug = "foundations-of-neuroscience";
const box = {
  slug: "box-descartes",
  kind: "box",
  paragraphs: [{ id: "p", text: "Text" }],
};

describe("database chapter settings (OPENBRAIN-63)", () => {
  it("prefers the unified cover over the old column and slug map", () => {
    expect(
      coverForModule({
        slug,
        cover: { image: " /own.webp " },
        cover_image_url: "/old.webp",
      })
    ).toBe("/own.webp");
    expect(
      coverForModule({
        slug,
        cover: { image: 5 },
        cover_image_url: "/old.webp",
      })
    ).toBe("/old.webp");
  });
  it("prefers unified reactive covers, including head artwork", () => {
    const reactive = { lottie: "/own.json", axis: "y" };
    expect(
      reactiveCoverForModule({
        slug,
        cover: { reactive },
        reactive_cover: { lottie: "/old.json" },
      }).lottie
    ).toBe("/own.json");
    expect(
      reactiveCoverForModule({
        slug: "other",
        cover: { reactive: HISTORY_HEAD },
      }).kind
    ).toBe("head");
    expect(
      reactiveCoverForModule({ slug, cover: { reactive: null } })
    ).toBeNull();
  });
  it.each([null, [], "bad JSON", 3, { image: {}, reactive: { kind: "head" } }])(
    "falls back from malformed covers: %j",
    (cover) => {
      expect(coverForModule({ slug, cover })).toBe(coverForModule({ slug }));
      expect(reactiveCoverForModule({ slug, cover })).toEqual(
        reactiveCoverForModule({ slug })
      );
    }
  );
  it("prefers stored credits and allows deliberately empty credits", () => {
    const credits = {
      funding: { text: "Own funding", url: "javascript:bad" },
      acknowledgements: ["Thanks"],
    };
    expect(creditsForModule({ slug, credits })).toEqual({
      funding: { text: "Own funding", url: "", logo: null },
      acknowledgements: ["Thanks"],
    });
    expect(
      creditsForModule({
        slug,
        credits: { funding: null, acknowledgements: [] },
      })
    ).toEqual({ funding: null, acknowledgements: [] });
  });
  it.each([null, [], "bad JSON", 3, { funding: [], acknowledgements: [3] }])(
    "falls back from malformed credits: %j",
    (credits) => {
      expect(creditsForModule({ slug, credits })).toEqual(
        creditsForModule({ slug })
      );
    }
  );
  it("takes author profiles from the row before the fallback directory", () => {
    const authors = [
      {
        name: "Stuart Trenholm",
        url: "https://example.org",
        photo: "/own.webp",
      },
    ];
    expect(authorsForModule({ slug: "the-retina", authors })).toEqual(authors);
    expect(authorCardsForModule({ authors })[0]).toMatchObject({
      url: "https://example.org",
      photo: "/own.webp",
    });
    for (const bad of [null, {}, "bad JSON", [{ name: 3 }]])
      expect(authorsForModule({ slug: "the-retina", authors: bad })).toEqual(
        authorsForModule({ slug: "the-retina" })
      );
  });
  it("lets database sections enable and disable rails, with malformed values falling back", () => {
    expect(boxIsRail({ ...box, rail: false }, slug)).toBe(false);
    expect(boxIsRail({ ...box, rail: true }, "other")).toBe(true);
    for (const rail of [null, "false", {}, []])
      expect(boxIsRail({ ...box, rail }, slug)).toBe(true);
    expect(boxIsRail({ ...box, rail: true, paragraphs: [] }, slug)).toBe(false);
  });
  it("prefers stored treatments and ramps, falling back for malformed values", () => {
    expect(boxTreatmentFor({ ...box, treatment: "pale" }, slug)).toBe("pale");
    expect(rampForModule({ slug, ramp: "perc" })).toBe("perc");
    for (const bad of [null, {}, [], "wrong"]) {
      expect(boxTreatmentFor({ ...box, treatment: bad }, slug)).toBe("dark");
      expect(rampForModule({ slug, ramp: bad })).toBe("fund");
    }
  });
  it("carries art and rail through the DB transform and outline, for any chapter", () => {
    const art = { src: "/own.webp", position: "25% 50%" };
    const text = transformModuleToChapterFormat({
      slug: "other",
      sections: [
        { id: "intro", slug: "introduction", order_index: 0, art },
        { id: "s", slug: "section", order_index: 1, art },
        {
          id: "box",
          ...box,
          order_index: 2,
          rail: false,
          box_treatment: "dark",
          box_card: { image: art, quote: "Own words" },
        },
      ],
    });
    const outline = buildOutline(text);
    expect(outline[0].art).toEqual(art);
    expect(outline[1].art).toEqual(art);
    expect(text.sections[1]).toMatchObject({
      rail: false,
      treatment: "dark",
      box_card: { image: art, quote: "Own words" },
    });
    expect(sectionArtForChapter("other", outline)).toHaveProperty("section");
    expect(sectionArtFor("other", outline[1])).toEqual({ ...art, alt: "" });
  });
  it.each([null, [], "bad JSON", { src: 3 }])(
    "falls back from malformed section art: %j",
    (art) => {
      expect(sectionArtFor(slug, { slug: "closing-words", art })).toEqual(
        sectionArtFor(slug, { slug: "closing-words" })
      );
    }
  );
});
