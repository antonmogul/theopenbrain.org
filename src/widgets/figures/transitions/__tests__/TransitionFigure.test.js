import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
const mock = vi.hoisted(() => ({
  anim: { totalFrames: 0, goToAndStop: vi.fn(), addEventListener: vi.fn() },
  destroy: vi.fn(),
}));
vi.mock("../../shared/useFigureLottie.js", () => ({
  useFigureLottie: () => ({
    anim: mock.anim,
    failed: { value: false },
    mount: async () => mock.anim,
    destroy: mock.destroy,
  }),
}));
import TransitionFigure from "../TransitionFigure.vue";
afterEach(() => {
  document.documentElement.removeAttribute("data-reduce-motion");
  vi.clearAllMocks();
});
describe("original eye transition", () => {
  it("seeks the latest progress when asynchronously loaded artwork becomes ready, then parks under reduced motion", async () => {
    mock.anim.totalFrames = 0;
    const w = mount(TransitionFigure, {
      props: {
        schema: { id: "eye", scrub: { from: 0.1, to: 0.9 } },
        lottieUrl: "/eye.json",
        progress: 0.2,
      },
    });
    await flushPromises();
    await w.setProps({ progress: 0.7 });
    mock.anim.totalFrames = 100;
    mock.anim.addEventListener.mock.calls.find(
      ([name]) => name === "DOMLoaded"
    )[1]();
    expect(mock.anim.goToAndStop.mock.calls.at(-1)[0]).toBeCloseTo(75);
    document.documentElement.setAttribute("data-reduce-motion", "1");
    await new Promise((r) => setTimeout(r, 10));
    await flushPromises();
    expect(mock.anim.goToAndStop).toHaveBeenLastCalledWith(99, true);
    await w.setProps({ progress: 0.3 });
    expect(mock.anim.goToAndStop).toHaveBeenLastCalledWith(99, true);
    w.unmount();
    expect(mock.destroy).toHaveBeenCalledOnce();
  });
});
