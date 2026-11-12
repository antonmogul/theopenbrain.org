/*
 * SectionComp in a sideways box (OPENBRAIN-187). BreakoutBox provides the
 * mode; the box's text is cut into RailParts (helper/exploreRail.js's
 * railLayoutOf), each drawing its figures first and once, never again in
 * the paragraph; an Explore paragraph loses its fold-out card; a widget
 * that ends the box is rendered by the box-tail copy that BreakoutBox puts
 * after the track. Out of the rail, nothing changes.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, provide, ref } from "vue";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import SectionComp from "../SectionComp.vue";
import { FULL_BLEED_FLOATING } from "@/composables/useInlineFigures";

vi.mock("@/composables/useAnimations", async () => {
  const { ref } = await import("vue");
  return {
    useAnimations: () => ({
      animations: ref([]),
      fetchAnimations: async () => ({ data: [] }),
    }),
  };
});

const mode = ref("track");
// The frame: floats (figures inline over the pane), provides the mode, and
// renders the text and what follows the track, as BreakoutBox does.
const BreakoutBox = defineComponent({
  name: "BreakoutBox",
  props: { section: Object, label: String },
  setup(props, { slots }) {
    provide("exploreRail", mode);
    provide(FULL_BLEED_FLOATING, ref(true));
    return () =>
      h("aside", { "data-box": props.section.id }, [
        h("div", { class: "track" }, slots.default?.()),
        h("div", { class: "after" }, slots.after?.()),
      ]);
  },
});

const stubs = {
  BreakoutBox,
  StartEndIcon: true,
  IllustrationInline: {
    props: ["animationId"],
    template: '<figure class="fig" :data-id="animationId"></figure>',
  },
  FullScreenIllustration: true,
  WidgetBreakout: {
    props: ["placement"],
    template: '<div class="widget" :data-id="placement.widgetId"></div>',
  },
  SubSection: true,
  InlineImages: true,
  VideoEmbed: true,
  BreakImages: true,
  BreakSection: true,
  ReferenceList: true,
  EditableBlock: true,
  DemoModal: true,
};

const mountBox = (section) =>
  mount(SectionComp, {
    props: { section, index: 0, label: "F" },
    global: {
      provide: {
        boxesAfter: () => [],
        sectionLabels: ref({}),
        references: { references: ref([]) },
        chapterSlug: ref("foundations-of-neuroscience"),
      },
      stubs,
    },
  });

const penfield = {
  id: "box-penfield",
  kind: "box",
  slug: "box-penfield",
  title: "Wilder Penfield and the Montreal Procedure",
  paragraphs: [
    {
      id: "p1",
      text: "Wilder Penfield was born…",
      animation: { id: "figOp", name: "Op" },
    },
    {
      id: "p2",
      text: "In 1927, Penfield…",
      animation: { id: "figMap", name: "Map" },
    },
    { id: "p3", text: "Then this." },
    {
      id: "pw",
      type: "widget",
      widget: { kind: "inline", widgetId: "upload:history-penfield-binder" },
    },
  ],
};

beforeEach(() => {
  setActivePinia(createPinia());
  mode.value = "track";
  vi.stubGlobal("matchMedia", (query) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

describe("SectionComp in a sideways box", () => {
  it("cuts the text into parts, each figure leading its part once", () => {
    const w = mountBox(penfield);
    const track = w.find(".track");
    expect(track.find(".bx-rail-row").exists()).toBe(true);
    const parts = track.findAll("[data-rail-part]");
    expect(parts).toHaveLength(2);
    // Part one: the operative photograph, then its paragraph.
    expect(
      parts[0].findAll(".fig").map((f) => f.attributes("data-id"))
    ).toEqual(["figOp"]);
    // Part two: the map, then its paragraph and the next one.
    expect(
      parts[1].findAll(".fig").map((f) => f.attributes("data-id"))
    ).toEqual(["figMap"]);
    expect(
      parts[1]
        .findAll("[data-paragraph-id]")
        .map((p) => p.attributes("data-paragraph-id"))
    ).toEqual(["p2", "p3"]);
    // Each figure once in the whole box, and never inside the columns.
    expect(w.findAll(".fig")).toHaveLength(2);
    expect(w.find("[data-rail-columns] .fig").exists()).toBe(false);
    // The paragraphs keep their figure triggers around their text.
    expect(
      parts[0]
        .find("[data-paragraph-id='p1']")
        .element.closest(".animationTrigger")
    ).not.toBeNull();
  });

  it("leaves the binder off the track, after it, once", () => {
    const w = mountBox(penfield);
    expect(w.find(".track .widget").exists()).toBe(false);
    const binders = w.findAll(".after .widget");
    expect(binders).toHaveLength(1);
    expect(binders[0].attributes("data-id")).toBe(
      "upload:history-penfield-binder"
    );
    // The tail copy draws nothing else of the box.
    expect(w.findAll(".after [data-paragraph-id]")).toHaveLength(0);
  });

  it("lays an Explore paragraph open on the track, under its name", () => {
    const w = mountBox({
      id: "box-b",
      kind: "box",
      slug: "box-rete-mirabile",
      title: "Failures in comparative neuroanatomy",
      paragraphs: [
        {
          id: "e1",
          text: "How does our brain…",
          animation: { id: "figC" },
          explore: { title: "The rete mirabile", prompt: "Explore more" },
        },
        {
          id: "e2",
          text: "In contrast…",
          explore: { title: "The hippocampus minor", prompt: "Explore more" },
        },
      ],
    });
    expect(w.find(".xc").exists()).toBe(false);
    expect(w.find(".explore-pair-item").exists()).toBe(false);
    const parts = w.findAll("[data-rail-part]");
    expect(parts.map((p) => p.attributes("data-explore"))).toEqual([
      "e1",
      "e2",
    ]);
    expect(parts[0].find("h3").text()).toBe("The rete mirabile");
    expect(w.findAll(".fig")).toHaveLength(1);
  });

  it("changes nothing where the box runs down the page", () => {
    mode.value = null;
    const w = mountBox(penfield);
    expect(w.find("[data-rail-part]").exists()).toBe(false);
    expect(w.find(".bx-rail-row").exists()).toBe(false);
    // Figures in their paragraphs, the binder in the text, nothing after.
    expect(w.findAll(".track .fig")).toHaveLength(2);
    expect(w.findAll(".track .widget")).toHaveLength(1);
    expect(w.find(".after .widget").exists()).toBe(false);
    expect(w.find(".after [data-paragraph-id]").exists()).toBe(false);
  });
});
