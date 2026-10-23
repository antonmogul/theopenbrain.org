import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import FigureImages from "../FigureImages.vue";

const SET = [
  { src: "/one.jpg", caption: "First plate", alt: "" },
  { src: "/two.jpg", caption: "", alt: "" },
  { src: "/three.jpg", caption: "Third plate", alt: "Alt three" },
];
const FIFTEEN_S = 15_000;

let wrapper;
const mountSet = (props = {}) => {
  wrapper = mount(FigureImages, {
    attachTo: document.body,
    props: {
      images: SET,
      caption: "Shared legend",
      label: "FIG 06",
      title: "Cell doctrine",
      ...props,
    },
  });
  return wrapper;
};
/* The template's comments make the component a fragment: address the
   gallery root itself. */
const gallery = () => wrapper.find(".figimg--gallery");
const shown = () => wrapper.find(".figimg-gallery-img").attributes("src");
const counter = () => wrapper.find(".figimg-count-n").text();
const dots = () => wrapper.findAll(".figimg-thumbnail");
const currentDot = () =>
  dots().findIndex((d) => d.attributes("aria-current") === "true");
const state = () => gallery().attributes("data-autoplay");
const key = async (k) => {
  await gallery().trigger("keydown", { key: k });
};
const advance = async (ms) => {
  vi.advanceTimersByTime(ms);
  await nextTick();
};

