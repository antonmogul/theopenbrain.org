/*
 * The deck editor's dialogs (OPENBRAIN-129 review): Problems keeps focus in
 * the dialog when Renumber clears its own button; New deck keeps Create
 * enabled and sends an invalid Create to the field to fix; Share says
 * "copied" only when the link is on the clipboard.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import DeckProblems from "../DeckProblems.vue";
import NewDeckDialog from "../NewDeckDialog.vue";
import DeckShareDialog from "../DeckShareDialog.vue";
import { SHARE_ROWS } from "@/stories/deckFixtures.js";

let wrapper;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

const ENTRIES = [
  { id: "a", label: "A", layout: "section", props: { title: "A" } },
  { id: "b", label: "B", layout: "section", props: { title: "B" } },
];
const eyebrow = {
  slideId: "b",
  path: "props.eyebrow",
  level: "warn",
  code: "W_EYEBROW",
  message: "Numbered 03 on slide 2.",
};
const other = {
  slideId: "a",
  path: "props.title",
  level: "warn",
  code: "W_LENGTH",
  message: "Long title.",
};

describe("DeckProblems", () => {
  it("moves focus to the first problem left once Renumber clears itself", async () => {
    // The editor renumbers, and the eyebrow warnings go.
    const Host = defineComponent({
      setup() {
        const problems = ref([eyebrow, other]);
        return () =>
          h(DeckProblems, {
            open: true,
            problems: problems.value,
            entries: ENTRIES,
            onRenumber: () => (problems.value = [other]),
          });
      },
    });
    wrapper = mount(Host, {
      attachTo: document.body,
      global: { stubs: { teleport: true } },
    });
    await flushPromises();
    const renumber = [...document.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === "Renumber eyebrows"
    );
    expect(document.activeElement).toBe(renumber);
    renumber.click();
    await flushPromises();
    expect(document.activeElement.classList).toContain("deck-problems__item");
    expect(document.activeElement.textContent).toContain("Long title.");
  });
});

describe("NewDeckDialog", () => {
  const mountNew = () => {
    wrapper = mount(NewDeckDialog, {
      props: { open: false, takenSlugs: ["funding"] },
      attachTo: document.body,
      global: { stubs: { teleport: true } },
    });
    return wrapper;
  };
  const create = () =>
    [...document.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === "Create"
    );

  it("keeps Create enabled and sends an invalid one to the field to fix", async () => {
    const w = mountNew();
    await w.setProps({ open: true });
    await flushPromises();
    create().focus();
    create().click();
    await flushPromises();
    expect(create().disabled).toBe(false);
    expect(document.activeElement.id).toBe("new-deck-title");
    expect(
      document.getElementById("new-deck-title-desc").textContent
    ).toContain("Give the deck a title.");
    expect(w.emitted("create")).toBeUndefined();

    // A title whose link name is taken: on to the link name.
    await w.get("#new-deck-title").setValue("Funding");
    create().click();
    await flushPromises();
    expect(document.activeElement.id).toBe("new-deck-slug");
  });

  it("says why when Enter in the field to fix can't create", async () => {
    const w = mountNew();
    await w.setProps({ open: true });
    await flushPromises();
    const title = w.get("#new-deck-title");
    title.element.focus();
    await title.trigger("keydown", { key: "Enter" });
    await flushPromises();
    expect(w.get('[aria-live="assertive"]').text()).toBe(
      "Give the deck a title."
    );
  });

  it("states each starter's slide count once", async () => {
    const w = mountNew();
    await w.setProps({ open: true });
    await flushPromises();
    for (const desc of w.findAll(".new-deck__starter-desc"))
      expect(desc.text().match(/\d+ slides?/g)?.length ?? 0).toBeLessThan(2);
    expect(w.text()).not.toContain(" · 9 slides");
  });
});

describe("DeckShareDialog", () => {
  const mountShare = () => {
    wrapper = mount(DeckShareDialog, {
      props: { open: true, deck: SHARE_ROWS.published },
      attachTo: document.body,
      global: { stubs: { teleport: true } },
    });
    return wrapper;
  };
  const copyButton = () =>
    [...document.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === "Copy"
    );

  it("reports copy only when the link is on the clipboard", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn(() => Promise.reject(new Error("denied"))) },
    });
    const w = mountShare();
    await flushPromises();
    copyButton().click();
    await flushPromises();
    expect(w.emitted("copy")).toBeUndefined();
    expect(w.emitted("copy-failed")).toHaveLength(1);
    expect(copyButton().textContent.trim()).toBe("Copy");

    navigator.clipboard.writeText = vi.fn(() => Promise.resolve());
    copyButton().click();
    await flushPromises();
    expect(w.emitted("copy")).toHaveLength(1);
    await nextTick();
  });

  it("names /deck by this site's host", async () => {
    const w = mountShare();
    await flushPromises();
    expect(w.text()).toContain(`Show this deck at ${location.host}/deck`);
    expect(w.text()).not.toContain("theopenbrain.org/deck");
  });
});
