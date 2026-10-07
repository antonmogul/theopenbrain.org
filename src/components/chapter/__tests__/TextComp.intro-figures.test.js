/*
 * The intro's own figures (OPENBRAIN-131). An intro paragraph with a figure
 * (the Attention chapter's Figure 1, the guru painting; Stress Figure 1)
 * gets its figure from transformModuleToChapterFormat, but TextComp used to
 * render the intro's paragraphs with no trigger span and no inline figure, so
 * neither the pinned pane (from 1024px) nor the one-column reader ever showed
 * it. These mount TextComp on a transformed chapter, as ChapterView does.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

vi.mock("vue-router", () => ({
  useRoute: () => ({ query: {}, params: { slug: "attention" } }),
}));
vi.mock("gsap", () => ({ gsap: { registerPlugin: vi.fn() } }));
vi.mock("gsap/ScrollTrigger", () => ({
  default: { create: vi.fn(() => ({ kill: vi.fn() })) },
}));
vi.mock("@/composables/useAuth", async () => {
  const { ref } = await import("vue");
  return {
    useAuth: () => ({ isCreator: ref(false), session: ref(null) }),
  };
});

import TextComp from "../TextComp.vue";
import { useText } from "@/stores";
import { transformModuleToChapterFormat } from "@/composables/chapterTransform.mjs";
import { READER_NARROW_QUERY } from "@/helper/readerLayout";

// IllustrationInline resolves and draws the figure (Lottie, image, widget);
// here only which figure it was asked for matters.
const IllustrationInline = defineComponent({
  name: "IllustrationInline",
  props: { animationId: String },
  setup: (props) => () =>
    h("figure", { "data-inline-figure": props.animationId }),
});

const text = (content) => ({ blocks: [{ type: "text", content }] });
const row = (id, order_index, content, figure) => ({
  id,
  order_index,
  content,
  is_subsection_header: false,
  subsection_level: 0,
  ...(figure
    ? {
        animation_id: `${figure}-uuid`,
        animation_key: figure,
        animation_title: "The guru and princes by Nandalal Bose",
        animation_trigger: "auto",
      }
    : {}),
});

/* The Attention chapter's intro as 20260925020000 seeds it: text, the
   Figure 1 caption row (the figure's paragraph), more text. */
const attentionModule = () => ({
  id: "m-attention",
  slug: "attention-and-working-memory",
  title: "Attention and Working Memory",
  sections: [
    {
      id: "s-intro",
      slug: "introduction",
      title: "Introduction",
      order_index: 0,
      paragraphs: [
        row("p0", 0, text("In the Mahabharata, the great Hindu epic…")),
        row(
          "p1",
          1,
          {
            blocks: [
              { type: "figure_placeholder", number: 1, caption: "The guru" },
              { type: "text", content: ". The guru and princes" },
            ],
          },
          "animationAttentionV2Fig1"
        ),
        row("p2", 2, text("The guru asked each, “tell me what you see”.")),
      ],
    },
    {
      id: "s-1",
      slug: "the-story-of-attention",
      title: "The story of attention",
      order_index: 1,
      paragraphs: [row("q0", 0, text("Hundreds of years later…"))],
    },
  ],
});

