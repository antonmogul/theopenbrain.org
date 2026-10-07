/*
 * Every element the figure pane listens to carries its figure's authored
 * hold as data-figure-hold (OPENBRAIN-131): IllustrationsComp sees only the
 * DOM trigger and the figure record, so a level that missed the binding
 * would silently fall back to Automatic. Mounts SectionComp with the real
 * SubSection and SubSubSection, one figure at every trigger level.
 * (The intro's triggers are covered in TextComp.intro-figures.test.js.)
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import SectionComp from "../SectionComp.vue";
import InlineImages from "../InlineImages.vue";
import { FIGURE_BANDS } from "@/helper/historyFigureTiming";

const fig = (name, hold) => ({
  id: `animation${name}`,
  name,
  title: name,
  transition: false,
  ...(hold === undefined ? {} : { hold }),
});
const text = (id, animation) => ({
  id,
  text: `<p>${id}</p>`,
  ...(animation ? { animation } : {}),
});

const section = {
  id: "s1",
  title: "A section",
  kind: "section",
  // A section-level figure (sections.animation_config) wraps them all.
  animation: { name: "SectionFig", hold: 1 },
  paragraphs: [
    text("p0", fig("ParaFig", 0.5)),
    text("p1", fig("AutoFig")),
    {
      subSection: [
        {
          id: "h1",
          title: "A subsection",
          animation: fig("HeaderFig", "next"),
          paragraphs: [
            text("sp0", fig("SubFig", 0)),
            {
              // A sub-subsection group (level-2 rows), then the legacy
              // text.json shape with paragraphs of its own.
              animation: { id: "animationGroupFig", hold: 2 },
              subSubSection: [
                text("ss0", fig("SubSubFig", 2)),
                {
                  id: "ss1",
                  title: "Legacy",
                  paragraphs: [text("ssp0", fig("SubSubParFig", 0.5))],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const mountSection = (props = { section, index: 0, label: "1" }, extra = {}) =>
  mount(SectionComp, {
    props,
    global: {
      provide: {
        boxesAfter: () => [],
        sectionLabels: ref({}),
        references: { references: ref([]) },
      },
      stubs: {
        BreakoutBox: true,
        StartEndIcon: true,
        IllustrationInline: true,
        FullScreenIllustration: true,
        WidgetBreakout: true,
        InlineImages: true,
        VideoEmbed: true,
        BreakImages: true,
        BreakSection: true,
        ReferenceList: true,
        EditableBlock: true,
        ...extra,
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

describe("data-figure-hold on every figure trigger", () => {
  it("binds each level's hold on the element IllustrationsComp wires", () => {
    const wrapper = mountSection();
    const holds = Object.fromEntries(
      wrapper
        .findAll(".animationTrigger[id]")
        .map((el) => [el.attributes("id"), el.attributes("data-figure-hold")])
    );
    expect(holds).toEqual({
      // SectionComp: the section-level span and a paragraph's span
      triggerAnimationSectionFig: "1",
      triggerAnimationParaFig: "0.5",
      triggerAnimationAutoFig: undefined,
      // SubSection: the header's span and a sub-paragraph's span
      triggerAnimationHeaderFig: "next",
      triggerAnimationSubFig: "0",
      // SubSubSection: the group, a sub-subsection, a legacy sub-paragraph
      triggeranimationGroupFig: "2",
      triggeranimationSubSubFig: "2",
      triggeranimationSubSubParFig: "0.5",
    });
  });

  it("leaves the attribute off a figure on Automatic, and off the text", () => {
    const wrapper = mountSection();
    expect(
      wrapper.find("#triggerAnimationAutoFig").attributes()
    ).not.toHaveProperty("data-figure-hold");
    for (const el of wrapper.findAll("[data-paragraph-id]"))
      expect(el.attributes()).not.toHaveProperty("data-figure-hold");
  });
});

describe("image blocks and the bands a hold stops at", () => {
  const slotOf = (paragraph) =>
    mount(InlineImages, { props: { paragraph } }).find(".fb-slot").element;

  it("an image in the text column is not a full-width band; a wide one is", () => {
    expect(slotOf({ id: "a", img: "/a.jpg" }).matches(FIGURE_BANDS)).toBe(
      false
    );
    expect(
      slotOf({ id: "b", img: "/b.jpg", imgWide: true }).matches(FIGURE_BANDS)
    ).toBe(true);
  });

  it("a paragraph's own image sits inside its figure's trigger", () => {
    // So figureEnd skips it: the image is part of the text the figure
    // belongs to, not a band that ends the figure early.
    const wrapper = mountSection(
      {
        section: {
          id: "s2",
          title: "Photoreceptors",
          kind: "section",
          paragraphs: [
            {
              ...text("p0", fig("Photoreceptors", 1)),
              img: "/waveLength.png",
              imgWide: true,
            },
          ],
        },
        index: 0,
        label: "2",
      },
      { InlineImages: false }
    );
    const trigger = wrapper.find("#triggerAnimationPhotoreceptors").element;
    const slot = wrapper.find(".fb-slot").element;
    expect(slot.matches(FIGURE_BANDS)).toBe(true);
    expect(trigger.contains(slot)).toBe(true);
  });
});
