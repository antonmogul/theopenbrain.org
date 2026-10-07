import { afterEach, describe, expect, it } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import IllustrationPlaceholder from "../IllustrationPlaceholder.vue";
let wrapper;
const animation = {
  id: "animationFoundationsFig6",
  figureNumber: 6,
  title: "Ventricular theory",
  images: [
    { src: "/one.jpg", caption: "First" },
    { src: "/two.jpg", caption: "A longer caption ".repeat(50) },
  ],
};
async function openShell() {
  wrapper = mount(IllustrationPlaceholder, {
    props: { animation },
    attachTo: document.body,
    global: { stubs: { Transition: true } },
  });
  const opener = wrapper.get('[aria-label="Expand to full screen"]');
  opener.element.focus();
  await opener.trigger("click");
  await flushPromises();
  return opener;
}
afterEach(() => {
  wrapper?.unmount();
  document.body.innerHTML = "";
});

describe("figure shell dialog", () => {
  it.each([false, true])(
    "keeps a nested gallery's interior Tab navigation above the shell (shift=%s)",
    async (shiftKey) => {
      await openShell();
      document.querySelector(".demo-body .figimg-thumb").click();
      await flushPromises();
      const active = document.querySelector(
        shiftKey ? ".figview-nav--next" : ".figview-close"
      );
      active.focus();
      const event = new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey,
        bubbles: true,
        cancelable: true,
      });
      active.dispatchEvent(event);
      // happy-dom does not emulate the browser's native Tab move; verify it
      // remains available and no lower dialog steals focus in its handler.
      expect(event.defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(active);
      expect(
        document.querySelector(".figview").contains(document.activeElement)
      ).toBe(true);
    }
  );

  it("keeps the reader locked when a nested gallery closes, then restores focus and scroll", async () => {
    const opener = await openShell();
    document.querySelector(".demo-body .figimg-thumb").click();
    await flushPromises();
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(2);
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
    await flushPromises();
    expect(document.querySelector(".figview")).toBeNull();
    expect(document.querySelector(".demo-panel")).not.toBeNull();
    expect(document.body.getAttribute("style")).toContain("overflow: hidden");
    document.querySelector(".demo-close").click();
    await flushPromises();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.style.overflow).toBe("");
    expect(document.activeElement).toBe(opener.element);
  });

  it("cleans both overlays when navigation unmounts the reader", async () => {
    await openShell();
    document.querySelector(".demo-body .figimg-thumb").click();
    await flushPromises();
    wrapper.unmount();
    await flushPromises();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.style.overflow).toBe("");
    expect(document.documentElement.style.overflow).toBe("");
  });
});
