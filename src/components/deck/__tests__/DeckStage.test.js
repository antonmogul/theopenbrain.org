/*
 * DeckStage navigation: keys move one slide and stop at the ends, number
 * keys jump, typing in a field is left alone, and only the current slide is
 * shown.
 */
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import DeckStage from "../DeckStage.vue";

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    disconnect() {}
  };
});

const Slide = { props: ["text"], template: "<p>{{ text }}</p>" };
const SLIDES = ["One", "Two", "Three"].map((label) => ({
  id: label.toLowerCase(),
  label,
  notes: `Notes for ${label}`,
  component: Slide,
  props: { text: label },
}));

let wrapper;
const mountStage = (modelValue = 0) => {
  wrapper = mount(DeckStage, {
    props: {
      slides: SLIDES,
      modelValue,
      "onUpdate:modelValue": (v) => wrapper.setProps({ modelValue: v }),
    },
    attachTo: document.body,
  });
  return wrapper;
};
// Each press waits for the v-model round trip before the next.
const press = async (key, target = window) => {
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  await flushPromises();
};
const emitted = () => wrapper.emitted("update:modelValue")?.map(([v]) => v);

afterEach(() => wrapper?.unmount());

describe("DeckStage", () => {
  it("shows only the current slide", () => {
    mountStage(1);
    const shown = wrapper
      .findAll(".deck-stage__slide")
      .filter((s) => s.element.style.display !== "none");
    expect(shown).toHaveLength(1);
    expect(shown[0].text()).toBe("Two");
  });

  it("moves forward and back with the arrow keys", async () => {
    mountStage(1);
    await press("ArrowRight");
    await press("ArrowLeft");
    expect(emitted()).toEqual([2, 1]);
  });

  it("stops at the first and last slide", async () => {
    mountStage(0);
    await press("ArrowLeft");
    await press("End");
    await press("PageDown");
    expect(emitted()).toEqual([2]);
  });

  it("jumps with the number keys", async () => {
    mountStage(0);
    await press("3");
    expect(emitted()).toEqual([2]);
  });

  it("ignores keys typed into a field", async () => {
    mountStage(0);
    const input = document.createElement("input");
    document.body.appendChild(input);
    await press("ArrowRight", input);
    input.remove();
    expect(emitted()).toBeUndefined();
  });

  it("toggles the speaker notes with N", async () => {
    mountStage(2);
    expect(wrapper.find(".deck-stage__notes").exists()).toBe(false);
    await press("n");
    expect(wrapper.find(".deck-stage__notes").text()).toContain(
      "Notes for Three"
    );
  });

  it("announces the slide for screen readers", () => {
    mountStage(1);
    expect(wrapper.find(".deck-stage__live").text()).toBe("Slide 2 of 3: Two");
  });
});
