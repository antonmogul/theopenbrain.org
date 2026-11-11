import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";

/*
 * Which contents a chapter opens with (OPENBRAIN-174): the one with a
 * picture per section when the chapter has section art, the numbered list
 * otherwise, so chapters the art has not reached do not change.
 */

vi.mock("gsap", () => ({ gsap: { registerPlugin: vi.fn() } }));
vi.mock("gsap/ScrollTrigger", () => ({ default: { refresh: vi.fn() } }));
vi.mock("../OpenerHero.vue", () => ({
  default: { name: "OpenerHero", template: "<div class='hero-stub' />" },
}));

import ChapterOpener from "../ChapterOpener.vue";

const text = {
  intro: [{ id: "intro", title: "A chapter", sectionTitle: "Introduction" }],
  sections: [
    {
      id: "s1",
      slug: "where-is-my-mind",
      kind: "section",
      title: "Where is my mind?",
      paragraphs: [],
    },
  ],
};
const opener = (slug) =>
  mount(ChapterOpener, {
    props: { module: { slug, title: "A chapter" }, text },
  });

describe("ChapterOpener's contents", () => {
  it("shows the section pictures for a chapter that has them", () => {
    const wrapper = opener("foundations-of-neuroscience");
    const toc = wrapper.findComponent({ name: "OpenerTocArt" });
    expect(toc.exists()).toBe(true);
    expect(toc.props("chapterSlug")).toBe("foundations-of-neuroscience");
    expect(toc.attributes("id")).toBe("chapter-toc");
    // The outline it is given carries each section's slug, which is how
    // the pictures are looked up.
    expect(toc.props("outline").map((entry) => entry.slug)).toEqual([
      "introduction",
      "where-is-my-mind",
    ]);
    expect(wrapper.find(".opener-toc").exists()).toBe(false);
    wrapper.unmount();
  });

  it("keeps the numbered list for every other chapter", () => {
    const wrapper = opener("the-retina");
    expect(wrapper.findComponent({ name: "OpenerTocArt" }).exists()).toBe(
      false
    );
    expect(wrapper.find("#chapter-toc.opener-toc").exists()).toBe(true);
    wrapper.unmount();
  });

  it("keeps the numbered list while the module has not loaded", () => {
    const wrapper = mount(ChapterOpener, { props: { module: null, text } });
    expect(wrapper.find("#chapter-toc.opener-toc").exists()).toBe(true);
    wrapper.unmount();
  });
});
