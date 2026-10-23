import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const mock = vi.hoisted(() => ({ load: vi.fn(), instances: [] }));
vi.mock("@/composables/useLottie", () => ({ loadLottie: mock.load }));
import IllustrationComp from "../IllustrationComp.vue";

const dragon = { id: "animationDragon", loop: true, loopSection: [82, 287] };
let wrappers;
beforeEach(() => {
  wrappers = [];
  mock.instances = [];
  mock.load.mockResolvedValue({
    loadAnimation: (options) => {
      const anim = {
        options,
        totalFrames: 288,
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
    },
  });
});
afterEach(() => {
  wrappers.forEach((w) => w.unmount());
  document.documentElement.removeAttribute("data-reduce-motion");
  vi.useRealTimers();
});
async function render(animation = dragon, scopeId = null) {
  const w = mount(IllustrationComp, {
    attachTo: document.body,
    props: { animation, scopeId },
  });
  wrappers.push(w);
  await flushPromises();
  return w;
}

describe("legacy artwork lifecycle", () => {
  it("loads and parks the original art under explicit reduced motion, then follows changes", async () => {
    document.documentElement.setAttribute("data-reduce-motion", "1");
    const w = await render();
    const anim = mock.instances[0];
    anim.listeners.DOMLoaded();
    await flushPromises();
    expect(anim.options.autoplay).toBe(false);
    expect(anim.goToAndStop).toHaveBeenCalledWith(82, true);
    expect(anim.play).not.toHaveBeenCalled();
    expect(
      w.get('button[aria-label="Play animation"]').attributes("disabled")
    ).toBeUndefined();
    document.documentElement.setAttribute("data-reduce-motion", "0");
    await new Promise((r) => setTimeout(r, 10));
    await flushPromises();
    expect(anim.play).toHaveBeenCalledOnce();
    document.documentElement.setAttribute("data-reduce-motion", "1");
    await new Promise((r) => setTimeout(r, 10));
    expect(anim.goToAndStop).toHaveBeenLastCalledWith(82, true);
  });

  it("does not create artwork when the async library resolves after unmount", async () => {
    let resolve;
    const loader = vi.fn();
    mock.load.mockReturnValue(new Promise((r) => (resolve = r)));
    const w = await render();
    w.unmount();
    wrappers = [];
    resolve({ loadAnimation: loader });
    await flushPromises();
    expect(loader).not.toHaveBeenCalled();
  });

  it("cancels delayed transition playback and ignores late ready callbacks", async () => {
    const w = await render({ ...dragon, hasTransition: true });
    const anim = mock.instances[0];
    vi.useFakeTimers();
    anim.listeners.DOMLoaded();
    w.unmount();
    wrappers = [];
    vi.advanceTimersByTime(500);
    anim.listeners.DOMLoaded();
    anim.listeners.complete();
    expect(anim.play).not.toHaveBeenCalled();
    expect(anim.playSegments).not.toHaveBeenCalled();
    expect(anim.destroy).toHaveBeenCalledOnce();
  });

  it("scopes accessible anatomical selection to the mounted instance", async () => {
    const eye = {
      id: "animationEyeStructur",
      clickTriggered: true,
      highlight: true,
      states: ["Lens", "Iris"],
    };
    const one = await render(eye, "eye-one");
    const two = await render(eye, "eye-two");
    for (const w of [one, two])
      w.get("figure > div").element.innerHTML =
        '<svg><g class="lensHighlight"></g><g class="irisHighlight"></g></svg>';
    mock.instances.forEach((a) => a.listeners.DOMLoaded());
    await one.get("button").trigger("click");
    expect(one.get(".lensHighlight").classes()).toContain("highlightIllu");
    expect(two.get(".lensHighlight").classes()).not.toContain("highlightIllu");
    expect(one.get("button").attributes("aria-pressed")).toBe("true");
    await one.findAll("button")[1].trigger("click");
    expect(one.get(".lensHighlight").classes()).not.toContain("highlightIllu");
    expect(one.get(".irisHighlight").classes()).toContain("highlightIllu");
  });
});
