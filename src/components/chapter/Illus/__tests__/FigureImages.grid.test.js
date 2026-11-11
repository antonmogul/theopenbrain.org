/*
 * The gallery's two views and its controls (OPENBRAIN-177): the grid of all
 * the images a larger set opens as, the single view a tile opens, play/pause
 * and the view-all switch beside the counter.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import FigureImages from "../FigureImages.vue";

const FIVE = [
  { src: "/one.jpg", caption: "First plate" },
  { src: "/two.jpg", caption: "" },
  { src: "/three.jpg", caption: "Third plate" },
  { src: "/four.jpg", caption: "Fourth plate" },
  { src: "/five.jpg", caption: "Fifth plate" },
];
const TRIO = FIVE.slice(0, 3);
const FIFTEEN_S = 15_000;

let wrapper;
const mountSet = (props = {}) => {
  wrapper = mount(FigureImages, {
    attachTo: document.body,
    props: {
      images: FIVE,
      caption: "Shared legend",
      label: "FIG 06",
      title: "Cell doctrine",
      ...props,
    },
  });
  return wrapper;
};
const gallery = () => wrapper.find(".figimg--gallery");
const view = () => gallery().attributes("data-view");
const state = () => gallery().attributes("data-autoplay");
const tiles = () => wrapper.findAll(".figimg-tile");
const shown = () => wrapper.find(".figimg-gallery-img").attributes("src");
const counter = () => wrapper.find(".figimg-count-n").text();
const play = () => wrapper.find(".figimg-play");
const viewAll = () => wrapper.find(".figimg-all");
const advance = async (ms) => {
  vi.advanceTimersByTime(ms);
  await nextTick();
};
const settle = async () => {
  await nextTick();
  await nextTick();
};

describe("FigureImages grid and controls", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.happyDOM.settings.disableIframePageLoading = true;
    document.documentElement.removeAttribute("data-reduce-motion");
  });
  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    document.body.innerHTML = "";
    document.documentElement.removeAttribute("data-reduce-motion");
    vi.useRealTimers();
  });

  it("shows a set as a grid of all its images, with the clock off", async () => {
    mountSet({ start: "grid" });
    expect(view()).toBe("grid");
    expect(gallery().classes()).toContain("figimg--grid");
    const t = tiles();
    expect(t).toHaveLength(5);
    t.forEach((tile, i) => {
      expect(tile.element.tagName).toBe("BUTTON");
      expect(tile.attributes("type")).toBe("button");
      expect(tile.find("img").attributes("src")).toBe(FIVE[i].src);
      // The name is on the button; the picture adds nothing to it.
      expect(tile.find("img").attributes("alt")).toBe("");
    });
    expect(t.map((tile) => tile.attributes("aria-label"))).toEqual([
      "Image 1 of 5: First plate",
      "Image 2 of 5",
      "Image 3 of 5: Third plate",
      "Image 4 of 5: Fourth plate",
      "Image 5 of 5: Fifth plate",
    ]);
    expect(t.map((tile) => tile.find(".figimg-tile-n").text())).toEqual([
      "01",
      "02",
      "03",
      "04",
      "05",
    ]);
    // No stage, arrows or thumbnails in the grid; the counter says how many.
    expect(wrapper.find(".figimg-stage").exists()).toBe(false);
    expect(wrapper.find(".figimg-thumbnails").exists()).toBe(false);
    expect(counter()).toBe("5 images");
    // The figure's own legend stands over the grid.
    expect(wrapper.find(".figimg-legend").text()).toBe("Shared legend");
    expect(viewAll().attributes("aria-pressed")).toBe("true");
    expect(state()).toBe("paused");
    await advance(FIFTEEN_S * 3);
    expect(view()).toBe("grid");
    expect(wrapper.emitted("update:index")).toBeUndefined();
  });

  it("opens any set on its first image, turning, with the grid one press away", async () => {
    for (const images of [FIVE, TRIO]) {
      mountSet({ images });
      expect(view()).toBe("single");
      expect(tiles()).toHaveLength(0);
      expect(shown()).toBe("/one.jpg");
      expect(counter()).toBe(`1 / ${images.length}`);
      expect(state()).toBe("running");
      expect(viewAll().attributes("aria-pressed")).toBe("false");
      await viewAll().trigger("click");
      await settle();
      expect(view()).toBe("grid");
      expect(tiles()).toHaveLength(images.length);
      wrapper.unmount();
    }
  });

  it("lets the figure choose its opening view", () => {
    mountSet({ start: "single" });
    expect(view()).toBe("single");
    expect(state()).toBe("running");
    wrapper.unmount();
    mountSet({ images: TRIO, start: "grid" });
    expect(view()).toBe("grid");
    expect(state()).toBe("paused");
  });

  it("opens the single view on the tile's image, stopped, with focus on the view switch", async () => {
    mountSet({ start: "grid" });
    const tile = tiles()[2];
    tile.element.focus();
    await tile.trigger("click");
    await settle();
    expect(view()).toBe("single");
    expect(shown()).toBe("/three.jpg");
    expect(counter()).toBe("3 / 5");
    expect(wrapper.findAll(".figimg-thumbnail")).toHaveLength(5);
    expect(wrapper.find(".figimg-legend").text()).toBe("Third plate");
    expect(wrapper.emitted("update:index").at(-1)).toEqual([2]);
    expect(wrapper.emitted("update:view").at(-1)).toEqual(["single"]);
    // The tile is gone: focus lands on the control that brings it back.
    expect(document.activeElement).toBe(viewAll().element);
    // The reader chose an image: it does not turn away on its own.
    expect(state()).toBe("paused");
    await advance(FIFTEEN_S * 2);
    expect(shown()).toBe("/three.jpg");
  });

  it("switches between the two views from the view-all button, marking the image last shown", async () => {
    mountSet({ images: TRIO });
    await wrapper.find('[aria-label="Next image"]').trigger("click");
    expect(viewAll().attributes("aria-label")).toBe("View all images");
    await viewAll().trigger("click");
    expect(view()).toBe("grid");
    expect(viewAll().attributes("aria-pressed")).toBe("true");
    expect(tiles().map((t) => t.classes().includes("is-current"))).toEqual([
      false,
      true,
      false,
    ]);
    await viewAll().trigger("click");
    expect(view()).toBe("single");
    expect(shown()).toBe("/two.jpg");
    expect(viewAll().attributes("aria-pressed")).toBe("false");
  });

  it("follows the view it is given, so a pane and its dialog stay together", async () => {
    mountSet({ view: "single" });
    expect(view()).toBe("single");
    await wrapper.setProps({ view: "grid" });
    expect(view()).toBe("grid");
    await tiles()[0].trigger("click");
    expect(wrapper.emitted("update:view").at(-1)).toEqual(["single"]);
  });

  it("has a play button that names what it will do, and no worded gallery button", async () => {
    mountSet({ images: TRIO });
    expect(wrapper.find(".figimg-pause").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("gallery");
    expect(play().element.tagName).toBe("BUTTON");
    expect(play().attributes("aria-label")).toBe("Pause slideshow");
    expect(play().attributes("data-state")).toBe("playing");
    await play().trigger("click");
    expect(play().attributes("aria-label")).toBe("Play slideshow");
    expect(play().attributes("data-state")).toBe("stopped");
    expect(state()).toBe("paused");
    await advance(FIFTEEN_S * 2);
    expect(shown()).toBe("/one.jpg");
  });

  it("plays when asked, even with the pointer still on the button", async () => {
    mountSet({ images: TRIO });
    await wrapper.find('[aria-label="Next image"]').trigger("click");
    expect(state()).toBe("paused");
    // The reader's pointer and focus are on the gallery: they pressed play.
    await gallery().trigger("pointerenter");
    play().element.focus();
    await gallery().trigger("focusin");
    await play().trigger("click");
    expect(state()).toBe("running");
    await advance(FIFTEEN_S);
    expect(shown()).toBe("/three.jpg");
    // A manual step still stops it.
    await wrapper.find('[aria-label="Previous image"]').trigger("click");
    expect(state()).toBe("paused");
    expect(play().attributes("aria-label")).toBe("Play slideshow");
  });

  it("plays from the grid by turning to the single view", async () => {
    mountSet({ start: "grid" });
    await play().trigger("click");
    await settle();
    expect(view()).toBe("single");
    expect(state()).toBe("running");
    expect(shown()).toBe("/one.jpg");
    await advance(FIFTEEN_S);
    expect(shown()).toBe("/two.jpg");
  });

  it("offers no play button under reduced motion, and none on a video the reader plays", async () => {
    document.documentElement.setAttribute("data-reduce-motion", "1");
    mountSet({ start: "grid" });
    expect(play().exists()).toBe(false);
    expect(viewAll().exists()).toBe(true);
    wrapper.unmount();
    document.documentElement.removeAttribute("data-reduce-motion");
    mountSet({
      images: [
        { src: "/huxley.jpg", youtube: "KbA3RLz3xUQ", play: "player" },
        FIVE[0],
      ],
    });
    expect(play().exists()).toBe(false);
    await wrapper.find('[aria-label="Next image"]').trigger("click");
    expect(play().exists()).toBe(true);
  });

  it("walks the tiles with the arrow keys, Home and End", async () => {
    mountSet({ start: "grid" });
    const t = tiles();
    // happy-dom lays nothing out: every tile is on one row.
    await gallery().trigger("keydown", { key: "ArrowRight" });
    expect(document.activeElement).toBe(t[0].element);
    await gallery().trigger("keydown", { key: "ArrowRight" });
    expect(document.activeElement).toBe(t[1].element);
    await gallery().trigger("keydown", { key: "End" });
    expect(document.activeElement).toBe(t[4].element);
    await gallery().trigger("keydown", { key: "ArrowRight" });
    expect(document.activeElement).toBe(t[4].element);
    await gallery().trigger("keydown", { key: "Home" });
    expect(document.activeElement).toBe(t[0].element);
    await gallery().trigger("keydown", { key: "ArrowLeft" });
    expect(document.activeElement).toBe(t[0].element);
    // The keys move focus, not the image.
    expect(wrapper.emitted("update:index")).toBeUndefined();
  });

  it("answers the arrow keys from anywhere in the dialog, once", async () => {
    mountSet({ images: TRIO, large: true });
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true })
    );
    await nextTick();
    expect(shown()).toBe("/two.jpg");
    // A key pressed inside the gallery reaches the window too: one step.
    wrapper.find('[aria-label="Next image"]').element.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowRight",
        bubbles: true,
        cancelable: true,
      })
    );
    await nextTick();
    expect(shown()).toBe("/three.jpg");
    wrapper.unmount();
    wrapper = null;
    // In the pane the window's keys are not the gallery's.
    mountSet({ images: TRIO });
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true })
    );
    await nextTick();
    expect(shown()).toBe("/one.jpg");
  });

  it("says what is showing in a polite live region", async () => {
    mountSet({ start: "grid" });
    const live = wrapper.find("[aria-live]");
    expect(live.classes()).toContain("sr-only");
    expect(live.attributes("aria-atomic")).toBe("true");
    expect(live.text()).toBe("All 5 images");
    await tiles()[3].trigger("click");
    await settle();
    expect(live.text()).toBe("Image 4 of 5: Fourth plate");
    expect(live.attributes("aria-live")).toBe("polite");
  });

  it("keeps the dialog's legend row in the single view, and drops an empty one over the grid", async () => {
    mountSet({ caption: "", large: true, start: "grid" });
    // Over the grid there is nothing to say and no arrows to hold still.
    expect(wrapper.find(".figimg-legend").exists()).toBe(false);
    await tiles()[1].trigger("click");
    await settle();
    // Image 2 has no caption: the row stays, empty, so the stage keeps its
    // height from plate to plate.
    expect(wrapper.find(".figimg-legend").exists()).toBe(true);
    expect(wrapper.find(".figimg-legend").text()).toBe("");
  });
});
