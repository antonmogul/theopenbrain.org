/*
 * Where the two-column reader ends (OPENBRAIN-179). The chapter's close and
 * its references used to sit in the text column, beside the figure pane:
 * 121 references between the last paragraph and the key takeaways. They now
 * run the full width, below <main id="text">, in #chapter-back: the close
 * first, then Further reading, the references and the page's last line.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

const route = { query: {}, params: { slug: "history" } };
vi.mock("vue-router", () => ({ useRoute: () => route }));
vi.mock("gsap", () => ({ gsap: { registerPlugin: vi.fn() } }));
const created = [];
vi.mock("gsap/ScrollTrigger", () => ({
  default: {
    create: vi.fn((config) => {
      created.push(config);
      return { kill: vi.fn() };
    }),
  },
}));
const isCreator = ref(false);
vi.mock("@/composables/useAuth", () => ({
  useAuth: () => ({ isCreator, session: { value: null } }),
}));

import TextComp from "../TextComp.vue";
import { useText } from "@/stores";

// The section component renders its section's slug, so a test can see which
// sections the text column was given.
const Section = defineComponent({
  name: "SectionComp",
  props: { section: Object, label: String },
  setup: (props) => () =>
    h("section", { "data-stub-section": props.section.slug }),
});
const ChapterReferences = defineComponent({
  name: "ChapterReferences",
  props: {
    references: Array,
    title: String,
    label: String,
    sectionId: String,
    sectionSlug: String,
  },
  setup: (props) => () =>
    h("div", {
      "data-stub-references": props.references.length,
      "data-title": props.title,
      "data-label": props.label,
      "data-section-id": props.sectionId,
      "data-section-slug": props.sectionSlug,
    }),
});
const FurtherReading = defineComponent({
  name: "FurtherReading",
  props: { content: Object },
  setup: () => () => h("div", { "data-stub-further-reading": "" }),
});
const FootNotes = defineComponent({
  name: "FootNotes",
  setup: () => () => h("div", { "data-stub-footnotes": "" }),
});

const section = (id, slug, title, paragraphs = []) => ({
  id,
  slug,
  title,
  paragraphs,
});
const history = () => ({
  slug: "foundations-of-neuroscience",
  intro: [],
  sections: [
    section("s1", "where-is-my-mind", "Where is my mind?"),
    section("s5", "closing-words", "Closing words"),
    section("s6", "references", "References", [
      { id: "r", text: "<ol><li>Gross. A Hole in the Head.</li></ol>" },
    ]),
  ],
  furtherReading: { title: "Further reading:", paragraphs: [{ links: [] }] },
  footNotes: { notes: [] },
});
const retina = () => ({
  slug: "the-retina",
  intro: [],
  sections: [section("s1", "the-eye", "The eye")],
  furtherReading: { paragraphs: [] },
  footNotes: { notes: [{ text: "First." }, { text: "Second." }] },
});

const wrappers = [];
function mountReader(chapter, rows = []) {
  useText().updateText("*", chapter);
  const wrapper = mount(TextComp, {
    props: { module: null },
    slots: {
      "end-of-chapter": '<div data-slot-close="" />',
      "chapter-foot": '<div data-slot-foot="" />',
    },
    global: {
      provide: { references: { references: ref(rows) } },
      stubs: {
        Section,
        ChapterReferences,
        FurtherReading,
        FootNotes,
        Points: true,
        HoverImg: true,
        MediaPicker: true,
        IllustrationInline: true,
        EditableBlock: true,
      },
    },
    attachTo: document.body,
  });
  wrappers.push(wrapper);
  return wrapper;
}
const order = (el) =>
  [...el.querySelectorAll("*")]
    .map(
      (n) =>
        (n.hasAttribute("data-slot-close") && "close") ||
        (n.hasAttribute("data-stub-further-reading") && "further") ||
        (n.hasAttribute("data-stub-references") && "references") ||
        (n.hasAttribute("data-slot-foot") && "foot")
    )
    .filter(Boolean);

beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
  isCreator.value = false;
  route.query = {};
  created.length = 0;
  vi.stubGlobal("matchMedia", (query) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.useFakeTimers();
});
afterEach(() => {
  wrappers.splice(0).forEach((w) => w.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("the end of the reader", () => {
  it("puts the close and the back matter after the text column, not in it", () => {
    const wrapper = mountReader(history());
    const main = wrapper.find("main#text").element;
    const back = wrapper.find("#chapter-back").element;
    // The boundary the two-column furniture stops at.
    expect(back.hasAttribute("data-reader-end")).toBe(true);
    expect(main.nextElementSibling).toBe(back);
    expect(main.contains(back)).toBe(false);
    for (const selector of [
      "[data-slot-close]",
      "[data-stub-references]",
      "[data-stub-further-reading]",
      "[data-slot-foot]",
    ])
      expect(main.querySelector(selector), selector).toBeNull();
  });

  it("orders it: the close, further reading, the references, the last line", () => {
    const wrapper = mountReader(history());
    expect(order(wrapper.find("#chapter-back").element)).toEqual([
      "close",
      "further",
      "references",
      "foot",
    ]);
  });

  it("takes a References section out of the text column and keeps it a section", () => {
    const rows = [
      { number: 1, raw_text: "Row one." },
      { number: 2, raw_text: "Row two." },
    ];
    const wrapper = mountReader(history(), rows);
    expect(
      wrapper
        .findAll("main#text [data-stub-section]")
        .map((s) => s.attributes("data-stub-section"))
    ).toEqual(["where-is-my-mind", "closing-words"]);

    const refs = wrapper.find("[data-stub-references]");
    // The table's rows, the section's own number, id and slug.
    expect(refs.attributes("data-stub-references")).toBe("2");
    expect(refs.attributes("data-title")).toBe("References");
    expect(refs.attributes("data-label")).toBe("3");
    expect(refs.attributes("data-section-id")).toBe("s6");
    expect(refs.attributes("data-section-slug")).toBe("references");
    // The wrapper the top bar's menu and a #references link land on.
    const trigger = refs.element.parentElement;
    expect(trigger.id).toBe("references");
    expect(trigger.classList.contains("trigger")).toBe(true);
  });

  it("lists the section's own entries until the table's rows arrive", () => {
    const wrapper = mountReader(history());
    expect(
      wrapper.find("[data-stub-references]").attributes("data-stub-references")
    ).toBe("1");
  });

  it("names the references in the top bar as a section, like the others", () => {
    mountReader(history());
    vi.advanceTimersByTime(50);
    const triggers = created
      .filter((c) => String(c.id || "").startsWith("scrollTriggerText-"))
      .map((c) => c.trigger.id);
    expect(triggers).toEqual([
      "where-is-my-mind",
      "closing-words",
      "references",
    ]);
  });

  it("leaves a References section in the text column while a creator edits it", () => {
    isCreator.value = true;
    route.query = { edit: "1" };
    const wrapper = mountReader(history());
    expect(
      wrapper
        .findAll("main#text [data-stub-section]")
        .map((s) => s.attributes("data-stub-section"))
    ).toContain("references");
    expect(wrapper.find("[data-stub-references]").exists()).toBe(false);
    // Further reading and the close are still the full-width end.
    expect(order(wrapper.find("#chapter-back").element)).toEqual([
      "close",
      "further",
      "foot",
    ]);
  });

  it("lists the Retina's footnotes, its bibliography, as the references", () => {
    const wrapper = mountReader(retina());
    const refs = wrapper.find("[data-stub-references]");
    expect(refs.attributes("data-stub-references")).toBe("2");
    expect(refs.attributes("data-label")).toBe("");
    expect(refs.attributes("data-section-id")).toBeUndefined();
    expect(refs.element.parentElement.id).toBe("references");
    // They are not printed again as footnotes.
    expect(wrapper.find("[data-stub-footnotes]").exists()).toBe(false);
  });

  it("keeps another chapter's explanatory footnotes with its text", () => {
    const wrapper = mountReader({ ...retina(), slug: "stress" });
    expect(wrapper.find("main#text [data-stub-footnotes]").exists()).toBe(true);
    expect(wrapper.find("[data-stub-references]").exists()).toBe(false);
  });

  it("ends a chapter with no back matter on its close, with no last line", () => {
    const wrapper = mountReader({
      slug: "new-chapter",
      intro: [],
      sections: [section("s1", "one", "One")],
      furtherReading: { paragraphs: [] },
      footNotes: { notes: [] },
    });
    expect(order(wrapper.find("#chapter-back").element)).toEqual(["close"]);
    expect(wrapper.find(".chapter-back__matter").exists()).toBe(false);
  });
});
