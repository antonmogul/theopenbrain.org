/*
 * Breathing room between sections (OPENBRAIN-131): index.css gives
 * `.chapter-reader section.reader-section` its space after from
 * --reader-section-gap. The class goes on the chapter's own sections only:
 * SectionComp's <section> and the intro, never a breakout box's body (a div,
 * which a full screen's height and 20rem would leave mostly empty) and
 * never the opener's contents, the end-of-chapter callout or Further
 * Reading, which keep the global rule so --opener-h does not move.
 */
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import SectionComp from "../SectionComp.vue";

const source = (file) => readFileSync(new URL(file, import.meta.url), "utf8");

// The box frame is FullBleed (teleports, stage layer); here it only has to
// render the box's text, which SectionComp draws with box-body.
const BreakoutBox = defineComponent({
  name: "BreakoutBox",
  props: { section: Object, label: String },
  setup:
    (props, { slots }) =>
    () =>
      h("aside", { "data-box": props.section.id }, slots.default?.()),
});

const paragraph = (id) => ({ id, text: `<p>${id}</p>` });
const mountSection = (section, boxesAfter = () => []) =>
  mount(SectionComp, {
    props: { section, index: 0, label: "1" },
    global: {
      provide: {
        boxesAfter,
        sectionLabels: ref({}),
        references: { references: ref([]) },
      },
      stubs: {
        BreakoutBox,
        StartEndIcon: true,
        IllustrationInline: true,
        FullScreenIllustration: true,
        WidgetBreakout: true,
        SubSection: true,
        InlineImages: true,
        VideoEmbed: true,
        BreakImages: true,
        BreakSection: true,
        ReferenceList: true,
        EditableBlock: true,
      },
    },
  });

beforeEach(() => {
  setActivePinia(createPinia());
  vi.stubGlobal("matchMedia", (query) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

describe("SectionComp: the reader-section class", () => {
  it("is on a chapter section's <section>", () => {
    const wrapper = mountSection({
      id: "s1",
      title: "The story of attention",
      kind: "section",
      paragraphs: [paragraph("p1")],
    });
    const section = wrapper.find("section#s1");
    expect(section.classes()).toEqual(
      expect.arrayContaining(["reader-section", "overflow-y-visible"])
    );
    expect(wrapper.findAll(".reader-section")).toHaveLength(1);
    expect(wrapper.find("h2.subChapter").text()).toBe("The story of attention");
  });

  it("is not on a breakout box's body", () => {
    const wrapper = mountSection({
      id: "box-a",
      title: "Box A",
      kind: "box",
      paragraphs: [paragraph("b1")],
    });
    const body = wrapper.find("[data-box='box-a'] > div");
    expect(body.exists()).toBe(true);
    expect(body.classes()).not.toContain("reader-section");
    expect(wrapper.find(".reader-section").exists()).toBe(false);
    expect(wrapper.find("section").exists()).toBe(false);
  });

  it("is not on the body of a box anchored inside a section", () => {
    const box = {
      id: "box-b",
      title: "Box B",
      kind: "box",
      anchored: true,
      paragraphs: [paragraph("b1")],
    };
    const wrapper = mountSection(
      {
        id: "s2",
        title: "Section two",
        kind: "section",
        paragraphs: [paragraph("p1"), paragraph("p2")],
      },
      (id) => (id === "p1" ? [box] : [])
    );
    expect(wrapper.find("[data-box='box-b']").exists()).toBe(true);
    expect(
      wrapper.findAll(".reader-section").map((el) => el.attributes("id"))
    ).toEqual(["s2"]);
  });
});

describe("reader-section in the reader's CSS and templates", () => {
  const css = source("../../../../index.css");
  const brand = source("../../../../styles/brand.css");

  it("takes the section gap only through the reader-section class", () => {
    expect(css).toMatch(
      /\.chapter-reader section\.reader-section\s*\{\s*padding-bottom: var\(--reader-section-gap\);\s*\}/
    );
    // The global rule still sizes the opener's contents, the end-of-chapter
    // callout and Further Reading.
    expect(css).toMatch(
      /\.chapter-reader section\s*\{\s*min-height: 100vh;\s*padding-bottom: 15rem;\s*\}/
    );
    expect(css).toMatch(
      /\.chapter-reader section\s*\{\s*padding-bottom: 4rem;\s*\}/
    );
  });

  it("spaces section titles and subsections from tokens, sparing the scroll anchor", () => {
    expect(css).toMatch(
      /\.chapter-reader h2\.subChapter\s*\{\s*padding-bottom: var\(--reader-title-gap\);/
    );
    expect(css).toMatch(
      /\.chapter-reader h3\.subT:not\(\.animationScrollAnchor\)\s*\{\s*padding-top: var\(--reader-subsection-gap\);/
    );
  });

  it("sets the gaps in brand.css, 20rem from the 1024px two-column breakpoint", () => {
    expect(brand).toContain("--reader-section-gap: 6rem;");
    expect(brand).toContain("--reader-title-gap: 0.75em;");
    expect(brand).toContain("--reader-subsection-gap: 1.25em;");
    expect(brand).toMatch(
      /@media \(min-width: 1024px\) \{\s*:root \{\s*--reader-section-gap: 20rem;\s*\}\s*\}/
    );
  });

  it("puts the class on the intro and on no other reader <section>", () => {
    expect(source("../../TextComp.vue")).toMatch(
      /<section\s+v-for="section in source\['intro'\]"[^>]*class="reader-section /
    );
    for (const file of [
      "../../opener/OpenerToc.vue",
      "../../EndOfChapterCallout.vue",
      "../FurtherReading.vue",
    ])
      expect(source(file), file).not.toContain("reader-section");
  });
});
