/*
 * DeckSlideRail (OPENBRAIN-129): the keyboard contract (arrows select,
 * Alt+arrows reorder, Delete removes and moves on) and the item menu. In the
 * 1024–1279px strip the list scrolls sideways and clipped the menu that
 * opened inside it, so there the menu moves to <body> under its button.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { FUNDING_DECK } from "@/data/decks/funding.js";
import DeckSlideRail from "../DeckSlideRail.vue";

const ENTRIES = FUNDING_DECK.slice(0, 4);
const ids = ENTRIES.map((e) => e.id);

let wrapper;
let railWidth = 220;
const RealResizeObserver = globalThis.ResizeObserver;

beforeEach(() => {
  railWidth = 220;
  // The rail picks column or strip from its own width.
  globalThis.ResizeObserver = class {
    constructor(callback) {
      this.callback = callback;
    }
    observe() {
      this.callback([{ contentRect: { width: railWidth } }]);
    }
    disconnect() {}
  };
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
  globalThis.ResizeObserver = RealResizeObserver;
});

async function mountRail(props = {}) {
  wrapper = mount(DeckSlideRail, {
    props: { entries: ENTRIES, selectedId: ids[1], ...props },
    attachTo: document.body,
  });
  await nextTick();
  return wrapper;
}
const slideButton = (w, id) => w.get(`[data-slide-id="${id}"]`);

describe("DeckSlideRail · keyboard", () => {
  it("names each slide and marks the selected one", async () => {
    const w = await mountRail();
    const selected = slideButton(w, ids[1]);
    expect(selected.attributes("aria-current")).toBe("true");
    expect(selected.attributes("aria-label")).toMatch(/^Slide 2: /);
    expect(selected.attributes("tabindex")).toBe("0");
    expect(slideButton(w, ids[0]).attributes("tabindex")).toBe("-1");
  });

  it("selects with the arrows and reorders with Alt+arrows", async () => {
    const w = await mountRail();
    await slideButton(w, ids[1]).trigger("keydown", { key: "ArrowDown" });
    expect(w.emitted("select")).toEqual([[ids[2]]]);

    await slideButton(w, ids[1]).trigger("keydown", {
      key: "ArrowUp",
      altKey: true,
    });
    expect(w.emitted("move")).toEqual([[ids[1], -1]]);
    await nextTick();
    expect(w.get("p[aria-live]").text()).toBe("Slide moved to position 1.");

    // Nothing to move past the ends.
    await slideButton(w, ids[0]).trigger("keydown", {
      key: "ArrowUp",
      altKey: true,
    });
    expect(w.emitted("move")).toHaveLength(1);
  });

  it("removes with Delete and selects the next slide, or the previous at the end", async () => {
    const w = await mountRail();
    await slideButton(w, ids[1]).trigger("keydown", { key: "Delete" });
    expect(w.emitted("remove")).toEqual([[ids[1]]]);
    expect(w.emitted("select").at(-1)).toEqual([ids[2]]);

    await slideButton(w, ids[3]).trigger("keydown", { key: "Backspace" });
    expect(w.emitted("remove").at(-1)).toEqual([ids[3]]);
    expect(w.emitted("select").at(-1)).toEqual([ids[2]]);
  });
});

describe("DeckSlideRail · item menu", () => {
  it("opens below its button inside the item in the column", async () => {
    const w = await mountRail();
    await w.get(`[data-menu-for="${ids[1]}"]`).trigger("click");
    const menu = document.getElementById(`deck-rail-menu-${ids[1]}`);
    expect(menu).not.toBeNull();
    expect(menu.closest(".deck-rail__item")).not.toBeNull();
    expect(menu.style.position).toBe("");
    expect(document.activeElement?.textContent).toMatch(/Move\s+slide 2\s+up/);
  });

  it("moves to <body> under its button in the strip, and its actions still run", async () => {
    railWidth = 960;
    const w = await mountRail();
    const button = w.get(`[data-menu-for="${ids[1]}"]`);
    vi.spyOn(button.element, "getBoundingClientRect").mockReturnValue({
      top: 240,
      bottom: 268,
      left: 260,
      right: 288,
      width: 28,
      height: 28,
    });
    await button.trigger("click");
    await nextTick();
    const menu = document.getElementById(`deck-rail-menu-${ids[1]}`);
    expect(menu.parentElement).toBe(document.body);
    expect(menu.style.position).toBe("fixed");
    expect(menu.style.top).toBe("272px");
    expect(menu.style.left).toBe("96px");

    // A press inside the moved menu must not count as "outside".
    const duplicate = [...menu.querySelectorAll("button")].find((b) =>
      /Duplicate/.test(b.textContent)
    );
    duplicate.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    duplicate.click();
    await nextTick();
    expect(w.emitted("duplicate")).toEqual([[ids[1]]]);
    expect(document.getElementById(`deck-rail-menu-${ids[1]}`)).toBeNull();
  });

  it("closes the strip menu when something scrolls, and on Escape refocuses its button", async () => {
    railWidth = 960;
    const w = await mountRail();
    const button = w.get(`[data-menu-for="${ids[2]}"]`);
    await button.trigger("click");
    window.dispatchEvent(new Event("scroll"));
    await nextTick();
    expect(document.getElementById(`deck-rail-menu-${ids[2]}`)).toBeNull();

    await button.trigger("click");
    const menu = document.getElementById(`deck-rail-menu-${ids[2]}`);
    menu.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    await nextTick();
    await nextTick();
    expect(document.getElementById(`deck-rail-menu-${ids[2]}`)).toBeNull();
    expect(document.activeElement).toBe(button.element);
  });
});

describe("DeckSlideRail · focus", () => {
  it("makes only the selected slide's Actions button a tab stop", async () => {
    const w = await mountRail();
    const more = (id) => w.get(`[data-menu-for="${id}"]`);
    expect(more(ids[1]).attributes("tabindex")).toBe("0");
    for (const id of [ids[0], ids[2], ids[3]])
      expect(more(id).attributes("tabindex")).toBe("-1");
    await w.setProps({ selectedId: ids[3] });
    expect(more(ids[3]).attributes("tabindex")).toBe("0");
    expect(more(ids[1]).attributes("tabindex")).toBe("-1");
  });

  it("puts focus back on Actions before an action opens a dialog", async () => {
    const w = await mountRail();
    let focusedAtAdd = null;
    await w.setProps({ onAdd: () => (focusedAtAdd = document.activeElement) });
    const actions = w.get(`[data-menu-for="${ids[1]}"]`);
    actions.element.focus();
    await actions.trigger("click");
    await nextTick();
    const add = [...document.querySelectorAll(".deck-rail__menu button")].find(
      (b) => /Add slide below/.test(b.textContent)
    );
    add.focus();
    add.click();
    // The dialog records whatever has focus when it opens: the Actions
    // button, which stays on the page, not the menu item about to go.
    expect(focusedAtAdd).toBe(actions.element);
  });
});
