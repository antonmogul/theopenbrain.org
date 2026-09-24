import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

// A stand-in for lottie-web: the stage gets one element per highlight layer.
const anim = {
  setSubframe: vi.fn(),
  setSpeed: vi.fn(),
  goToAndStop: vi.fn(),
  playSegments: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  destroy: vi.fn(),
  addEventListener: vi.fn(),
};
const loadAnimation = vi.fn(({ container }) => {
  container.innerHTML =
    '<g class="rhodopsinHighlight"></g><g class="rodHighlight"></g><g class="rodHighlight"></g>';
  return anim;
});
vi.mock("@/composables/useLottie", () => ({
  loadLottie: () => Promise.resolve({ loadAnimation }),
}));

import StepThrough from "../step-through/StepThrough.vue";
import visualCycle from "../visual-cycle/schema.js";
import pupillary from "../pupillary-reflex/schema.js";
import { figureContent } from "../content.js";

const RouterLinkStub = { props: ["to"], template: "<a><slot /></a>" };

function mountFigure(schema, record = {}, props = {}) {
  return mount(StepThrough, {
    props: {
      schema,
      content: figureContent(schema, record),
      lottieUrl: `/publicAssets/animations/${schema.animationKey}.json`,
      infoOpenAtStart: false,
      ...props,
    },
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({ assets: [] }) })
  );
});
afterEach(() => {
  vi.useRealTimers();
  delete global.fetch;
});

describe("StepThrough", () => {
  it("starts the first step a second in, looping its stretch of the timeline", async () => {
    mountFigure(visualCycle);
    await flushPromises();
    expect(anim.playSegments).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(anim.setSpeed).toHaveBeenCalledWith(0.6);
    expect(anim.playSegments).toHaveBeenLastCalledWith([0, 72], true);
    expect(loadAnimation.mock.calls[0][0].loop).toBe(true);
  });

  it("names the current step in the banner and moves on, wrapping at the end", async () => {
    const w = mountFigure(visualCycle);
    await flushPromises();
    const banner = () => w.get(".st-banner-text").text();
    expect(banner()).toMatch(/^1\.\s*Rhodopsin absorps/);

    await w.get("button[aria-label='Next step']").trigger("click");
    expect(banner()).toMatch(/^2\.\s*All-trans retinal exits the rod/);
    expect(anim.playSegments).toHaveBeenLastCalledWith([72, 120], true);

    const steps = w.findAll(".st-step");
    await steps[5].trigger("click");
    expect(steps[5].attributes("aria-current")).toBe("step");
    expect(anim.playSegments).toHaveBeenLastCalledWith([432, 480], true);

    await w.get("button[aria-label='Next step']").trigger("click");
    expect(banner()).toMatch(/^1\./);
    expect(anim.playSegments).toHaveBeenLastCalledWith([0, 72], true);
  });

  it("lights up a legend item's layers, and clears them on a second click", async () => {
    const w = mountFigure(visualCycle);
    await flushPromises();
    const rod = w.findAll(".st-key")[2];
    await rod.trigger("click");
    expect(rod.attributes("aria-pressed")).toBe("true");
    expect(w.findAll(".st-lottie .highlightIllu")).toHaveLength(2);

    await w.findAll(".st-key")[0].trigger("click");
    expect(w.findAll(".st-lottie .highlightIllu")).toHaveLength(1);
    expect(
      w.find(".st-lottie .rhodopsinHighlight.highlightIllu").exists()
    ).toBe(true);

    await w.findAll(".st-key")[0].trigger("click");
    expect(w.findAll(".st-lottie .highlightIllu")).toHaveLength(0);
  });

  it("shows its legend icons from the schema", async () => {
    const w = mountFigure(pupillary);
    await flushPromises();
    expect(w.findAll(".st-key img").map((i) => i.attributes("src"))).toEqual(
      pupillary.legendArt.map((a) => a.icon)
    );
  });

  it("uses the database's step text and the saved legend labels", async () => {
    const w = mountFigure(pupillary, {
      states: ["Light enters the eye"],
      statesHighlight: ["Iris muscle"], // the old artwork's legend: ignored
      content: { legend: [null, null, null, "The pupil"] },
    });
    await flushPromises();
    expect(w.findAll(".st-step")[0].text()).toContain("Light enters the eye");
    expect(w.findAll(".st-step")[1].text()).toContain(
      pupillary.defaults.states[1]
    );
    expect(w.findAll(".st-key").map((k) => k.text())).toEqual([
      "Pretectal nucleus",
      "Edinger-Westphal nucleus",
      "Ciliary ganglion",
      "The pupil",
    ]);
  });

  it("opens on the introduction when it has one, and closes it", async () => {
    const w = mountFigure(visualCycle, {}, { infoOpenAtStart: true });
    await flushPromises();
    expect(w.find(".st").classes()).toContain("st--info");
    expect(w.find(".fi").text()).toContain("When rhodopsin absorbs a photon");
    await w.get("button[aria-expanded]").trigger("click");
    expect(w.find(".fi").exists()).toBe(false);
  });

  it("has no introduction toggle without an introduction", async () => {
    const w = mountFigure(pupillary, {}, { infoOpenAtStart: true });
    await flushPromises();
    expect(w.find("button[aria-expanded]").exists()).toBe(false);
    expect(w.find(".st").classes()).not.toContain("st--info");
  });
});
