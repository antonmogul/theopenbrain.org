import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import MotionNotice from "../MotionNotice.vue";
import { usePreferences } from "@/composables/usePreferences";
import {
  MOTION_NOTICE_KEY,
  resetMotionPreferenceForTests,
} from "@/composables/useMotionPreference";

/*
 * "Animations are off" (OPENBRAIN-189): shown once per browser while the
 * device asks for less motion and the reader has chosen nothing.
 */

function device(reduce) {
  vi.spyOn(window, "matchMedia").mockReturnValue({
    matches: reduce,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
}

let observed;
beforeEach(() => {
  localStorage.clear();
  usePreferences().reduceMotion.value = "auto";
  resetMotionPreferenceForTests();
  observed = [];
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb) {
        this.cb = cb;
        observed.push(this);
      }
      observe() {}
      disconnect() {}
    }
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("MotionNotice", () => {
  it("stays out of the way when the device allows motion", () => {
    device(false);
    const w = mount(MotionNotice);
    expect(w.find('[data-testid="motion-notice"]').exists()).toBe(false);
  });

  it("stays out of the way once the reader has chosen", () => {
    device(true);
    usePreferences().reduceMotion.value = "on";
    const w = mount(MotionNotice);
    expect(w.find('[data-testid="motion-notice"]').exists()).toBe(false);
  });

  it("says, politely, why animations are off and offers both answers", async () => {
    device(true);
    const w = mount(MotionNotice);
    await flushPromises();
    const status = w.get('[role="status"]');
    expect(status.text()).toMatch(/Animations are off.*less motion/);
    expect(w.get('[data-testid="motion-notice-on"]').text()).toBe(
      "Turn animations on"
    );
    expect(w.get('[data-testid="motion-notice-off"]').text()).toBe(
      "Keep them off"
    );
    for (const b of w.findAll("button")) {
      expect(b.attributes("type")).toBe("button");
    }
  });

  it("turns animations on for this book and keeps the keyboard's place", async () => {
    device(true);
    const w = mount(MotionNotice, { attachTo: document.body });
    await w.get('[data-testid="motion-notice-on"]').trigger("click");
    await flushPromises();
    expect(usePreferences().reduceMotion.value).toBe("off");
    expect(localStorage.getItem(MOTION_NOTICE_KEY)).toBe("1");
    const done = w.get('[data-testid="motion-notice"] [role="status"]');
    expect(done.text()).toMatch(/Animations are on\..*Help.*top bar/);
    expect(document.activeElement).toBe(done.element);
    w.unmount();
  });

  it("keeps them off: follows the device and does not ask again", async () => {
    device(true);
    const w = mount(MotionNotice);
    await w.get('[data-testid="motion-notice-off"]').trigger("click");
    expect(usePreferences().reduceMotion.value).toBe("auto");
    expect(localStorage.getItem(MOTION_NOTICE_KEY)).toBe("1");
    expect(w.text()).toMatch(/Animations stay off/);
  });

  it("counts a notice seen and passed by as answered, once it was on screen", async () => {
    device(true);
    const unseen = mount(MotionNotice);
    await flushPromises();
    unseen.unmount();
    expect(localStorage.getItem(MOTION_NOTICE_KEY)).toBeNull();

    const seen = mount(MotionNotice);
    await flushPromises();
    observed.at(-1).cb([{ isIntersecting: true }]);
    seen.unmount();
    expect(localStorage.getItem(MOTION_NOTICE_KEY)).toBe("1");
    expect(usePreferences().reduceMotion.value).toBe("auto");
  });
});
