import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import FigureImages from "../FigureImages.vue";
import { FIGURE_TINT } from "@/helper/figureTint";

const STILL = { src: "/photo.jpg", caption: "", alt: "A photograph" };
const POSTER = {
  src: "/poster.webp",
  caption: "",
  alt: "",
  youtube: "g4-6A8u8QBc",
  play: "player",
};

let wrapper;
const pane = (value = 0.75) => ({
  provide: { [FIGURE_TINT]: { current: () => value } },
});
const mountImages = (props, global = pane()) => {
  wrapper = mount(FigureImages, {
    attachTo: document.body,
    props: { images: [STILL], title: "A figure", ...props },
    global,
  });
  return wrapper;
};
const washes = () => wrapper.findAll("[data-figure-wash]");

describe("FigureImages: the chapter-colour wash", () => {
  beforeEach(() => {
    document.documentElement.setAttribute("data-chapter", "fund");
    document.documentElement.setAttribute("data-reduce-motion", "0");
  });
  afterEach(() => {
    wrapper?.unmount();
    document.documentElement.removeAttribute("data-chapter");
    document.documentElement.removeAttribute("data-reduce-motion");
  });

  it("lays a filtered copy over a still, at the pane's opacity of the moment", () => {
    mountImages({ wash: true });
    expect(washes()).toHaveLength(1);
    const copy = washes()[0];
    expect(copy.attributes("src")).toBe(STILL.src);
    expect(copy.attributes("aria-hidden")).toBe("true");
    expect(copy.attributes("alt")).toBe("");
    expect(copy.element.style.opacity).toBe("0.75");
    const filter = wrapper.find("filter");
    expect(copy.attributes("style")).toContain(`#${filter.attributes("id")}`);
    // The natural picture is still there, under it, with its own alt.
    expect(
      wrapper.find(".figimg-img:not(.figimg-wash)").attributes("alt")
    ).toBe("A photograph");
  });

  it("has no copy unless the figure asked", () => {
    mountImages({});
    expect(washes()).toHaveLength(0);
    expect(wrapper.find("filter").exists()).toBe(false);
  });

  it("has no copy outside the pane (nothing would clear it)", () => {
    mountImages({ wash: true }, {});
    expect(washes()).toHaveLength(0);
  });

  it("has no copy under reduced motion", () => {
    document.documentElement.setAttribute("data-reduce-motion", "1");
    mountImages({ wash: true });
    expect(washes()).toHaveLength(0);
  });

  it("has no copy without a chapter colour", () => {
    document.documentElement.removeAttribute("data-chapter");
    mountImages({ wash: true });
    expect(washes()).toHaveLength(0);
  });

  it("in a gallery washes the stills and leaves a video poster alone", async () => {
    mountImages({ wash: true, images: [STILL, POSTER], start: "single" });
    expect(washes()).toHaveLength(1);
    expect(washes()[0].classes()).toContain("figimg-gallery-img");
    await wrapper.setProps({ index: 1 });
    expect(
      washes().filter((w) => w.attributes("src") === POSTER.src)
    ).toHaveLength(0);
  });

  it("leaves a picture that opted out", () => {
    mountImages({ wash: true, images: [{ ...STILL, tint: false }] });
    expect(washes()).toHaveLength(0);
  });
});
