import { afterEach, describe, expect, it } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import IllustrationPlaceholder from "../IllustrationPlaceholder.vue";

/* OPENBRAIN-84 (Maura, 25 Nov): a figure whose row says `fill: true` covers
   the whole pane above its toolbar row, cropped around `focus`. Only the
   pane: the text column and the fullscreen dialog show the whole picture. */
const PLATO = {
  id: "animationFoundationsPlatoAristotle",
  figureNumber: 6,
  title: "Plato, Aristotle, and the debate of head vs. heart",
  caption: "Plato and his pupil Aristotle.",
  placeholder: true,
  images: [
    {
      src: "/publicAssets/video/foundations/plato-aristotle-loop.webp",
      alt: "Plato holds a brain; Aristotle holds a heart.",
      loop: {
        webm: "/publicAssets/video/foundations/plato-aristotle-loop.webm",
        mp4: "/publicAssets/video/foundations/plato-aristotle-loop.mp4",
        width: 960,
        height: 1280,
      },
    },
  ],
};
const FILLED = { ...PLATO, fill: true, focus: "50% 15%" };

let wrapper;
const mountShell = (animation, props = {}) =>
  (wrapper = mount(IllustrationPlaceholder, {
    attachTo: document.body,
    props: { animation, ...props },
    global: { stubs: { Transition: true } },
  }));
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
});

describe("a figure that fills the pane", () => {
  it("covers the pane around its focal point, with no air above it", () => {
    mountShell(FILLED);
    expect(wrapper.get(".fig-area").classes()).toContain("fig-area--fill");
    const figure = wrapper.get(".fig-shell .figimg");
    expect(figure.classes()).toContain("figimg--fill");
    expect(figure.element.style.getPropertyValue("--figimg-focus")).toBe(
      "50% 15%"
    );
    // The toolbar row is still there, under the artwork.
    expect(wrapper.get(".fig-toolbar .fig-label").text()).toBe("FIG 06");
  });

  it("leaves a figure without the flag as it was", () => {
    mountShell(PLATO);
    expect(wrapper.get(".fig-area").classes()).not.toContain("fig-area--fill");
    expect(wrapper.find(".figimg--fill").exists()).toBe(false);
  });

  it("shows the whole picture in the text column", () => {
    mountShell(FILLED, { inline: true });
    expect(wrapper.get(".fig-area").classes()).not.toContain("fig-area--fill");
    expect(wrapper.find(".figimg--fill").exists()).toBe(false);
    expect(wrapper.find(".figimg--flow").exists()).toBe(true);
  });

  it("shows the whole picture in the fullscreen dialog", async () => {
    mountShell(FILLED);
    await wrapper.get(".fig-fs-btn").trigger("click");
    await flushPromises();
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog.querySelector(".figimg")).not.toBeNull();
    expect(dialog.querySelector(".figimg--fill")).toBeNull();
    expect(dialog.querySelector(".fig-area--fill")).toBeNull();
    // The pane behind it keeps its crop.
    expect(wrapper.find(".fig-shell .figimg--fill").exists()).toBe(true);
  });
});
