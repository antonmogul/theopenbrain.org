import { describe, it, expect } from "vitest";
import {
  coverForModule,
  COVER_BY_SLUG,
  DEFAULT_COVER,
  normalizeReactiveCover,
  reactiveCoverForModule,
} from "@/helper/chapterCover";

describe("coverForModule", () => {
  it("prefers the module's own cover column when set", () => {
    expect(
      coverForModule({ slug: "the-retina", cover_image_url: "/x/cover.jpg" })
    ).toBe("/x/cover.jpg");
  });

  it("falls back to the slug map when the column is absent, null or blank", () => {
    expect(coverForModule({ slug: "the-retina" })).toBe(
      COVER_BY_SLUG["the-retina"]
    );
    expect(coverForModule({ slug: "the-retina", cover_image_url: null })).toBe(
      COVER_BY_SLUG["the-retina"]
    );
    expect(coverForModule({ slug: "the-retina", cover_image_url: "  " })).toBe(
      COVER_BY_SLUG["the-retina"]
    );
    expect(coverForModule({ slug: "attention-and-working-memory" })).toBe(
      COVER_BY_SLUG["attention-and-working-memory"]
    );
  });

  it("uses the neutral default for unknown or missing modules", () => {
    expect(coverForModule({ slug: "a-future-chapter" })).toBe(DEFAULT_COVER);
    expect(coverForModule(null)).toBe(DEFAULT_COVER);
    expect(coverForModule(undefined)).toBe(DEFAULT_COVER);
  });

  it("gives History the Matisse reader until a cover is set (OPENBRAIN-67)", () => {
    expect(coverForModule({ slug: "foundations-of-neuroscience" })).toBe(
      "/publicAssets/images/attention-matisse-reader.jpg"
    );
    expect(
      coverForModule({
        slug: "foundations-of-neuroscience",
        cover_image_url: "https://x/cover.jpg",
      })
    ).toBe("https://x/cover.jpg");
  });
});

describe("reactiveCoverForModule (OPENBRAIN-146)", () => {
  const EYE = {
    lottie: "/publicAssets/animations/covers/matisse-eyes.json",
    axis: "x",
    reverse: false,
    fit: "slice",
    idle: 14,
  };

  it("gives Retina and History the eye Lottie, scrubbed on x, defaults filled", () => {
    expect(reactiveCoverForModule({ slug: "the-retina" })).toEqual(EYE);
    expect(
      reactiveCoverForModule({ slug: "foundations-of-neuroscience" })
    ).toEqual(EYE);
  });

  it("has none for other chapters or a missing module", () => {
    expect(reactiveCoverForModule({ slug: "stress" })).toBeNull();
    expect(
      reactiveCoverForModule({ slug: "attention-and-working-memory" })
    ).toBeNull();
    expect(reactiveCoverForModule(null)).toBeNull();
  });

  it("lets a module's own reactive_cover record win over the slug map", () => {
    expect(
      reactiveCoverForModule({
        slug: "the-retina",
        reactive_cover: {
          lottie: " https://x/cover.json ",
          axis: "y",
          reverse: true,
          fit: "slice",
          idle: 0,
        },
      })
    ).toEqual({
      lottie: "https://x/cover.json",
      axis: "y",
      reverse: true,
      fit: "slice",
      idle: 0,
    });
  });

  it("ignores a record without a Lottie and normalises odd values", () => {
    expect(normalizeReactiveCover({ axis: "y" })).toBeNull();
    expect(normalizeReactiveCover("eye.json")).toBeNull();
    expect(
      reactiveCoverForModule({
        slug: "the-retina",
        reactive_cover: { lottie: " " },
      })
    ).toEqual(EYE);
    expect(
      normalizeReactiveCover({
        lottie: "/a.json",
        idle: "nope",
        axis: "z",
        reverse: "yes",
      })
    ).toEqual({ ...EYE, lottie: "/a.json", fit: "meet" });
  });
});
