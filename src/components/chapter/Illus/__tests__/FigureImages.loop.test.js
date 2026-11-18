import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import FigureImages from "../FigureImages.vue";

/* OPENBRAIN-201: a figure can loop a short film of our own in place of its
   still (Plato and Aristotle): muted, looping, inline, over its poster. */
const PLATO = {
  src: "/publicAssets/video/foundations/plato-aristotle-loop.webp",
  alt: "Plato holds a brain; Aristotle holds a heart.",
  caption: "",
  loop: {
    webm: "/publicAssets/video/foundations/plato-aristotle-loop.webm",
    mp4: "/publicAssets/video/foundations/plato-aristotle-loop.mp4",
    width: 960,
    height: 1280,
  },
};

let wrapper;
const mountOne = (props = {}) => {
  wrapper = mount(FigureImages, {
    attachTo: document.body,
    props: { images: [PLATO], caption: "Legend", ...props },
  });
  return wrapper;
};

describe("FigureImages: a figure's own loop", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-reduce-motion");
  });
  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    document.body.innerHTML = "";
    document.documentElement.removeAttribute("data-reduce-motion");
  });

  it("plays it muted, looping and inline over its poster", () => {
    mountOne();
    const video = wrapper.find("video.figimg-loop");
    expect(video.exists()).toBe(true);
    expect(wrapper.find("img").exists()).toBe(false);
    const el = video.element;
    expect(el.muted).toBe(true);
    expect(el.hasAttribute("muted")).toBe(true);
    expect(el.hasAttribute("autoplay")).toBe(true);
    expect(el.hasAttribute("loop")).toBe(true);
    expect(el.hasAttribute("playsinline")).toBe(true);
    expect(el.hasAttribute("controls")).toBe(false);
    expect(video.attributes("poster")).toBe(PLATO.src);
    expect(video.attributes("aria-label")).toBe(PLATO.alt);
    expect(video.attributes("width")).toBe("960");
    expect(video.attributes("height")).toBe("1280");
    // WebM first, MP4 for Safari.
    expect(
      wrapper
        .findAll("source")
        .map((s) => [s.attributes("type"), s.attributes("src")])
    ).toEqual([
      ["video/webm", PLATO.loop.webm],
      ["video/mp4", PLATO.loop.mp4],
    ]);
  });

  it("shows the still under reduced motion", () => {
    document.documentElement.setAttribute("data-reduce-motion", "1");
    mountOne();
    expect(wrapper.find("video").exists()).toBe(false);
    expect(wrapper.find("img.figimg-img").attributes("src")).toBe(PLATO.src);
  });

  it("is the same film inline in the text column", () => {
    mountOne({ fit: false });
    expect(wrapper.find(".figimg--flow video.figimg-loop").exists()).toBe(true);
  });
});
