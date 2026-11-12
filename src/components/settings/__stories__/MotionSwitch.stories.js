/*
 * Foundations/Settings/MotionSwitch — Animations: on / off / follow my
 * device (OPENBRAIN-189). The reader's one motion control, in the reader's
 * help panel (Chapter/ReaderShell/ReaderHelp). It binds to `reduceMotion`
 * on usePreferences, so a click here really does set data-reduce-motion on
 * <html> until the next story loads. The line under it says what is
 * happening now and why.
 */
import MotionSwitch from "../MotionSwitch.vue";

export default {
  title: "Foundations/Settings/MotionSwitch",
  component: MotionSwitch,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  render: () => ({
    components: { MotionSwitch },
    template: `<div style="max-width:21rem;"><MotionSwitch /></div>`,
  }),
};

export const Default = {};
