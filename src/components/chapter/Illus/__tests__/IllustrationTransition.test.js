import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { sectionTransitionId } from "@/helper/figureTransitions";
const fixture = vi.hoisted(() => ({ load: null }));
vi.mock("@/composables/useLottie", () => ({ loadLottie: () => fixture.load }));
import IllustrationTransition from "../IllustrationTransition.vue";
import TransitionWidgetSequence from "../TransitionWidgetSequence.vue";
const animation = {
  id: "animationRetinalCellTypesTransition",
  lottieUrl: "/zoom.json",
};
const successor = {
  id: "widget-upload:retina-retinal-cell-types",
  widgetId: "upload:retina-retinal-cell-types",
};
const wrappers = [];
afterEach(() => {
  wrappers.splice(0).forEach((w) => w.unmount());
});
function renderer() {
  const events = {};
  const item = {
    totalFrames: 90,
    setSubframe: vi.fn(),
    goToAndStop: vi.fn(),
    destroy: vi.fn(),
    addEventListener: (name, fn) => (events[name] = fn),
  };
  const loadAnimation = vi.fn(() => item);
  return { item, events, lottie: { loadAnimation } };
}
describe("authored retinal transition", () => {
  it("restores the entrance for the replacement without changing other sections", () => {
    expect(
      sectionTransitionId({ paragraphs: [{ animation: successor }] })
    ).toBe(animation.id);
    expect(
      sectionTransitionId({
        paragraphs: [
          { animation: { id: "animationEyeStructur", transition: true } },
        ],
      })
    ).toBe("animationEyeStructurTransition");
    expect(
      sectionTransitionId({ paragraphs: [{ animation: { id: "other" } }] })
    ).toBeNull();
    expect(
      sectionTransitionId({
        paragraphs: [{ animation: { name: "EyeStructur", transition: true } }],
      })
    ).toBe("animationEyeStructurTransition");
    expect(
      sectionTransitionId({ paragraphs: [{ animation: { transition: true } }] })
    ).toBeNull();
  });
  it("seeks latest progress after async load and DOM readiness, then scrubs backwards", async () => {
    let resolve;
    fixture.load = new Promise((r) => (resolve = r));
    const r = renderer();
    const w = mount(IllustrationTransition, {
      props: { animation, progress: 0.1 },
    });
    wrappers.push(w);
    await w.setProps({ progress: 0.7 });
    resolve(r.lottie);
    await flushPromises();
    expect(r.lottie.loadAnimation.mock.calls[0][0].path).toBe("/zoom.json");
    expect(r.item.goToAndStop).not.toHaveBeenCalled();
    r.events.DOMLoaded();
    expect(r.item.goToAndStop.mock.calls.at(-1)[0]).toBeCloseTo(67.5);
    expect(r.item.goToAndStop.mock.calls.at(-1)[1]).toBe(true);
    await w.setProps({ progress: 0.3 });
    expect(r.item.goToAndStop.mock.calls.at(-1)[0]).toBeCloseTo(22.5);
    w.unmount();
    expect(r.item.destroy).toHaveBeenCalledOnce();
    wrappers.pop();
  });
  it("does not create a late animation after unmount", async () => {
    let resolve;
    fixture.load = new Promise((r) => (resolve = r));
    const r = renderer();
    const w = mount(IllustrationTransition, { props: { animation } });
    w.unmount();
    resolve(r.lottie);
    await flushPromises();
    expect(r.lottie.loadAnimation).not.toHaveBeenCalled();
  });
  it("shows the endpoint without zooming when reduced motion is selected", async () => {
    document.documentElement.setAttribute("data-reduce-motion", "1");
    const r = renderer();
    fixture.load = Promise.resolve(r.lottie);
    const w = mount(IllustrationTransition, {
      props: { animation, progress: 0.2 },
    });
    wrappers.push(w);
    await flushPromises();
    r.events.DOMLoaded();
    expect(r.item.goToAndStop).toHaveBeenLastCalledWith(89, true);
    document.documentElement.removeAttribute("data-reduce-motion");
  });
  it("retains the endpoint until the successor is ready and returns to the zoom on reverse scroll", async () => {
    const w = mount(TransitionWidgetSequence, {
      props: {
        transition: animation,
        successor,
        active: successor.id.toLowerCase(),
        progress: 0.5,
      },
      global: {
        stubs: { IllustrationTransition: true, IllustrationWidget: true },
      },
    });
    wrappers.push(w);
    const zoom = w.findComponent({ name: "IllustrationTransition" }),
      widget = w.findComponent({ name: "IllustrationWidget" });
    expect(zoom.props("progress")).toBe(1);
    expect(widget.attributes("style")).toContain("hidden");
    widget.vm.$emit("ready");
    await flushPromises();
    expect(widget.attributes("style")).toContain("visible");
    expect(zoom.attributes("style")).toContain("hidden");
    await w.setProps({ active: animation.id.toLowerCase(), progress: 0.4 });
    expect(zoom.props("progress")).toBe(0.4);
    expect(zoom.attributes("style")).toContain("visible");
    expect(widget.attributes("inert")).toBeDefined();
  });
});
