import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

/*
 * CutawayCover (OPENBRAIN-156): the History opener's skull cutaway. The
 * asset probe and Image are stubbed; these pin the contract the opener
 * relies on: a missing file means "unavailable" and no layers at all, a
 * present set mounts closed and reports ready, pointer x poses the layers
 * at once (no easing in), leaving eases them shut to exactly closed and
 * then stops, touch lifting closes too, and reduced motion stays closed.
 */

const { assetOk, reduced, images } = vi.hoisted(() => ({
  assetOk: vi.fn(),
  reduced: vi.fn(() => false),
  images: [],
}));
vi.mock("@/helper/animationResolve", () => ({ imageAssetOk: assetOk }));
vi.mock("@/helper/readerJump", () => ({ reducedMotionPreferred: reduced }));

import CutawayCover from "../CutawayCover.vue";
import OpenerHero from "../OpenerHero.vue";
import { reactiveCoverForModule } from "@/helper/chapterCover";

const spec = reactiveCoverForModule({ slug: "foundations-of-neuroscience" });

class FakeImage {
  constructor() {
    this.naturalWidth = 1542;
    this.naturalHeight = 1338;
    images.push(this);
  }
  set src(url) {
    this._src = url;
    queueMicrotask(() => this.onload?.());
  }
  get src() {
    return this._src;
  }
  decode() {
    return Promise.resolve();
  }
}

let rafQueue = [];
beforeEach(() => {
  images.length = 0;
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
  vi.stubGlobal("Image", FakeImage);
  // happy-dom has neither observer: the component starts straight away and
  // sizes the canvas once.
  vi.stubGlobal("IntersectionObserver", undefined);
  vi.stubGlobal("ResizeObserver", undefined);
  Object.defineProperty(window, "innerWidth", { value: 1000, writable: true });
  Object.defineProperty(window, "innerHeight", { value: 800, writable: true });
  Element.prototype.getBoundingClientRect = () => ({
    top: 0,
    bottom: 800,
    left: 0,
    right: 1000,
    width: 1000,
    height: 800,
  });
});
afterEach(() => vi.unstubAllGlobals());

const runFrames = (n) => {
  for (let i = 0; i < n; i++) {
    const batch = rafQueue.splice(0);
    batch.forEach(({ cb }) => cb());
  }
};
const move = (clientX, clientY = 300) =>
  window.dispatchEvent(new PointerEvent("pointermove", { clientX, clientY }));
const capRotation = (w) =>
  parseFloat(
    w
      .get(".cutaway-cover__cap")
      .element.style.transform.match(/rotate\(([-\d.]+)deg\)/)[1]
  );
const handShift = (w) => w.get(".cutaway-cover__hand").element.style.transform;

async function mountReady(props = {}) {
  assetOk.mockResolvedValue(true);
  const w = mount(CutawayCover, {
    props: { spec, ...props },
    attachTo: document.body,
  });
  await flushPromises();
  await flushPromises();
  return w;
}

