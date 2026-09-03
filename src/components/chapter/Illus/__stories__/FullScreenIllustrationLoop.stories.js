/*
 * Chapter/Illustrations/FullScreenIllustrationLoop — the stepped, looping
 * Lottie inside a full-screen band (phototransduction, the visual cycle).
 * `state` names which of animation.states the loop starts from; the frame
 * markers per figure are hard-coded in the component.
 */
import FullScreenIllustrationLoop from "../FullScreenIllustrationLoop.vue";
import {
  animationById,
  illustrationFrame,
} from "../../__stories__/chapterFixtures";

const phototransduction = animationById("animationPhototransduction");
const visualCycle = animationById("animationTheVisualCycle");

export default {
  title: "Chapter/Illustrations/FullScreenIllustrationLoop",
  component: FullScreenIllustrationLoop,
  parameters: { layout: "fullscreen", api: { animations: [] } },
  args: { animation: phototransduction, state: phototransduction.states[0] },
  argTypes: {
    animation: { control: "object" },
    state: {
      control: "select",
      options: phototransduction.states,
      description: "One of animation.states — where the loop starts.",
    },
  },
  render: illustrationFrame(FullScreenIllustrationLoop),
};

export const Default = {};

export const VisualCycle = {
  args: { animation: visualCycle, state: visualCycle.states[0] },
  argTypes: { state: { options: visualCycle.states } },
};
