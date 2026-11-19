import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import {
  REVIEW_KEYS,
  reloadReviewState,
  resetReviewForTests,
  setReviewTransport,
} from "@/composables/useReviewFeedback";
import ReviewPointer from "../ReviewPointer.vue";
import ReviewWidget from "../ReviewWidget.vue";

const jump = vi.hoisted(() => ({ toElement: vi.fn(() => true) }));
vi.mock("@/helper/readerJump", () => ({
  jumpToId: vi.fn(),
  jumpToElement: jump.toElement,
  flashElement: vi.fn(),
  scrollToY: vi.fn(),
}));

const PAGE = `
<main id="text">
  <section class="reader-section" data-section-slug="photoreceptors">
    <h2 class="T">Photoreceptors</h2>
    <div id="p1" class="P" data-paragraph-id="11111111-0000-4000-8000-000000000002">Rods and cones.</div>
  </section>
</main>`;

let submit;
let list;
const NOTE_ID = "aaaaaaaa-0000-4000-8000-000000000001";
const ROWS = [
  {
    id: NOTE_ID,
    parent_id: null,
    created_at: "2026-11-18T10:00:00Z",
    type: "content",
    note: "Say how much more sensitive.",
    anchor: {
      v: 1,
      kind: "paragraph",
      label: "¶ 1 in “Photoreceptors”",
      paragraphId: "11111111-0000-4000-8000-000000000002",
      sectionSlug: "photoreceptors",
    },
    reviewer_name: "Maura",
    reviewer_role: "designer",
    status: "new",
  },
  {
    id: "aaaaaaaa-0000-4000-8000-000000000002",
    parent_id: NOTE_ID,
    created_at: "2026-11-18T11:00:00Z",
    type: "note",
    note: "Agreed, 100 times.",
    anchor: {},
    reviewer_name: "Stuart",
    reviewer_role: "author",
    status: "new",
  },
];
beforeEach(() => {
  document.body.innerHTML = PAGE;
  resetReviewForTests();
  localStorage.setItem(
    REVIEW_KEYS.identity,
    JSON.stringify({ name: "Stuart", role: "author" })
  );
  reloadReviewState();
  submit = vi.fn().mockResolvedValue({ id: "row-1", status: "new" });
  list = vi.fn().mockResolvedValue(ROWS);
  setReviewTransport({
    submit,
    statuses: vi.fn().mockResolvedValue([]),
    list,
  });
  document.elementsFromPoint = () => [];
});
afterEach(() => {
  setReviewTransport(null);
  delete document.elementsFromPoint;
  document.body.innerHTML = "";
});

const mountWidget = (props = {}) =>
  mount(ReviewWidget, {
    props: {
      chapterSlug: "the-retina",
      force: true,
      figureRecords: [],
      ...props,
    },
    attachTo: document.body,
    global: { stubs: { Teleport: true } },
  });

describe("ReviewWidget", () => {
  it("is a Feedback button until opened", async () => {
    const w = mountWidget();
    expect(w.find('[data-testid="review-fab"]').exists()).toBe(true);
    expect(w.find('[data-testid="review-panel"]').exists()).toBe(false);
    await w.get('[data-testid="review-fab"]').trigger("click");
    expect(w.find('[data-testid="review-panel"]').exists()).toBe(true);
    w.unmount();
  });

  it("asks a first-time reviewer who they are", async () => {
    resetReviewForTests();
    const w = mountWidget({ startOpen: true });
    await flushPromises();
    expect(w.find('[data-testid="review-name"]').exists()).toBe(true);
    await w.get('[data-testid="review-name"]').setValue("Maura");
    await w.get('[data-testid="review-name-save"]').trigger("submit");
    expect(w.find('[data-testid="review-note"]').exists()).toBe(true);
    expect(JSON.parse(localStorage.getItem(REVIEW_KEYS.identity)).name).toBe(
      "Maura"
    );
    w.unmount();
  });

  it("starts from a selection: the passage, its paragraph, a text note", async () => {
    const w = mountWidget();
    w.vm.startFromSelection({
      text: "Rods and cones",
      paragraphElement: document.getElementById("p1"),
    });
    await flushPromises();
    expect(w.get('[data-testid="review-place-label"]').text()).toBe(
      "¶ 1 in “Photoreceptors”"
    );
    expect(w.get('[data-testid="review-quote"]').element.value).toBe(
      "Rods and cones"
    );
    expect(w.get('[data-testid="review-type-content"]').element.checked).toBe(
      true
    );
    await w.get('[data-testid="review-suggested"]').setValue("Rods and cones.");
    await w.get("form.rv-form").trigger("submit");
    await flushPromises();
    expect(submit).toHaveBeenCalledTimes(1);
    const p = submit.mock.calls[0][0];
    expect(p).toMatchObject({
      chapter_slug: "the-retina",
      type: "content",
      quote: "Rods and cones",
      suggested_text: "Rods and cones.",
      paragraph_id: "11111111-0000-4000-8000-000000000002",
      reviewer_name: "Stuart",
    });
    expect(p.anchor).toMatchObject({ kind: "paragraph", via: "selection" });
    expect(w.get('[data-testid="review-status"]').text()).toBe(
      "Sent. Thank you."
    );
    w.unmount();
  });

  it("keeps the note when the database is not there yet", async () => {
    submit.mockRejectedValue(new Error("API Error 404"));
    const w = mountWidget({ startOpen: true });
    await flushPromises();
    await w.get('[data-testid="review-note"]').setValue("The legend is wrong.");
    await w.get("form.rv-form").trigger("submit");
    await flushPromises();
    expect(w.get('[data-testid="review-status"]').text()).toMatch(
      /Saved in this browser/
    );
    expect(w.get('[data-testid="review-fab"]').text()).toContain("1");
    w.unmount();
  });

  it("points: the panel gives way to the layer, and comes back with the place", async () => {
    const w = mountWidget({ startOpen: true });
    await flushPromises();
    await w.get('[data-testid="review-point"]').trigger("click");
    expect(w.find('[data-testid="review-panel"]').exists()).toBe(false);
    const pointer = w.findComponent(ReviewPointer);
    expect(pointer.exists()).toBe(true);
    pointer.vm.$emit("pick", {
      v: 1,
      kind: "figure-pane",
      label: "Fig 08 · The cell doctrine",
      figureKey: "animationFoundationsFig6",
      via: "point",
    });
    await flushPromises();
    expect(w.get('[data-testid="review-place-label"]').text()).toBe(
      "Fig 08 · The cell doctrine"
    );
    expect(w.get('[data-testid="review-type-figure"]').element.checked).toBe(
      true
    );
    expect(w.get('[data-testid="review-point"]').text()).toBe("Point again");
    w.unmount();
  });

  it("is not there when this browser said ?review=off", () => {
    localStorage.setItem(REVIEW_KEYS.off, "1");
    const w = mount(ReviewWidget, {
      props: { chapterSlug: "x", figureRecords: [] },
    });
    expect(w.find('[data-testid="review-fab"]').exists()).toBe(false);
    localStorage.removeItem(REVIEW_KEYS.off);
    w.unmount();
  });
});

