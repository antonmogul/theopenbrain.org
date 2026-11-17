import { describe, it, expect } from "vitest";
import {
  authorCardsForModule,
  authorInitials,
  authorsForModule,
  AUTHOR_PROFILES,
  AUTHORS_BY_SLUG,
} from "@/helper/chapterAuthors";

// Stuart, 11 Nov (OPENBRAIN-197): a face and a link to the lab for each
// chapter author, with the four addresses he gave.
describe("authorCardsForModule", () => {
  it("gives each author the lab site Stuart listed, by name", () => {
    expect(AUTHOR_PROFILES["Stuart Trenholm"].url).toBe(
      "https://www.trenholmlab.com"
    );
    expect(AUTHOR_PROFILES["Naguib Mechawar"].url).toBe(
      "https://douglas.research.mcgill.ca/naguib-mechawar"
    );
    expect(AUTHOR_PROFILES["Arjun Krishnaswamy"].url).toBe(
      "https://www.swamylab.com/"
    );
    expect(AUTHOR_PROFILES["Erik Cook"].url).toBe(
      "https://www.mcgill.ca/physiology/directory/core-faculty/erik-cook"
    );
    const retina = authorCardsForModule({ slug: "the-retina" });
    expect(retina.map((a) => [a.name, a.url])).toEqual([
      ["Arjun Krishnaswamy", "https://www.swamylab.com/"],
      ["Stuart Trenholm", "https://www.trenholmlab.com"],
    ]);
    const attention = authorCardsForModule({
      slug: "attention-and-working-memory",
    });
    expect(attention.map((a) => a.name)).toEqual([
      "Arjun Krishnaswamy",
      "Erik Cook",
    ]);
  });

  it("carries the affiliation, the initials and a photo slot", () => {
    const [arjun] = authorCardsForModule({ slug: "the-retina" });
    expect(arjun).toEqual({
      name: "Arjun Krishnaswamy",
      affiliation:
        "Department of Physiology, McGill University, Montreal, Canada",
      url: "https://www.swamylab.com/",
      photo: "",
      initials: "AK",
    });
  });

  it("the author's own entry in modules.authors wins over the directory", () => {
    const [stuart] = authorCardsForModule({
      authors: [
        {
          name: "Stuart Trenholm",
          affiliation: "MNI",
          url: "https://example.org/lab",
          photo: "/publicAssets/images/authors/stuart-trenholm.webp",
        },
      ],
    });
    expect(stuart.url).toBe("https://example.org/lab");
    expect(stuart.photo).toBe(
      "/publicAssets/images/authors/stuart-trenholm.webp"
    );
  });

  it("only makes a link of a web address", () => {
    const cards = authorCardsForModule({
      authors: [
        { name: "A. Person", url: "javascript:alert(1)", photo: "//evil/x" },
        { name: "B. Person", url: "  https://b.example/lab  " },
        { name: "C. Person", url: 42 },
      ],
    });
    expect(cards.map((c) => c.url)).toEqual(["", "https://b.example/lab", ""]);
    expect(cards[0].photo).toBe("");
    expect(cards[0].affiliation).toBe("");
  });

  it("returns an empty list for chapters without authors", () => {
    expect(authorCardsForModule({ slug: "stress" })).toEqual([]);
    expect(authorCardsForModule(null)).toEqual([]);
  });
});

describe("authorInitials", () => {
  it("takes the first and last capitalised words", () => {
    expect(authorInitials("Stuart Trenholm")).toBe("ST");
    expect(authorInitials("Santiago Ramón y Cajal")).toBe("SC");
    expect(authorInitials("Élise de la Tour")).toBe("ÉT");
    expect(authorInitials("Plato")).toBe("P");
    expect(authorInitials("")).toBe("");
  });
});

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
