import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick, ref } from "vue";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("gsap/ScrollTrigger", () => ({ default: { refresh } }));

import FigureBar from "../shared/FigureBar.vue";
import { FIGURE_WIDGET_FIT } from "../shared/figureFit.js";
import TrepanationMethods from "../trepanation/TrepanationMethods.vue";
import trepanation from "../trepanation/schema.js";
import PapyrusCase from "../papyrus/PapyrusCase.vue";
import papyrus from "../papyrus/schema.js";
import { figureContent } from "../content.js";

const PROPS = {
  label: "Fig 02",
  title: "Methods of trepanation",
  legend: "Different trepanation methods (Lisowski, 1967).",
};
const wrappers = [];
function mountBar({ fit = false, props = PROPS, slots } = {}) {
  const wrapper = mount(FigureBar, {
    props,
    slots,
    global: { provide: { [FIGURE_WIDGET_FIT]: ref(fit) } },
    attachTo: document.body,
  });
  wrappers.push(wrapper);
  return wrapper;
}
const mouse = { pointerType: "mouse" };

beforeEach(() => {
  vi.useFakeTimers();
  refresh.mockClear();
});
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.useRealTimers();
});

describe("FigureBar: a figure widget's toolbar row", () => {
  it("draws the label and the title, and folds the legend behind its control", () => {
    const bar = mountBar();
    expect(bar.find(".fbar-fig").text()).toBe("Fig 02");
    expect(bar.find("h4.fbar-title").text()).toBe("Methods of trepanation");
    const button = bar.find(".fbar-legend-btn");
    expect(button.text()).toBe("Legend");
    expect(button.attributes("aria-expanded")).toBe("false");
    // Folded, the legend is still in the document, and the control names it.
    const legend = bar.find(".fbar-legend");
    expect(legend.text()).toContain("Lisowski, 1967");
    expect(legend.classes()).toContain("fbar-legend--folds");
    expect(legend.classes()).not.toContain("is-open");
    expect(button.attributes("aria-controls")).toBe(legend.attributes("id"));
  });

  it("has no control without a legend", () => {
    const bar = mountBar({ props: { ...PROPS, legend: "" } });
    expect(bar.find(".fbar-legend-btn").exists()).toBe(false);
    expect(bar.find(".fbar-legend").exists()).toBe(false);
  });

  it("keeps the legend open on a click and folds it on the next", async () => {
    const bar = mountBar();
    const button = bar.find(".fbar-legend-btn");
    await button.trigger("click");
    expect(button.attributes("aria-expanded")).toBe("true");
    expect(bar.find(".fbar-legend").classes()).not.toContain(
      "fbar-legend--folds"
    );
    await button.trigger("click");
    expect(button.attributes("aria-expanded")).toBe("false");
    expect(bar.find(".fbar-legend").classes()).toContain("fbar-legend--folds");
    // In the pane nothing on the page moved.
    await nextTick();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("floats the legend for a look: a mouse resting on the heading, or focus on the control", async () => {
    const bar = mountBar();
    const legend = () => bar.find(".fbar-legend").classes();
    await bar.find(".fbar-title").trigger("pointerover", mouse);
    // Not at once: a pointer on its way elsewhere should not flash it.
    expect(legend()).not.toContain("is-open");
    await vi.advanceTimersByTimeAsync(150);
    expect(legend()).toContain("is-open");
    // Still folded: the look takes no room and pins nothing.
    expect(bar.find(".fbar-legend-btn").attributes("aria-expanded")).toBe(
      "false"
    );
    await bar.find(".fbar").trigger("pointerleave");
    expect(legend()).not.toContain("is-open");

    await bar.find(".fbar-legend-btn").trigger("focus");
    expect(legend()).toContain("is-open");
    await bar.find(".fbar-legend-btn").trigger("blur");
    expect(legend()).not.toContain("is-open");
  });

  it("has no look for a finger: a touch is a tap", async () => {
    const bar = mountBar();
    await bar
      .find(".fbar-title")
      .trigger("pointerover", { pointerType: "touch" });
    await vi.advanceTimersByTimeAsync(300);
    expect(bar.find(".fbar-legend").classes()).not.toContain("is-open");
  });

  it("folds on Escape", async () => {
    const bar = mountBar();
    await bar.find(".fbar-legend-btn").trigger("click");
    await bar.find(".fbar").trigger("keydown", { key: "Escape" });
    expect(bar.find(".fbar-legend-btn").attributes("aria-expanded")).toBe(
      "false"
    );
  });

  it("inline in the text there is no look, and opening it re-measures the page", async () => {
    const bar = mountBar({ fit: true });
    await bar.find(".fbar-title").trigger("pointerover", mouse);
    await vi.advanceTimersByTimeAsync(300);
    await bar.find(".fbar-legend-btn").trigger("focus");
    expect(bar.find(".fbar-legend").classes()).not.toContain("is-open");
    await bar.find(".fbar-legend-btn").trigger("click");
    await nextTick();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("takes a control that leads the row", () => {
    const bar = mountBar({
      slots: { lead: '<button class="lead" type="button">x</button>' },
    });
    expect(bar.find(".fbar").classes()).toContain("fbar--lead");
    expect(bar.find(".fbar").element.firstElementChild.className).toBe("lead");
  });
});

describe("History's figure widgets fold their legends like every figure (OPENBRAIN-195)", () => {
  it.each([
    ["Methods of trepanation", TrepanationMethods, trepanation],
    ["Edwin Smith papyrus, case 20", PapyrusCase, papyrus],
  ])("%s", (name, component, schema) => {
    const wrapper = mount(component, {
      props: { content: figureContent(schema, { content: {} }), schema },
      attachTo: document.body,
    });
    wrappers.push(wrapper);
    const legend = wrapper.find(".fbar-legend");
    expect(legend.text().length).toBeGreaterThan(20);
    expect(legend.classes()).toContain("fbar-legend--folds");
    expect(wrapper.find(".fbar-legend-btn").attributes("aria-expanded")).toBe(
      "false"
    );
  });
});
