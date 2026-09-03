/*
 * Chapter/Illustrations/IllustrationTransition — the scroll-scrubbed morph
 * between two pane figures (eye structure → cell types). `progress` in
 * 0.1–0.9 maps linearly onto the Lottie's frames.
 */
import IllustrationTransition from "../IllustrationTransition.vue";
import {
  animationById,
  illustrationFrame,
} from "../../__stories__/chapterFixtures";

const transition = animationById("animationEyeStructurTransition");

export default {
  title: "Chapter/Illustrations/IllustrationTransition",
  component: IllustrationTransition,
  parameters: { layout: "fullscreen", api: { animations: [] } },
  args: {
    animation: transition,
    activeAnimation: transition.id.toLowerCase(),
    progress: 0.48,
  },
  argTypes: {
    animation: { control: "object" },
    activeAnimation: { control: "text" },
    progress: {
      control: { type: "range", min: 0, max: 1, step: 0.01 },
      description: "Scroll progress through the transition trigger, 0–1.",
    },
  },
  render: illustrationFrame(IllustrationTransition),
};

export const Default = {};

export const Start = { args: { progress: 0 } };

export const End = { args: { progress: 1 } };
