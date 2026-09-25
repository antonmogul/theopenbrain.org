import { describe, expect, it } from "vitest";
import {
  linkifyReference,
  referenceFromChapter,
} from "../chapterReferences.js";

describe("referenceFromChapter (OPENBRAIN-90)", () => {
  it("finds a Retina reference among its footnotes", () => {
    const chapter = {
      footNotes: {
        notes: [
          { text: "Hubel, D. H. Eye, brain and vision." },
          { text: "Second." },
        ],
      },
      sections: [],
    };
    expect(referenceFromChapter(chapter, 2)).toEqual({
      number: 2,
      html: "Second.",
    });
  });

  it("finds a History reference in its References list", () => {
    const chapter = {
      footNotes: { notes: [] },
      sections: [
        { slug: "introduction", paragraphs: [{ text: "<p>x</p>" }] },
        {
          slug: "references",
          paragraphs: [
            {
              text: "<ol><li>Gross. <em>A Hole in the Head</em>.</li><li>Broca, P. (1867).</li></ol>",
            },
          ],
        },
      ],
    };
    expect(referenceFromChapter(chapter, 1).html).toBe(
      "Gross. <em>A Hole in the Head</em>."
    );
    expect(referenceFromChapter(chapter, 2).html).toBe("Broca, P. (1867).");
    expect(referenceFromChapter(chapter, 3)).toBeNull();
  });

  it("returns null when there is nothing to find", () => {
    expect(referenceFromChapter(null, 1)).toBeNull();
    expect(referenceFromChapter({ sections: [] }, 0)).toBeNull();
  });
});

describe("linkifyReference", () => {
  it("links bare URLs and DOIs to their source", () => {
    const html = linkifyReference(
      "Sacks. <em>Vanity Fair</em> https://www.vanityfair.com/x (2015). doi:10.1038/nn.4112."
    );
    expect(html).toContain('<a href="https://www.vanityfair.com/x"');
    expect(html).toContain('<a href="https://doi.org/10.1038/nn.4112"');
    expect(html).toContain("(2015)");
  });

  it("leaves a reference that already has links alone", () => {
    const html = 'See <a href="https://a.b">here</a>.';
    expect(linkifyReference(html)).toBe(html);
  });
});
