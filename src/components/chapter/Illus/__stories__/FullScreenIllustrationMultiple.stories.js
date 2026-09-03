/*
 * Chapter/Illustrations/FullScreenIllustrationMultiple — one state of a
 * multi-state full-screen figure (impaired vision: emmetropia, myopia, …).
 * The parent mounts one of these per state and shows the active one.
 */
import FullScreenIllustrationMultiple from "../FullScreenIllustrationMultiple.vue";
import {
  animationById,
  illustrationFrame,
} from "../../__stories__/chapterFixtures";

const impairedVision = animationById("animationImpairedVision");

export default {
  title: "Chapter/Illustrations/FullScreenIllustrationMultiple",
  component: FullScreenIllustrationMultiple,
  parameters: { layout: "fullscreen", api: { animations: [] } },
  args: { animation: impairedVision, state: impairedVision.states[1] },
  argTypes: {
    animation: { control: "object" },
    state: {
      control: "select",
      options: impairedVision.states,
      description: "One of animation.states; also keys the Lottie asset name.",
    },
  },
  render: illustrationFrame(FullScreenIllustrationMultiple),
};

/** Myopia. */
export const Default = {};

export const Astigmatism = { args: { state: impairedVision.states[3] } };
