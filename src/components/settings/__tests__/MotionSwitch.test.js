import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import MotionSwitch from "../MotionSwitch.vue";
import { usePreferences } from "@/composables/usePreferences";
import { resetMotionPreferenceForTests } from "@/composables/useMotionPreference";

/* Animations: on / off / follow my device (OPENBRAIN-189). */

function device(reduce) {
  vi.spyOn(window, "matchMedia").mockReturnValue({
    matches: reduce,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
}

beforeEach(() => {
  localStorage.clear();
  usePreferences().reduceMotion.value = "auto";
  resetMotionPreferenceForTests();
});
afterEach(() => vi.restoreAllMocks());

describe("MotionSwitch", () => {
  it("is one named group of three radios, the current choice checked", () => {
    device(false);
    const w = mount(MotionSwitch);
    expect(w.get("legend").text()).toBe("Animations");
    const radios = w.findAll('input[type="radio"]');
    expect(radios.map((r) => r.element.value)).toEqual(["on", "off", "device"]);
    expect(new Set(radios.map((r) => r.attributes("name"))).size).toBe(1);
    expect(radios[2].element.checked).toBe(true);
    // Each radio has its visible label as its name.
    expect(radios[2].element.closest("label").textContent).toContain(
      "Follow my device"
    );
  });

  it("says why animations are off when the device asks", () => {
    device(true);
    const w = mount(MotionSwitch);
    const status = w.get('[data-testid="motion-status"]');
    expect(status.text()).toMatch(/device asks for less motion/);
    expect(w.get("fieldset").attributes("aria-describedby")).toBe(
      status.attributes("id")
    );
  });

  it("sets the book's preference, which wins over the device", async () => {
    device(true);
    const w = mount(MotionSwitch);
    await w.findAll('input[type="radio"]')[0].setValue(true);
    expect(usePreferences().reduceMotion.value).toBe("off");
    expect(w.get('[data-testid="motion-status"]').text()).toMatch(
      /On in this book/
    );
    await w.findAll('input[type="radio"]')[1].setValue(true);
    expect(usePreferences().reduceMotion.value).toBe("on");
  });

  it("gives two switches on one page their own groups", () => {
    device(false);
    const a = mount(MotionSwitch);
    const b = mount(MotionSwitch);
    expect(a.get("input").attributes("name")).not.toBe(
      b.get("input").attributes("name")
    );
  });
});
