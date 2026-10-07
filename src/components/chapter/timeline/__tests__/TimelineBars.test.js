import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import TimelineBars from "@/components/chapter/timeline/TimelineBars.vue";
import {
  stubBarsWidth,
  testBars,
  testLayers,
  testModel,
} from "./timelineTestModel";

const WIDTH = 800;
let restoreWidth;

beforeEach(() => {
  restoreWidth = stubBarsWidth(WIDTH);
});

afterEach(() => {
  restoreWidth();
});

// The width is measured on mount, so the bars draw on the next tick.
async function mountBars(props = {}) {
  const wrapper = mount(TimelineBars, {
    props: { model: testModel(), ...props },
  });
  await flushPromises();
  return wrapper;
}

const clipRect = (wrapper, name) =>
  wrapper.find(`clipPath[id$="-${name}"] rect`);

describe("TimelineBars", () => {
  it("draws prose bars and block bars in separate paths, rounded on top", async () => {
    const wrapper = await mountBars();
    const text = wrapper.get(".tl-layer:not(.is-played) .tl-text");
    const block = wrapper.get(".tl-layer:not(.is-played) .tl-block");
    // Six prose items, two blocks (the widget and the video break).
    expect(text.attributes("d").match(/M/g)).toHaveLength(6);
    expect(block.attributes("d").match(/M/g)).toHaveLength(2);
    expect(text.attributes("d")).toContain("Q");
    expect(block.attributes("fill")).toMatch(/^url\(#.+-hatch-rest\)$/);
  });

  it("is as tall as a bar at rest and adds labels and lanes expanded", async () => {
    const rest = await mountBars({ barHeight: 12 });
    expect(rest.attributes("style")).toContain("height: 12px");
    expect(rest.find(".tl-labels").exists()).toBe(false);

    const open = await mountBars({ barHeight: 52, expanded: true });
    expect(open.attributes("style")).toContain("height: 96px");
    const labels = open.findAll(".tl-label").map((l) => l.text());
    // The intro has no label; sections 1 and 2 do.
    expect(labels).toEqual(["1", "2"]);
    expect(open.get(".tl-content").attributes("d")).toMatch(/M/);
  });

  it("clips the read part at the bar being read and fills that bar partly", async () => {
    const model = testModel();
    const bars = testBars(model, WIDTH);
    const wrapper = await mountBars({ model, position: 3.5 });
    expect(Number(clipRect(wrapper, "played").attributes("width"))).toBe(
      bars[3].x
    );
    const current = clipRect(wrapper, "current");
    expect(current.exists()).toBe(true);
    // A block is full height: half of it read.
    expect(Number(current.attributes("height"))).toBeCloseTo(6, 5);
    expect(wrapper.findAll(".tl-layer.is-played")).toHaveLength(2);
  });

  it("plays everything at the end and nothing at the start", async () => {
    const wrapper = await mountBars({ position: 8 });
    expect(Number(clipRect(wrapper, "played").attributes("width"))).toBe(WIDTH);
    expect(clipRect(wrapper, "current").exists()).toBe(false);
    await wrapper.setProps({ position: 0 });
    expect(Number(clipRect(wrapper, "played").attributes("width"))).toBe(0);
  });

  it("draws the cursor bar in ink", async () => {
    const wrapper = await mountBars();
    expect(wrapper.find(".tl-cursor").exists()).toBe(false);
    await wrapper.setProps({ cursor: 3 });
    const cursor = wrapper.get(".tl-cursor");
    expect(cursor.classes()).toContain("is-block");
    await wrapper.setProps({ cursor: 2 });
    expect(wrapper.get(".tl-cursor").classes()).not.toContain("is-block");
  });

  it("shows the layers expanded: trending caps, your dots and notes", async () => {
    const wrapper = await mountBars({
      expanded: true,
      barHeight: 52,
      layers: testLayers(),
    });
    const caps = wrapper.findAll(".tl-cap");
    expect(caps).toHaveLength(1);
    expect(caps[0].attributes("opacity")).toBe("1");
    const dot = wrapper.get(".tl-dot");
    expect(dot.attributes("fill")).toBe("#86efac");
    expect(wrapper.get(".tl-note").attributes("d")).toMatch(/M/);
  });

  it("reports the item under the mouse and picks on click", async () => {
    const model = testModel();
    const bars = testBars(model, WIDTH);
    const wrapper = await mountBars({ model });
    const center = (b) => bars[b].x + bars[b].w / 2;

    await wrapper.trigger("pointermove", {
      pointerType: "mouse",
      clientX: center(4),
    });
    expect(wrapper.emitted("hover")[0][0]).toEqual({
      index: 4,
      x: center(4),
    });
    await wrapper.trigger("pointerleave", { pointerType: "mouse" });
    expect(wrapper.emitted("hover")[1][0]).toBeNull();

    await wrapper.trigger("pointerdown", {
      pointerType: "mouse",
      clientX: center(1),
    });
    await wrapper.trigger("click", { clientX: center(1) });
    expect(wrapper.emitted("pick")[0][0]).toEqual({ index: 1, x: center(1) });
  });

  it("on touch, scrubs on drag and picks only a second tap on the same bar", async () => {
    const model = testModel();
    const bars = testBars(model, WIDTH);
    const wrapper = await mountBars({ model });
    const center = (b) => bars[b].x + bars[b].w / 2;

    await wrapper.trigger("pointerdown", {
      pointerType: "touch",
      clientX: center(0),
    });
    await wrapper.trigger("pointermove", {
      pointerType: "touch",
      clientX: center(5),
    });
    expect(wrapper.emitted("hover").at(-1)[0].index).toBe(5);
    await wrapper.trigger("click", { clientX: center(5) });
    expect(wrapper.emitted("pick")).toBeUndefined();

    // A tap on another bar selects it…
    await wrapper.setProps({ cursor: 5 });
    await wrapper.trigger("pointerdown", {
      pointerType: "touch",
      clientX: center(2),
    });
    await wrapper.trigger("click", { clientX: center(2) });
    expect(wrapper.emitted("hover").at(-1)[0].index).toBe(2);
    expect(wrapper.emitted("pick")).toBeUndefined();

    // …and a tap on the selected one picks it.
    await wrapper.setProps({ cursor: 2 });
    await wrapper.trigger("pointerdown", {
      pointerType: "touch",
      clientX: center(2),
    });
    await wrapper.trigger("click", { clientX: center(2) });
    expect(wrapper.emitted("pick")[0][0].index).toBe(2);
  });

  it("ignores the pointer when not interactive", async () => {
    const wrapper = await mountBars({ interactive: false });
    await wrapper.trigger("pointermove", { pointerType: "mouse", clientX: 5 });
    await wrapper.trigger("click", { clientX: 5 });
    expect(wrapper.emitted("hover")).toBeUndefined();
    expect(wrapper.emitted("pick")).toBeUndefined();
  });

  it("exposes the centre of an item's bar", async () => {
    const model = testModel();
    const bars = testBars(model, WIDTH);
    const wrapper = await mountBars({ model });
    expect(wrapper.vm.centerOf(6)).toBe(bars[6].x + bars[6].w / 2);
  });
});
