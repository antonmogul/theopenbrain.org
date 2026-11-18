import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const shared = vi.hoisted(() => ({ route: null }));
vi.mock("vue-router", async () => {
  const { reactive } = await import("vue");
  shared.route = reactive({
    fullPath: "/chapter/1/foundations-of-neuroscience",
  });
  return { routeLocationKey: Symbol.for("test.listen.route") };
});
import ReaderListen from "../ReaderListen.vue";
let wrapper;
const synth = {
  getVoices: () => [{ voiceURI: "en", lang: "en-GB", name: "Test English" }],
  cancel: vi.fn(),
  resume: vi.fn(),
  speak: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("speechSynthesis", synth);
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      constructor(text) {
        this.text = text;
      }
    }
  );
  document.body.innerHTML =
    '<main id="text"><div data-paragraph-id="test">Chapter text.</div></main>';
  vi.clearAllMocks();
});
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});
describe("ReaderListen controls", () => {
  it("opens a labelled dialog, plays on a gesture and restores focus on Escape", async () => {
    wrapper = mount(ReaderListen, {
      attachTo: document.body,
      global: { provide: { [Symbol.for("test.listen.route")]: shared.route } },
    });
    const button = wrapper.get('[aria-label="Listen to this chapter"]');
    expect(button.attributes("aria-expanded")).toBe("false");
    await button.trigger("click");
    await flushPromises();
    expect(wrapper.get('[role="dialog"]').isVisible()).toBe(true);
    expect(document.activeElement.id).toBe("reader-listen-panel");
    const play = wrapper.findAll("button").find((b) => b.text() === "Play");
    await play.trigger("click");
    expect(synth.speak).toHaveBeenCalledOnce();
    expect(wrapper.get('[role="status"]').text()).toContain("Reading passage");
    await wrapper.get('[role="dialog"]').trigger("keydown", { key: "Escape" });
    await flushPromises();
    expect(button.attributes("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(button.element);
  });
  it("stops speech on chapter navigation", async () => {
    wrapper = mount(ReaderListen, {
      global: { provide: { [Symbol.for("test.listen.route")]: shared.route } },
    });
    await wrapper.get(".listen-play").trigger("click");
    const before = synth.cancel.mock.calls.length;
    shared.route.fullPath = "/chapter/2/the-retina";
    await flushPromises();
    expect(synth.cancel.mock.calls.length).toBeGreaterThan(before);
    expect(document.querySelector(".ob-listening")).toBe(null);
  });
  it("hides the control when speech synthesis is unavailable", () => {
    vi.stubGlobal("speechSynthesis", undefined);
    wrapper = mount(ReaderListen, {
      global: { provide: { [Symbol.for("test.listen.route")]: shared.route } },
    });
    expect(wrapper.find("button").exists()).toBe(false);
  });
});
