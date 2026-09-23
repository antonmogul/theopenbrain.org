import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import FigureImages from "../FigureImages.vue";
import { slideDurationMs } from "@/helper/figureCycle";

const SET = [
  { src: "/one.jpg", caption: "First plate", alt: "" },
  { src: "/two.jpg", caption: "", alt: "" },
  { src: "/three.jpg", caption: "Third plate", alt: "Alt three" },
];
const mountSet = (props = {}) =>
  mount(FigureImages, {
    props: { images: SET, caption: "Shared legend", label: "FIG 06", ...props },
  });

describe("FigureImages", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.documentElement.removeAttribute("data-reduce-motion");
  });
  afterEach(() => vi.useRealTimers());

  it("shows one image without controls", () => {
    const w = mount(FigureImages, {
      props: { images: SET.slice(0, 1), caption: "Shared legend" },
    });
    expect(w.find("img").attributes("src")).toBe("/one.jpg");
    expect(w.find(".figimg-controls").exists()).toBe(false);
    expect(w.attributes("aria-roledescription")).toBeUndefined();
  });

  it("uses the image's caption, then the shared one, and a real alt", async () => {
    const w = mountSet();
    expect(w.find(".figimg-caption.is-current").text()).toBe("First plate");
    await w.find('[aria-label="Next image"]').trigger("click");
    expect(w.find(".figimg-caption.is-current").text()).toBe("Shared legend");
    expect(w.find(".figimg-count").text()).toBe("2 / 3");
    await w.find('[aria-label="Next image"]').trigger("click");
    expect(w.find("img").attributes("alt")).toBe("Alt three");
  });

  it("wraps backwards from the first image", async () => {
    const w = mountSet();
    await w.find('[aria-label="Previous image"]').trigger("click");
    expect(w.find(".figimg-count").text()).toBe("3 / 3");
  });

  it("auto-advances until the reader takes over, then stays put", async () => {
    const w = mountSet();
    // One slide's worth of the slowest pace slideDurationMs allows; a large
    // round number can land on a full lap and read "1 / 3" again.
    await vi.advanceTimersByTimeAsync(
      slideDurationMs(SET[0], "Shared legend") + 100
    );
    expect(w.find(".figimg-count").text()).toBe("2 / 3");

    await w.find('[aria-label="Next image"]').trigger("click");
    const after = w.find(".figimg-count").text();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(w.find(".figimg-count").text()).toBe(after);
  });

  it("does not auto-advance while hovered, or under reduce-motion", async () => {
    const hovered = mountSet();
    await hovered.trigger("mouseenter");
    await vi.advanceTimersByTimeAsync(120_000);
    expect(hovered.find(".figimg-count").text()).toBe("1 / 3");

    document.documentElement.setAttribute("data-reduce-motion", "1");
    const calm = mountSet();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(calm.find(".figimg-count").text()).toBe("1 / 3");
  });
});