let narrow = false;
function stubMatchMedia() {
  vi.stubGlobal("matchMedia", (query) => ({
    matches: query === READER_NARROW_QUERY ? narrow : !narrow,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

const wrappers = [];
function mountReader(chapter) {
  useText().updateText("*", chapter);
  const wrapper = mount(TextComp, {
    props: { module: null },
    global: {
      provide: { references: { references: ref([]) } },
      stubs: {
        Section: true,
        Points: true,
        HoverImg: true,
        QuizSection: true,
        FurtherReading: true,
        FootNotes: true,
        MediaPicker: true,
        IllustrationInline,
      },
    },
    attachTo: document.body,
  });
  wrappers.push(wrapper);
  return wrapper;
}

beforeEach(() => {
  // transformModuleToChapterFormat reports what it built.
  vi.spyOn(console, "log").mockImplementation(() => {});
  setActivePinia(createPinia());
  localStorage.clear();
  narrow = false;
  stubMatchMedia();
  vi.useFakeTimers();
});
afterEach(() => {
  wrappers.splice(0).forEach((w) => w.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("transformModuleToChapterFormat: intro figures", () => {
  it("gives an intro paragraph its figure", () => {
    const chapter = transformModuleToChapterFormat(attentionModule());
    const [intro] = chapter.intro;
    expect(intro.paragraphs.map((p) => p.animation?.id ?? null)).toEqual([
      null,
      "animationAttentionV2Fig1",
      null,
    ]);
    expect(intro.paragraphs[1].animation.name).toBe("AttentionV2Fig1");
  });
});

describe("TextComp: the intro's figures", () => {
  it("wraps an intro paragraph with a figure in its pane trigger (1024px and up)", async () => {
    const wrapper = mountReader(
      transformModuleToChapterFormat(attentionModule())
    );
    await wrapper.vm.$nextTick();
    const intro = wrapper.find("section#s-intro");
    const trigger = intro.find("#triggerAnimationAttentionV2Fig1");
    expect(trigger.exists()).toBe(true);
    expect(trigger.classes()).toEqual(
      expect.arrayContaining(["animationTrigger", "block", "noHighlight"])
    );
    // The trigger spans its own paragraph only, which keeps its id for the
    // timeline, readerJump and highlights.
    const inside = trigger.findAll("[data-paragraph-id]");
    expect(inside.map((p) => p.attributes("id"))).toEqual(["p1"]);
    // IllustrationsComp maps a trigger id to its figure this way.
    expect(
      trigger
        .attributes("id")
        .replace(/^trigger/i, "")
        .toLowerCase()
    ).toBe("animationattentionv2fig1");
    // Only that paragraph is a trigger, and the pane draws it, not the text.
    expect(intro.findAll(".animationTrigger[id]")).toHaveLength(1);
    expect(intro.find("[data-inline-figure]").exists()).toBe(false);
  });

  it("draws the intro figure inline below 1024px", async () => {
    narrow = true;
    stubMatchMedia();
    const wrapper = mountReader(
      transformModuleToChapterFormat(attentionModule())
    );
    await wrapper.vm.$nextTick();
    const figures = wrapper.findAll("section#s-intro [data-inline-figure]");
    expect(figures.map((f) => f.attributes("data-inline-figure"))).toEqual([
      "animationAttentionV2Fig1",
    ]);
    // In the paragraph's trigger, after its text, as SectionComp does it.
    const trigger = wrapper.find("#triggerAnimationAttentionV2Fig1");
    expect(trigger.find("[data-inline-figure]").exists()).toBe(true);
  });

  it("keeps a section-level intro animation (the Retina's dragon) around every paragraph", async () => {
    const chapter = transformModuleToChapterFormat(attentionModule());
    chapter.intro[0].animation = { name: "dragon" };
    const wrapper = mountReader(chapter);
    await wrapper.vm.$nextTick();
    const dragon = wrapper.find("#triggerAnimationDragon");
    expect(dragon.classes()).toContain("animationTrigger");
    expect(
      dragon.findAll("[data-paragraph-id]").map((p) => p.attributes("id"))
    ).toEqual(["p0", "p1", "p2"]);
    // The figure's own trigger nests inside it and comes later in document
    // order, so it wins while both are active (last active wins).
    const triggers = wrapper.findAll("section#s-intro .animationTrigger[id]");
    expect(triggers.map((t) => t.attributes("id"))).toEqual([
      "triggerAnimationDragon",
      "triggerAnimationAttentionV2Fig1",
    ]);
  });

  it("gives the intro its section gap (reader-section)", async () => {
    const wrapper = mountReader(
      transformModuleToChapterFormat(attentionModule())
    );
    await wrapper.vm.$nextTick();
    expect(wrapper.find("section#s-intro").classes()).toContain(
      "reader-section"
    );
  });

  it("renders an intro without figures with no triggers at all (History)", async () => {
    const module = attentionModule();
    delete module.sections[0].paragraphs[1].animation_id;
    delete module.sections[0].paragraphs[1].animation_key;
    const wrapper = mountReader(transformModuleToChapterFormat(module));
    await wrapper.vm.$nextTick();
    const intro = wrapper.find("section#s-intro");
    expect(intro.findAll(".animationTrigger").length).toBe(0);
    expect(intro.findAll("[id^=triggerAnimation]").length).toBe(0);
    expect(
      intro.findAll("[data-paragraph-id]").map((p) => p.attributes("id"))
    ).toEqual(["p0", "p1", "p2"]);
  });
});
