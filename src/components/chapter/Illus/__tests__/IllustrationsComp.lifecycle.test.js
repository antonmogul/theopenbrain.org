import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { shallowMount, flushPromises } from "@vue/test-utils";

const fixtures = vi.hoisted(() => ({
  triggers: [],
  store: null,
  fetch: vi.fn(),
}));
vi.mock("@/stores", async () => {
  const { reactive } = await import("vue");
  fixtures.store = reactive({ isScrolling: false, animationActive: false });
  return { useGeneral: () => fixtures.store };
});
vi.mock("@/composables/useAnimations", async () => {
  const { ref } = await import("vue");
  return {
    useAnimations: () => ({
      animations: ref([
        { id: "animationFoundationsFig1", mediaType: "image" },
        { id: "animationFoundationsFig2", mediaType: "image" },
      ]),
      fetchAnimations: fixtures.fetch,
    }),
  };
});
vi.mock("gsap/ScrollTrigger", () => ({
  default: {
    create: vi.fn((vars) => {
      const trigger = {
        vars,
        trigger: vars.trigger,
        kill: vi.fn(),
        isActive: false,
      };
      fixtures.triggers.push(trigger);
      return trigger;
    }),
    refresh: vi.fn(),
    getAll: () => fixtures.triggers,
  },
}));
vi.mock("@/helper/chapterDebug", () => ({
  clog: vi.fn(),
  cgroup: vi.fn(),
  announce: vi.fn(),
}));
import IllustrationsComp from "../IllustrationsComp.vue";
import ScrollTrigger from "gsap/ScrollTrigger";

const wrappers = [];
const mountPane = (options = {}) => {
  const wrapper = shallowMount(IllustrationsComp, options);
  wrappers.push(wrapper);
  return wrapper;
};
const toggle = (trigger, isActive) => {
  trigger.isActive = isActive;
  trigger.vars.onToggle({ trigger: trigger.trigger, isActive });
};
async function settle() {
  await flushPromises();
  await vi.advanceTimersByTimeAsync(500);
}
beforeEach(() => {
  fixtures.triggers.length = 0;
  ScrollTrigger.refresh.mockClear();
  fixtures.fetch.mockReset().mockResolvedValue([]);
  fixtures.store.animationActive = false;
  vi.useFakeTimers();
  document.body.innerHTML = `<div id="container">
    <span id="triggerAnimationFoundationsFig1" class="animationTrigger"></span>
    <span id="triggerAnimationFoundationsFig2" class="animationTrigger"></span>
    <div data-breakout-box="humours"><span id="triggerAnimationHumours" class="animationTrigger animationScrollAnchor"></span></div>
    <div data-breakout-box="comparative"><span id="triggerAnimationComparative" class="animationTrigger"></span></div>
    <div data-breakout-box="descartes"><span id="triggerAnimationDescartes" class="animationTrigger"></span></div>
  </div>`;
});
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("reader figure lifecycle", () => {
  it("never registers breakout artwork with the pinned figure pane", async () => {
    mountPane();
    await settle();
    expect(fixtures.triggers.map((t) => t.trigger.id)).toEqual([
      "triggerAnimationFoundationsFig1",
      "triggerAnimationFoundationsFig2",
      "container",
    ]);
  });

  it("keeps an overlapping figure active when another exits, in both scroll directions", async () => {
    mountPane();
    await settle();
    const [first, second] = fixtures.triggers;
    toggle(first, true);
    toggle(second, true);
    toggle(first, false);
    expect(fixtures.store.animationActive).toBe(true);
    expect(second.trigger.classList.contains("active")).toBe(true);
    toggle(first, true);
    toggle(second, false);
    expect(fixtures.store.animationActive).toBe(true);
    toggle(first, false);
    expect(fixtures.store.animationActive).toBe(false);
  });

  it("does not bind to the departing chapter during a route transition", async () => {
    const reader = document.createElement("div");
    reader.className = "chapter-reader";
    reader.innerHTML =
      '<div id="container"><span id="triggerAnimationNewChapter" class="animationTrigger"></span></div>';
    document.body.appendChild(reader);
    mountPane({ attachTo: reader });
    await settle();
    expect(fixtures.triggers.map((t) => t.trigger.id)).toEqual([
      "triggerAnimationNewChapter",
      "container",
    ]);
  });

  it("cancels pending setup when the reader is closed immediately", async () => {
    const pane = mountPane();
    await flushPromises();
    pane.unmount();
    await vi.advanceTimersByTimeAsync(1000);
    expect(fixtures.triggers).toHaveLength(0);
  });

  it("ignores a fetch that finishes after leaving the chapter", async () => {
    let resolve;
    fixtures.fetch.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        })
    );
    const pane = mountPane();
    pane.unmount();
    resolve([]);
    await settle();
    expect(fixtures.triggers).toHaveLength(0);
  });

  it("refreshes cached positions after reader reflow and late fonts, then detaches", async () => {
    const originalFonts = Object.getOwnPropertyDescriptor(document, "fonts");
    const fonts = new EventTarget();
    fonts.ready = Promise.resolve();
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: fonts,
    });
    const disconnect = vi.fn();
    let resized;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback) {
          resized = callback;
        }
        observe() {}
        disconnect() {
          disconnect();
        }
      }
    );
    try {
      const pane = mountPane();
      await settle();
      await vi.advanceTimersByTimeAsync(1);
      ScrollTrigger.refresh.mockClear();
      resized([{ contentRect: { width: 600, height: 3000 } }]);
      fonts.dispatchEvent(new Event("loadingdone"));
      await vi.advanceTimersByTimeAsync(1);
      expect(ScrollTrigger.refresh).toHaveBeenCalledTimes(1);
      resized([{ contentRect: { width: 600, height: 3000 } }]);
      await vi.advanceTimersByTimeAsync(1);
      expect(ScrollTrigger.refresh).toHaveBeenCalledTimes(1);
      resized([{ contentRect: { width: 600, height: 3200 } }]);
      pane.unmount();
      fonts.dispatchEvent(new Event("loadingdone"));
      await vi.advanceTimersByTimeAsync(1);
      expect(ScrollTrigger.refresh).toHaveBeenCalledTimes(1);
      expect(disconnect).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
      if (originalFonts)
        Object.defineProperty(document, "fonts", originalFonts);
      else delete document.fonts;
    }
  });
  it("kills only this pane's triggers during interrupted Back/Forward remounts", async () => {
    const oldPane = mountPane();
    await settle();
    const oldTriggers = [...fixtures.triggers];
    const newPane = mountPane();
    await settle();
    const newTriggers = fixtures.triggers.slice(oldTriggers.length);
    oldPane.unmount();
    expect(oldTriggers.every((t) => t.kill.mock.calls.length === 1)).toBe(true);
    expect(newTriggers.every((t) => t.kill.mock.calls.length === 0)).toBe(true);
    newPane.unmount();
    expect(newTriggers.every((t) => t.kill.mock.calls.length === 1)).toBe(true);
  });
});
