import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

const made = [];
const loadAnimation = vi.fn(() => {
  const a = {
    setSubframe: vi.fn(),
    setSpeed: vi.fn(),
    goToAndPlay: vi.fn(),
    goToAndStop: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    destroy: vi.fn(),
  };
  made.push(a);
  return a;
});
vi.mock("@/composables/useLottie", () => ({
  loadLottie: () => Promise.resolve({ loadAnimation }),
}));

import SwitchFigure from "../switch/SwitchFigure.vue";
import rodCone from "../rod-cone/schema.js";
import centerSurround from "../center-surround/schema.js";
import onOff from "../on-off/schema.js";
import { figureContent } from "../content.js";

function mountFigure(schema, record = {}) {
  return mount(SwitchFigure, {
    props: { schema, content: figureContent(schema, record) },
  });
}

beforeEach(() => {
  made.length = 0;
  vi.clearAllMocks();
  global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({ assets: [] }) })
  );
});
afterEach(() => delete global.fetch);

describe("SwitchFigure", () => {
  it("loads one versioned Lottie per switch and plays only the first", async () => {
    mountFigure(rodCone);
    await flushPromises();
    expect(global.fetch.mock.calls.map((c) => c[0])).toEqual(
      rodCone.variants.map((v) => `${v.file}?v=v0.2.3`)
    );
    expect(made).toHaveLength(2);
    expect(made[0].goToAndPlay).toHaveBeenCalledWith(0, true);
    expect(made[1].pause).toHaveBeenCalled();
  });

  it("switches: the chosen version plays from its start, the other holds", async () => {
    const w = mountFigure(rodCone);
    await flushPromises();
    const [day, night] = w.findAll(".sf-option");
    await night.trigger("click");
    expect(night.attributes("aria-pressed")).toBe("true");
    expect(day.attributes("aria-pressed")).toBe("false");
    expect(made[1].goToAndPlay).toHaveBeenLastCalledWith(0, true);
    expect(made[0].pause).toHaveBeenCalled();
    const hidden = (e) => /display: none/.test(e.attributes("style") || "");
    const stages = w.findAll(".sf-stage");
    expect(hidden(stages[0])).toBe(true);
    expect(hidden(stages[1])).toBe(false);
  });

  it("pauses and plays the version on show", async () => {
    const w = mountFigure(rodCone);
    await flushPromises();
    const pause = w.get(".sf-pause");
    await pause.trigger("click");
    expect(made[0].pause).toHaveBeenCalled();
    expect(pause.attributes("aria-label")).toBe("Play the animation");
    await pause.trigger("click");
    expect(made[0].play).toHaveBeenCalled();
  });

  it("opens its legend with a symbol per label", async () => {
    const w = mountFigure(centerSurround);
    await flushPromises();
    const hidden = () =>
      /display: none/.test(w.get(".sf-legend").attributes("style") || "");
    expect(hidden()).toBe(true);
    await w.get(".sf-legend-toggle").trigger("click");
    expect(hidden()).toBe(false);
    expect(w.findAll(".sf-legend img").map((i) => i.attributes("src"))).toEqual(
      centerSurround.legendArt.map((a) => a.icon)
    );
  });

  it("uses the drawing's labels, not the database's older ones", async () => {
    const w = mountFigure(centerSurround, {
      switches: ["Small light", "Wide light"],
      legend: ["Excitatation"],
      content: { switches: [null, "Centre and surround"] },
    });
    await flushPromises();
    expect(w.findAll(".sf-option").map((b) => b.text())).toEqual([
      "Center",
      "Centre and surround",
    ]);
    expect(w.text()).not.toContain("Excitatation");
  });

  it("says so only for the version on show that didn't load", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    // Day loads, Night doesn't.
    global.fetch = vi.fn((url) =>
      Promise.resolve(
        url.includes("Night")
          ? { ok: false, status: 404 }
          : { ok: true, json: () => Promise.resolve({ assets: [] }) }
      )
    );
    const w = mountFigure(rodCone);
    await flushPromises();
    expect(w.find(".sf-failed").exists()).toBe(false);
    await w.findAll(".sf-option")[1].trigger("click");
    expect(w.find(".sf-failed").exists()).toBe(true);
    expect(error.mock.calls[0][0]).toMatch(/rod-cone #2/);
    error.mockRestore();
  });

  it("holds each version at its still frame when reduced motion is on", async () => {
    document.documentElement.dataset.reduceMotion = "1";
    const w = mountFigure(rodCone);
    await flushPromises();
    expect(made[0].goToAndStop).toHaveBeenCalledWith(
      rodCone.variants[0].stillFrame,
      true
    );
    expect(made[0].goToAndPlay).not.toHaveBeenCalled();
    expect(w.find(".sf-pause").exists()).toBe(false);
    await w.findAll(".sf-option")[1].trigger("click");
    expect(made[1].goToAndStop).toHaveBeenLastCalledWith(
      rodCone.variants[1].stillFrame,
      true
    );
    delete document.documentElement.dataset.reduceMotion;
  });

  it("pauses off screen and picks up again on screen, unless paused", async () => {
    let report;
    global.IntersectionObserver = class {
      constructor(cb) {
        report = cb;
      }
      observe() {}
      disconnect() {}
    };
    const w = mountFigure(rodCone);
    await flushPromises();
    report([{ isIntersecting: false }]);
    expect(made[0].pause).toHaveBeenCalled();
    report([{ isIntersecting: true }]);
    expect(made[0].play).toHaveBeenCalledTimes(1);
    await w.get(".sf-pause").trigger("click");
    report([{ isIntersecting: false }]);
    report([{ isIntersecting: true }]);
    expect(made[0].play).toHaveBeenCalledTimes(1);
    delete global.IntersectionObserver;
  });

  it("gives each copy of a figure on the page its own legend id", async () => {
    const content = figureContent(rodCone, {});
    const w = mount({
      components: { SwitchFigure },
      setup: () => ({ rodCone, content }),
      template: `<div><SwitchFigure :schema="rodCone" :content="content" /><SwitchFigure :schema="rodCone" :content="content" /></div>`,
    });
    await flushPromises();
    const ids = w.findAll(".sf-legend").map((l) => l.attributes("id"));
    expect(new Set(ids).size).toBe(2);
    expect(
      w.findAll(".sf-legend-toggle").map((t) => t.attributes("aria-controls"))
    ).toEqual(ids);
  });

  it("shows labels as text, not markup", async () => {
    const w = mountFigure(rodCone, {
      content: { legend: ['<img src=x onerror="alert(1)">'] },
    });
    await flushPromises();
    expect(w.find(".sf-legend img[src='x']").exists()).toBe(false);
    expect(w.get(".sf-legend li span").text()).toContain("<img");
  });

  it("plays at its schema's speed (ON & OFF at half)", async () => {
    mountFigure(onOff);
    await flushPromises();
    expect(made.map((a) => a.setSpeed.mock.calls[0]?.[0])).toEqual([0.5, 0.5]);
    mountFigure(rodCone);
    await flushPromises();
    expect(made[2].setSpeed).not.toHaveBeenCalled();
  });
});
