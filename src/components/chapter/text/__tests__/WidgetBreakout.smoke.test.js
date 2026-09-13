import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

/* Stub the widget loaders so the test never pulls a 1,500-line view into
   happy-dom. The contract under test is when/where a widget mounts, not what
   the widget draws. */
vi.mock("@/widgets/embeds", async () => {
  // Resolve straight to a component: defineAsyncComponent only unwraps
  // `.default` from a real ES-module namespace, and a render function beats
  // a `template:` string under the runtime-only Vue build Vitest uses.
  const { h } = await import("vue");
  const fake = (name) => () =>
    Promise.resolve({
      name,
      render: () => h("div", { class: "fake-widget" }, name),
    });
  const WIDGET_EMBEDS = {
    "color-vision": fake("ColorVision"),
    retinabox: fake("RetINaBox"),
  };
  return {
    WIDGET_EMBEDS,
    hasEmbed: (id) => Object.prototype.hasOwnProperty.call(WIDGET_EMBEDS, id),
  };
});

/* The stage refreshes ScrollTrigger when its slot height changes; gsap
   itself is not under test here. */
const { refreshSpy } = vi.hoisted(() => ({ refreshSpy: vi.fn() }));
vi.mock("gsap/ScrollTrigger", () => ({ default: { refresh: refreshSpy } }));

import WidgetBreakout from "@/components/chapter/text/WidgetBreakout.vue";
import { STAGE_LAYER_ID } from "@/helper/stageLayer";

const RouterLinkStub = {
  props: ["to"],
  template: '<a :href="to" class="router-link-stub"><slot /></a>',
};

function mountBreakout(placement) {
  return mount(WidgetBreakout, {
    props: { placement },
    attachTo: document.body,
    global: {
      // Stub transitions: happy-dom never fires transitionend, so a real
      // <Transition> would keep the closed modal in the DOM.
      stubs: { RouterLink: RouterLinkStub, Transition: true },
    },
  });
}

const breakout = {
  placementId: "retina-color-vision",
  widgetId: "color-vision",
  kind: "breakout",
  title: "Colour vision starts in the retina",
  blurb: "Three pigment classes become the colours we see.",
  credit: "Interactive by Stuart Trenholm",
  route: "/color-vision",
};

let savedIO;
let savedMatchMedia;
/* A controllable matchMedia: `desktop.matches` decides the breakpoint and
   `desktop.fire(bool)` simulates crossing it. */
const desktop = {
  matches: false,
  listeners: new Set(),
  fire(matches) {
    this.matches = matches;
    for (const fn of this.listeners) fn({ matches });
  },
};
beforeEach(() => {
  savedIO = globalThis.IntersectionObserver;
  // No observer → inline stages mount eagerly, which is what the assertions
  // below need. The observer path is exercised in the browser smoke run.
  globalThis.IntersectionObserver = undefined;
  savedMatchMedia = window.matchMedia;
  desktop.matches = false;
  desktop.listeners.clear();
  window.matchMedia = () => ({
    get matches() {
      return desktop.matches;
    },
    addEventListener: (_, fn) => desktop.listeners.add(fn),
    removeEventListener: (_, fn) => desktop.listeners.delete(fn),
  });
  refreshSpy.mockClear();
});

afterEach(() => {
  globalThis.IntersectionObserver = savedIO;
  window.matchMedia = savedMatchMedia;
  document.body.innerHTML = "";
  document.body.style.overflow = "";
});

function addStageLayer() {
  const container = document.createElement("div");
  container.id = "container";
  const layer = document.createElement("div");
  layer.id = STAGE_LAYER_ID;
  container.appendChild(layer);
  document.body.appendChild(container);
  return layer;
}

