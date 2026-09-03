/*
 * Chapter/Illustrations/IllustrationOnScroll — a pane figure scrubbed by the
 * reader's scroll position: `progress` (0–1) maps onto the Lottie's frames.
 */
import IllustrationOnScroll from "../IllustrationOnScroll.vue";
import {
  animationById,
  illustrationFrame,
} from "../../__stories__/chapterFixtures";

const scrollFigure = animationById("animationLateralOrganization");

export default {
  title: "Chapter/Illustrations/IllustrationOnScroll",
  component: IllustrationOnScroll,
  parameters: { layout: "fullscreen", api: { animations: [] } },
  args: {
    animation: scrollFigure,
    activeAnimation: scrollFigure.id.toLowerCase(),
    progress: 0.56,
    scopeId: "storybook-scroll-figure",
  },
  argTypes: {
    animation: { control: "object" },
    activeAnimation: { control: "text" },
    progress: {
      control: { type: "range", min: 0, max: 1, step: 0.01 },
      description: "Scroll progress through the trigger, 0–1.",
    },
    scopeId: { control: "text" },
  },
  render: illustrationFrame(IllustrationOnScroll),
};

export const Default = {};

export const Start = { args: { progress: 0 } };

export const End = { args: { progress: 1 } };
