import { describe, expect, it } from "vitest";
import {
  chapterBackReferences,
  linkifyReference,
  referenceParts,
  referenceSearchText,
} from "../chapterReferences.js";
import fixture from "@/stories/historyFullReaderData.json";

// The full-width reference list (OPENBRAIN-179).

describe("referenceParts: a reference's text with its links taken out", () => {
  it("tells the authors and the title apart and turns the DOI into a link", () => {
    const parts = referenceParts({
      number: 4,
      authors: "Broca, M. P",
      title: "Cas singulier de trépanation chez les Incas",
      doi: "10.3406/bmsap.1867.4320",
      raw_text:
        "Broca, M. P. Cas singulier de trépanation chez les Incas. <em>Bulletins de la Société d’anthropologie de Paris</em> <strong>2</strong>, 403–408 (1867).",
    });
    expect(parts.html).toBe(
      '<span class="ref-authors">Broca, M. P.</span> <span class="ref-title">Cas singulier de trépanation chez les Incas</span>. <em>Bulletins de la Société d’anthropologie de Paris</em> <strong>2</strong>, 403–408 (1867).'
    );
    expect(parts.links).toEqual([
      {
        href: "https://doi.org/10.3406/bmsap.1867.4320",
        kind: "doi",
        label: "doi:10.3406/bmsap.1867.4320",
      },
    ]);
  });

  it("takes a bare address out of the sentence and names the site", () => {
    const parts = referenceParts({
      authors: "Weschler, L",
      title: "A Rare, Personal Look at Oliver Sacks’s Early Career",
      url: "https://www.vanityfair.com/culture/2015/04/oliver-sacks",
      raw_text:
        "Weschler, L. A Rare, Personal Look at Oliver Sacks’s Early Career. <em>Vanity Fair</em> https://www.vanityfair.com/culture/2015/04/oliver-sacks (2015).",
    });
    expect(parts.html).toContain("<em>Vanity Fair</em> (2015).");
    expect(parts.html).not.toContain("http");
    expect(parts.links).toEqual([
      {
        href: "https://www.vanityfair.com/culture/2015/04/oliver-sacks",
        kind: "url",
        label: "vanityfair.com",
      },
    ]);
  });

  it("leaves no stray punctuation where an address ended the sentence", () => {
    expect(
      referenceParts({
        raw_text:
          "Gross. A Hole in the Head. <em>MIT Press</em> https://mitpress.mit.edu/a-hole-in-the-head/.",
      }).html
    ).toBe("Gross. A Hole in the Head. <em>MIT Press</em>.");
    const chapter = referenceParts({
      doi: "10.1007/978-3-030-22212-3_3",
      raw_text:
        "González-Darder, J. M. Facts and Myths. (Springer, Cham, 2019). doi:10.1007/978-3-030-22212-3_3.",
    });
    expect(chapter.html).toBe(
      "González-Darder, J. M. Facts and Myths. (Springer, Cham, 2019)."
    );
    // The row's DOI and the one written in the text are one link.
    expect(chapter.links).toHaveLength(1);
  });

  it("lists the DOI before a web address, each once", () => {
    const { links } = referenceParts({
      doi: "10.1000/x",
      url: "https://example.org/paper",
      raw_text: "A. B. https://example.org/paper (2001).",
    });
    expect(links.map((l) => l.kind)).toEqual(["doi", "url"]);
    expect(links.map((l) => l.label)).toEqual(["doi:10.1000/x", "example.org"]);
  });

  it('reads "et al" in the authors as the text writes it', () => {
    expect(
      referenceParts({
        authors: "Gresky, J. et al",
        raw_text: "Gresky, J. <em>et al.</em> New cases of trepanations.",
      }).html
    ).toBe(
      '<span class="ref-authors">Gresky, J. <em>et al.</em></span> New cases of trepanations.'
    );
  });

  it("marks a book's title inside its italics", () => {
    expect(
      referenceParts({
        authors: "Finger, S",
        title: "Origins of Neuroscience",
        raw_text:
          "Finger, S. <em>Origins of Neuroscience</em>. (Oxford University Press, 2001).",
      }).html
    ).toContain(
      '<em><span class="ref-title">Origins of Neuroscience</span></em>'
    );
  });

  it("keeps the text whole when the row's fields are not in it", () => {
    const raw = "Hubel, D. H. Eye, brain and vision. (1988).";
    expect(
      referenceParts({ authors: "Someone else", title: "Nope", raw_text: raw })
        .html
    ).toBe(raw);
  });

  it("turns a chapter entry's address-only links into labels and keeps worded ones", () => {
    // The Retina's entries arrive already linkified ({ number, html }).
    const bare = referenceParts({
      number: 3,
      html: linkifyReference(
        "Masland, R. H. The fundamental plan of the retina. Nat. Neurosci. 4, 877--886 (2001). https://doi.org/10.1038/nn0901-877"
      ),
    });
    expect(bare.html).toBe(
      "Masland, R. H. The fundamental plan of the retina. Nat. Neurosci. 4, 877–886 (2001)."
    );
    expect(bare.links).toEqual([
      {
        href: "https://doi.org/10.1038/nn0901-877",
        kind: "doi",
        label: "doi:10.1038/nn0901-877",
      },
    ]);
    const worded = referenceParts({
      html: 'See <a href="https://webvision.med.utah.edu/">Webvision</a>.',
    });
    expect(worded.html).toContain(">Webvision</a>");
    expect(worded.links).toEqual([]);
  });

  it("never makes a link of an address that is not http(s)", () => {
    expect(
      referenceParts({ url: "javascript:alert(1)", raw_text: "A. B." }).links
    ).toEqual([]);
    expect(referenceParts(null)).toEqual({ html: "", links: [] });
  });

  it("holds for every reference of the published History chapter", () => {
    expect(fixture.references.length).toBeGreaterThan(100);
    for (const ref of fixture.references) {
      const { html, links } = referenceParts(ref);
      // No address left in the sentence, no punctuation left hanging.
      expect(html, `#${ref.number}`).not.toMatch(/https?:|doi:\s*10\./);
      expect(html, `#${ref.number}`).not.toMatch(/\s[.,;]|\(\)|\.\.$/);
      expect(html, `#${ref.number}`).toContain('class="ref-authors"');
      for (const link of links) expect(link.href).toMatch(/^https?:\/\//);
      if (ref.doi) expect(links[0].kind).toBe("doi");
    }
  });
});

describe("referenceSearchText: what the list's filter searches", () => {
  it("is the reference's words, its year and its links, lower case", () => {
    const text = referenceSearchText({
      authors: "Dröscher, A",
      year: 1998,
      doi: "10.1007/s004180050245",
      raw_text:
        "Dröscher, A. Camillo Golgi and the discovery of the Golgi apparatus. <em>Histochemistry</em> <strong>109</strong>, 425–430 (1998).",
    });
    expect(text).toContain("dröscher, a. camillo golgi");
    expect(text).toContain("histochemistry 109");
    expect(text).toContain("1998");
    expect(text).toContain("doi:10.1007/s004180050245");
    expect(text).not.toMatch(/<|>/);
  });
});

describe("chapterBackReferences: the chapter's list for its back matter", () => {
  const section = {
    id: "refs",
    slug: "references",
    title: "References",
    paragraphs: [
      {
        text: "<ol><li>Gross. <em>A Hole in the Head</em>.</li><li>Broca, P. (1867).</li></ol>",
      },
    ],
  };
  const chapter = { sections: [{ slug: "introduction" }, section] };

  it("is the References section with the table's rows", () => {
    const rows = [{ number: 1, raw_text: "Row one." }];
    expect(chapterBackReferences(chapter, rows)).toEqual({
      section,
      title: "References",
      entries: rows,
    });
  });

  it("is the section's own list, entry by entry, while the table is empty", () => {
    expect(chapterBackReferences(chapter).entries).toEqual([
      { number: 1, raw_text: "Gross. <em>A Hole in the Head</em>." },
      { number: 2, raw_text: "Broca, P. (1867)." },
    ]);
  });

  it("is the Retina's footnotes under the table's rows when there is no section", () => {
    const retina = {
      slug: "the-retina",
      sections: [],
      footNotes: { notes: [{ text: "First." }, { text: "Second." }] },
    };
    const back = chapterBackReferences(retina, [
      { number: 2, raw_text: "Second, from the table." },
    ]);
    expect(back.section).toBeNull();
    expect(back.title).toBe("References");
    expect(back.entries.map((e) => e.number)).toEqual([1, 2]);
    expect(back.entries[1].raw_text).toBe("Second, from the table.");
  });

  it("is null for a chapter with nothing to list", () => {
    expect(chapterBackReferences({ sections: [] })).toBeNull();
    expect(chapterBackReferences(null)).toBeNull();
    // A References section that is not a list stays where it is.
    expect(
      chapterBackReferences({
        sections: [
          { slug: "references", paragraphs: [{ text: "<p>None yet.</p>" }] },
        ],
      })
    ).toBeNull();
  });
});