describe("FigureImages", () => {
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

  it("shows one image on its own, without a gallery or controls", () => {
    wrapper = mount(FigureImages, {
      props: { images: SET.slice(0, 1), caption: "Shared legend" },
    });
    const imgs = wrapper.findAll("img");
    expect(imgs).toHaveLength(1);
    expect(imgs[0].attributes("src")).toBe("/one.jpg");
    expect(imgs[0].attributes("alt")).toBe("First plate");
    expect(wrapper.find(".figimg-caption").text()).toBe("First plate");
    expect(wrapper.find(".figimg-thumbnails").exists()).toBe(false);
    expect(wrapper.find("button").exists()).toBe(false);
    expect(wrapper.find('[role="group"]').exists()).toBe(false);
  });

  it("shows one full-size image with a thumbnail per image and arrows at the sides", () => {
    const w = mountSet();
    expect(gallery().attributes("role")).toBe("group");
    expect(gallery().attributes("aria-label")).toBe("FIG 06: Cell doctrine");
    // One image at a time, the first to start.
    expect(w.findAll(".figimg-gallery-img")).toHaveLength(1);
    expect(shown()).toBe("/one.jpg");
    expect(w.find(".figimg-gallery-img").attributes("alt")).toBe("First plate");
    expect(counter()).toBe("1 / 3");
    // Dots: real buttons with a label that names the image.
    const d = dots();
    expect(d).toHaveLength(3);
    d.forEach((b, i) => {
      expect(b.find("img").attributes("src")).toBe(SET[i].src);
      expect(b.find("img").attributes("alt")).toBe("");
      expect(b.element.tagName).toBe("BUTTON");
      expect(b.attributes("type")).toBe("button");
    });
    expect(d.map((b) => b.attributes("aria-label"))).toEqual([
      "Image 1 of 3: First plate",
      "Image 2 of 3",
      "Image 3 of 3: Third plate",
    ]);
    expect(currentDot()).toBe(0);
    expect(d[0].classes()).toContain("is-current");
    // Arrows live inside the stage box, so they centre on it, not the image.
    const stage = w.find(".figimg-stage");
    expect(stage.find('[aria-label="Previous image"]').exists()).toBe(true);
    expect(stage.find('[aria-label="Next image"]').exists()).toBe(true);
    // The current image's legend; the figure's when it has none.
    expect(w.find(".figimg-legend").text()).toBe("First plate");
  });

  it("steps with the arrows and the dots, wrapping at the ends", async () => {
    const w = mountSet();
    await w.find('[aria-label="Previous image"]').trigger("click");
    expect(shown()).toBe("/three.jpg");
    expect(counter()).toBe("3 / 3");
    expect(currentDot()).toBe(2);
    expect(w.find(".figimg-legend").text()).toBe("Third plate");
    await w.find('[aria-label="Next image"]').trigger("click");
    expect(shown()).toBe("/one.jpg");
    await dots()[1].trigger("click");
    expect(shown()).toBe("/two.jpg");
    // Image 2 has no caption of its own: the figure legend stands in...
    expect(w.find(".figimg-legend").text()).toBe("Shared legend");
    // ...unless the shell already shows it above the artwork.
    await w.setProps({ legendAbove: true });
    expect(w.find(".figimg-legend").exists()).toBe(false);
    expect(w.emitted("update:index").at(-1)).toEqual([1]);
  });

  it("steps with the arrow keys when it has focus", async () => {
    mountSet();
    await key("ArrowRight");
    expect(shown()).toBe("/two.jpg");
    await key("ArrowLeft");
    await key("ArrowLeft");
    expect(shown()).toBe("/three.jpg");
  });

  it("advances every 15 s on its own", async () => {
    mountSet();
    expect(state()).toBe("running");
    await advance(FIFTEEN_S - 1);
    expect(shown()).toBe("/one.jpg");
    await advance(1);
    expect(shown()).toBe("/two.jpg");
    await advance(FIFTEEN_S);
    expect(shown()).toBe("/three.jpg");
    await advance(FIFTEEN_S);
    expect(shown()).toBe("/one.jpg");
  });

  it("pauses while hovered or focused and resumes after", async () => {
    const w = mountSet();
    await advance(6000);
    await gallery().trigger("pointerenter");
    expect(state()).toBe("paused");
    await advance(FIFTEEN_S * 2);
    expect(shown()).toBe("/one.jpg");
    await gallery().trigger("pointerleave");
    expect(state()).toBe("running");
    // The clock restarts from the resume, not from where it was.
    await advance(FIFTEEN_S - 1);
    expect(shown()).toBe("/one.jpg");
    await advance(1);
    expect(shown()).toBe("/two.jpg");

    const next = w.find('[aria-label="Next image"]');
    next.element.focus();
    await gallery().trigger("focusin");
    expect(state()).toBe("paused");
    await advance(FIFTEEN_S * 2);
    expect(shown()).toBe("/two.jpg");
    next.element.blur();
    await gallery().trigger("focusout", { relatedTarget: document.body });
    expect(state()).toBe("running");
  });

  it("stops for good after a manual step", async () => {
    const w = mountSet();
    await w.find('[aria-label="Next image"]').trigger("click");
    expect(shown()).toBe("/two.jpg");
    expect(state()).toBe("paused");
    await advance(FIFTEEN_S * 3);
    expect(shown()).toBe("/two.jpg");
    await dots()[0].trigger("click");
    await advance(FIFTEEN_S * 3);
    expect(shown()).toBe("/one.jpg");
    await key("ArrowRight");
    await advance(FIFTEEN_S * 3);
    expect(shown()).toBe("/two.jpg");
  });

  it("never runs under reduced motion", async () => {
    document.documentElement.setAttribute("data-reduce-motion", "1");
    mountSet();
    expect(state()).toBe("paused");
    await advance(FIFTEEN_S * 3);
    expect(shown()).toBe("/one.jpg");
  });

  it("stops when the reader turns reduced motion on mid-way", async () => {
    mountSet();
    await advance(FIFTEEN_S);
    expect(shown()).toBe("/two.jpg");
    document.documentElement.setAttribute("data-reduce-motion", "1");
    await advance(FIFTEEN_S * 3);
    expect(shown()).toBe("/two.jpg");
    expect(state()).toBe("paused");
  });

  it("switches a running loop to its poster when explicit reduced motion changes", async () => {
    mountSet({
      images: [{ src: "/still.jpg", youtube: "OmmH4Rp9-to" }, SET[0]],
    });
    expect(wrapper.find("iframe").exists()).toBe(true);
    document.documentElement.setAttribute("data-reduce-motion", "1");
    await vi.advanceTimersByTimeAsync(1);
    await nextTick();
    expect(wrapper.find("iframe").exists()).toBe(false);
    expect(shown()).toBe("/still.jpg");
    expect(wrapper.find(".figimg-watch").exists()).toBe(true);
  });

  it("waits while the tab is hidden", async () => {
    mountSet();
    let visibility = "hidden";
    // An own property shadows happy-dom's getter; deleting it restores it.
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => visibility,
    });
    try {
      document.dispatchEvent(new Event("visibilitychange"));
      await nextTick();
      expect(state()).toBe("paused");
      await advance(FIFTEEN_S * 2);
      expect(shown()).toBe("/one.jpg");
      visibility = "visible";
      document.dispatchEvent(new Event("visibilitychange"));
      await nextTick();
      expect(state()).toBe("running");
      await advance(FIFTEEN_S);
      expect(shown()).toBe("/two.jpg");
    } finally {
      delete document.visibilityState;
    }
  });

  it("stops the clock when it unmounts", async () => {
    const onIndex = vi.fn();
    const w = mountSet({ "onUpdate:index": onIndex });
    await advance(FIFTEEN_S);
    expect(onIndex).toHaveBeenCalledTimes(1);
    w.unmount();
    wrapper = null;
    await advance(FIFTEEN_S * 3);
    expect(onIndex).toHaveBeenCalledTimes(1);
  });

  it("follows the index it is given and starts over on a different figure", async () => {
    const w = mountSet({ index: 2 });
    expect(shown()).toBe("/three.jpg");
    await w.setProps({ index: 1 });
    expect(shown()).toBe("/two.jpg");
    await w.find('[aria-label="Next image"]').trigger("click");
    await w.setProps({
      index: 0,
      images: [
        { src: "/a.jpg", caption: "A" },
        { src: "/b.jpg", caption: "B" },
      ],
    });
    expect(shown()).toBe("/a.jpg");
    expect(w.emitted("update:index").at(-1)).toEqual([0]);
    // A fresh figure gets the clock back.
    expect(state()).toBe("running");
  });

  it("stops the clock on a video the reader plays, but rotates past a silent loop", async () => {
    const player = {
      src: "/interview.jpg",
      caption: "Interview",
      youtube: "g4-6A8u8QBc",
      play: "player",
    };
    const loop = { src: "/still.jpg", caption: "Loop", youtube: "OmmH4Rp9-to" };
    mountSet({ images: [SET[0], loop, player, SET[2]] });
    await advance(FIFTEEN_S);
    expect(wrapper.find(".figimg-gallery-video").attributes("src")).toContain(
      "loop=1"
    );
    expect(state()).toBe("running");
    await advance(FIFTEEN_S);
    expect(wrapper.findComponent({ name: "VideoEmbed" }).exists()).toBe(true);
    await wrapper.find(".ve-poster").trigger("click");
    expect(wrapper.find(".ve-frame iframe").attributes("src")).toContain(
      "g4-6A8u8QBc"
    );
    expect(state()).toBe("paused");
    await advance(FIFTEEN_S * 3);
    expect(counter()).toBe("3 / 4");
  });

  it("does not advance away from a player-first gallery or a suspended pane", async () => {
    mountSet({
      images: [
        { src: "/huxley.jpg", youtube: "KbA3RLz3xUQ", play: "player" },
        SET[0],
      ],
    });
    expect(state()).toBe("paused");
    await advance(FIFTEEN_S * 3);
    expect(counter()).toBe("1 / 2");
    wrapper.unmount();
    mountSet({ suspended: true });
    await advance(FIFTEEN_S * 3);
    expect(counter()).toBe("1 / 3");
    await wrapper.setProps({ suspended: false });
    await advance(FIFTEEN_S);
    expect(counter()).toBe("2 / 3");
  });

  it("keeps a video item as a looping slide, with a link under reduced motion", async () => {
    const video = {
      src: "/still.jpg",
      caption: "Sectioning",
      youtube: "OmmH4Rp9-to",
    };
    const w = mountSet({ images: [SET[0], video] });
    await dots()[1].trigger("click");
    const frame = w.find(".figimg-gallery-video");
    expect(frame.exists()).toBe(true);
    expect(frame.attributes("src")).toContain("OmmH4Rp9-to");
    expect(frame.attributes("src")).toContain("loop=1");
    expect(w.find(".figimg-watch").attributes("href")).toBe(
      "https://www.youtube.com/watch?v=OmmH4Rp9-to"
    );
    w.unmount();
    document.documentElement.setAttribute("data-reduce-motion", "1");
    mountSet({ images: [SET[0], video], index: 1 });
    expect(wrapper.find(".figimg-gallery-video").exists()).toBe(false);
    expect(shown()).toBe("/still.jpg");
    expect(wrapper.find(".figimg-watch").exists()).toBe(true);
  });
});
