import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, shallowMount, flushPromises } from "@vue/test-utils";
import { ref } from "vue";

/*
 * OPENBRAIN-151 — the 2023 fullscreen figures never tore anything down: their
 * Lotties, the split's ScrollTrigger and the loop's frame poll all outlived the
 * chapter they were mounted in, and the next scroll after a chapter change ran
 * the split's progress watcher against instances that no longer existed. Each
 * component must destroy what it made on unmount, and a library import or
 * delayed setup that lands after unmount must create nothing.
 */

const mock = vi.hoisted(() => ({
  load: vi.fn(),
  instances: [],
  triggers: [],
}));
vi.mock("@/composables/useLottie", () => ({ loadLottie: mock.load }));
vi.mock("gsap/ScrollTrigger", () => ({
  default: {
    create: vi.fn((vars) => {
      const trigger = { vars, kill: vi.fn() };
      mock.triggers.push(trigger);
      return trigger;
    }),
    refresh: vi.fn(),
    getAll: () => mock.triggers,
  },
}));
const DB_FIGURE = {
  id: "animationDbOnlyFigure",
  title: "A DB-only fullscreen figure",
  fullscreen: true,
  loop: false,
};
vi.mock("@/composables/useAnimations", () => ({
  useAnimations: () => ({
    animations: ref([DB_FIGURE]),
    fetchAnimations: vi.fn().mockResolvedValue({ data: [DB_FIGURE] }),
  }),
}));

import FullScreenIllustration from "../FullScreenIllustration.vue";
import FullScreenIllustrationSplit from "../FullScreenIllustrationSplit.vue";
import FullScreenIllustrationLoop from "../FullScreenIllustrationLoop.vue";
import FullScreenIllustrationMultiple from "../FullScreenIllustrationMultiple.vue";
import IllustarionMultiple from "../IllustarionMultiple.vue";

const loadAnimation = vi.fn((options) => {
  const anim = {
    options,
    totalFrames: 300,
    animationData: { op: 300 },
    projectInterface: { currentFrame: 0 },
    listeners: {},
    addEventListener(name, fn) {
      this.listeners[name] = fn;
    },
    setSubframe: vi.fn(),
    setSpeed: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    goToAndStop: vi.fn(),
    playSegments: vi.fn(),
    destroy: vi.fn(),
  };
  mock.instances.push(anim);
  return anim;
});

let wrappers;
beforeEach(() => {
  wrappers = [];
  mock.instances = [];
  mock.triggers.length = 0;
  loadAnimation.mockClear();
  mock.load.mockResolvedValue({ loadAnimation });
  vi.useFakeTimers();
});
afterEach(() => {
  wrappers.forEach((w) => w.unmount());
  vi.useRealTimers();
  document.body.innerHTML = "";
});
function keep(w) {
  wrappers.push(w);
  return w;
}
// Takes a wrapper out of afterEach's hands once the test unmounted it itself.
function release(w) {
  wrappers = wrappers.filter((x) => x !== w);
}
// Resolves the library import on the next call only, under the test's control.
function pendingLibrary() {
  let resolve;
  mock.load.mockReturnValueOnce(new Promise((r) => (resolve = r)));
  return () => resolve({ loadAnimation });
}

const split = { id: "animationSplit", title: "A split figure", sources: [] };
const loop = {
  id: "animationPhototransduction",
  title: "Phototransduction",
  loop: true,
  states: ["One", "Two", "Three"],
};
const multiple = { id: "animationMulti", states: { Lens: "Lens" } };

