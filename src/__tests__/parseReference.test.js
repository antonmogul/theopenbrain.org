import { describe, expect, it } from "vitest";
import { parseReference } from "../../scripts/references/parseReference.mjs";

// The chapters' Nature-style references (OPENBRAIN-92).
describe("parseReference", () => {
  it("reads a journal article", () => {
    const r = parseReference(
      "Masland, R. H. The neuronal organization of the retina. <em>Neuron</em> <strong>76</strong>, 266--80 (2012)."
    );
    expect(r).toMatchObject({
      authors: "Masland, R. H",
      title: "The neuronal organization of the retina",
      journal: "Neuron",
      volume: "76",
      pages: "266–80",
      year: 2012,
      pub_type: "article",
    });
  });

  it("keeps several authors, '&' and 'et al.' in the author list", () => {
    expect(
      parseReference(
        "Reese, B. E. & Galli-Resta, L. The role of tangential dispersion in retinal mosaic formation. <em>Prog Retin Eye Res</em> <strong>21</strong>, 153--168 (2002)."
      ).authors
    ).toBe("Reese, B. E. & Galli-Resta, L");
    expect(
      parseReference(
        "Gauthier, J. L. et al. Receptive Fields in Primate Retina. <em>PLOS Biology</em> <strong>7</strong>, e1000063 (2009)."
      ).authors
    ).toBe("Gauthier, J. L. et al");
    expect(
      parseReference(
        "Crivellato, E. & Ribatti, D. Soul, mind, brain: Greek philosophy. <em>Brain Research Bulletin</em> <strong>71</strong>, 327–336 (2007)."
      ).title
    ).toBe("Soul, mind, brain: Greek philosophy");
  });

  it("reads a book and a book chapter", () => {
    expect(
      parseReference(
        "Finger, S. <em>Origins of neuroscience</em>. (Oxford Univ. Press, 2001)."
      )
    ).toMatchObject({
      authors: "Finger, S",
      title: "Origins of neuroscience",
      year: 2001,
      pub_type: "book",
    });
    const ch = parseReference(
      "González-Darder, J. M. Facts and Myths of Primitive Trepanations. in <em>Trepanation, Trephining and Craniotomy</em> (ed. González-Darder, J. M.) 19–32 (Springer, 2019). doi:10.1007/978-3-030-22212-3_3."
    );
    expect(ch).toMatchObject({
      pub_type: "chapter",
      title: "Facts and Myths of Primitive Trepanations",
      journal: "Trepanation, Trephining and Craniotomy",
      doi: "10.1007/978-3-030-22212-3_3",
    });
  });

  it("keeps a web page's URL", () => {
    const r = parseReference(
      "Weschler, L. A Rare, Personal Look at Oliver Sacks’s Early Career. <em>Vanity Fair</em> https://www.vanityfair.com/culture/2015/04/oliver-sacks (2015)."
    );
    expect(r).toMatchObject({
      authors: "Weschler, L",
      title: "A Rare, Personal Look at Oliver Sacks’s Early Career",
      url: "https://www.vanityfair.com/culture/2015/04/oliver-sacks",
      year: 2015,
    });
  });
});
