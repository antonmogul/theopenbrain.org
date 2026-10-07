import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import TimelineMap from "@/components/chapter/timeline/TimelineMap.vue";
import { buildTimeline } from "@/helper/chapterTimeline";
import {
  stubBarsWidth,
  testBars,
  testLayers,
  testModel,
} from "./timelineTestModel";

vi.mock("@/widgets/thumbnails", () => ({ widgetThumb: () => null }));

const WIDTH = 900;
let restoreWidth;
let wrapper;

function mountMap(props = {}) {
  wrapper = mount(TimelineMap, {
    props: {
      model: testModel(),
      position: 3.5,
      readPercent: 44,
      chapterTitle: "The Eye",
      layers: testLayers(),
      ...props,
    },
    attachTo: document.body,
  });
  return wrapper;
}

const heads = () =>
  wrapper.findAll(".map-section-head").map((h) => h.get(".map-section-title"));

beforeEach(() => {
  restoreWidth = stubBarsWidth(WIDTH);
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  restoreWidth();
  document.body.innerHTML = "";
});

describe("TimelineMap", () => {
  it("is a modal dialog named by the chapter, focused on close", async () => {
    mountMap();
    await flushPromises();
    const dialog = wrapper.get('[role="dialog"]');
    expect(dialog.attributes("aria-modal")).toBe("true");
    const title = wrapper.get(`#${dialog.attributes("aria-labelledby")}`);
    expect(title.text()).toBe("The Eye");
    expect(wrapper.text()).toContain("Chapter map");
    expect(wrapper.text()).toContain("44% read");
    expect(document.activeElement).toBe(
      wrapper.get('[aria-label="Close chapter map"]').element
    );
  });

  it("locks the page scroll while open", () => {
    // Read through the attribute: happy-dom's style getters go stale once
    // the style attribute has been emptied.
    const inline = () => document.documentElement.getAttribute("style") || "";
    mountMap();
    expect(inline()).toContain("overflow: hidden");
    wrapper.unmount();
    wrapper = null;
    expect(inline()).not.toContain("overflow");
  });

  it("closes on Escape and from the close button, saying how", async () => {
    mountMap();
    const close = wrapper.get('[aria-label="Close chapter map"]');
    await wrapper.trigger("keydown", { key: "Escape" });
    // Enter on the button: the keyboard.
    await close.trigger("keydown", { key: "Enter" });
    await close.trigger("click");
    // A click or tap: the pointer.
    await close.trigger("pointerdown", { pointerType: "mouse" });
    await close.trigger("click");
    expect(wrapper.emitted("close")).toEqual([
      [{ pointer: false }],
      [{ pointer: false }],
      [{ pointer: true }],
    ]);
  });

  it("keeps Tab inside when the dialog itself has focus", async () => {
    mountMap();
    await flushPromises();
    const dialog = wrapper.get('[role="dialog"]').element;
    const buttons = [...dialog.querySelectorAll("button")];
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    const tab = (shiftKey) => {
      const e = new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey,
        bubbles: true,
        cancelable: true,
      });
      document.activeElement.dispatchEvent(e);
      return e;
    };

    // A click on the map's text or padding focuses the dialog itself.
    dialog.focus();
    expect(document.activeElement).toBe(dialog);
    expect(tab(true).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(last);

    dialog.focus();
    expect(tab(false).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);
  });

  it("lists each section once, with its read progress", () => {
    mountMap();
    expect(heads().map((h) => h.text())).toEqual([
      "The Eye",
      "Photoreceptors",
      "Circuits",
    ]);
    const nums = wrapper.findAll(".map-num").map((n) => n.text());
    expect(nums).toEqual(["0", "1", "2"]);
    const fills = wrapper
      .findAll(".map-rule-fill")
      .map((f) => f.attributes("style"));
    expect(fills[0]).toContain("scaleX(1)");
    expect(fills[1]).toContain("scaleX(0.5)");
    expect(fills[2]).toContain("scaleX(0)");
    const current = wrapper.get('[aria-current="location"]');
    expect(current.text()).toContain("Photoreceptors");
    expect(current.text()).toContain("2 paragraphs · 1 widget");
  });

  it("lists widgets, media, your marks and trending, each a jump", async () => {
    mountMap();
    const sections = wrapper.findAll(".map-section");

    const widget = sections[1].get(".map-widget");
    expect(widget.text()).toContain("Colour vision");
    expect(widget.text()).toContain("Interactive by Stuart Trenholm");
    await widget.trigger("click");

    const media = sections[1].findAll(".map-entry").map((e) => e.text());
    expect(media.join(" | ")).toContain("Rods and cones");
    expect(sections[2].text()).toContain("Tom Baden");

    // Named as the reader's own for a screen reader.
    const yours = sections[1].findAll(".map-entry.is-yours");
    expect(yours.map((y) => y.text())).toEqual([
      "Your highlight: Rods word",
      "Your note: Check the figure.",
    ]);
    expect(yours[0].get(".sr-only").text()).toBe("Your highlight:");
    await yours[1].trigger("click");

    const trending = sections[2].findAll(".map-entry.is-trending");
    expect(trending[0].text()).toContain("12 readers");
    expect(trending[0].text()).toContain("“Bipolar word word”");
    await trending[0].trigger("click");

    await sections[2].get(".map-section-head").trigger("click");
    // From the keyboard (Enter's click), as nothing was pressed.
    const keyboard = { pointer: false };
    expect(wrapper.emitted("jump")).toEqual([
      [3, keyboard],
      [2, keyboard],
      [5, keyboard],
      // A section lands on its heading, by its element's id.
      [{ index: 5, anchorId: "s2" }, keyboard],
    ]);
  });

  it("says when a click or tap made the jump", async () => {
    mountMap();
    const head = wrapper.findAll(".map-section-head")[2];
    await head.trigger("pointerdown", { pointerType: "mouse" });
    await head.trigger("click");
    // Enter on the same entry afterwards: the keyboard again.
    await head.trigger("keydown", { key: "Enter" });
    await head.trigger("click");
    expect(wrapper.emitted("jump")).toEqual([
      [{ index: 5, anchorId: "s2" }, { pointer: true }],
      [{ index: 5, anchorId: "s2" }, { pointer: false }],
    ]);
  });

  it("jumps to a subsection's heading", async () => {
    const model = buildTimeline(
      {
        sections: [
          {
            id: "s1",
            title: "Bipolar cells",
            paragraphs: [
              { id: "p1", text: "Opening words." },
              {
                subSection: [
                  {
                    id: "sub-on-off",
                    title: "On and off",
                    paragraphs: [{ id: "p2", text: "On cells and off." }],
                  },
                ],
              },
            ],
          },
        ],
      },
      { labels: { s1: "1" } }
    );
    mountMap({ model, layers: undefined, position: 0 });
    await wrapper.get(".map-entry.is-sub").trigger("click");
    expect(wrapper.emitted("jump")).toEqual([
      [{ index: 1, anchorId: "sub-on-off" }, { pointer: false }],
    ]);
  });

  it("jumps from the large bars and previews below them", async () => {
    const model = testModel();
    const bars = testBars(model, WIDTH);
    mountMap({ model });
    const strip = wrapper.get(".tl-bars");
    expect(strip.attributes("aria-hidden")).toBe("true");
    const x = bars[6].x + bars[6].w / 2;
    await strip.trigger("pointermove", { pointerType: "mouse", clientX: x });
    const preview = wrapper.get('[data-testid="timeline-preview"]');
    expect(preview.classes()).toContain("is-below");
    expect(preview.text()).toContain("Tom Baden");
    await strip.trigger("pointerdown", { pointerType: "mouse", clientX: x });
    await strip.trigger("click", { clientX: x });
    expect(wrapper.emitted("jump")).toEqual([[6, { pointer: true }]]);
  });

  it("explains only the marks the chapter has", () => {
    mountMap({ layers: undefined });
    const legend = wrapper.findAll(".map-legend li").map((l) => l.text());
    expect(legend).toEqual(["Widget", "Figure", "Video"]);
  });

  it("says so when there is nothing to map", () => {
    mountMap({
      model: { items: [], sections: [], subsections: [], maxWords: 1 },
      position: 0,
    });
    expect(wrapper.text()).toContain("nothing to map yet");
    expect(wrapper.find(".tl-bars").exists()).toBe(false);
  });
});
