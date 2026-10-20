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
async function mountShell() {
  wrapper = mount(IllustrationPlaceholder, {
    props: { animation },
    attachTo: document.body,
    global: { stubs: { Transition: true } },
  });
  document.documentElement.setAttribute("data-reduce-motion", "1");
  await flushPromises();
  return wrapper.get('[aria-label="Expand to full screen"]');
}
async function openShell() {
  const opener = await mountShell();
  opener.element.focus();
  await opener.trigger("click");
  await flushPromises();
  return opener;
}
const paneImg = () =>
  document.querySelector(".fig-shell .figimg-gallery-img")?.getAttribute("src");
const dialogImg = () =>
  document.querySelector(".demo-body .figimg-gallery-img")?.getAttribute("src");
afterEach(() => {
  wrapper?.unmount();
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("data-reduce-motion");
});

describe("figure shell dialog", () => {
  it("opens full screen on the image the pane is showing, and the pane follows the dialog", async () => {
    const opener = await mountShell();
    document.querySelector(".fig-shell [aria-label='Next image']").click();
    await flushPromises();
    expect(paneImg()).toBe("/two.jpg");
    await opener.trigger("click");
    await flushPromises();
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(dialogImg()).toBe("/two.jpg");
    // The dialog's arrows sit inside its stage box, like the pane's.
    const stage = document.querySelector(".demo-body .figimg-stage");
    expect(stage.querySelector(".figimg-nav--prev")).not.toBeNull();
    expect(stage.querySelector(".figimg-nav--next")).not.toBeNull();
    stage.querySelector(".figimg-nav--next").click();
    await flushPromises();
    expect(dialogImg()).toBe("/one.jpg");
    expect(paneImg()).toBe("/one.jpg");
  });

  it("closes on Esc, then restores focus and scroll", async () => {
    const opener = await openShell();
    expect(document.body.getAttribute("style")).toContain("overflow: hidden");
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
    await flushPromises();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.style.overflow).toBe("");
    expect(document.activeElement).toBe(opener.element);
  });

  it("cleans the overlay when navigation unmounts the reader", async () => {
    await openShell();
    wrapper.unmount();
    await flushPromises();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.style.overflow).toBe("");
    expect(document.documentElement.style.overflow).toBe("");
  });
});
