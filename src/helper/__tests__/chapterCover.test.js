import { describe, it, expect } from "vitest";
import {
  coverForModule,
  COVER_BY_SLUG,
  DEFAULT_COVER,
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
