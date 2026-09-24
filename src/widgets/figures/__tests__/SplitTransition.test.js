import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

const made = [];
const loadAnimation = vi.fn(({ renderer }) => {
  const a = {
    renderer,
    totalFrames: 192,
    setSubframe: vi.fn(),
    goToAndStop: vi.fn(),
    destroy: vi.fn(),
  };
  made.push(a);
  return a;
});
vi.mock("@/composables/useLottie", () => ({
  loadLottie: () => Promise.resolve({ loadAnimation }),
}));

import SplitFigure from "../split/SplitFigure.vue";
import TransitionFigure from "../transitions/TransitionFigure.vue";
import lateral from "../lateral-organization/schema.js";
import cellTypes from "../transitions/retinal-cell-types.js";
import { figureContent } from "../content.js";

beforeEach(() => {
  made.length = 0;
  vi.clearAllMocks();
  global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({ assets: [] }) })
  );
});
afterEach(() => delete global.fetch);

describe("SplitFigure", () => {
  const mountSplit = (progress, record = {}) =>
    mount(SplitFigure, {
      props: {
        schema: lateral,
        content: figureContent(lateral, record),
        progress,
      },
    });

  it("loads both sides, versioned, as SVG (the mosaics blur in)", async () => {
    mountSplit(0);
    await flushPromises();
    expect(global.fetch.mock.calls.map((c) => c[0])).toEqual([
      `${lateral.left}?v=v0.2.3`,
      `${lateral.right}?v=v0.2.3`,
    ]);
    expect(made.map((a) => a.renderer)).toEqual(["svg", "svg"]);
  });

  it("runs both sides together over the scroll, from its start frame", async () => {
    const w = mountSplit(0);
    await flushPromises();
    expect(made[0].goToAndStop).toHaveBeenLastCalledWith(20, true);
    await w.setProps({ progress: 1 });
    expect(made[0].goToAndStop).toHaveBeenLastCalledWith(191, true);
    expect(made[1].goToAndStop).toHaveBeenLastCalledWith(191, true);
  });

  it("captions the layer on screen, and nothing between layers", async () => {
    const w = mountSplit(0);
    await flushPromises();
    expect(w.find(".sp-info").exists()).toBe(false);
    // frame 20 + p·171 = 80 → the first layer (60–100)
    await w.setProps({ progress: 60 / 171 });
    expect(w.get(".sp-info").text()).toBe("Cone mosaic in the fovea.");
    expect(w.get(".sp-source").text()).toBe("Source Wikipedia.");
    // frame 105 → between layers
    await w.setProps({ progress: 85 / 171 });
    expect(w.find(".sp-info").exists()).toBe(false);
  });

  it("keeps its captions and other side going if one file doesn't load", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn((url) =>
      Promise.resolve(
        url.includes("Left")
          ? { ok: false, status: 404 }
          : { ok: true, json: () => Promise.resolve({ assets: [] }) }
      )
    );
    const w = mountSplit(0);
    await flushPromises();
    expect(w.find(".sp-failed").exists()).toBe(true);
    await w.setProps({ progress: 60 / 171 });
    expect(w.get(".sp-info").text()).toBe("Cone mosaic in the fovea.");
    expect(made[0].goToAndStop).toHaveBeenLastCalledWith(80, true);
    error.mockRestore();
  });

  it("keeps one live region and lists every caption for screen readers", async () => {
    const w = mountSplit(0);
    await flushPromises();
    expect(w.get(".sp-caption").attributes("aria-live")).toBe("polite");
    expect(w.findAll(".sp-sr li")).toHaveLength(3);
  });

  it("uses its captions, not the database's merged ones", async () => {
    const w = mountSplit(60 / 171, {
      sources: ["Cone mosaic in the fovea. Source Wikipedia."],
    });
    await flushPromises();
    expect(w.get(".sp-source").text()).toBe("Source Wikipedia.");
  });
});

describe("TransitionFigure", () => {
  it("plays over the middle 80% of the scroll", async () => {
    const w = mount(TransitionFigure, {
      props: { schema: cellTypes, lottieUrl: "/t.json", progress: 0 },
    });
    await flushPromises();
    expect(made[0].goToAndStop).toHaveBeenLastCalledWith(1, true);
    await w.setProps({ progress: 0.5 });
    expect(made[0].goToAndStop).toHaveBeenLastCalledWith(96, true);
    await w.setProps({ progress: 1 });
    expect(made[0].goToAndStop).toHaveBeenLastCalledWith(191, true);
  });

  it("warns when its host passes no progress", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mount(TransitionFigure, {
      props: { schema: cellTypes, lottieUrl: "/t.json" },
    });
    await flushPromises();
    expect(warn.mock.calls[0][0]).toMatch(/no scroll progress/);
    expect(made[0].goToAndStop).toHaveBeenLastCalledWith(1, true);
    warn.mockRestore();
  });

  it("says so when it doesn't load", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 404 }));
    const w = mount(TransitionFigure, {
      props: { schema: cellTypes, lottieUrl: "/t.json", progress: 0 },
    });
    await flushPromises();
    expect(w.find(".tr-failed").exists()).toBe(true);
    error.mockRestore();
  });
});
