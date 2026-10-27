/*
 * The chapter editor's Move up / Move down arrows (OPENBRAIN-150). A move is
 * a park-then-assign on (section_id, order_index): rows go to a PARK slot,
 * then to their new place. Two moves in flight at once read the same stale
 * order and collide on the park slots, so a double-click gave a 409 toast
 * or a wrong final order. The arrows now wait for the save (ed.saving) as
 * well as for the list bounds, and come back once it lands.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DOMWrapper, flushPromises, shallowMount } from "@vue/test-utils";

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

const para = (id, section_id, order_index) => ({
  id,
  section_id,
  order_index,
  content: { blocks: [{ type: "text", content: `Paragraph ${id}.` }] },
  content_text: `Paragraph ${id}.`,
  is_subsection_header: false,
  subsection_level: 0,
  animation_id: null,
  animation_trigger: null,
});

let rows;
let secs;
// Every PATCH waits here until the test releases it, so a save can be held
// in flight while the arrows are inspected and clicked again.
let release;
let held;
function api() {
  rows = [para("a", "one", 0), para("b", "one", 1), para("c", "one", 2)];
  secs = [
    { id: "one", title: "One", slug: "one", order_index: 1 },
    { id: "two", title: "Two", slug: "two", order_index: 2 },
  ];
  held = new Promise((resolve) => (release = resolve));
  authedRequest.mockImplementation(async (path, init = {}) => {
    // Writes first: a section PATCH is also `sections?...`.
    if (init.method === "PATCH") {
      await held;
      const id = (path.match(/id=eq\.([^&]+)/) || [])[1];
      const table = path.startsWith("sections?") ? secs : rows;
      const row = table.find((r) => r.id === id);
      Object.assign(row, JSON.parse(init.body));
      return [structuredClone(row)];
    }
    if (path.startsWith("modules?"))
      return [
        {
          id: "m",
          slug: "attention",
          title: "Attention",
          status: "draft",
          order_index: 3,
        },
      ];
    if (path.startsWith("sections?")) return secs.map((s) => ({ ...s }));
    if (path.startsWith("animations?")) return [];
    if (path.startsWith("paragraphs?section_id"))
      return rows.map((r) => structuredClone(r));
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
// Rows and sections are found through a live component instance in each
// (BlockPreview; the section's end-of-section InsertMenu), not by querying
// the DOM: happy-dom 13 leaves a stale copy of a keyed <template v-for>
// fragment behind when Vue moves it, so after a reorder a plain query would
// also return leftovers no render owns. Order is the render's order.
const blocks = () =>
  wrapper
    .findAllComponents({ name: "BlockPreview" })
    .map((c) => c.element.closest(".ce-block"));
const sections = () =>
  wrapper
    .findAllComponents({ name: "InsertMenu" })
    .filter((c) => /^Add a block at the end of/.test(c.props("label")))
    .map((c) => c.element.closest(".ce-section"));
const arrow = (el, label) => el.querySelector(`button[aria-label="${label}"]`);
const disabledOf = (scope, label) =>
  scope().map((el) => arrow(el, label).disabled);
// trigger() fires nothing on a disabled element, as a browser does.
const click = (el, label) => new DOMWrapper(arrow(el, label)).trigger("click");
const orderPatches = () =>
  authedRequest.mock.calls.filter(
    ([, init]) => init?.method === "PATCH" && /order_index/.test(init.body)
  );
// The held PATCHes resolve in two phases (park, then assign) for a block
// and three for a section; each needs its own turn of the microtask queue.
async function settle() {
  for (let i = 0; i < 6; i++) await flushPromises();
}

beforeEach(() => {
  vi.clearAllMocks();
  api();
});
afterEach(() => {
  wrapper?.unmount();
  vi.restoreAllMocks();
});

describe("ChapterEditorView: move arrows while a save is in flight", () => {
  it("are enabled at rest, within the list bounds", async () => {
    await mountView();
    expect(wrapper.vm.ed.saving.value).toBe(false);
    // Blocks a, b, c: only the first can't go up, only the last can't go down.
    expect(disabledOf(blocks, "Move up")).toEqual([true, false, false]);
    expect(disabledOf(blocks, "Move down")).toEqual([false, false, true]);
    expect(disabledOf(sections, "Move section up")).toEqual([true, false]);
    expect(disabledOf(sections, "Move section down")).toEqual([false, true]);
  });

  it("disable every block and section arrow until the move lands, so a second click issues no colliding writes", async () => {
    await mountView();
    await click(blocks()[0], "Move down");
    await flushPromises();
    // The park phase is out and waiting; the arrows are all off.
    expect(wrapper.vm.ed.saving.value).toBe(true);
    const parked = orderPatches().length;
    expect(parked).toBe(2);
    expect(disabledOf(blocks, "Move up")).toEqual([true, true, true]);
    expect(disabledOf(blocks, "Move down")).toEqual([true, true, true]);
    expect(disabledOf(sections, "Move section up")).toEqual([true, true]);
    expect(disabledOf(sections, "Move section down")).toEqual([true, true]);
    // A second click, on a block or a section, reaches no handler: no new
    // writes while the first move is parked.
    await click(blocks()[1], "Move down");
    await click(sections()[0], "Move section down");
    await flushPromises();
    expect(orderPatches().length).toBe(parked);

    release();
    await settle();
    expect(wrapper.vm.ed.saving.value).toBe(false);
    // Park + assign for the two swapped rows, nothing else.
    expect(orderPatches().length).toBe(4);
    expect(rows.map((r) => [r.id, r.order_index])).toEqual([
      ["a", 1],
      ["b", 0],
      ["c", 2],
    ]);
    // Back in the new order, b a c, and the arrows are usable again.
    expect(disabledOf(blocks, "Move up")).toEqual([true, false, false]);
    expect(disabledOf(blocks, "Move down")).toEqual([false, false, true]);
    expect(disabledOf(sections, "Move section down")).toEqual([false, true]);
    // Not permanently off: the next move goes through.
    await click(blocks()[0], "Move down");
    await settle();
    expect(orderPatches().length).toBe(8);
    expect(rows.map((r) => [r.id, r.order_index])).toEqual([
      ["a", 0],
      ["b", 1],
      ["c", 2],
    ]);
  });

  it("the same for a section move", async () => {
    await mountView();
    await click(sections()[0], "Move section down");
    await flushPromises();
    expect(wrapper.vm.ed.saving.value).toBe(true);
    expect(disabledOf(sections, "Move section up")).toEqual([true, true]);
    expect(disabledOf(sections, "Move section down")).toEqual([true, true]);
    expect(disabledOf(blocks, "Move down")).toEqual([true, true, true]);
    // The section is parked at bare PARK; a second move would park there too.
    const parked = orderPatches().length;
    expect(parked).toBe(1);
    await click(sections()[0], "Move section down");
    await click(blocks()[0], "Move down");
    await flushPromises();
    expect(orderPatches().length).toBe(parked);

    release();
    await settle();
    expect(wrapper.vm.ed.saving.value).toBe(false);
    expect(orderPatches().length).toBe(3);
    expect(secs.map((s) => [s.id, s.order_index])).toEqual([
      ["one", 2],
      ["two", 1],
    ]);
    expect(disabledOf(sections, "Move section up")).toEqual([true, false]);
    expect(disabledOf(sections, "Move section down")).toEqual([false, true]);
  });
});
