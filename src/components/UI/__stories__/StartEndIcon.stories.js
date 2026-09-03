/*
 * Legacy/StartEndIcon — the start/end markers of a scroll-driven animation.
 *
 * A start marker renders only when the paragraph's animation has neither
 * `end` nor `middel` set (sic — the legacy key), and vice versa; the
 * Suppressed story shows the middle-of-animation case where neither draws.
 */
import StartEndIcon from "../StartEndIcon.vue";

export default {
  title: "Legacy/StartEndIcon",
  component: StartEndIcon,
  tags: ["autodocs"],
  argTypes: {
    paragraph: {
      control: "object",
      description: "{ animation: { start?, end?, middel? } }",
    },
    art: { control: "inline-radio", options: ["start", "end"] },
  },
  args: {
    paragraph: { animation: { start: true, end: false, middel: false } },
    art: "start",
  },
  render: (args) => ({
    components: { StartEndIcon },
    setup: () => ({ args }),
    template: `
      <div style="min-height:48px; display:flex; align-items:center; gap:12px;">
        <span style="font-family:var(--font-mono); font-size:12px;">{{ args.art }}</span>
        <StartEndIcon :paragraph="args.paragraph" :art="args.art" />
      </div>`,
  }),
};

export const StartMarker = {};

export const EndMarker = {
  args: {
    paragraph: { animation: { start: false, end: true, middel: false } },
    art: "end",
  },
};

/** Mid-animation paragraph — neither marker renders. */
export const Suppressed = {
  args: {
    paragraph: { animation: { start: false, end: false, middel: true } },
  },
};

/** Both markers side by side, the catalog's original comparison. */
export const Markers = {
  render: () => ({
    components: { StartEndIcon },
    setup: () => ({
      start: { animation: { end: false, middel: false } },
      end: { animation: { start: false, middel: false } },
    }),
    template: `
      <div style="display:flex; gap:40px;">
        <div>Start <StartEndIcon :paragraph="start" art="start" /></div>
        <div>End <StartEndIcon :paragraph="end" art="end" /></div>
      </div>`,
  }),
};
