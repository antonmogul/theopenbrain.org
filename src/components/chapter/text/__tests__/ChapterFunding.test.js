import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ChapterFunding from "../ChapterFunding.vue";
import { creditsForModule } from "@/helper/chapterCredits";

/*
 * Maura, 25 Nov (OPENBRAIN-91): "add the logo without a background, make
 * the banner light gray instead of purple, remove the purple vertical line
 * on the left, and place the logo on the left with the text on the right,
 * so it follows the same structure as the names".
 */
const HISTORY = creditsForModule({ slug: "foundations-of-neuroscience" });
const source = readFileSync(
  resolve(__dirname, "../ChapterFunding.vue"),
  "utf8"
);
const authors = readFileSync(
  resolve(__dirname, "../ChapterAuthors.vue"),
  "utf8"
);
const rule = (css, selector) => {
  const at = css.indexOf(`\n${selector} {`);
  return at < 0 ? "" : css.slice(at, css.indexOf("\n}", at));
};

describe("ChapterFunding", () => {
  it("is one row, the funder's logo first and the line after it", () => {
    const w = mount(ChapterFunding, { props: { funding: HISTORY.funding } });
    const row = w.get('[data-testid="chapter-funding"]');
    expect([...row.element.children].map((el) => el.className)).toEqual([
      "chapter-funding__logo",
      "chapter-funding__text",
    ]);
    expect(row.classes()).toContain("chapter-funding--logo");
    expect(w.get(".chapter-funding__text").text()).toBe(HISTORY.funding.text);
  });

  it("links the logo to the funder, in a new tab, and says so", () => {
    const w = mount(ChapterFunding, { props: { funding: HISTORY.funding } });
    const link = w.get('[data-testid="chapter-funding-link"]');
    expect(link.element.tagName).toBe("A");
    expect(link.attributes("href")).toBe("https://www.mcgill.ca/neuro/");
    expect(link.attributes("target")).toBe("_blank");
    expect(link.attributes("rel")).toBe("noopener noreferrer");
    expect(link.get("img").attributes("alt")).toMatch(
      /^The Neuro.* \(opens in a new tab\)$/
    );
  });

  it("is the line alone for a funder with no logo", () => {
    const w = mount(ChapterFunding, {
      props: { funding: { text: "Funded by a foundation.", logo: null } },
    });
    const row = w.get('[data-testid="chapter-funding"]');
    expect(row.classes()).not.toContain("chapter-funding--logo");
    expect(row.element.children).toHaveLength(1);
    expect(w.find('[data-testid="chapter-funding-link"]').exists()).toBe(false);
  });

  it("is a grey panel with no rule down its side, and the logo has no chip of its own", () => {
    const panel = rule(source, ".chapter-funding");
    expect(panel).toMatch(/background:\s*rgb\(var\(--color-line\) \/ 0\.\d+\)/);
    expect(source).not.toMatch(/border-left/);
    expect(source).not.toMatch(/--color-chapter/);
    expect(rule(source, ".chapter-funding__logo")).not.toMatch(/background/);
  });

  it("sets the row as the authors' rows are: the same gap, face and size", () => {
    const gap = /column-gap:\s*0\.875rem/;
    expect(rule(authors, ".chapter-author")).toMatch(gap);
    expect(rule(source, ".chapter-funding")).toMatch(gap);
    for (const [css, selector] of [
      [authors, ".chapter-author__text"],
      [source, ".chapter-funding__text"],
    ]) {
      expect(rule(css, selector)).toMatch(/font-family:\s*var\(--font-mono\)/);
      expect(rule(css, selector)).toMatch(/font-size:\s*var\(--ui-size-13\)/);
    }
    // No taller than a face.
    expect(rule(authors, ".chapter-author__face")).toMatch(/height:\s*3rem/);
    expect(rule(source, ".chapter-funding__logo img")).toMatch(
      /max-height:\s*3rem/
    );
  });
});
