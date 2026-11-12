/*
 * The figure shell in a pane (OPENBRAIN-177): the legend folded behind its
 * control, a gallery opening as the grid, and the fullscreen dialog keeping
 * the pane's ground. In the text column the legend folds too, under the
 * artwork (OPENBRAIN-190).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick } from "vue";
import ScrollTrigger from "gsap/ScrollTrigger";
import IllustrationPlaceholder from "../IllustrationPlaceholder.vue";

vi.mock("gsap/ScrollTrigger", () => ({
  default: { refresh: vi.fn() },
}));

const SINGLE = {
  id: "animationFoundationsFig1",
  figureNumber: 1,
  title: "Trepanned Incan skull",
  caption: "An Incan skull, acquired by Squier and studied by Broca.",
  images: [{ src: "/skull.jpg" }],
};
const TEN = {
  id: "animationFoundationsFig6",
  figureNumber: 6,
  title: "The cell doctrine",
  images: Array.from({ length: 10 }, (_, i) => ({
    src: `/plate-${i + 1}.jpg`,
    caption: `Plate ${i + 1}`,
  })),
};

let wrapper;
let host;
/* Mounted inside a stand-in for the reader: `.chapter-reader` with the
   figure pane, whose data-ground is what a figure anywhere in the chapter
   takes its dialog's ground from. */
function mountShell(animation, { inline = false, ground, inPane = true } = {}) {
  host = document.createElement("div");
  host.className = "chapter-reader";
  const pane = document.createElement("div");
  pane.className = "figure-pane";
  if (ground) pane.dataset.ground = ground;
  const column = document.createElement("div");
  host.append(pane, column);
  document.body.append(host);
  wrapper = mount(IllustrationPlaceholder, {
    props: { animation, inline },
    attachTo: inPane ? pane : column,
    global: { stubs: { Transition: true } },
  });
  return wrapper;
}
const legend = () => wrapper.find(".fig-legend");
const button = () => wrapper.find(".fig-legend-btn");
const toolbar = () => wrapper.find(".fig-toolbar");
const panel = () => document.querySelector(".demo-panel");

beforeEach(() => {
  document.documentElement.setAttribute("data-reduce-motion", "1");
  ScrollTrigger.refresh.mockClear();
});
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("data-reduce-motion");
  vi.useRealTimers();
});

describe("figure shell: the legend folded in the pane", () => {
  it("keeps the legend in the document, folded behind a labelled control", () => {
    mountShell(SINGLE);
    // Still there for a screen reader, as the figure's caption.
    expect(legend().element.tagName).toBe("FIGCAPTION");
    expect(legend().text()).toBe(SINGLE.caption);
    expect(legend().classes()).toContain("fig-legend--folds");
    expect(legend().classes()).not.toContain("is-open");
    expect(button().element.tagName).toBe("BUTTON");
    expect(button().text()).toBe("Legend");
    expect(button().attributes("aria-expanded")).toBe("false");
    expect(button().attributes("aria-controls")).toBe(
      legend().attributes("id")
    );
    expect(toolbar().classes()).toContain("fig-toolbar--folded");
  });

  it("keeps it open on a click: in the flow, under the title", async () => {
    mountShell(SINGLE);
    await button().trigger("click");
    expect(button().attributes("aria-expanded")).toBe("true");
    expect(legend().classes()).not.toContain("fig-legend--folds");
    expect(toolbar().classes()).not.toContain("fig-toolbar--folded");
    await button().trigger("click");
    expect(button().attributes("aria-expanded")).toBe("false");
    expect(legend().classes()).toContain("fig-legend--folds");
    expect(legend().classes()).not.toContain("is-open");
  });

  it("floats it for a look on keyboard focus, and folds it on blur", async () => {
    mountShell(SINGLE);
    await button().trigger("focus");
    expect(legend().classes()).toContain("is-open");
    // A look is not a choice: the control still reads collapsed.
    expect(button().attributes("aria-expanded")).toBe("false");
    await button().trigger("blur");
    expect(legend().classes()).not.toContain("is-open");
  });

  it("floats it when a mouse rests on the title, after a beat, until it leaves the toolbar", async () => {
    vi.useFakeTimers();
    mountShell(SINGLE);
    await wrapper
      .find(".fig-name")
      .trigger("pointerover", { pointerType: "mouse" });
    vi.advanceTimersByTime(100);
    await nextTick();
    expect(legend().classes()).not.toContain("is-open");
    vi.advanceTimersByTime(60);
    await nextTick();
    expect(legend().classes()).toContain("is-open");
    await toolbar().trigger("pointerleave");
    expect(legend().classes()).not.toContain("is-open");
    // A pointer that only crosses the title never opens it...
    await wrapper
      .find(".fig-name")
      .trigger("pointerover", { pointerType: "mouse" });
    await toolbar().trigger("pointerleave");
    vi.advanceTimersByTime(500);
    await nextTick();
    expect(legend().classes()).not.toContain("is-open");
    // ...and a finger's tap is a click, not a hover.
    await wrapper
      .find(".fig-name")
      .trigger("pointerover", { pointerType: "touch" });
    vi.advanceTimersByTime(500);
    await nextTick();
    expect(legend().classes()).not.toContain("is-open");
  });

  it("closes on Escape", async () => {
    mountShell(SINGLE);
    await button().trigger("click");
    await button().trigger("keydown", { key: "Escape" });
    expect(button().attributes("aria-expanded")).toBe("false");
    expect(legend().classes()).toContain("fig-legend--folds");
  });

  it("has no control when the figure has no legend", () => {
    mountShell({ ...SINGLE, caption: "" });
    expect(button().exists()).toBe(false);
    expect(legend().exists()).toBe(false);
  });
});