describe("All notes", () => {
  it("lists the chapter only once the panel asks, threads replies, and replies", async () => {
    const w = mountWidget({ startOpen: true });
    await flushPromises();
    // Nothing fetched on mount.
    expect(list).not.toHaveBeenCalled();
    await w.get('[data-testid="review-tab-all"]').trigger("click");
    await flushPromises();
    expect(list).toHaveBeenCalledWith("the-retina");
    const rows = w.findAll('[data-testid="review-all-note"]');
    expect(rows).toHaveLength(1);
    expect(rows[0].text()).toContain("Maura");
    expect(rows[0].text()).toContain("Photoreceptors");
    expect(rows[0].text()).toContain("Agreed, 100 times.");

    await w.get('[data-testid="review-all-show"]').trigger("click");
    expect(jump.toElement).toHaveBeenCalledWith(
      document.getElementById("p1"),
      expect.objectContaining({ flash: true })
    );

    await w.get('[data-testid="review-reply-open"]').trigger("click");
    await w.get('[data-testid="review-reply-text"]').setValue("Disagree.");
    await w.get('[data-testid="review-reply-send"]').trigger("click");
    await flushPromises();
    const p = submit.mock.calls.at(-1)[0];
    expect(p).toMatchObject({
      parent_id: NOTE_ID,
      note: "Disagree.",
      section_slug: "photoreceptors",
    });
    expect(list).toHaveBeenCalledTimes(2);
    w.unmount();
  });

  it("pins the notes in view when asked, and a pin opens its note", async () => {
    const p1 = document.getElementById("p1");
    p1.getBoundingClientRect = () => ({
      left: 100,
      top: 200,
      width: 400,
      height: 100,
      right: 500,
      bottom: 300,
    });
    const w = mountWidget({ startOpen: true });
    await flushPromises();
    await w.get('[data-testid="review-tab-all"]').trigger("click");
    await flushPromises();
    await w.get('[data-testid="review-pins"]').setValue(true);
    await new Promise((r) => setTimeout(r, 40));
    await flushPromises();
    const pin = w.find('[data-testid="review-pin"]');
    expect(pin.exists()).toBe(true);
    expect(pin.text()).toContain("● 1");
    expect(pin.attributes("aria-label")).toContain("New");
    w.unmount();
  });
});

describe("ReviewPointer", () => {
  it("a click picks the meaningful thing under it; Escape cancels", async () => {
    const p1 = document.getElementById("p1");
    p1.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 200,
      height: 100,
      right: 200,
      bottom: 100,
    });
    const w = mount(ReviewPointer, {
      attachTo: document.body,
      global: { stubs: { Teleport: true } },
    });
    const layer = w.get('[data-testid="review-pointer"]').element;
    document.elementsFromPoint = () => [layer, p1, p1.parentElement];
    await w.get('[data-testid="review-pointer"]').trigger("click", {
      clientX: 50,
      clientY: 25,
    });
    const [anchor] = w.emitted("pick")[0];
    expect(anchor).toMatchObject({
      kind: "paragraph",
      paragraphId: "11111111-0000-4000-8000-000000000002",
      point: { x: 0.25, y: 0.25 },
      via: "point",
    });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(w.emitted("cancel")).toHaveLength(1);
    w.unmount();
  });
});
