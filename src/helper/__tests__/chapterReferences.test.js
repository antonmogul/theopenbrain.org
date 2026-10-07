import { describe, expect, it } from "vitest";
import {
  linkifyReference,
  referenceDisplay,
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

  it("keeps a URL's balanced brackets and stops at an entity", () => {
    const html = linkifyReference(
      "See https://en.wikipedia.org/wiki/Retina_(anatomy)&nbsp;today."
    );
    expect(html).toContain(
      'href="https://en.wikipedia.org/wiki/Retina_(anatomy)"'
    );
    expect(html).not.toContain('&nbsp;"');
  });

  it("leaves a reference that already has links alone", () => {
    const html = 'See <a href="https://a.b">here</a>.';
    expect(linkifyReference(html)).toBe(html);
  });
});

describe("referenceDisplay (OPENBRAIN-92)", () => {
  it("shows the authors' own text with a link to the DOI", () => {
    const d = referenceDisplay({
      raw_text:
        "Masland, R. H. The neuronal organization of the retina. <em>Neuron</em> <strong>76</strong>, 266–280 (2012).",
      doi: "10.1016/j.neuron.2012.10.002",
    });
    expect(d.html).toContain("<em>Neuron</em>");
    expect(d.href).toBe("https://doi.org/10.1016/j.neuron.2012.10.002");
    expect(d.hrefLabel).toBe("doi:10.1016/j.neuron.2012.10.002");
  });

  it("uses the URL when there is no DOI, and nothing unsafe", () => {
    expect(referenceDisplay({ raw_text: "x", url: "https://a.b/c" }).href).toBe(
      "https://a.b/c"
    );
    expect(
      referenceDisplay({ raw_text: "x", url: "javascript:alert(1)" }).href
    ).toBeNull();
  });

  it("falls back to the structured fields, escaped", () => {
    const d = referenceDisplay({
      authors: "Hubel, D. H.",
      year: 1962,
      title: "Receptive fields <b>",
      journal: "J Physiol",
    });
    expect(d.html).toBe(
      "Hubel, D. H. (1962) Receptive fields &lt;b&gt; <em>J Physiol</em>"
    );
    expect(d.href).toBeNull();
  });

  it("links the source once: not again when the text already links it", () => {
    const d = referenceDisplay({
      raw_text:
        "Schwartz, G. W. Texture sensitivity. in <em>Retinal Computation</em> 126--142 (2021). doi:10.1016/B978-0-12-819896-4.00008-1.",
      doi: "10.1016/B978-0-12-819896-4.00008-1",
    });
    expect(d.html).toContain("126–142");
    expect(d.html).toContain(
      'href="https://doi.org/10.1016/B978-0-12-819896-4.00008-1"'
    );
    expect(d.href).toBeNull();
  });
});
