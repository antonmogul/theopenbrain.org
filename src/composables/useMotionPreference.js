import { computed, ref } from "vue";
import { usePreferences } from "./usePreferences";

/*
 * The reader's say over animations (OPENBRAIN-189), in the reader's words.
 *
 * usePreferences stores it as `reduceMotion`: "auto" follows the device,
 * "on" reduces, "off" asks for motion whatever the device says (rendered as
 * data-reduce-motion on <html>: absent, "1", "0"). That reads backwards in
 * an interface, so this maps it to `animations`: "device" | "off" | "on".
 *
 * It also holds the one-off notice: a device can ask for less motion
 * without its owner knowing (Stuart's office PC had Windows' "Animation
 * effects" off and the book looked broken to him). While the device asks
 * for less motion, the reader has chosen nothing here and has not answered
 * before, `noticePending` is true: the reader shows MotionNotice once and
 * the top bar's help button carries a dot. Any choice, or "Keep them off",
 * answers it for good in this browser (`ob.motionNotice`).
 */
export const MOTION_NOTICE_KEY = "ob.motionNotice";
const QUERY = "(prefers-reduced-motion: reduce)";

const TO_PREF = { device: "auto", off: "on", on: "off" };
const FROM_PREF = { auto: "device", on: "off", off: "on" };

// Module scope, like usePreferences: one answer for every consumer.
const systemReduced = ref(false);
const answered = ref(false);
let listening = false;

function listen() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  try {
    answered.value = localStorage.getItem(MOTION_NOTICE_KEY) === "1";
  } catch {
    // Private mode: the notice is asked again next visit.
  }
  const media = window.matchMedia?.(QUERY);
  systemReduced.value = !!media?.matches;
  media?.addEventListener?.("change", (event) => {
    systemReduced.value = !!event.matches;
  });
}

function markAnswered() {
  answered.value = true;
  try {
    localStorage.setItem(MOTION_NOTICE_KEY, "1");
  } catch {
    // ignore quota / private-mode errors
  }
}

export function useMotionPreference() {
  listen();
  const { reduceMotion } = usePreferences();

  /** "device" | "off" | "on" */
  const animations = computed(() => FROM_PREF[reduceMotion.value] || "device");
  /** Whether animations run right now. */
  const animationsOn = computed(
    () =>
      animations.value === "on" ||
      (animations.value === "device" && !systemReduced.value)
  );
  const noticePending = computed(
    () =>
      systemReduced.value && animations.value === "device" && !answered.value
  );

  /** A choice made by the reader; it also answers the notice. */
  function setAnimations(value) {
    reduceMotion.value = TO_PREF[value] || "auto";
    markAnswered();
  }

  return {
    animations,
    animationsOn,
    systemReduced,
    noticePending,
    setAnimations,
    /** "Keep them off": go on following the device, and don't ask again. */
    dismissNotice: markAnswered,
  };
}

/** Tests only: forget the device and the answer, and read them again. */
export function resetMotionPreferenceForTests() {
  listening = false;
  systemReduced.value = false;
  answered.value = false;
}
