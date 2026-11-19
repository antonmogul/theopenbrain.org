import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { CREDITS_BY_SLUG, creditsForModule } from "../chapterCredits";

describe("creditsForModule (OPENBRAIN-200)", () => {
  it("gives History The Neuro's funding line, logo and link", () => {
    const { funding } = creditsForModule({
      slug: "foundations-of-neuroscience",
    });
    expect(funding.text).toBe(
      "This chapter was funded by The Montreal Neurological Institute (The Neuro)."
    );
    expect(funding.url).toBe("https://www.mcgill.ca/neuro/");
    expect(funding.logo.src).toBe(
      "/publicAssets/images/funders/the-neuro.webp"
    );
    expect(existsSync(`public${funding.logo.src}`)).toBe(true);
    expect(funding.logo.alt).toMatch(/Montreal Neurological Institute/);
  });

  it("gives History Stuart's acknowledgements, word for word", () => {
    expect(
      creditsForModule({ slug: "foundations-of-neuroscience" }).acknowledgements
    ).toEqual([
      "Web development by Mogul (Anton Morrison). Graphic design by Studio Malpeso (Sonia, Maura, Karen and Naz). We thank Dr. Joseph Rochford for peer review. ST acknowledges funding from the Canada Research Chairs program.",
    ]);
  });

  it("gives a chapter without credits nothing", () => {
    expect(creditsForModule({ slug: "a-new-chapter" })).toEqual({
      funding: null,
      acknowledgements: [],
    });
    expect(creditsForModule(null)).toEqual({
      funding: null,
      acknowledgements: [],
    });
  });

  it("gives the Retina its requested funder and a bundled logo", () => {
    const { funding } = creditsForModule({ slug: "the-retina" });
    expect(funding.text).toBe(
      "This chapter was funded by the Vision Science Research Network."
    );
    expect(funding.url).toBe("https://visionnetwork.ca/");
    expect(funding.logo.alt).toBe("Vision Science Research Network");
    expect(existsSync(`public${funding.logo.src}`)).toBe(true);
  });

  it("prefers the module row's own credits, and keeps only safe links", () => {
    const credits = creditsForModule({
      slug: "foundations-of-neuroscience",
      funding: {
        text: " Funded by X. ",
        url: "javascript:alert(1)",
        logo: { src: "//evil.example/x.png", alt: "X" },
      },
      acknowledgements: "Thanks to Y.",
    });
    expect(credits.funding).toEqual({
      text: "Funded by X.",
      url: "",
      logo: null,
    });
    expect(credits.acknowledgements).toEqual(["Thanks to Y."]);
  });

  it("is frozen chapter data", () => {
    expect(Object.isFrozen(CREDITS_BY_SLUG)).toBe(true);
  });
});
