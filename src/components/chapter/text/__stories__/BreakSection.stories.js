/*
 * Chapter/Text/BreakSection — the full-bleed, sticky "try it yourself" demo
 * (blind spot, colour blindness). The title doubles as the demo selector:
 * "Blind spot" loads blind-spot.png and the fixation markers.
 */
import BreakSection from "../BreakSection.vue";
import { chapterFrame } from "../../__stories__/chapterFixtures";

const BLIND_SPOT = {
  id: "blind-spot-demo",
  title: "Blind spot",
  text: "Close one eye and fixate the opposite marker. At the correct distance, one marker disappears where its image falls on the optic disc.",
  steps: [
    "Close your left eye and fixate A with your right eye.",
    "Move slowly toward the screen until B disappears.",
    "Reverse eyes and repeat.",
  ],
};

const COLOR_BLINDNESS = {
  id: "color-blindness-demo",
  title: "Color blindness",
  text: "Look at the plates with each eye in turn. Someone with a red–green deficiency will not see the number hidden in the dots.",
  steps: [
    "View each plate at arm's length under daylight.",
    "Note which numerals you can read.",
    "Compare with a colleague.",
  ],
};

export default {
  title: "Chapter/Text/BreakSection",
  component: BreakSection,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: { content: BLIND_SPOT },
  argTypes: {
    content: {
      control: "object",
      description:
        "{ title, text, steps[] }. The title selects the demo artwork; steps are optional.",
    },
  },
  render: chapterFrame(BreakSection, {
    template: `<div style="min-height:1200px;overflow:hidden;"><StoryComponent v-bind="args" /></div>`,
  }),
};

export const Default = {};

export const ColorBlindness = { args: { content: COLOR_BLINDNESS } };

/** No directions authored — the "Directions" list must simply not render. */
export const WithoutSteps = {
  args: {
    content: {
      id: BLIND_SPOT.id,
      title: BLIND_SPOT.title,
      text: BLIND_SPOT.text,
    },
  },
};
