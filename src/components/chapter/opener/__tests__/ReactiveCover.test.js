import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

/*
 * ReactiveCover (OPENBRAIN-146): the opener's pointer-scrubbed Lottie.
 * lottie-web and the asset probe are stubbed; these pin the contract the
 * opener relies on: a missing file means "unavailable" and no Lottie at
 * all, a present one parks on the middle frame and then follows pointer x
 * (goToAndStop, never play), and reduced motion keeps the middle frame.
 */

const { assetOk, loadAnimation, anim, reduced } = vi.hoisted(() => {
  const anim = {
    totalFrames: 67,
    goToAndStop: vi.fn(),
    play: vi.fn(),
    destroy: vi.fn(),
    listeners: {},
    addEventListener(name, cb) {
      this.listeners[name] = cb;
    },
  };
  return {
    anim,
    assetOk: vi.fn(),
    loadAnimation: vi.fn(() => anim),
    reduced: vi.fn(() => false),
  };
});
vi.mock("@/helper/animationResolve", () => ({ lottieAssetOk: assetOk }));
vi.mock("@/composables/useLottie", () => ({
  loadLottie: () => Promise.resolve({ loadAnimation }),
}));
vi.mock("@/helper/readerJump", () => ({ reducedMotionPreferred: reduced }));

import ReactiveCover from "../ReactiveCover.vue";
import OpenerHero from "../OpenerHero.vue";

const spec = {
  lottie: "/publicAssets/animations/covers/matisse-eyes.json",
  axis: "x",
  reverse: false,
  fit: "meet",
  idle: 14,
};

let rafQueue = [];
beforeEach(() => {
  anim.goToAndStop.mockClear();
  anim.play.mockClear();
  anim.destroy.mockClear();
  anim.listeners = {};
  loadAnimation.mockClear();
  reduced.mockReturnValue(false);
  rafQueue = [];
  let nextId = 1;
  vi.stubGlobal("requestAnimationFrame", (cb) => {
    const id = nextId++;
    rafQueue.push({ id, cb });
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id) => {
    rafQueue = rafQueue.filter((f) => f.id !== id);
  });
  // happy-dom has no IntersectionObserver: the component starts straight away.
  vi.stubGlobal("IntersectionObserver", undefined);
  Object.defineProperty(window, "innerWidth", { value: 1000, writable: true });
  Object.defineProperty(window, "innerHeight", { value: 800, writable: true });
});
afterEach(() => vi.unstubAllGlobals());

const runFrames = (n) => {
  for (let i = 0; i < n; i++) {
    const batch = rafQueue.splice(0);
    batch.forEach(({ cb }) => cb());
  }
};

async function mountReady() {
  assetOk.mockResolvedValue(true);
  const w = mount(ReactiveCover, { props: { spec }, attachTo: document.body });
  await flushPromises();
  anim.listeners.DOMLoaded?.();
  return w;
}