describe("WidgetBreakout — breakout card", () => {
  it("renders the card without loading the widget, then mounts it in a wide modal on demand", async () => {
    const wrapper = mountBreakout(breakout);
    await flushPromises();

    const root = wrapper.find("[data-widget-breakout='color-vision']");
    expect(root.exists()).toBe(true);
    expect(root.classes()).toContain("wb--breakout");
    expect(wrapper.text()).toContain("Colour vision starts in the retina");
    expect(wrapper.text()).toContain("Three pigment classes");
    expect(wrapper.text()).toContain("Interactive by Stuart Trenholm");
    expect(document.querySelector(".fake-widget")).toBeNull();
    expect(document.querySelector('[role="dialog"]')).toBeNull();

    const link = wrapper.find("a.router-link-stub");
    expect(link.attributes("href")).toBe("/color-vision");

    const open = wrapper.find("button.wb-btn--primary");
    expect(open.text()).toBe("Open interactive");
    await open.trigger("click");
    await flushPromises();

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.classList.contains("demo-panel--wide")).toBe(true);
    // defineAsyncComponent resolves over a few microtasks; wait for it.
    await vi.waitFor(() =>
      expect(document.querySelector(".fake-widget")?.textContent).toBe(
        "ColorVision"
      )
    );

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await flushPromises();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    wrapper.unmount();
  });

  it("is labelled for assistive tech and opts out of highlighting", async () => {
    const wrapper = mountBreakout(breakout);
    await flushPromises();
    const root = wrapper.find("aside");
    expect(root.classes()).toContain("noHighlight");
    const labelledBy = root.attributes("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    expect(wrapper.find(`#${labelledBy}`).text()).toBe(
      "Colour vision starts in the retina"
    );
    wrapper.unmount();
  });
});

describe("WidgetBreakout — inline stage", () => {
  it("mounts the widget in the prose and offers a full-screen escape hatch", async () => {
    const wrapper = mountBreakout({
      ...breakout,
      placementId: "retina-retinabox",
      widgetId: "retinabox",
      kind: "inline",
      title: "RetINaBox",
      route: "/retinabox",
    });
    await flushPromises();

    expect(wrapper.find(".wb--inline").exists()).toBe(true);
    await vi.waitFor(() =>
      expect(wrapper.find(".wb-stage .fake-widget").exists()).toBe(true)
    );
    expect(wrapper.find(".wb-stage .fake-widget").text()).toBe("RetINaBox");
    const full = wrapper.find("button.wb-btn--primary");
    expect(full.text()).toBe("Full screen");

    await full.trigger("click");
    await flushPromises();
    // One instance at a time: the stage yields to the modal while it is open.
    expect(wrapper.find(".wb-stage .fake-widget").exists()).toBe(false);
    await vi.waitFor(() =>
      expect(
        document.querySelector('[role="dialog"] .fake-widget')
      ).not.toBeNull()
    );
    wrapper.unmount();
  });
});

