/*
 * An image in the text (OPENBRAIN-70). Below the two-column reader it is
 * the figure shell, bare: as wide as the page, the caption folded behind
 * "Legend" under the picture and wrapped like any legend. From 1024px, and
 * for a `wide` image at any size, the original block stays.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import InlineImages from "../InlineImages.vue";
import { READER_NARROW_QUERY } from "@/helper/readerLayout";

vi.mock("gsap/ScrollTrigger", () => ({
  default: { refresh: vi.fn() },
}));

const PARAGRAPH = {
  id: "p1",
  img: "absorption-spectra",
  imgCap: "The normalized absorption spectra of rod and cone photoreceptors.",
};

let wrapper;
const realMatchMedia = window.matchMedia;
function setNarrow(narrow) {
  window.matchMedia = (query) => ({
    matches: query === READER_NARROW_QUERY ? narrow : false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  });
}
async function mountImage(paragraph, narrow) {
  setNarrow(narrow);
  wrapper = mount(InlineImages, {
    props: { paragraph },
    attachTo: document.body,
    global: { stubs: { Transition: true } },
  });
  await flushPromises();
  return wrapper;
}

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
  window.matchMedia = realMatchMedia;
});

describe("InlineImages", () => {
  it("is the bare figure shell below the two-column reader", async () => {
    await mountImage(PARAGRAPH, true);
    expect(wrapper.find("[data-inline-image]").exists()).toBe(true);
    expect(wrapper.find(".fig-shell--inline").exists()).toBe(true);
    // Not the desktop block, which is as wide as the two-column text
    // column and was cut off on a phone.
    expect(wrapper.find(".w-text").exists()).toBe(false);
    expect(wrapper.find(".imgDesription").exists()).toBe(false);
    // No number or title to show: no toolbar row.
    expect(wrapper.find(".fig-toolbar").exists()).toBe(false);
    expect(wrapper.find("img").attributes("src")).toContain(
      "absorption-spectra"
    );
    // Still an in-column slot: never a band a pane figure's hold stops at.
    expect(wrapper.find(".fb-slot").classes()).toContain("fb-slot--column");
  });

  it("folds the caption behind Legend, under the picture", async () => {
    await mountImage(PARAGRAPH, true);
    const row = wrapper.find(".fig-legend-row");
    const button = row.find(".fig-legend-btn");
    const legend = row.find(".fig-legend");
    expect(legend.text()).toBe(PARAGRAPH.imgCap);
    expect(legend.classes()).toContain("fig-legend--folds");
    expect(button.attributes("aria-expanded")).toBe("false");
    // The row follows the artwork in the document: open, the legend is
    // below the picture, never over it.
    const area = wrapper.find(".fig-area").element;
    expect(
      area.compareDocumentPosition(row.element) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    await button.trigger("click");
    expect(button.attributes("aria-expanded")).toBe("true");
    expect(legend.classes()).not.toContain("fig-legend--folds");
  });

  it("offers the full-screen view beside the legend's control", async () => {
    await mountImage(PARAGRAPH, true);
    const expand = wrapper.find(".fig-legend-row .fig-fs-btn");
    expect(expand.attributes("aria-label")).toBe("Expand to full screen");
  });

  it("without a caption keeps the expand button and has no legend", async () => {
    await mountImage({ id: "p2", img: "bars" }, true);
    expect(wrapper.find(".fig-legend-btn").exists()).toBe(false);
    expect(wrapper.find(".fig-legend").exists()).toBe(false);
    expect(wrapper.find(".fig-legend-row .fig-fs-btn").exists()).toBe(true);
  });

  it("keeps the original block in the two-column reader", async () => {
    await mountImage(PARAGRAPH, false);
    expect(wrapper.find("[data-inline-image]").exists()).toBe(false);
    expect(wrapper.find(".w-text").exists()).toBe(true);
    expect(wrapper.find(".imgDesription").text()).toBe(PARAGRAPH.imgCap);
  });

  // OPENBRAIN-79: an image block with a figureNumber is one of the
  // chapter's figures and is named like one at every width.
  const NUMBERED = {
    ...PARAGRAPH,
    imgNumber: 9,
    imgTitle: "Absorption spectra",
  };

  it("a numbered image has the shell's toolbar below the two-column reader", async () => {
    await mountImage(NUMBERED, true);
    const figure = wrapper.find("[data-inline-image]");
    expect(figure.attributes("data-figure-number")).toBe("9");
    expect(figure.find(".fig-toolbar .fig-label").text()).toBe("FIG 09");
    expect(figure.find(".fig-toolbar .fig-name").text()).toBe(
      "Absorption spectra"
    );
    // The expand button is the toolbar's; the row under the art is the legend's.
    expect(figure.find(".fig-toolbar .fig-fs-btn").exists()).toBe(true);
    expect(figure.find(".fig-legend-row--bare").exists()).toBe(false);
    expect(figure.find(".fig-legend").text()).toBe(PARAGRAPH.imgCap);
  });

  it("a numbered image has the figure heading in the two-column reader", async () => {
    await mountImage(NUMBERED, false);
    const block = wrapper.find(".w-text");
    expect(block.attributes("data-figure-number")).toBe("9");
    expect(block.find(".figure-heading__label").text()).toBe("FIG 09");
    expect(block.find(".figure-heading__title").text()).toBe(
      "Absorption spectra"
    );
    expect(block.find(".imgDesription").text()).toBe(PARAGRAPH.imgCap);
  });

  it("an image without a number has no heading in the two-column reader", async () => {
    await mountImage({ ...PARAGRAPH, imgTitle: "Absorption spectra" }, false);
    expect(wrapper.find(".figure-heading").exists()).toBe(false);
    expect(wrapper.find("[data-figure-number]").exists()).toBe(false);
  });

  it("keeps a wide image's own block on a phone", async () => {
    await mountImage({ ...PARAGRAPH, imgWide: true }, true);
    expect(wrapper.find("[data-inline-image]").exists()).toBe(false);
    expect(wrapper.find(".ii-wide").exists()).toBe(true);
  });
});
