import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  SECTION_ART_BY_SLUG,
  NO_SECTION_CARD,
  hasSectionCard,
  sectionArtFor,
  sectionArtForChapter,
} from "@/helper/sectionArt";

/*
 * Section art (OPENBRAIN-174) is data: which picture a section shows in the
 * opener's contents and on its card in the pane. These pin the lookups and
 * that every file the map names is in the repo, since a missing one would
 * only show as a blank half-screen in the opener.
 */

const HISTORY = "foundations-of-neuroscience";

describe("section art", () => {
  it("names files that exist, each with a description", () => {
    for (const [chapter, sections] of Object.entries(SECTION_ART_BY_SLUG)) {
      for (const [slug, art] of Object.entries(sections)) {
        const file = path.join(process.cwd(), "public", art.src);
        expect(existsSync(file), `${chapter}/${slug}: ${art.src}`).toBe(true);
        expect(art.alt.length, `${chapter}/${slug} alt`).toBeGreaterThan(10);
      }
    }
  });

  it("covers History's intro, five sections and references", () => {
    expect(Object.keys(sectionArtForChapter(HISTORY))).toEqual([
      "introduction",
      "where-is-my-mind",
      "do-different-parts",
      "basic-functional-unit",
      "how-neurons-communicate",
      "closing-words",
      "references",
    ]);
  });

  it("has nothing for a chapter without art", () => {
    expect(sectionArtForChapter("the-retina")).toBeNull();
    expect(sectionArtForChapter(undefined)).toBeNull();
    expect(sectionArtFor("the-retina", { slug: "introduction" })).toBeNull();
  });

  it("looks a section up by its slug", () => {
    expect(sectionArtFor(HISTORY, { slug: "closing-words" }).src).toMatch(
      /\/sections\/closing-words\.webp$/
    );
    expect(sectionArtFor(HISTORY, { slug: "box-penfield" })).toBeNull();
    expect(sectionArtFor(HISTORY, null)).toBeNull();
  });

  it("prefers a section's own art, once sections carry one", () => {
    const own = { src: " /media/own.webp ", alt: "Its own" };
    expect(sectionArtFor(HISTORY, { slug: "closing-words", art: own })).toEqual(
      { src: "/media/own.webp", alt: "Its own" }
    );
    // An empty one does not hide the map's.
    expect(
      sectionArtFor(HISTORY, { slug: "closing-words", art: { src: "" } }).src
    ).toMatch(/closing-words/);
  });

  // Stuart, 14 Nov: "when you hover over '6. References' - change image
  // that is displayed to the Brenda Milner photo" (OPENBRAIN-193).
  it("shows Brenda Milner for History's references, cropped to her face", () => {
    const art = sectionArtFor(HISTORY, { slug: "references" });
    expect(art.src).toMatch(/\/sections\/references-milner\.webp$/);
    expect(art.alt).toContain("Brenda Milner");
    expect(art.position).toBe("50% 67%");
    // The others are centred: they say nothing.
    expect(sectionArtFor(HISTORY, { slug: "closing-words" }).position).toBe(
      undefined
    );
  });

  it("carries a section's own position, when it has one", () => {
    const own = {
      src: "/media/own.webp",
      alt: "Its own",
      position: " 50% 20% ",
    };
    expect(sectionArtFor(HISTORY, { slug: "x", art: own })).toEqual({
      src: "/media/own.webp",
      alt: "Its own",
      position: "50% 20%",
    });
    expect(
      sectionArtFor(HISTORY, { slug: "x", art: { ...own, position: 3 } })
    ).toEqual({ src: "/media/own.webp", alt: "Its own" });
  });

  it("gives cards to the numbered sections only", () => {
    const card = (slug, kind = "section") =>
      hasSectionCard(HISTORY, { slug, kind });
    expect(card("where-is-my-mind")).toBe(true);
    expect(card("closing-words")).toBe(true);
    // Has art for the contents, but is back matter, or the intro the opener
    // runs straight into.
    for (const slug of ["introduction", "references"]) {
      expect(NO_SECTION_CARD).toContain(slug);
      expect(card(slug)).toBe(false);
    }
    expect(card("box-penfield", "box")).toBe(false);
    expect(hasSectionCard("the-retina", { slug: "story-of-the-eye" })).toBe(
      false
    );
  });
});

it("preserves the strict temporary-art flag without labelling real art", () => {
  const own = { src: "/placeholder.webp", alt: "Temporary", placeholder: true };
  expect(sectionArtFor("any", { art: own }).placeholder).toBe(true);
  expect(
    sectionArtFor("any", { art: { ...own, placeholder: "true" } }).placeholder
  ).toBeUndefined();
  expect(
    sectionArtFor("any", { art: { ...own, placeholder: false } }).placeholder
  ).toBeUndefined();
});

it("keeps known original sources for a stored designer export, never for replacement art", () => {
  const slug = "where-is-my-mind";
  const original = sectionArtFor(HISTORY, { slug });
  const stored = sectionArtFor(HISTORY, { slug, art: { src: original.src } });
  expect(stored.figureSources).toContain(
    "/publicAssets/images/foundations/fig01-skull-cutout-v2.webp"
  );
  expect(
    sectionArtFor(HISTORY, { slug, art: { src: "/new-picture.webp" } })
      .figureSources
  ).toBeUndefined();
});