// Stuart on his phone, 12 Nov (OPENBRAIN-190): legends of different lengths
// above the plate moved the image and its arrows at every step.
describe("figure shell: the legend folded in the text column", () => {
  const row = () => wrapper.find(".fig-legend-row");

  it("folds it under the artwork, behind the same control, nothing in the toolbar", () => {
    mountShell(SINGLE, { inline: true, inPane: false });
    expect(toolbar().classes()).not.toContain("fig-toolbar--pane");
    expect(toolbar().find(".fig-legend").exists()).toBe(false);
    expect(toolbar().find(".fig-legend-btn").exists()).toBe(false);
    // Under the artwork: the row follows the diagram area.
    expect(row().element.previousElementSibling.classList).toContain(
      "fig-area"
    );
    expect(legend().element.tagName).toBe("FIGCAPTION");
    expect(legend().text()).toBe(SINGLE.caption);
    expect(legend().classes()).toContain("fig-legend--folds");
    expect(button().text()).toBe("Legend");
    expect(button().attributes("aria-expanded")).toBe("false");
    expect(button().attributes("aria-controls")).toBe(
      legend().attributes("id")
    );
  });

  it("opens on a tap, with no look on focus, and re-measures the page", async () => {
    mountShell(SINGLE, { inline: true, inPane: false });
    await button().trigger("focus");
    expect(legend().classes()).toContain("fig-legend--folds");
    await button().trigger("click");
    await nextTick();
    expect(button().attributes("aria-expanded")).toBe("true");
    expect(legend().classes()).not.toContain("fig-legend--folds");
    expect(ScrollTrigger.refresh).toHaveBeenCalledTimes(1);
    await button().trigger("keydown", { key: "Escape" });
    await nextTick();
    expect(button().attributes("aria-expanded")).toBe("false");
    expect(legend().classes()).toContain("fig-legend--folds");
    expect(ScrollTrigger.refresh).toHaveBeenCalledTimes(2);
  });

  it("keeps a gallery's legend open while stepping, as tall as the longest", async () => {
    const plates = {
      ...TEN,
      images: TEN.images.map((image, i) =>
        i === 4
          ? { ...image, caption: "A much longer legend. ".repeat(8) }
          : image
      ),
    };
    mountShell(plates, { inline: true, inPane: false });
    // Folded, nothing is laid out to size it.
    expect(wrapper.findAll(".fig-legend-sizer")).toHaveLength(0);
    await button().trigger("click");
    expect(legend().classes()).toContain("fig-legend--reserve");
    expect(legend().find(".fig-legend-text").text()).toBe("Plate 1");
    // Every other legend lies unseen in the same cell, the longest included.
    const sizers = () =>
      wrapper.findAll(".fig-legend-sizer").map((s) => s.text());
    expect(sizers()).toHaveLength(9);
    expect(sizers()).toContain(plates.images[4].caption.trim());
    expect(
      wrapper
        .findAll(".fig-legend-sizer")
        .every((s) => s.attributes("aria-hidden") === "true")
    ).toBe(true);
    await wrapper.get('[aria-label="Next image"]').trigger("click");
    await flushPromises();
    expect(button().attributes("aria-expanded")).toBe("true");
    expect(legend().find(".fig-legend-text").text()).toBe("Plate 2");
    expect(sizers()).not.toContain("Plate 2");
    expect(sizers()).toContain("Plate 1");
  });
});

