/*
 * Chapter/Figure widgets/Step-through — the pupillary light reflex,
 * phototransduction and the visual cycle (OPENBRAIN-81), one component with
 * a schema each, matched to theopenbrain.org.
 */
import StepThrough from "../step-through/StepThrough.vue";
import pupillary from "../pupillary-reflex/schema.js";
import phototransduction from "../phototransduction/schema.js";
import visualCycle from "../visual-cycle/schema.js";
import { figureContent } from "../content.js";

const args = (schema, extra = {}) => ({
  schema,
  content: figureContent(schema, {}),
  lottieUrl: `/publicAssets/animations/${schema.animationKey}.json`,
  infoOpenAtStart: false,
  ...extra,
});

export default {
  title: "Chapter/Figure widgets/Step-through",
  component: StepThrough,
  decorators: [
    () => ({
      template: `<div data-chapter="perc" style="height: 760px"><story /></div>`,
    }),
  ],
};

export const PupillaryReflex = { args: args(pupillary) };
export const Phototransduction = { args: args(phototransduction) };
export const VisualCycle = { args: args(visualCycle) };

/** As a reader first meets it: the introduction over the figure. */
export const VisualCycleIntroduction = {
  args: args(visualCycle, { infoOpenAtStart: true }),
};
