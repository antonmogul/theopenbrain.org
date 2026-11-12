import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MOTION_NOTICE_KEY,
  resetMotionPreferenceForTests,
  useMotionPreference,
} from "../useMotionPreference";
import { usePreferences } from "../usePreferences";

/*
 * OPENBRAIN-189: the reader's say over animations, in the reader's words,
 * and the one-off notice for a device that asks for less motion (Stuart's
 * office PC had Windows' "Animation effects" off and the book read as
 * broken to him).
 */

let media;
function device(reduce) {
  media = {
    matches: reduce,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  vi.spyOn(window, "matchMedia").mockReturnValue(media);
}

beforeEach(() => {
  localStorage.clear();
  usePreferences().reduceMotion.value = "auto";
  resetMotionPreferenceForTests();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("useMotionPreference", () => {
  it("maps the stored reduceMotion pref to on / off / follow my device", () => {
    device(false);
    const { reduceMotion } = usePreferences();
    const { animations, setAnimations } = useMotionPreference();
    expect(animations.value).toBe("device");
    setAnimations("on");
    expect(reduceMotion.value).toBe("off"); // data-reduce-motion="0"
    setAnimations("off");
    expect(reduceMotion.value).toBe("on"); // data-reduce-motion="1"
    setAnimations("device");
    expect(reduceMotion.value).toBe("auto");
    setAnimations("nonsense");
    expect(reduceMotion.value).toBe("auto");
  });

  it("says whether animations run: the reader's choice first, then the device", () => {
    device(true);
    const { animationsOn, setAnimations } = useMotionPreference();
    expect(animationsOn.value).toBe(false);
    setAnimations("on");
    expect(animationsOn.value).toBe(true);
    setAnimations("off");
    expect(animationsOn.value).toBe(false);
  });

  it("asks only when the device reduces motion and the reader has chosen nothing", () => {
    device(false);
    expect(useMotionPreference().noticePending.value).toBe(false);

    resetMotionPreferenceForTests();
    device(true);
    const { noticePending } = useMotionPreference();
    expect(noticePending.value).toBe(true);

    // A choice made elsewhere (the help panel) also settles it.
    usePreferences().reduceMotion.value = "on";
    expect(noticePending.value).toBe(false);
  });

  it("follows the device live", () => {
    device(false);
    const { noticePending, systemReduced } = useMotionPreference();
    expect(noticePending.value).toBe(false);
    media.addEventListener.mock.calls[0][1]({ matches: true });
    expect(systemReduced.value).toBe(true);
    expect(noticePending.value).toBe(true);
  });

  it("remembers an answer in this browser", () => {
    device(true);
    const first = useMotionPreference();
    first.dismissNotice();
    expect(first.noticePending.value).toBe(false);
    expect(first.animations.value).toBe("device"); // still follows the device
    expect(localStorage.getItem(MOTION_NOTICE_KEY)).toBe("1");

    resetMotionPreferenceForTests();
    device(true);
    expect(useMotionPreference().noticePending.value).toBe(false);
  });

  it("records the answer when the reader turns animations on", () => {
    device(true);
    const { setAnimations, noticePending } = useMotionPreference();
    setAnimations("on");
    expect(noticePending.value).toBe(false);
    expect(localStorage.getItem(MOTION_NOTICE_KEY)).toBe("1");
  });
});
