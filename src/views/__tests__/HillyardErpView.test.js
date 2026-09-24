import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import HillyardErpView from "@/views/HillyardErpView.vue";

const $ = (w, name) => w.get(`[data-test="${name}"]`);

describe("HillyardErpView", () => {
  let wrapper;

  beforeEach(() => {
    vi.useFakeTimers();
    delete document.documentElement.dataset.reduceMotion;
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    vi.useRealTimers();
    delete document.documentElement.dataset.reduceMotion;
  });

  it("starts attending left with the large N1 and switching on", () => {
    wrapper = mount(HillyardErpView);
    expect($(wrapper, "attention-label").text()).toBe("Attention: left ear");
    expect($(wrapper, "condition-label").text()).toBe("left ear attended");
    expect($(wrapper, "attend-left").attributes("aria-pressed")).toBe("true");
    expect($(wrapper, "auto-switch").text()).toBe("Pause switching");
    // Large N1 peaks at 67 - 31 = 36.
    expect($(wrapper, "wave").attributes("d")).toContain("154 36");
  });

  it("auto-switches every 4.2 s", async () => {
    wrapper = mount(HillyardErpView);
    await vi.advanceTimersByTimeAsync(4199);
    expect($(wrapper, "attention-label").text()).toBe("Attention: left ear");
    await vi.advanceTimersByTimeAsync(1);
    expect($(wrapper, "attention-label").text()).toBe("Attention: right ear");
    expect($(wrapper, "condition-label").text()).toBe("left ear ignored");
    expect($(wrapper, "takeaway").text()).toContain("Smaller N1");
    // Small N1 peaks at 67 - 14 = 53.
    expect($(wrapper, "wave").attributes("d")).toContain("154 53");
    await vi.advanceTimersByTimeAsync(4200);
    expect($(wrapper, "attention-label").text()).toBe("Attention: left ear");
  });

  it("choosing an ear stops the switching", async () => {
    wrapper = mount(HillyardErpView);
    await $(wrapper, "attend-right").trigger("click");
    expect($(wrapper, "attention-label").text()).toBe("Attention: right ear");
    expect($(wrapper, "auto-switch").text()).toBe("Auto switch");
    expect($(wrapper, "auto-switch").attributes("aria-pressed")).toBe("false");
    await vi.advanceTimersByTimeAsync(10000);
    expect($(wrapper, "attention-label").text()).toBe("Attention: right ear");

    await $(wrapper, "auto-switch").trigger("click");
    expect($(wrapper, "auto-switch").text()).toBe("Pause switching");
    await vi.advanceTimersByTimeAsync(4200);
    expect($(wrapper, "attention-label").text()).toBe("Attention: left ear");
  });

  it("clears its interval on unmount", () => {
    wrapper = mount(HillyardErpView);
    expect(vi.getTimerCount()).toBe(1);
    wrapper.unmount();
    wrapper = null;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("follows the reader's reduce-motion setting", async () => {
    document.documentElement.dataset.reduceMotion = "1";
    wrapper = mount(HillyardErpView);
    expect(wrapper.classes()).toContain("hl-rm");
    document.documentElement.dataset.reduceMotion = "0";
    await vi.waitFor(() => expect(wrapper.classes()).not.toContain("hl-rm"));
  });
});
