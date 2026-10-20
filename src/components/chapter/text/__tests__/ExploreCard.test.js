/*
 * ExploreCard (OPENBRAIN-142): a real disclosure. The button owns
 * aria-expanded / aria-controls, the panel keeps the paragraph in the DOM
 * while folded (hidden, so ids stay findable), and opening re-measures the
 * scroll-linked figures.
 */
import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import ExploreCard from "../ExploreCard.vue";

const refresh = vi.fn();
vi.mock("gsap/ScrollTrigger", () => ({
  default: { refresh: () => refresh() },
}));

const explore = {
  title: "Humoral theory",
  prompt: "Explore more about humoral theory",
  image: { src: "/publicAssets/images/foundations/x.jpg", alt: "A woodcut." },
  legend: "Woodcut, 1574.",
};

const mountCard = (props = {}) =>
  mount(ExploreCard, {
    props: { explore, paragraphId: "p1", ...props },
    slots: { default: '<div class="P" data-paragraph-id="p1">Text</div>' },
  });

describe("ExploreCard", () => {
  it("shows the image, legend, title and prompt, with the paragraph folded", () => {
    const w = mountCard();
    expect(w.find("img").attributes("src")).toBe(explore.image.src);
    expect(w.find("img").attributes("alt")).toBe("A woodcut.");
    expect(w.find("figcaption").text()).toBe("Woodcut, 1574.");
    expect(w.find("h3").text()).toBe("Humoral theory");
    const btn = w.find("button");
    expect(btn.text()).toContain("Explore more about humoral theory");
    expect(btn.attributes("aria-expanded")).toBe("false");
    expect(btn.attributes("aria-controls")).toBe("explore-panel-p1");
    const panel = w.find("#explore-panel-p1");
    expect(panel.attributes("hidden")).toBeDefined();
    // Folded, not gone: the paragraph keeps its id for highlights/timeline.
    expect(w.find('[data-paragraph-id="p1"]').exists()).toBe(true);
  });

  it("opens and closes on the button, and re-measures the page", async () => {
    refresh.mockClear();
    const w = mountCard();
    await w.find("button").trigger("click");
    await nextTick();
    expect(w.find("button").attributes("aria-expanded")).toBe("true");
    expect(w.find("#explore-panel-p1").attributes("hidden")).toBeUndefined();
    expect(w.find("button").text()).toContain("Hide");
    expect(refresh).toHaveBeenCalledTimes(1);
    await w.find("button").trigger("click");
    expect(w.find("button").attributes("aria-expanded")).toBe("false");
    expect(w.find("#explore-panel-p1").attributes("hidden")).toBeDefined();
  });

  it("renders without an image and can start open", () => {
    const w = mountCard({
      explore: { title: "The rete mirabile", prompt: "Explore more" },
      defaultOpen: true,
    });
    expect(w.find("figure").exists()).toBe(false);
    expect(w.find(".xc").classes()).toContain("xc--no-image");
    expect(w.find("button").attributes("aria-expanded")).toBe("true");
  });
});
