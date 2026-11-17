import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

/*
 * The chapter search in the reader's top bar (OPENBRAIN-197). Stuart,
 * 11 Nov: "where it currently says something like 'Ch 1 Where is my
 * mind?', we can remove that, and replace with a search bar."
 */
const state = vi.hoisted(() => ({ text: null, jumpToId: null, fetched: 0 }));

vi.mock("@/stores", async () => {
  const { reactive } = await import("vue");
  state.text = reactive({ text: null });
  return { useText: () => state.text };
});
vi.mock("@/composables/useAnimations", async () => {
  const { ref } = await import("vue");
  return {
    useAnimations: () => ({
      animations: ref([]),
      fetchAnimations: () => {
        state.fetched += 1;
        return Promise.resolve({ data: [] });
      },
    }),
  };
});
vi.mock("@/helper/readerJump", () => {
  state.jumpToId = vi.fn(() => true);
  return { jumpToId: state.jumpToId };
});

import ReaderSearch from "../ReaderSearch.vue";

const CHAPTER = {
  slug: "foundations-of-neuroscience",
  intro: [],
  sections: [
    {
      id: "mind",
      title: "Where is my mind?",
      paragraphs: [
        { id: "p1", text: "<p>The heart, said Aristotle, holds the mind.</p>" },
        { id: "p2", text: "<p>Galen put the mind in the brain.</p>" },
        { id: "p3", text: "<p>Descartes chose the pineal gland.</p>" },
      ],
    },
  ],
};

let wrapper;
const input = () => wrapper.get('[data-testid="reader-search-input"]');
const panel = () => wrapper.get('[data-testid="reader-search-panel"]');
const rows = () => wrapper.findAll('[role="option"]');
async function type(value) {
  await input().trigger("focus");
  await input().setValue(value);
  await flushPromises();
}
const key = (k) => input().trigger("keydown", { key: k });

beforeEach(() => {
  state.text.text = CHAPTER;
  state.jumpToId.mockClear();
  state.fetched = 0;
  wrapper = mount(ReaderSearch, { attachTo: document.body });
});
afterEach(() => {
  wrapper.unmount();
  document.body.innerHTML = "";
});

describe("ReaderSearch", () => {
  it("is a named combobox over a listbox", () => {
    const field = input();
    expect(field.attributes("role")).toBe("combobox");
    expect(field.attributes("aria-label")).toBe("Search this chapter");
    expect(field.attributes("aria-autocomplete")).toBe("list");
    expect(field.attributes("aria-expanded")).toBe("false");
    const list = wrapper.get(`#${field.attributes("aria-controls")}`);
    expect(list.attributes("role")).toBe("listbox");
    expect(wrapper.get(".search-field").attributes("role")).toBe("search");
  });

  it("does nothing until it is used: no index, no figure request", async () => {
    expect(state.fetched).toBe(0);
    await input().trigger("focus");
    expect(state.fetched).toBe(1);
    expect(wrapper.emitted("open")).toHaveLength(1);
  });

  it("lists results as you type, the words marked", async () => {
    await type("mind");
    expect(panel().isVisible()).toBe(true);
    expect(input().attributes("aria-expanded")).toBe("true");
    // The heading first, then the two paragraphs in reading order.
    expect(rows()).toHaveLength(3);
    expect(rows()[0].text()).toContain("Where is my mind?");
    expect(rows()[0].get("mark").text()).toBe("mind");
    expect(rows()[1].get("mark").text()).toBe("mind");
    expect(wrapper.get('[role="status"]').text()).toBe("3 results");
    // The first row is the active one.
    expect(input().attributes("aria-activedescendant")).toBe(
      rows()[0].attributes("id")
    );
    expect(rows()[0].attributes("aria-selected")).toBe("true");
  });

  it("says so when nothing matches", async () => {
    await type("zebra");
    expect(rows()).toHaveLength(0);
    expect(wrapper.get('[role="status"]').text()).toContain("zebra");
    expect(input().attributes("aria-activedescendant")).toBeUndefined();
  });

  it("the arrows move through the results and wrap", async () => {
    await type("mind");
    await key("ArrowDown");
    expect(rows()[1].attributes("aria-selected")).toBe("true");
    expect(input().attributes("aria-activedescendant")).toBe(
      rows()[1].attributes("id")
    );
    await key("ArrowUp");
    await key("ArrowUp");
    expect(rows()[2].attributes("aria-selected")).toBe("true");
  });

  it("Enter goes to the active result through readerJump, with a flash, and closes", async () => {
    await type("mind");
    await key("ArrowDown");
    await key("Enter");
    await flushPromises();
    expect(state.jumpToId).toHaveBeenCalledWith(
      "p1",
      expect.objectContaining({ align: "top", flash: true })
    );
    expect(panel().isVisible()).toBe(false);
    expect(input().element.value).toBe("");
  });

  it("a press on a result goes to it", async () => {
    await type("pineal");
    await rows()[0].trigger("click");
    await flushPromises();
    expect(state.jumpToId).toHaveBeenCalledWith("p3", expect.anything());
  });

  it("Escape closes the results and empties the field", async () => {
    await type("mind");
    const event = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    input().element.dispatchEvent(event);
    await flushPromises();
    expect(panel().isVisible()).toBe(false);
    expect(input().element.value).toBe("");
    expect(state.jumpToId).not.toHaveBeenCalled();
    // Handled here: the page's own Escape handlers do not also fire.
    expect(event.defaultPrevented).toBe(true);
  });

  it("“/” focuses the field from anywhere on the page, but not while typing elsewhere", async () => {
    const press = (target) => {
      const event = new KeyboardEvent("keydown", {
        key: "/",
        bubbles: true,
        cancelable: true,
      });
      target.dispatchEvent(event);
      return event;
    };
    // happy-dom has no layout: give the field one, as on a wide screen.
    Object.defineProperty(input().element, "offsetParent", {
      get: () => document.body,
    });
    expect(press(document.body).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(input().element);

    input().element.blur();
    const other = document.createElement("textarea");
    document.body.appendChild(other);
    other.focus();
    expect(press(other).defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(other);
  });

  it("on a phone the field is behind a named button that opens it and focuses it", async () => {
    const toggle = wrapper.get('[data-testid="reader-search-toggle"]');
    expect(toggle.attributes("aria-label")).toBe("Search this chapter");
    expect(toggle.attributes("aria-expanded")).toBe("false");
    await toggle.trigger("click");
    await flushPromises();
    expect(toggle.attributes("aria-expanded")).toBe("true");
    expect(wrapper.classes()).toContain("is-expanded");
    expect(document.activeElement).toBe(input().element);
    // Its own close, which puts the field away and returns to the button.
    await wrapper.get('[data-testid="reader-search-close"]').trigger("click");
    await flushPromises();
    expect(wrapper.classes()).not.toContain("is-expanded");
    expect(document.activeElement).toBe(toggle.element);
  });

  it("the × empties a field with words in it and keeps the reader in it", async () => {
    await type("mind");
    const clear = wrapper.get('[data-testid="reader-search-close"]');
    expect(clear.attributes("aria-label")).toBe("Clear search");
    await clear.trigger("click");
    await flushPromises();
    expect(input().element.value).toBe("");
    expect(document.activeElement).toBe(input().element);
  });

  it("forgets what was typed when the chapter changes", async () => {
    await type("mind");
    state.text.text = { ...CHAPTER, slug: "the-retina" };
    await flushPromises();
    expect(input().element.value).toBe("");
    expect(panel().isVisible()).toBe(false);
  });
});
