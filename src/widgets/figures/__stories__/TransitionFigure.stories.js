/*
 * Chapter/Figure widgets/Transition — the eye's structure and the retina's
 * cell types (OPENBRAIN-83), played by scrolling; `progress` stands in.
 */
import TransitionFigure from "../transitions/TransitionFigure.vue";
import cellTypes from "../transitions/retinal-cell-types.js";
import eye from "../transitions/eye-structure.js";

export default {
  title: "Chapter/Figure widgets/Transition",
  component: TransitionFigure,
  argTypes: {
    progress: { control: { type: "range", min: 0, max: 1, step: 0.01 } },
  },
  decorators: [
    () => ({
      template: `<div style="height: 760px; width: 720px"><story /></div>`,
    }),
  ],
};

export const RetinalCellTypes = {
  args: {
    schema: cellTypes,
    lottieUrl:
      "/publicAssets/animations/animationRetinalCellTypesTransition.json?v=v0.2.3",
    progress: 0.5,
  },
};
export const EyeStructure = {
  args: {
    schema: eye,
    lottieUrl:
      "/publicAssets/animations/animationEyeStructurTransition.json?v=v0.2.3",
    progress: 0.5,
  },
};
