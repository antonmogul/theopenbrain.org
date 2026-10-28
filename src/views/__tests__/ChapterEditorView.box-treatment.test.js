/*
 * The chapter editor's "Colour" select on a breakout box (OPENBRAIN-157):
 * which treatment the box renders in (helper/breakoutTreatment.js). It sits
 * with the box's placement controls, says what Automatic resolves to for
 * that box, and saves through setBoxTreatment into sections.box_treatment:
 * once per choice, as the figure "Stays" select does (OPENBRAIN-131), so
 * arrowing through the options doesn't save at every step. Until the
 * column is migrated it is offered disabled, saying why.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, shallowMount } from "@vue/test-utils";

vi.mock("vue-router", () => ({
  useRoute: () => ({
    params: { slug: "foundations-of-neuroscience" },
    query: {},
  }),
}));
vi.mock("@/services/api/client", async (importOriginal) => ({
  ...(await importOriginal()),
  authedRequest: vi.fn(),
  apiRequest: vi.fn(async () => []),
}));
import { authedRequest } from "@/services/api/client";
import ChapterEditorView from "../ChapterEditorView.vue";

let sections;
let status;
function api({ published = false, column = true } = {}) {
  status = published ? "published" : "draft";
  const stored = column ? { box_treatment: null } : {};
  sections = [
    {
      id: "sec",
      title: "Where is my mind?",
      slug: "where-is-my-mind",
      order_index: 1,
    },
    {
      id: "descartes",
      title: "Descartes",
      slug: "box-descartes",
      order_index: 2,
      parent_section_id: "sec",
      ...stored,
    },
    {
      id: "new",
      title: "A new aside",
      slug: "box-new",
      order_index: 3,
      parent_section_id: "sec",
      ...(column ? { box_treatment: "plate" } : {}),
    },
  ];
  authedRequest.mockImplementation(async (path, init = {}) => {
    if (path.startsWith("modules?"))
      return [
        {
          id: "m",
          slug: "foundations-of-neuroscience",
          title: "History",
          status,
          order_index: 1,
        },
      ];
    if (path.startsWith("sections?module_id"))
      return sections.map((s) => structuredClone(s));
    if (path.startsWith("animations?")) return [];
    if (path.startsWith("paragraphs?section_id")) return [];
    if (init.method === "PATCH" && path.startsWith("sections?id=eq.")) {
      const id = path.slice("sections?id=eq.".length);
      const row = sections.find((s) => s.id === id);
      Object.assign(row, JSON.parse(init.body));
      return [structuredClone(row)];
    }
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
const head = (id) => wrapper.find(`#sec-${id} .ce-section-head`);
const colour = (id) => head(id).find(".ce-box-colour select");
const stored = (id) => sections.find((s) => s.id === id).box_treatment;
const patches = () =>
  authedRequest.mock.calls.filter(([, init]) => init?.method === "PATCH");
async function choose(id, value) {
  await colour(id).setValue(value);
  await colour(id).trigger("blur");
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

describe("ChapterEditorView: a breakout box's Colour select", () => {
  it("shows on every breakout box and on no main section", async () => {
    await mountView();
    expect(colour("descartes").exists()).toBe(true);
    expect(colour("new").exists()).toBe(true);
    expect(head("sec").find(".ce-box-colour").exists()).toBe(false);
  });

  it("is labelled, lists the four treatments, and says what Automatic means for this box", async () => {
    await mountView();
    const label = head("descartes").find(".ce-box-colour > span");
    expect(label.text()).toBe("Colour");
    // History's Descartes box is dark by the chapter map; an unmapped box
    // is the pale card.
    expect(
      colour("descartes")
        .findAll("option")
        .map((o) => [o.attributes("value"), o.text()])
    ).toEqual([
      ["", "Automatic (Dark)"],
      ["pale", "Pale card"],
      ["dark", "Dark"],
      ["plate", "Lighter dark"],
      ["chapter", "Chapter colour"],
    ]);
    expect(colour("new").find("option").text()).toBe("Automatic (Pale card)");
    expect(colour("descartes").attributes("disabled")).toBeUndefined();
  });

  it("shows the stored treatment, Automatic when there is none", async () => {
    await mountView();
    expect(colour("descartes").element.value).toBe("");
    expect(colour("new").element.value).toBe("plate");
  });

  it("saves the choice once into sections.box_treatment", async () => {
    await mountView();
    await choose("descartes", "chapter");
    expect(patches()).toHaveLength(1);
    expect(patches()[0][0]).toBe("sections?id=eq.descartes");
    expect(JSON.parse(patches()[0][1].body).box_treatment).toBe("chapter");
    expect(stored("descartes")).toBe("chapter");
    expect(colour("descartes").element.value).toBe("chapter");
    expect(wrapper.text()).toContain("Box colour saved.");

    // Back to Automatic clears the column.
    await choose("descartes", "");
    expect(stored("descartes")).toBeNull();
    expect(colour("descartes").element.value).toBe("");
  });

  it("shows what is stored when a save is refused", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await mountView();
    const original = authedRequest.getMockImplementation();
    authedRequest.mockImplementation(async (path, init = {}) =>
      init.method === "PATCH" ? [] : original(path, init)
    );
    await choose("new", "dark");
    expect(stored("new")).toBe("plate");
    expect(colour("new").element.value).toBe("plate");
    expect(wrapper.text()).toContain("didn't allow");
  });

  it("is offered disabled, saying why, until sections.box_treatment is migrated", async () => {
    api({ column: false });
    await mountView();
    const select = colour("descartes");
    expect(select.exists()).toBe(true);
    expect(select.attributes("disabled")).toBeDefined();
    expect(select.attributes("title")).toMatch(/database update/i);
    expect(head("descartes").find(".ce-box-colour-note").text()).toMatch(
      /database update/i
    );
  });
});

describe("ChapterEditorView: choosing a box colour with the keyboard", () => {
  async function arrowTo(id, values) {
    for (const value of values) await colour(id).setValue(value);
  }
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("steps through the options without saving, then saves the last once, undoable in one step", async () => {
    await mountView();
    await arrowTo("descartes", ["pale", "dark", "plate"]);
    expect(colour("descartes").element.value).toBe("plate");
    expect(patches()).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1000);
    await flushPromises();
    expect(patches()).toHaveLength(1);
    expect(stored("descartes")).toBe("plate");
    expect(wrapper.vm.ed.undoStack.value).toHaveLength(1);
    await wrapper.find(".ce-toast-undo").trigger("click");
    await flushPromises();
    expect(stored("descartes")).toBeNull();
    expect(colour("descartes").element.value).toBe("");
  });

  it("saves at once on Enter, and leaving the select doesn't save again", async () => {
    await mountView();
    await arrowTo("descartes", ["pale", "chapter"]);
    await colour("descartes").trigger("keydown", { key: "Enter" });
    await flushPromises();
    expect(patches()).toHaveLength(1);
    await colour("descartes").trigger("blur");
    await vi.advanceTimersByTimeAsync(1000);
    await flushPromises();
    expect(patches()).toHaveLength(1);
    expect(stored("descartes")).toBe("chapter");
  });

  it("saves nothing when the keys come back to the stored value", async () => {
    await mountView();
    await arrowTo("new", ["dark", "plate"]);
    await vi.advanceTimersByTimeAsync(1000);
    await colour("new").trigger("blur");
    await flushPromises();
    expect(patches()).toHaveLength(0);
    expect(colour("new").element.value).toBe("plate");
  });

  it("on a published chapter, asks once the choice is made, not at each key", async () => {
    api({ published: true });
    await mountView();
    const dialog = () =>
      wrapper
        .findAllComponents({ name: "ConfirmDialog" })
        .find((c) => c.props("title") === "Change a published chapter?");
    await arrowTo("descartes", ["pale", "dark"]);
    expect(dialog().props("modelValue")).toBe(false);
    await vi.advanceTimersByTimeAsync(1000);
    await flushPromises();
    expect(dialog().props("modelValue")).toBe(true);
    // Cancelled: nothing saved, and the select shows what is stored.
    dialog().vm.$emit("update:modelValue", false);
    await flushPromises();
    expect(patches()).toHaveLength(0);
    expect(colour("descartes").element.value).toBe("");
    // Chosen again and confirmed: saved once.
    await arrowTo("descartes", ["chapter"]);
    await colour("descartes").trigger("blur");
    await flushPromises();
    expect(dialog().props("modelValue")).toBe(true);
    dialog().vm.$emit("confirm");
    await flushPromises();
    expect(patches()).toHaveLength(1);
    expect(stored("descartes")).toBe("chapter");
    expect(colour("descartes").element.value).toBe("chapter");
  });
});
