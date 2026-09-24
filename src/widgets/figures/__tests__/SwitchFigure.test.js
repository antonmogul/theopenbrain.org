import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

const made = [];
const loadAnimation = vi.fn(() => {
  const a = {
    setSubframe: vi.fn(),
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

  it("says so when a version's animation doesn't load", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 404 }));
    const w = mountFigure(rodCone);
    await flushPromises();
    expect(w.find(".sf-failed").exists()).toBe(true);
    error.mockRestore();
  });
});