describe("ReactiveCover", () => {
  it("renders nothing and reports unavailable when the Lottie is missing", async () => {
    assetOk.mockResolvedValue(false);
    const w = mount(ReactiveCover, { props: { spec } });
    await flushPromises();
    expect(assetOk).toHaveBeenCalledWith(spec.lottie);
    expect(loadAnimation).not.toHaveBeenCalled();
    expect(w.emitted("state").map(([s]) => s)).toEqual([
      "loading",
      "unavailable",
    ]);
    w.unmount();
  });

  it("loads the Lottie stopped, parks it on the middle frame and reports ready", async () => {
    const w = await mountReady();
    const opts = loadAnimation.mock.calls[0][0];
    expect(opts).toMatchObject({
      autoplay: false,
      loop: false,
      path: spec.lottie,
      renderer: "svg",
    });
    expect(opts.rendererSettings.preserveAspectRatio).toBe("xMidYMid meet");
    expect(anim.goToAndStop).toHaveBeenCalledWith(33, true);
    expect(anim.play).not.toHaveBeenCalled();
    expect(w.emitted("state").map(([s]) => s)).toEqual(["loading", "ready"]);
    w.unmount();
    expect(anim.destroy).toHaveBeenCalled();
  });

  it("parks on the frame pointer x maps to, at once, as the 2023 eye did", async () => {
    const w = await mountReady();
    anim.goToAndStop.mockClear();
    window.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 1000, clientY: 10 })
    );
    expect(anim.goToAndStop).toHaveBeenCalledTimes(1);
    expect(anim.goToAndStop).toHaveBeenLastCalledWith(66, true);
    window.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 250, clientY: 10 })
    );
    expect(anim.goToAndStop).toHaveBeenLastCalledWith(16.5, true);
    expect(anim.goToAndStop).toHaveBeenCalledTimes(2);
    expect(anim.play).not.toHaveBeenCalled();
    w.unmount();
  });

  it("keeps the middle frame and ignores the pointer under reduced motion", async () => {
    reduced.mockReturnValue(true);
    const w = await mountReady();
    expect(anim.goToAndStop).toHaveBeenCalledTimes(1);
    expect(anim.goToAndStop).toHaveBeenCalledWith(33, true);
    window.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 900, clientY: 10 })
    );
    runFrames(10);
    expect(anim.goToAndStop).toHaveBeenCalledTimes(1);
    w.unmount();
  });

  it("restarts and stops when the explicit motion preference changes without remounting", async () => {
    reduced.mockReturnValue(true);
    const w = await mountReady();
    reduced.mockReturnValue(false);
    document.documentElement.setAttribute("data-reduce-motion", "0");
    await new Promise((r) => setTimeout(r, 10));
    await flushPromises();
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 1000 }));
    expect(anim.goToAndStop).toHaveBeenLastCalledWith(66, true);
    reduced.mockReturnValue(true);
    document.documentElement.setAttribute("data-reduce-motion", "1");
    await new Promise((r) => setTimeout(r, 10));
    await flushPromises();
    expect(anim.goToAndStop).toHaveBeenLastCalledWith(33, true);
    const count = anim.goToAndStop.mock.calls.length;
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 1000 }));
    expect(anim.goToAndStop).toHaveBeenCalledTimes(count);
    w.unmount();
    document.documentElement.removeAttribute("data-reduce-motion");
  });

  it("sweeps on its own once the pointer has been quiet, and stops when it moves", async () => {
    vi.useFakeTimers();
    const now = vi.spyOn(performance, "now");
    let t = 0;
    now.mockImplementation(() => t);
    const w = await mountReady();
    anim.goToAndStop.mockClear();
    vi.advanceTimersByTime(1000);
    runFrames(5);
    expect(anim.goToAndStop).not.toHaveBeenCalled(); // not idle yet
    vi.advanceTimersByTime(2000); // past IDLE_AFTER_MS: the sweep begins
    t = 14000 / 4; // a quarter sweep later: well right of centre
    runFrames(120);
    expect(anim.goToAndStop.mock.calls.at(-1)[0]).toBeGreaterThan(40);
    // A pointer move takes over at once and the sweep stops.
    anim.goToAndStop.mockClear();
    window.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 100, clientY: 10 })
    );
    expect(anim.goToAndStop.mock.calls.at(-1)[0]).toBeCloseTo(6.6);
    runFrames(10);
    expect(anim.goToAndStop).toHaveBeenCalledTimes(1);
    now.mockRestore();
    vi.useRealTimers();
    w.unmount();
  });
});

describe("OpenerHero with a reactive cover", () => {
  it("binds the layer's state as data-reactive-cover and drops it when unavailable", async () => {
    assetOk.mockResolvedValue(false);
    const w = mount(OpenerHero, {
      props: { cover: "/x.jpg", reactive: spec, title: "T" },
      global: { stubs: { ReactiveCover: false } },
    });
    expect(w.get(".opener-hero").attributes("data-reactive-cover")).toBe(
      "loading"
    );
    await flushPromises();
    expect(w.get(".opener-hero").attributes("data-reactive-cover")).toBe(
      "unavailable"
    );
    expect(w.find(".reactive-cover").exists()).toBe(false);
    // The still cover is still the backdrop.
    expect(w.get(".opener-hero__cover").attributes("style")).toContain(
      "/x.jpg"
    );
    w.unmount();
  });

  it("has no data-reactive-cover without a record", () => {
    const w = mount(OpenerHero, { props: { cover: "/x.jpg" } });
    expect(w.get(".opener-hero").attributes("data-reactive-cover")).toBe(
      undefined
    );
    expect(w.find(".reactive-cover").exists()).toBe(false);
    w.unmount();
  });
});
