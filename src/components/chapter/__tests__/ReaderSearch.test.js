import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
    expect(press(document.body).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(input().element);

    input().element.blur();
    const other = document.createElement("textarea");
    document.body.appendChild(other);
    other.focus();
    expect(press(other).defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(other);
  });

  it("“/” opens a field that is behind its icon and cannot take focus yet", async () => {
    // Closed, the field is visibility:hidden (display:none on a phone).
    const focus = input().element.focus.bind(input().element);
    input().element.focus = () => {
      if (wrapper.classes().includes("is-expanded")) focus();
    };
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "/", cancelable: true })
    );
    await flushPromises();
    expect(wrapper.classes()).toContain("is-expanded");
    expect(document.activeElement).toBe(input().element);
  });

  // Maura, 25 Nov (OPENBRAIN-92): "on hover, the search line should open
  // and the text should slide in from the left with smooth easing. The
  // line can stay white instead of the accent color."
  describe("pointing at it", () => {
    const source = readFileSync(
      resolve(__dirname, "../ReaderSearch.vue"),
      "utf8"
    );
    const css = source.slice(source.indexOf("<style"));
    const rule = (block, selector) => {
      const at = block.indexOf(`${selector} {`);
      return at < 0 ? "" : block.slice(at, block.indexOf("}", at));
    };
    const wide = css.slice(
      css.indexOf("@media (min-width: 641px) {"),
      css.indexOf("@media (max-width: 640px) {")
    );
    const point = (type, pointerType = "mouse") => {
      const event = new Event(type);
      event.pointerType = pointerType;
      wrapper.element.dispatchEvent(event);
      return wrapper.vm.$nextTick();
    };

    it("shows the field while a mouse points at it, and no longer", async () => {
      await point("pointerenter");
      expect(wrapper.classes()).toContain("is-peek");
      // Seen, not used: the button still says closed, nothing is indexed.
      expect(
        wrapper
          .get('[data-testid="reader-search-toggle"]')
          .attributes("aria-expanded")
      ).toBe("false");
      await point("pointerleave");
      expect(wrapper.classes()).not.toContain("is-peek");
    });

    it("is not opened by a finger passing over it", async () => {
      await point("pointerenter", "touch");
      expect(wrapper.classes()).not.toContain("is-peek");
    });

    it("stays open once the reader is in it, and closes empty when they leave", async () => {
      await point("pointerenter");
      await input().trigger("focus");
      await point("pointerleave");
      expect(wrapper.classes()).toContain("is-expanded");
      await wrapper.trigger("focusout", { relatedTarget: null });
      expect(wrapper.classes()).not.toContain("is-expanded");
    });

    it("opens the line out of the icon and slides the words in from the left", () => {
      const closed = rule(wide, ".search-field");
      expect(closed).toMatch(/width:\s*0;/);
      expect(closed).toMatch(/overflow:\s*hidden/);
      // Out of the tab order while closed, as when it was not drawn.
      expect(closed).toMatch(/visibility:\s*hidden/);
      expect(closed).toMatch(/transition:\s*width /);
      const open = rule(wide, ".reader-search.is-peek .search-field");
      expect(open).toMatch(/width:\s*23rem/);
      expect(open).toMatch(/visibility:\s*visible/);
      expect(rule(wide, ".search-input")).toMatch(/transform:\s*translateX\(-/);
      expect(rule(wide, ".reader-search.is-peek .search-key")).toMatch(
        /transform:\s*none/
      );
    });

    it("rules the field in white, in it or not", () => {
      const focused = rule(css, ".search-field:focus-within");
      expect(focused).toMatch(
        /border-bottom-color:\s*rgb\(var\(--search-ink\)\)/
      );
      expect(css).not.toMatch(/\.search-field[^{]*\{[^}]*--color-accent/);
    });

    it("does not animate under reduced motion", () => {
      expect(css).toMatch(
        /:root\[data-reduce-motion="1"\] \.search-field,[\s\S]*?transition:\s*none/
      );
      const device = css.slice(
        css.indexOf("@media (prefers-reduced-motion: reduce) {")
      );
      expect(device).toMatch(
        /:root:not\(\[data-reduce-motion="0"\]\) \.search-field,/
      );
    });
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
