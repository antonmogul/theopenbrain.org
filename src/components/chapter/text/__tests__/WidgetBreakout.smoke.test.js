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

import WidgetBreakout from "@/components/chapter/text/WidgetBreakout.vue";

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
beforeEach(() => {
  savedIO = globalThis.IntersectionObserver;
  // No observer → inline stages mount eagerly, which is what the assertions
  // below need. The observer path is exercised in the browser smoke run.
  globalThis.IntersectionObserver = undefined;
});

afterEach(() => {
  globalThis.IntersectionObserver = savedIO;
  document.body.innerHTML = "";
  document.body.style.overflow = "";
});

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
