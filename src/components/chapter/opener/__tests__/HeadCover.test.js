import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

/*
 * HeadCover (OPENBRAIN-171): the History opener. The asset probe and Image
 * are stubbed; these pin what the opener relies on: a missing still means
 * "unavailable" and the chapter cover, a present one shows the still at
 * once and reports ready, the layers are fetched and the canvas takes over
 * only when motion is allowed, and the arrow is ink on the paper ground.
 */

const { assetOk, reduced, loaded } = vi.hoisted(() => ({
  assetOk: vi.fn(),
  reduced: vi.fn(() => false),
  loaded: [],
}));
vi.mock("@/helper/animationResolve", () => ({ imageAssetOk: assetOk }));
vi.mock("@/helper/readerJump", () => ({ reducedMotionPreferred: reduced }));

import HeadCover from "../HeadCover.vue";
import OpenerHero from "../OpenerHero.vue";
import { reactiveCoverForModule } from "@/helper/chapterCover";

const spec = reactiveCoverForModule({ slug: "foundations-of-neuroscience" });

class FakeImage {
  set src(url) {
    this._src = url;
    loaded.push(url);
    queueMicrotask(() => this.onload?.());
  }
  get src() {
    return this._src;
  }
  decode() {
    return Promise.resolve();
  }
}
// happy-dom has no canvas: enough of one for the cover to draw on.
const ctx = () => ({
  canvas: { width: 0, height: 0 },
  setTransform() {},
  clearRect() {},
  save() {},
  restore() {},
  translate() {},
  rotate() {},
  drawImage() {},
  fillRect() {},
  createLinearGradient: () => ({ addColorStop() {} }),
});

let frames = [];
beforeEach(() => {
  loaded.length = 0;
  frames = [];
  reduced.mockReturnValue(false);
  assetOk.mockResolvedValue(true);
  vi.stubGlobal("Image", FakeImage);
  vi.stubGlobal("requestAnimationFrame", (cb) => frames.push(cb));
  vi.stubGlobal("cancelAnimationFrame", () => {});
  HTMLCanvasElement.prototype.getContext = ctx;
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete HTMLCanvasElement.prototype.getContext;
});

describe("HeadCover", () => {
  it("reports unavailable, and shows nothing, when the still is missing", async () => {
    assetOk.mockResolvedValue(false);
    const w = mount(HeadCover, { props: { spec } });
    await flushPromises();
    expect(w.emitted("state").map(([s]) => s)).toEqual([
      "loading",
      "unavailable",
    ]);
    expect(loaded).toEqual([]); // no layer was asked for
    w.unmount();
  });

  it("shows the still at once, then the canvas once every layer is in", async () => {
    const w = mount(HeadCover, { props: { spec }, attachTo: document.body });
    expect(w.find(".head-cover__poster").attributes("src")).toBe(spec.poster);
    await flushPromises();
    expect(w.emitted("state").map(([s]) => s)).toEqual(["loading", "ready"]);
    // The five layers and the girl's nineteen frames.
    expect(loaded).toHaveLength(5 + 19);
    expect(loaded).toContain(spec.hand.src);
    expect(loaded).toContain(spec.body.frames[18]);
    expect(w.find(".head-cover").attributes("data-live")).toBe("");
    expect(frames.length).toBeGreaterThan(0); // the loop is running
    w.unmount();
  });

  it("stays on the still under reduced motion, and fetches no layers", async () => {
    reduced.mockReturnValue(true);
    const w = mount(HeadCover, { props: { spec }, attachTo: document.body });
    await flushPromises();
    expect(w.emitted("state").map(([s]) => s)).toEqual(["loading", "ready"]);
    expect(loaded).toEqual([]);
    expect(w.find(".head-cover").attributes("data-live")).toBeUndefined();
    expect(frames).toEqual([]);
    w.unmount();
  });

  it("keeps the still when a layer fails to load", async () => {
    vi.stubGlobal(
      "Image",
      class extends FakeImage {
        set src(url) {
          this._src = url;
          queueMicrotask(() =>
            url === spec.hand.src ? this.onerror?.() : this.onload?.()
          );
        }
        decode() {
          return this._src === spec.hand.src
            ? Promise.reject(new Error("no"))
            : Promise.resolve();
        }
      }
    );
    const w = mount(HeadCover, { props: { spec }, attachTo: document.body });
    await flushPromises();
    expect(w.emitted("state").map(([s]) => s)).toEqual(["loading", "ready"]);
    expect(w.find(".head-cover").attributes("data-live")).toBeUndefined();
    w.unmount();
  });
});

describe("OpenerHero with a head cover", () => {
  const mountHero = () =>
    mount(OpenerHero, {
      props: { cover: "/cover.jpg", title: "History", reactive: spec },
      attachTo: document.body,
    });

  it("paints no chapter cover behind it, and inks the arrow", async () => {
    const w = mountHero();
    await flushPromises();
    expect(w.attributes("data-reactive-cover")).toBe("ready");
    expect(w.find(".opener-hero__cover").attributes("style")).toContain(
      "background-image: none"
    );
    const arrow = w.find(".opener-hero__arrow");
    expect(arrow.classes()).toContain("opener-hero__arrow--ink");
    expect(arrow.attributes("style")).toMatch(
      /color:\s*(#1c1c1c|rgb\(28, 28, 28\))/
    );
    w.unmount();
  });

  it("falls back to the chapter cover when the artwork is missing", async () => {
    assetOk.mockResolvedValue(false);
    const w = mountHero();
    await flushPromises();
    expect(w.attributes("data-reactive-cover")).toBe("unavailable");
    expect(w.find(".head-cover").exists()).toBe(false);
    expect(w.find(".opener-hero__cover").attributes("style")).toContain(
      "/cover.jpg"
    );
    expect(w.find(".opener-hero__arrow").classes()).not.toContain(
      "opener-hero__arrow--ink"
    );
    w.unmount();
  });
});