describe("CutawayCover", () => {
  it("renders nothing and reports unavailable when a file is missing", async () => {
    assetOk.mockImplementation((url) => Promise.resolve(!/hand/.test(url)));
    const w = mount(CutawayCover, { props: { spec } });
    await flushPromises();
    expect(assetOk).toHaveBeenCalledTimes(3);
    expect(assetOk).toHaveBeenCalledWith(spec.hand);
    expect(images).toHaveLength(0); // nothing decoded, nothing requested
    expect(w.find(".cutaway-cover__canvas").exists()).toBe(false);
    expect(w.emitted("state").map(([s]) => s)).toEqual([
      "loading",
      "unavailable",
    ]);
    w.unmount();
  });

  it("decodes all three images, mounts closed and reports ready", async () => {
    const w = await mountReady();
    expect(images.map((i) => i.src)).toEqual([
      spec.base,
      spec.brain,
      spec.hand,
    ]);
    expect(w.emitted("state").map(([s]) => s)).toEqual(["loading", "ready"]);
    // Base and cap are the same drawing, split along the cut.
    expect(w.get(".cutaway-cover__base").attributes("src")).toBe(spec.base);
    expect(w.get(".cutaway-cover__cap img").attributes("src")).toBe(spec.base);
    expect(w.get(".cutaway-cover__base").element.style.clipPath).toMatch(
      /^polygon\(evenodd, 0% 0%/
    );
    expect(w.get(".cutaway-cover__band img").attributes("src")).toBe(
      spec.brain
    );
    expect(capRotation(w)).toBe(0);
    // The hand waits off the canvas: translated right and up by its rest offset.
    expect(handShift(w)).toMatch(/^translate\(\d+\.\d+%, -\d+\.\d+%\)$/);
    // Sized like background-size: cover at center 20% for a 1000x800 stage.
    const canvas = w.get(".cutaway-cover__canvas").element.style;
    expect(canvas.width).toBe("1238.7096774193549px");
    expect(canvas.height).toBe("800px");
    expect(canvas.left).toBe("-119.35483870967744px");
    expect(canvas.top).toBe("0px");
    w.unmount();
  });

  it("follows pointer x at once, in the next frame, with no easing in", async () => {
    const w = await mountReady();
    move(1000);
    expect(capRotation(w)).toBe(0); // nothing until the frame
    runFrames(1);
    expect(capRotation(w)).toBeCloseTo(-spec.open);
    expect(handShift(w)).toBe("translate(0.000%, 0.000%)");
    move(500); // halfway: the hand is in, the cap at 2/7 of its lift
    runFrames(1);
    expect(handShift(w)).toBe("translate(0.000%, 0.000%)");
    expect(capRotation(w)).toBeCloseTo((-spec.open * (0.5 - 0.3)) / 0.7, 2);
    w.unmount();
  });

  it("coalesces a burst of moves into one frame and writes nothing when still", async () => {
    const w = await mountReady();
    const cap = w.get(".cutaway-cover__cap").element;
    const writes = vi.spyOn(cap.style, "transform", "set");
    for (let x = 0; x <= 1000; x += 50) move(x);
    expect(rafQueue).toHaveLength(1);
    runFrames(1);
    expect(writes).toHaveBeenCalledTimes(1);
    runFrames(3); // the pointer is still: the same position is not rewritten
    expect(writes).toHaveBeenCalledTimes(1);
    w.unmount();
  });

  it("eases shut when the pointer leaves, lands exactly closed and stops", async () => {
    const w = await mountReady();
    move(1000);
    runFrames(1);
    expect(capRotation(w)).toBeCloseTo(-spec.open);
    move(500, 900); // below the hero
    runFrames(1);
    const first = capRotation(w);
    expect(first).toBeGreaterThan(-spec.open);
    expect(first).toBeLessThan(0);
    runFrames(1);
    expect(capRotation(w)).toBeGreaterThan(first);
    runFrames(200);
    expect(capRotation(w)).toBe(0);
    expect(w.get(".cutaway-cover__cap").element.style.transform).toBe(
      "rotate(0.000deg)"
    );
    expect(rafQueue).toHaveLength(0); // the loop has stopped
    // Leaving the window does the same.
    move(1000);
    runFrames(1);
    document.documentElement.dispatchEvent(new PointerEvent("pointerleave"));
    runFrames(200);
    expect(capRotation(w)).toBe(0);
    w.unmount();
  });

  it("closes when a touch lifts, not when a mouse button does", async () => {
    const w = await mountReady();
    move(1000);
    runFrames(1);
    window.dispatchEvent(
      new PointerEvent("pointerup", { pointerType: "mouse" })
    );
    runFrames(5);
    expect(capRotation(w)).toBeCloseTo(-spec.open);
    window.dispatchEvent(
      new PointerEvent("pointerup", { pointerType: "touch" })
    );
    runFrames(200);
    expect(capRotation(w)).toBe(0);
    w.unmount();
  });

  it("stays closed and ignores the pointer under reduced motion", async () => {
    reduced.mockReturnValue(true);
    const w = await mountReady();
    expect(w.emitted("state").map(([s]) => s)).toEqual(["loading", "ready"]);
    move(1000);
    runFrames(10);
    expect(capRotation(w)).toBe(0);
    expect(rafQueue).toHaveLength(0);
    w.unmount();
  });

  it("pins the reveal for review and lets go when it is cleared", async () => {
    const w = await mountReady({ reveal: 1 });
    expect(capRotation(w)).toBeCloseTo(-spec.open);
    move(0);
    runFrames(5);
    expect(capRotation(w)).toBeCloseTo(-spec.open); // pinned: no listener
    await w.setProps({ reveal: 0.5 });
    expect(capRotation(w)).toBeCloseTo((-spec.open * 0.2) / 0.7, 2);
    await w.setProps({ reveal: null });
    expect(capRotation(w)).toBe(0); // live again, from closed
    move(1000);
    runFrames(1);
    expect(capRotation(w)).toBeCloseTo(-spec.open);
    w.unmount();
  });
});

describe("OpenerHero with a cutaway cover", () => {
  it("mounts CutawayCover, not the Lottie, and uses the sketch as its still", async () => {
    assetOk.mockResolvedValue(true);
    const w = mount(OpenerHero, {
      props: { cover: "/x.jpg", reactive: spec, title: "History" },
      attachTo: document.body,
    });
    expect(w.get(".opener-hero").attributes("data-reactive-cover")).toBe(
      "loading"
    );
    expect(w.get(".opener-hero__cover").attributes("style")).toContain(
      spec.base
    );
    expect(w.get(".opener-hero__cover").attributes("style")).not.toContain(
      "/x.jpg"
    );
    await flushPromises();
    await flushPromises();
    expect(w.get(".opener-hero").attributes("data-reactive-cover")).toBe(
      "ready"
    );
    expect(w.find(".cutaway-cover__canvas").exists()).toBe(true);
    expect(w.find(".reactive-cover").exists()).toBe(false);
    w.unmount();
  });

  it("keeps the still sketch when a file is missing", async () => {
    assetOk.mockResolvedValue(false);
    const w = mount(OpenerHero, { props: { cover: "/x.jpg", reactive: spec } });
    await flushPromises();
    expect(w.get(".opener-hero").attributes("data-reactive-cover")).toBe(
      "unavailable"
    );
    expect(w.find(".cutaway-cover").exists()).toBe(false);
    expect(w.get(".opener-hero__cover").attributes("style")).toContain(
      spec.base
    );
    w.unmount();
  });
});
