import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import TimelinePreview, {
  displayTitle,
  readers,
  sectionName,
  sectionNumber,
} from "@/components/chapter/timeline/TimelinePreview.vue";
import { testModel } from "./timelineTestModel";

const thumbs = vi.hoisted(() => ({ url: null }));
vi.mock("@/widgets/thumbnails", () => ({ widgetThumb: () => thumbs.url }));

const model = testModel();
const item = (i) => model.items[i];
const section = (key) => model.sections.find((s) => s.key === key);

describe("TimelinePreview", () => {
  it("shows where a paragraph is and how it opens", () => {
    const wrapper = mount(TimelinePreview, {
      props: { item: item(2), section: section("s1") },
    });
    expect(wrapper.get(".tl-preview-num").text()).toBe("1");
    expect(wrapper.get(".tl-preview-section").text()).toBe("Photoreceptors");
    expect(wrapper.get(".tl-preview-excerpt").text()).toMatch(/^Rods word/);
    // Its figure, named from the animation key.
    expect(wrapper.get(".tl-preview-media").text()).toContain("Rods and cones");
  });

  it("numbers the intro 0, as the contents do", () => {
    const wrapper = mount(TimelinePreview, {
      props: { item: item(0), section: section("intro") },
    });
    expect(wrapper.get(".tl-preview-num").text()).toBe("0");
    expect(wrapper.get(".tl-preview-section").text()).toBe("The Eye");
  });

  it("shows a widget's card: thumbnail, kicker, title, blurb, credit", () => {
    thumbs.url = "/thumbs/color-vision.jpg";
    const wrapper = mount(TimelinePreview, {
      props: { item: item(3), section: section("s1") },
    });
    expect(wrapper.get(".tl-preview-thumb img").attributes("src")).toBe(
      "/thumbs/color-vision.jpg"
    );
    expect(wrapper.get(".tl-preview-kicker").text()).toBe("Interactive");
    expect(wrapper.get(".tl-preview-title").text()).toBe("Colour vision");
    expect(wrapper.get(".tl-preview-blurb").text()).toBe(
      "Mix the three cone signals."
    );
    expect(wrapper.get(".tl-preview-credit").text()).toBe(
      "Interactive by Stuart Trenholm"
    );

    thumbs.url = null;
    const bare = mount(TimelinePreview, { props: { item: item(3) } });
    expect(bare.find(".tl-preview-thumb img").exists()).toBe(false);
    expect(bare.find(".tl-preview-thumb-empty").exists()).toBe(true);
  });

  it("names a video break", () => {
    const wrapper = mount(TimelinePreview, { props: { item: item(6) } });
    expect(wrapper.get(".tl-preview-kicker").text()).toBe("Video");
    expect(wrapper.get(".tl-preview-title").text()).toBe("Tom Baden");
  });

  it("lists the reader's marks and the top trending passage", () => {
    const wrapper = mount(TimelinePreview, {
      props: {
        item: item(2),
        highlights: [
          { id: "a", color: "blue", text: "Rods word" },
          { id: "b", color: "nope", text: "word word" },
          { id: "c", color: "pink", text: "third" },
        ],
        notes: [{ id: "n", content: "Check the figure." }],
        trending: [
          { text: "Rods word word", count: 12 },
          { text: "word", count: 2 },
        ],
      },
    });
    const yours = wrapper.get('[data-testid="timeline-preview-yours"]');
    const quotes = yours.findAll(".tl-preview-quote");
    expect(quotes).toHaveLength(2);
    expect(quotes[0].attributes("style")).toContain("--tl-hl: #93c5fd");
    // An unknown colour falls back to yellow.
    expect(quotes[1].attributes("style")).toContain("--tl-hl: #fcd34d");
    expect(yours.text()).toContain("+2 more");

    const trending = wrapper.get('[data-testid="timeline-preview-trending"]');
    expect(trending.text()).toContain("12 readers highlighted:");
    expect(trending.text()).toContain("“Rods word word”");
    expect(trending.text()).toContain("+1 more passage");
  });

  it("anchors over a point and offers Go here on touch", async () => {
    const wrapper = mount(TimelinePreview, {
      props: { item: item(2), x: 120.4, touch: true },
    });
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(["is-anchored", "is-touch"])
    );
    expect(wrapper.attributes("style")).toContain("--tl-x: 120px");
    await wrapper.get(".tl-preview-go").trigger("click");
    expect(wrapper.emitted("go")).toHaveLength(1);

    const still = mount(TimelinePreview, { props: { item: item(2) } });
    expect(still.classes()).not.toContain("is-anchored");
    expect(still.find(".tl-preview-go").exists()).toBe(false);
  });
});

describe("timeline words", () => {
  it("names sections", () => {
    expect(sectionName({ kind: "intro", label: "" })).toBe("Introduction");
    expect(sectionName({ kind: "section", label: "3" })).toBe("Section 3");
    expect(sectionName({ kind: "box", label: "A" })).toBe("Box A");
    expect(sectionName(null)).toBe("");
    expect(sectionNumber({ kind: "intro", label: "" })).toBe("0");
    expect(sectionNumber({ kind: "box", label: "B" })).toBe("B");
  });

  it("turns animation keys into words and leaves titles alone", () => {
    expect(displayTitle("AccommodationVergence")).toBe(
      "Accommodation vergence"
    );
    expect(displayTitle("eyeMovements")).toBe("Eye movements");
    expect(displayTitle("RetinalCellTypes")).toBe("Retinal cell types");
    expect(displayTitle("dragon")).toBe("Dragon");
    expect(displayTitle("AMD")).toBe("AMD");
    expect(displayTitle("Eye Structure")).toBe("Eye Structure");
    expect(displayTitle("")).toBe("");
  });

  it("counts readers", () => {
    expect(readers(1)).toBe("1 reader");
    expect(readers(12)).toBe("12 readers");
  });
});