describe("WidgetBreakout — full-bleed stage (OPENBRAIN-37)", () => {
  const inline = {
    ...breakout,
    placementId: "retina-retinabox",
    widgetId: "retinabox",
    kind: "inline",
    title: "RetINaBox",
    route: "/retinabox",
  };

  it("teleports the stage into the reader's stage layer at desktop widths and vacates a same-height slot", async () => {
    const layer = addStageLayer();
    desktop.matches = true;
    const wrapper = mountBreakout(inline);
    await flushPromises();

    const stage = layer.querySelector('[data-widget-stage="retinabox"]');
    expect(stage).not.toBeNull();
    expect(stage.classList.contains("wb-stage--floating")).toBe(true);
    // Out of the clipping column: nothing of the stage remains in the card.
    expect(wrapper.find(".wb-slot .wb-stage").exists()).toBe(false);
    const slot = wrapper.find(".wb-slot");
    expect(slot.classes()).toContain("wb-slot--vacated");
    expect(slot.attributes("style")).toMatch(/height: \d+px/);
    // Geometry: fake rects (happy-dom lays nothing out) and let a resize
    // drive one sync — the slot takes the stage's height and the stage
    // sits at the slot's offset from the layer; ScrollTrigger re-measures.
    layer.getBoundingClientRect = () => ({ top: 100, height: 0 });
    slot.element.getBoundingClientRect = () => ({ top: 1000, height: 0 });
    stage.getBoundingClientRect = () => ({ top: 0, height: 300 });
    window.dispatchEvent(new Event("resize"));
    await flushPromises();
    expect(slot.attributes("style")).toBe("height: 300px;");
    expect(stage.style.top).toBe("900px");
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    // Same height again: no second refresh.
    window.dispatchEvent(new Event("resize"));
    await flushPromises();
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    // The widget still mounts, in the teleported stage, and the modal still
    // takes over from it.
    await vi.waitFor(() =>
      expect(layer.querySelector(".fake-widget")?.textContent).toBe("RetINaBox")
    );
    await wrapper.find("button.wb-btn--primary").trigger("click");
    await flushPromises();
    expect(layer.querySelector(".fake-widget")).toBeNull();
    wrapper.unmount();
    // Unmounting removes the teleported stage too.
    expect(layer.querySelector('[data-widget-stage="retinabox"]')).toBeNull();
  });

  it("stays in the card below the breakpoint and moves when the viewport crosses it", async () => {
    const layer = addStageLayer();
    desktop.matches = false;
    const wrapper = mountBreakout(inline);
    await flushPromises();

    expect(wrapper.find(".wb-slot .wb-stage").exists()).toBe(true);
    expect(layer.querySelector(".wb-stage")).toBeNull();

    desktop.fire(true);
    await flushPromises();
    expect(layer.querySelector(".wb-stage--floating")).not.toBeNull();
    expect(wrapper.find(".wb-slot .wb-stage").exists()).toBe(false);

    desktop.fire(false);
    await flushPromises();
    expect(layer.querySelector(".wb-stage")).toBeNull();
    expect(wrapper.find(".wb-slot .wb-stage").exists()).toBe(true);
    expect(wrapper.find(".wb-stage").classes()).not.toContain(
      "wb-stage--floating"
    );
    wrapper.unmount();
  });

  it("stays in the card when no stage layer exists (Storybook, other hosts)", async () => {
    desktop.matches = true;
    const wrapper = mountBreakout(inline);
    await flushPromises();
    expect(wrapper.find(".wb-slot .wb-stage").exists()).toBe(true);
    expect(wrapper.find(".wb-stage--floating").exists()).toBe(false);
    wrapper.unmount();
  });

  it("does not measure or refresh after unmount, even with a sync pending", async () => {
    const layer = addStageLayer();
    desktop.matches = true;
    const wrapper = mountBreakout(inline);
    await flushPromises();
    const stage = layer.querySelector(".wb-stage");
    stage.getBoundingClientRect = () => ({ top: 0, height: 480 });
    // Queue a sync (microtask) and unmount before it runs.
    window.dispatchEvent(new Event("resize"));
    wrapper.unmount();
    await flushPromises();
    expect(refreshSpy).not.toHaveBeenCalled();
    expect(layer.children).toHaveLength(0);
  });

  it("never teleports a breakout card", async () => {
    addStageLayer();
    desktop.matches = true;
    const wrapper = mountBreakout(breakout);
    await flushPromises();
    expect(document.querySelector(`#${STAGE_LAYER_ID}`).children).toHaveLength(
      0
    );
    expect(wrapper.find(".wb-slot").exists()).toBe(false);
    wrapper.unmount();
  });
});

describe("WidgetBreakout — unknown widget", () => {
  it("degrades to a message and hides the open button", async () => {
    const wrapper = mountBreakout({
      placementId: "x",
      widgetId: "not-ported",
      kind: "inline",
      title: "Someday",
      route: "",
    });
    await flushPromises();
    expect(wrapper.find(".wb--unavailable").exists()).toBe(true);
    expect(wrapper.text()).toContain("not available in the reader yet");
    expect(wrapper.find("button.wb-btn--primary").exists()).toBe(false);
    expect(wrapper.find("a.router-link-stub").exists()).toBe(false);
    wrapper.unmount();
  });
});
