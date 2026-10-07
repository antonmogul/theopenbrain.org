/*
 * The chapter editor's "Stays" select (OPENBRAIN-131): how long a
 * paragraph's figure stays in the reader's left pane. It shows only where
 * the reader applies a hold (by the figure, as figureEnd does; never in a
 * breakout box), describes what Automatic resolves to for that kind of
 * figure and where a hold always stops, and saves through setFigureHold
 * into content.animationFlags.hold: once per choice, so arrowing through
 * the options doesn't save at every step.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, shallowMount } from "@vue/test-utils";

vi.mock("vue-router", () => ({
  useRoute: () => ({ params: { slug: "attention" }, query: {} }),
}));
vi.mock("@/services/api/client", async (importOriginal) => ({
  ...(await importOriginal()),
  authedRequest: vi.fn(),
  apiRequest: vi.fn(async () => []),
}));
import { authedRequest } from "@/services/api/client";
import ChapterEditorView from "../ChapterEditorView.vue";

const text = (content) => ({ blocks: [{ type: "text", content }] });
const para = (id, order_index, extra = {}) => ({
  id,
  section_id: "sec",
  order_index,
  content: text(`Paragraph ${id}.`),
  content_text: `Paragraph ${id}.`,
  is_subsection_header: false,
  subsection_level: 0,
  animation_id: null,
  animation_trigger: null,
  ...extra,
});
const media = [
  {
    id: "img",
    title: "The guru and princes",
    animation_key: "animationAttentionV2Fig1",
    media_type: "image",
    image_file_url: "/publicAssets/images/attention/fig01.jpeg",
    config: { placeholder: true },
  },
  {
    id: "lottie",
    title: "Eye structure",
    animation_key: "animationEyeStructur",
    media_type: "lottie",
  },
  {
    id: "full",
    title: "A full-screen figure",
    animation_key: "animationFull",
    media_type: "lottie",
    config: { fullscreen: true },
  },
];

let rows;
let status;
function api({ published = false } = {}) {
  status = published ? "published" : "draft";
  rows = [
    para("auto", 0, { animation_id: "img", animation_trigger: "auto" }),
    para("held", 1, {
      animation_id: "img",
      animation_trigger: "auto",
      content: { ...text("Held."), animationFlags: { hold: 1, start: true } },
    }),
    para("anim", 2, { animation_id: "lottie", animation_trigger: "auto" }),
    para("scroll", 3, { animation_id: "lottie", animation_trigger: "scroll" }),
    para("full", 4, { animation_id: "full", animation_trigger: "auto" }),
    para("plain", 5),
    // A legacy 'scroll' row whose figure was swapped for a still image: the
    // reader holds it (its own trigger), so the editor offers Stays.
    para("scrollStill", 6, {
      animation_id: "img",
      animation_trigger: "scroll",
    }),
    // A breakout box draws its figures in the box, never in the pane.
    para("boxed", 0, {
      section_id: "box",
      animation_id: "img",
      animation_trigger: "auto",
    }),
  ];
  authedRequest.mockImplementation(async (path, init = {}) => {
    if (path.startsWith("modules?"))
      return [
        {
          id: "m",
          slug: "attention",
          title: "Attention",
          status,
          order_index: 3,
        },
      ];
    if (path.startsWith("sections?"))
      return [
        { id: "sec", title: "One", slug: "one", order_index: 1 },
        {
          id: "box",
          title: "Descartes",
          slug: "box-descartes",
          order_index: 2,
          parent_section_id: "sec",
        },
      ];
    if (path.startsWith("animations?")) return media;
    if (path.startsWith("paragraphs?section_id"))
      return rows.map((r) => structuredClone(r));
    const id = (path.match(/id=eq\.([^&]+)/) || [])[1];
    const row = rows.find((r) => r.id === id);
    if (init.method === "PATCH") {
      Object.assign(row, JSON.parse(init.body));
      return [structuredClone(row)];
    }
    if (path.includes("select=content"))
      return [{ content: structuredClone(row.content) }];
    return [];
  });
}

let wrapper;
async function mountView() {
  wrapper = shallowMount(ChapterEditorView, {
    global: { stubs: { "router-link": true } },
  });
  await flushPromises();
  return wrapper;
}
const toolbar = (id) =>
  wrapper
    .findAll(".ce-tools")
    .find((el) => el.attributes("aria-label").includes(`Paragraph ${id}`));
const stays = (id) => toolbar(id)?.find(".ce-hold select");
const stored = (id) => rows.find((r) => r.id === id).content;
const patches = () =>
  authedRequest.mock.calls.filter(([, init]) => init?.method === "PATCH");
// Choose an option and leave the select, as a mouse or Tab does.
async function choose(id, value) {
  await stays(id).setValue(value);
  await stays(id).trigger("blur");
  await flushPromises();
}

beforeEach(() => {
  vi.clearAllMocks();
  api();
});
afterEach(() => {
  wrapper?.unmount();
  vi.restoreAllMocks();
});

describe("ChapterEditorView: a figure's Stays select", () => {
  it("shows where the reader holds a figure", async () => {
    await mountView();
    expect(stays("auto").exists()).toBe(true);
    expect(stays("anim").exists()).toBe(true);
    // The reader decides by the figure, whatever the paragraph's trigger:
    // a 'scroll' row's own trigger holds like any other.
    expect(stays("scroll").exists()).toBe(true);
    expect(stays("scrollStill").exists()).toBe(true);
    // Scroll drives a full-screen figure: no hold.
    expect(stays("full").exists()).toBe(false);
    // A breakout box's figures never reach the pane.
    expect(stays("boxed").exists()).toBe(false);
    expect(toolbar("boxed").find(".ce-hold-hint").exists()).toBe(false);
    // No figure, no select.
    expect(stays("plain").exists()).toBe(false);
    expect(toolbar("plain").find(".ce-hold-hint").exists()).toBe(false);
  });

  it("says in the figure card what applies, but not for a box", async () => {
    await mountView();
    const preview = (id) =>
      wrapper
        .findAllComponents({ name: "BlockPreview" })
        .find((c) => c.props("paragraph").id === id);
    expect(preview("auto").props("inPane")).toBe(true);
    expect(preview("boxed").props("inPane")).toBe(false);
  });

  it("is labelled, and described by what Automatic means and where a hold stops", async () => {
    await mountView();
    const label = toolbar("auto").find(".ce-hold label");
    const select = stays("auto");
    expect(label.text()).toBe("Stays");
    expect(label.attributes("for")).toBe(select.attributes("id"));
    const hint = toolbar("auto").find(".ce-hold-hint");
    expect(select.attributes("aria-describedby")).toBe(hint.attributes("id"));
    expect(hint.text()).toBe(
      "Automatic: until the next figure. Wide screens only. Always stops at the next figure, a full-width band or the end of the section."
    );
    expect(select.attributes("title")).toBe(hint.text());
    // A Lottie's Automatic is today's window.
    expect(toolbar("anim").find(".ce-hold-hint").text()).toMatch(
      /^Automatic: with its paragraph\. /
    );
    expect(
      stays("auto")
        .findAll("option")
        .map((o) => [o.attributes("value"), o.text()])
    ).toEqual([
      ["", "Automatic"],
      ["0", "With its paragraph"],
      ["0.5", "+ ½ screen"],
      ["1", "+ 1 screen"],
      ["2", "+ 2 screens"],
      ["next", "Until the next figure"],
    ]);
  });

  it("shows the stored hold, Automatic when there is none", async () => {
    await mountView();
    expect(stays("auto").element.value).toBe("");
    expect(stays("held").element.value).toBe("1");
  });

  it("saves the choice into content.animationFlags, keeping the rest", async () => {
    await mountView();
    await choose("held", "0");
    expect(stored("held")).toEqual({
      ...text("Held."),
      animationFlags: { hold: 0, start: true },
    });
    expect(stays("held").element.value).toBe("0");

    await choose("auto", "next");
    expect(stored("auto").animationFlags).toEqual({ hold: "next" });
    expect(stays("auto").element.value).toBe("next");
    expect(wrapper.text()).toContain("Figure timing saved.");

    // Back to Automatic removes the key.
    await choose("auto", "");
    expect(stored("auto")).toEqual(text("Paragraph auto."));
  });

  it("shows what is stored when a save is refused", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await mountView();
    const original = authedRequest.getMockImplementation();
    authedRequest.mockImplementation(async (path, init = {}) =>
      init.method === "PATCH" ? [] : original(path, init)
    );
    await choose("held", "2");
    expect(stored("held").animationFlags.hold).toBe(1);
    expect(stays("held").element.value).toBe("1");
    expect(wrapper.text()).toContain("didn't allow");
  });
});

describe("ChapterEditorView: choosing Stays with the keyboard", () => {
  // Arrow keys on a closed select fire `change` at every step (Chromium on
  // Linux and Windows). Each step is a draft; the choice is saved once.
  async function arrowTo(id, values) {
    for (const value of values) await stays(id).setValue(value);
  }
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("steps through the options without saving, then saves the last once", async () => {
    await mountView();
    await arrowTo("auto", ["0", "0.5", "1"]);
    // The select follows the keys; nothing is saved yet.
    expect(stays("auto").element.value).toBe("1");
    expect(patches()).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1000);
    await flushPromises();
    expect(patches()).toHaveLength(1);
    expect(stored("auto").animationFlags).toEqual({ hold: 1 });
    expect(stays("auto").element.value).toBe("1");
    // One undo entry: back to Automatic in one step.
    expect(wrapper.vm.ed.undoStack.value).toHaveLength(1);
    await wrapper.find(".ce-toast-undo").trigger("click");
    await flushPromises();
    expect(stored("auto")).toEqual(text("Paragraph auto."));
  });

  it("saves at once on Enter, and leaving the select doesn't save again", async () => {
    await mountView();
    await arrowTo("auto", ["0", "0.5"]);
    await stays("auto").trigger("keydown", { key: "Enter" });
    await flushPromises();
    expect(patches()).toHaveLength(1);
    await stays("auto").trigger("blur");
    await vi.advanceTimersByTimeAsync(1000);
    await flushPromises();
    expect(patches()).toHaveLength(1);
    expect(stored("auto").animationFlags).toEqual({ hold: 0.5 });
  });

  it("saves nothing when the keys come back to the stored value", async () => {
    await mountView();
    await arrowTo("held", ["2", "1"]);
    await vi.advanceTimersByTimeAsync(1000);
    await stays("held").trigger("blur");
    await flushPromises();
    expect(patches()).toHaveLength(0);
    expect(stays("held").element.value).toBe("1");
  });

  it("on a published chapter, asks once the choice is made, not at each key", async () => {
    api({ published: true });
    await mountView();
    const dialog = () =>
      wrapper
        .findAllComponents({ name: "ConfirmDialog" })
        .find((c) => c.props("title") === "Change a published chapter?");
    await arrowTo("auto", ["0", "0.5"]);
    expect(dialog().props("modelValue")).toBe(false);
    await vi.advanceTimersByTimeAsync(1000);
    await flushPromises();
    expect(dialog().props("modelValue")).toBe(true);
    // Cancelled: nothing saved, and the select shows what is stored.
    dialog().vm.$emit("update:modelValue", false);
    await flushPromises();
    expect(patches()).toHaveLength(0);
    expect(stays("auto").element.value).toBe("");
    // Chosen again and confirmed: saved once.
    await arrowTo("auto", ["next"]);
    await stays("auto").trigger("blur");
    await flushPromises();
    expect(dialog().props("modelValue")).toBe(true);
    dialog().vm.$emit("confirm");
    await flushPromises();
    expect(patches()).toHaveLength(1);
    expect(stored("auto").animationFlags).toEqual({ hold: "next" });
    expect(stays("auto").element.value).toBe("next");
  });
});
