import { describe, it, expect } from "vitest";
import { authorsForModule, AUTHORS_BY_SLUG } from "@/helper/chapterAuthors";

describe("authorsForModule", () => {
  it("prefers a well-formed authors column", () => {
    const authors = [{ name: "A. Person", affiliation: "Somewhere" }];
    expect(authorsForModule({ slug: "the-retina", authors })).toBe(authors);
  });

  it("falls back to the slug map when the column is absent or malformed", () => {
    expect(authorsForModule({ slug: "the-retina" })).toBe(
      AUTHORS_BY_SLUG["the-retina"]
    );
    expect(authorsForModule({ slug: "the-retina", authors: null })).toBe(
      AUTHORS_BY_SLUG["the-retina"]
    );
    expect(authorsForModule({ slug: "the-retina", authors: [] })).toBe(
      AUTHORS_BY_SLUG["the-retina"]
    );
    expect(authorsForModule({ slug: "the-retina", authors: [{}] })).toBe(
      AUTHORS_BY_SLUG["the-retina"]
    );
  });

  it("returns an empty list for chapters without authors", () => {
    expect(authorsForModule({ slug: "foundations-of-neuroscience" })).toEqual(
      []
    );
    expect(authorsForModule(null)).toEqual([]);
  });
});
