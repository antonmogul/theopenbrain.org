/*
 * SlidePreview (OPENBRAIN-129): draws a deck entry with its layout, says why
 * when a slide can't be drawn instead of throwing, and never loads a video
 * in a thumbnail.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { FUNDING_DECK } from "@/data/decks/funding.js";
import SlidePreview from "../SlidePreview.vue";

// A layout that throws while rendering, to exercise the error boundary.
vi.mock("../slides/layouts.js", async (importOriginal) => {
  const actual = await importOriginal();
  const Boom = {
    props: ["title"],
    setup() {
      return () => {
        throw new Error("the layout fell over");
      };
    },
  };
  return { ...actual, SLIDE_LAYOUTS: { ...actual.SLIDE_LAYOUTS, boom: Boom } };
});

const entry = (id) => structuredClone(FUNDING_DECK.find((e) => e.id === id));
const VIDEO = {
  ...entry("textbook-today"),
  props: {
    ...entry("textbook-today").props,
    src: "/publicAssets/deck/walkthrough.mp4",
  },
};

let wrapper;
afterEach(() => {
  wrapper?.unmount();
  vi.useRealTimers();
});

describe("SlidePreview", () => {
  it("renders the entry's layout with its props", () => {
    wrapper = mount(SlidePreview, {
      props: { entry: entry("team"), label: "Preview of slide 2: Team" },
    });
    expect(wrapper.find(".deck-slide").exists()).toBe(true);
    expect(wrapper.text()).toContain("Our Team");
    expect(wrapper.text()).toContain("Stuart Trenholm");
    const img = wrapper.get('[role="img"]');
    expect(img.attributes("aria-label")).toBe("Preview of slide 2: Team");
    expect(wrapper.get(".slide-preview__canvas").attributes()).toHaveProperty(
      "inert"
    );
  });

  it("shows why a slide can't be drawn when its layout throws", async () => {
    wrapper = mount(SlidePreview, {
      props: { entry: { id: "x", label: "X", layout: "boom", props: {} } },
    });
    await flushPromises();
    expect(wrapper.text()).toContain(
      "Can't preview this slide: the layout fell over"
    );
    expect(wrapper.emitted("error").at(-1)).toEqual(["the layout fell over"]);
    // role="img" hides its contents from assistive tech: the failure is in
    // its name as well.
    expect(wrapper.get('[role="img"]').attributes("aria-label")).toBe(
      "Preview of X. Can't preview this slide: the layout fell over"
    );
  });

  it("names an unknown layout instead of throwing", () => {
    wrapper = mount(SlidePreview, {
      props: { entry: { id: "x", label: "X", layout: "chart", props: {} } },
    });
    expect(wrapper.text()).toMatch(/Can't preview this slide: .*"chart"/);
  });

  it("recovers once the entry can be drawn again", async () => {
    wrapper = mount(SlidePreview, {
      props: { entry: { id: "x", label: "X", layout: "boom", props: {} } },
    });
    await wrapper.setProps({ entry: { ...entry("team"), id: "x" } });
    expect(wrapper.text()).not.toContain("Can't preview");
    expect(wrapper.text()).toContain("Our Team");
    expect(wrapper.emitted("error").at(-1)).toEqual([null]);
  });

  it("keeps the video src in the full preview", () => {
    wrapper = mount(SlidePreview, { props: { entry: VIDEO } });
    expect(wrapper.get("video").attributes("src")).toBe(
      "/publicAssets/deck/walkthrough.mp4"
    );
  });

  it("blanks the video src in a thumbnail, so nothing is fetched", () => {
    wrapper = mount(SlidePreview, { props: { entry: VIDEO, thumb: true } });
    expect(wrapper.find("video").exists()).toBe(false);
    expect(wrapper.text()).toContain("Feature walkthrough video");
    // A thumbnail has no name of its own: the rail's button carries it.
    expect(wrapper.find('[role="img"]').exists()).toBe(false);
    expect(wrapper.attributes("aria-hidden")).toBe("true");
  });

  it("waits for the debounce before redrawing an edit", async () => {
    vi.useFakeTimers();
    const team = entry("team");
    wrapper = mount(SlidePreview, { props: { entry: team, debounce: 100 } });
    await wrapper.setProps({
      entry: { ...team, props: { ...team.props, title: "The people" } },
    });
    expect(wrapper.text()).toContain("Our Team");
    await vi.advanceTimersByTimeAsync(100);
    expect(wrapper.text()).toContain("The people");
  });

  it("reports text running off the slide, again for each slide", async () => {
    // happy-dom lays nothing out: make the slide root report a tall content.
    const proto = Object.getPrototypeOf(document.body);
    const owner = [proto, Element.prototype].find((p) =>
      Object.getOwnPropertyDescriptor(p, "scrollHeight")
    );
    const real = Object.getOwnPropertyDescriptor(owner, "scrollHeight");
    Object.defineProperty(owner, "scrollHeight", {
      configurable: true,
      get() {
        return this.classList?.contains("deck-slide") ? 2000 : 0;
      },
    });
    try {
      wrapper = mount(SlidePreview, { props: { entry: entry("team") } });
      await new Promise((r) => requestAnimationFrame(r));
      await flushPromises();
      expect(wrapper.emitted("overflow")).toEqual([[true]]);

      // A thumbnail never measures.
      const thumb = mount(SlidePreview, {
        props: { entry: entry("team"), thumb: true },
      });
      await new Promise((r) => requestAnimationFrame(r));
      expect(thumb.emitted("overflow")).toBeUndefined();
      thumb.unmount();

      // Another slide that also overflows is reported for itself.
      await wrapper.setProps({ entry: entry("users") });
      await new Promise((r) => requestAnimationFrame(r));
      await flushPromises();
      expect(wrapper.emitted("overflow")).toEqual([[true], [true]]);
    } finally {
      Object.defineProperty(owner, "scrollHeight", real);
    }
  });

  it("dims a hidden slide and says so", () => {
    wrapper = mount(SlidePreview, {
      props: { entry: { ...entry("team"), hidden: true } },
    });
    expect(wrapper.classes()).toContain("is-hidden");
    expect(wrapper.text()).toContain("Hidden when presenting");
  });
});