describe("figure shell: a gallery in the pane", () => {
  it("shows ten plates as the grid when the row asks, and a plate's legend once it is opened", async () => {
    mountShell({ ...TEN, galleryStart: "grid" });
    expect(wrapper.find(".figimg--gallery").attributes("data-view")).toBe(
      "grid"
    );
    // No figure-level legend: nothing to fold over the grid.
    expect(button().exists()).toBe(false);
    await wrapper.findAll(".figimg-tile")[3].trigger("click");
    await flushPromises();
    expect(wrapper.find(".figimg--gallery").attributes("data-view")).toBe(
      "single"
    );
    expect(legend().text()).toBe("Plate 4");
    expect(button().exists()).toBe(true);
  });

  it("opens on the first plate, with its legend, unless the row says otherwise", () => {
    mountShell(TEN);
    expect(wrapper.find(".figimg--gallery").attributes("data-view")).toBe(
      "single"
    );
    expect(legend().text()).toBe("Plate 1");
  });

  it("opens the dialog in the pane's view, and the two change together", async () => {
    mountShell({ ...TEN, galleryStart: "grid" });
    await wrapper.get('[aria-label="Expand to full screen"]').trigger("click");
    await flushPromises();
    const dialogGallery = () => panel().querySelector(".figimg--gallery");
    expect(dialogGallery().dataset.view).toBe("grid");
    panel().querySelectorAll(".figimg-tile")[6].click();
    await flushPromises();
    expect(dialogGallery().dataset.view).toBe("single");
    expect(wrapper.find(".figimg--gallery").attributes("data-view")).toBe(
      "single"
    );
    expect(
      panel().querySelector(".figimg-gallery-img").getAttribute("src")
    ).toBe("/plate-7.jpg");
    expect(
      wrapper.find(".fig-shell .figimg-gallery-img").attributes("src")
    ).toBe("/plate-7.jpg");
    // In the dialog the plate's legend is shown outright.
    expect(panel().querySelector(".figimg-legend").textContent.trim()).toBe(
      "Plate 7"
    );
    panel().querySelector(".figimg-all").click();
    await flushPromises();
    expect(wrapper.find(".figimg--gallery").attributes("data-view")).toBe(
      "grid"
    );
  });
});

describe("figure shell: the fullscreen dialog's ground", () => {
  async function open(animation, options) {
    mountShell(animation, options);
    await wrapper.get('[aria-label="Expand to full screen"]').trigger("click");
    await flushPromises();
  }

  it("is dark, with the pane's heading, where the chapter's pane is dark", async () => {
    await open(SINGLE, { ground: "dark" });
    expect(panel().classList.contains("demo-panel--dark")).toBe(true);
    // The pane's own contract, so the figure's on-dark rules apply.
    expect(panel().classList.contains("figure-pane--dark")).toBe(true);
    const heading = document.getElementById(
      panel().getAttribute("aria-labelledby")
    );
    expect(heading.querySelector(".fs-label").textContent).toBe("FIG 01");
    expect(heading.querySelector(".fs-name").textContent).toBe(
      "Trepanned Incan skull"
    );
    // The legend is in the dialog in full.
    expect(panel().querySelector(".figimg-caption").textContent.trim()).toBe(
      SINGLE.caption
    );
  });

  it("is dark for a figure in the text column or a breakout box of that chapter", async () => {
    await open(SINGLE, { ground: "dark", inline: true, inPane: false });
    expect(panel().classList.contains("demo-panel--dark")).toBe(true);
  });

  it("stays on paper where the chapter's art was drawn for paper", async () => {
    await open(SINGLE, { ground: "paper" });
    expect(panel().classList.contains("demo-panel--dark")).toBe(false);
    expect(panel().classList.contains("figure-pane--dark")).toBe(false);
    const heading = document.getElementById(
      panel().getAttribute("aria-labelledby")
    );
    expect(heading.textContent.trim()).toBe("FIG 01: Trepanned Incan skull");
    wrapper.unmount();
    document.body.innerHTML = "";
    await open(SINGLE, { ground: "paper", inline: true, inPane: false });
    expect(panel().classList.contains("demo-panel--dark")).toBe(false);
  });

  it("is dark where there is no pane to ask", async () => {
    wrapper = mount(IllustrationPlaceholder, {
      props: { animation: SINGLE },
      attachTo: document.body,
      global: { stubs: { Transition: true } },
    });
    await wrapper.get('[aria-label="Expand to full screen"]').trigger("click");
    await flushPromises();
    expect(panel().classList.contains("demo-panel--dark")).toBe(true);
  });
});
