/*
 * Chapter/Illustrations/IllustarionMultiple — one state of a multi-state
 * pane figure (the eye's anatomy: lens, iris, cornea, …). The component name
 * carries the original typo; the file is named after it on purpose so the
 * nav stays greppable.
 */
import IllustarionMultiple from "../IllustarionMultiple.vue";
import {
  animationById,
  illustrationFrame,
} from "../../__stories__/chapterFixtures";

const eye = animationById("animationEyeStructur");

export default {
  title: "Chapter/Illustrations/IllustarionMultiple",
  component: IllustarionMultiple,
  parameters: { layout: "fullscreen", api: { animations: [] } },
  args: { animation: eye, state: "Lens" },
  argTypes: {
    animation: { control: "object" },
    state: {
      control: "select",
      options: eye.states,
      description: "One of animation.states; upper-cased into the mount id.",
    },
  },
  render: illustrationFrame(IllustarionMultiple),
};

export const Default = {};

export const Retina = { args: { state: "Retina" } };
