import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

const anim = {
  totalFrames: 252,
  setSubframe: vi.fn(),
  goToAndStop: vi.fn(),
  playSegments: vi.fn(),
  destroy: vi.fn(),
};
const loadAnimation = vi.fn(() => anim);
vi.mock("@/composables/useLottie", () => ({
  loadLottie: () => Promise.resolve({ loadAnimation }),
}));

import RefractionErrors from "../refraction-errors/RefractionErrors.vue";
import schema from "../refraction-errors/schema.js";
import { figureContent } from "../content.js";

const RouterLinkStub = {
  name: "RouterLink",
  props: ["to"],
  template: '<a :href="to"><slot /></a>',
};

const lottie = {
  assets: [{ id: "img", u: "images/", p: "motif-medium.jpg", e: 0 }],
};

function mountWidget(content = {}, props = {}) {
  return mount(RefractionErrors, {
    props: {
      content: figureContent(schema, { content }),
      lottieUrl: "/publicAssets/animations/animationImpairedVision.json",
      ...props,
    },
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
}

const button = (w, name) =>
  w.findAll("button").find((b) => b.text() === name) ||
  w.findAll("button").find((b) => b.attributes("aria-label") === name);

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(lottie) })
  );
});
afterEach(() => {
  delete global.fetch;
});

describe("RefractionErrors", () => {
  it("opens on its introduction, with the video", async () => {
    const w = mountWidget();
    await flushPromises();
    expect(w.find(".rx").classes()).toContain("rx--info");
    expect(w.text()).toContain("Despite our body");
    expect(w.findComponent(RouterLinkStub).props("to")).toBe(
      "/chapter/break/neitz-myopia"
    );
  });

  it("closes the introduction and shows the conditions", async () => {
    const w = mountWidget();
    await flushPromises();
    await w.get("button[aria-expanded]").trigger("click");
    expect(w.find(".rx").classes()).not.toContain("rx--info");
    expect(w.find(".rx-info").exists()).toBe(false);
    expect(w.findAll(".rx-cell--state").map((b) => b.text())).toEqual(
      schema.defaults.states
    );
  });

  it("loads its Lottie as data with images resolved", async () => {
    mountWidget();
    await flushPromises();
    const { animationData } = loadAnimation.mock.calls[0][0];
    expect(animationData.assets[0].u).toBe("/publicAssets/animations/images/");
  });

  it("swaps in a replaced picture", async () => {
    mountWidget({ image: "https://storage.example/bust.jpg" });
    await flushPromises();
    const { animationData } = loadAnimation.mock.calls[0][0];
    expect(animationData.assets[0]).toMatchObject({
      p: "https://storage.example/bust.jpg",
      e: 1,
    });
  });

  it("shows a condition at its frame, and its correction 12 frames on", async () => {
    const w = mountWidget({}, { infoOpenAtStart: false });
    await flushPromises();

    await button(w, "Myopia").trigger("click");
    expect(anim.goToAndStop).toHaveBeenLastCalledWith(59, true);
    expect(button(w, "Myopia").attributes("aria-pressed")).toBe("true");

    await button(w, "Myopia, corrected").trigger("click");
    expect(button(w, "Myopia, corrected").attributes("aria-pressed")).toBe(
      "true"
    );
    expect(anim.playSegments).toHaveBeenLastCalledWith([54, 74], true);

    // Another condition while corrected: plays the correction out first, as
    // the original does, then shows the new condition corrected.
    await button(w, "Hyperopia, corrected").trigger("click");
    expect(anim.goToAndStop).toHaveBeenLastCalledWith(59 + 72 + 12, true);

    await button(w, "Normal eye (emmetropia)").trigger("click");
    expect(anim.goToAndStop).toHaveBeenLastCalledWith(0, true);
    expect(
      w.findAll("button[aria-pressed='true']").map((b) => b.text())
    ).toEqual(["Normal eye (emmetropia)"]);
  });

  it("uses the edited labels", async () => {
    const w = mountWidget(
      { states: [null, "Short sight"], toggle: "With glasses" },
      { infoOpenAtStart: false }
    );
    await flushPromises();
    expect(w.text()).toContain("Short sight");
    expect(w.text()).toContain("With glasses");
  });

  it("keeps going when the animation can't load", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 404 }));
    const w = mountWidget({}, { infoOpenAtStart: false });
    await flushPromises();
    await button(w, "Myopia").trigger("click");
    expect(button(w, "Myopia").attributes("aria-pressed")).toBe("true");
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