describe("FullScreenIllustrationSplit lifecycle", () => {
  async function render() {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const w = keep(
      mount(FullScreenIllustrationSplit, {
        attachTo: document.body,
        props: { animation: split, container },
      })
    );
    await flushPromises();
    await vi.advanceTimersByTimeAsync(20);
    return w;
  }

  it("kills its scroll trigger and destroys both Lotties on unmount", async () => {
    const w = await render();
    const [left, right] = mock.instances;
    expect(mock.instances).toHaveLength(2);
    expect(mock.triggers).toHaveLength(1);
    const [trigger] = mock.triggers;
    trigger.vars.onUpdate({ progress: 0.5 });
    await flushPromises();
    expect(left.goToAndStop).toHaveBeenCalledOnce();
    expect(right.goToAndStop).toHaveBeenCalledOnce();

    w.unmount();
    release(w);
    expect(trigger.kill).toHaveBeenCalledOnce();
    expect(left.destroy).toHaveBeenCalledOnce();
    expect(right.destroy).toHaveBeenCalledOnce();
  });

  it("ignores a scroll update that lands after unmount", async () => {
    const w = await render();
    const [left, right] = mock.instances;
    const [trigger] = mock.triggers;
    w.unmount();
    release(w);
    // The watcher is what used to throw "cannot read properties of null".
    expect(() => trigger.vars.onUpdate({ progress: 0.9 })).not.toThrow();
    await flushPromises();
    expect(left.goToAndStop).not.toHaveBeenCalled();
    expect(right.goToAndStop).not.toHaveBeenCalled();
  });

  it("creates no trigger when unmounted inside the setup wait", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const w = keep(
      mount(FullScreenIllustrationSplit, {
        attachTo: document.body,
        props: { animation: split, container },
      })
    );
    await flushPromises();
    expect(mock.instances).toHaveLength(2);
    w.unmount();
    release(w);
    await vi.advanceTimersByTimeAsync(100);
    expect(mock.triggers).toHaveLength(0);
    expect(mock.instances.every((a) => a.destroy.mock.calls.length === 1)).toBe(
      true
    );
  });

  it("does not create artwork when the library resolves after unmount", async () => {
    const resolve = pendingLibrary();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const w = keep(
      mount(FullScreenIllustrationSplit, {
        attachTo: document.body,
        props: { animation: split, container },
      })
    );
    w.unmount();
    release(w);
    resolve();
    await flushPromises();
    await vi.advanceTimersByTimeAsync(100);
    expect(loadAnimation).not.toHaveBeenCalled();
    expect(mock.triggers).toHaveLength(0);
  });
});

describe("FullScreenIllustrationLoop lifecycle", () => {
  async function render() {
    const w = keep(
      shallowMount(FullScreenIllustrationLoop, {
        attachTo: document.body,
        props: { animation: loop },
      })
    );
    await flushPromises();
    return w;
  }

  it("stops the frame poll and destroys the Lottie on unmount", async () => {
    const w = await render();
    const [anim] = mock.instances;
    const reads = vi.fn(() => 0);
    Object.defineProperty(anim.projectInterface, "currentFrame", {
      get: reads,
    });
    await vi.advanceTimersByTimeAsync(30);
    expect(reads).toHaveBeenCalled();
    w.unmount();
    release(w);
    expect(anim.destroy).toHaveBeenCalledOnce();
    reads.mockClear();
    await vi.advanceTimersByTimeAsync(100);
    expect(reads).not.toHaveBeenCalled();
    // A late "complete" from the destroyed player restarts nothing.
    anim.listeners.complete();
    expect(anim.playSegments).not.toHaveBeenCalled();
  });

  it("does not create artwork when the library resolves after unmount", async () => {
    const resolve = pendingLibrary();
    const w = keep(
      shallowMount(FullScreenIllustrationLoop, {
        attachTo: document.body,
        props: { animation: loop },
      })
    );
    w.unmount();
    release(w);
    resolve();
    await flushPromises();
    expect(loadAnimation).not.toHaveBeenCalled();
  });
});

describe.each([
  ["FullScreenIllustrationMultiple", FullScreenIllustrationMultiple],
  ["IllustarionMultiple", IllustarionMultiple],
])("%s lifecycle", (_name, Component) => {
  it("destroys the Lottie on unmount", async () => {
    const w = keep(
      mount(Component, {
        attachTo: document.body,
        props: { animation: multiple, state: "Lens" },
      })
    );
    await flushPromises();
    expect(mock.instances).toHaveLength(1);
    w.unmount();
    release(w);
    expect(mock.instances[0].destroy).toHaveBeenCalledOnce();
  });

  it("does not create artwork when the library resolves after unmount", async () => {
    const resolve = pendingLibrary();
    const w = keep(
      mount(Component, {
        attachTo: document.body,
        props: { animation: multiple, state: "Lens" },
      })
    );
    w.unmount();
    release(w);
    resolve();
    await flushPromises();
    expect(loadAnimation).not.toHaveBeenCalled();
  });
});

describe("FullScreenIllustration lifecycle", () => {
  it("destroys the Lottie it loaded on unmount", async () => {
    const w = keep(
      mount(FullScreenIllustration, {
        attachTo: document.body,
        props: { paragraph: { animationId: DB_FIGURE.id } },
      })
    );
    await flushPromises();
    expect(mock.instances).toHaveLength(1);
    w.unmount();
    release(w);
    expect(mock.instances[0].destroy).toHaveBeenCalledOnce();
  });

  it("does not create artwork when the library resolves after unmount", async () => {
    const resolve = pendingLibrary();
    const w = keep(
      mount(FullScreenIllustration, {
        attachTo: document.body,
        props: { paragraph: { animationId: DB_FIGURE.id } },
      })
    );
    // Let the record resolve and the template catch up, then leave while the
    // library import is still pending.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    w.unmount();
    release(w);
    resolve();
    await flushPromises();
    expect(loadAnimation).not.toHaveBeenCalled();
  });
});
