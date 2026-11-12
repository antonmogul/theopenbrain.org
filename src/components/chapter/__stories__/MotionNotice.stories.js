/*
 * Chapter/ReaderShell/MotionNotice — "Animations are off" (OPENBRAIN-189).
 *
 * In the reader it shows on the chapter cover, once per browser, while the
 * device asks for less motion and the reader has chosen nothing in the
 * book. Here the story pretends the device asks, and forgets any earlier
 * answer, so the notice is always there to look at. Its buttons really do
 * set the book's motion preference until the next story loads.
 */
import {
  MOTION_NOTICE_KEY,
  resetMotionPreferenceForTests,
  useMotionPreference,
} from "@/composables/useMotionPreference";
import { usePreferences } from "@/composables/usePreferences";
import MotionNotice from "../MotionNotice.vue";

export default {
  title: "Chapter/ReaderShell/MotionNotice",
  component: MotionNotice,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  render: () => ({
    components: { MotionNotice },
    setup() {
      try {
        localStorage.removeItem(MOTION_NOTICE_KEY);
      } catch {
        // private mode
      }
      resetMotionPreferenceForTests();
      usePreferences().reduceMotion.value = "auto";
      useMotionPreference().systemReduced.value = true;
      return {};
    },
    template: `<div style="max-width:21rem;"><MotionNotice /></div>`,
  }),
};

export const Default = {};

export const Mobile = {
  globals: { viewport: { value: "phone" } },
};
