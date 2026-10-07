/*
 * Widgets/BrainAtlas — the 3D brain atlas (OPENBRAIN-127), mounted on its
 * own. Storybook serves the model from public/publicAssets/models/brain
 * (a staticDirs entry in .storybook/main.mjs), so the stage renders here as
 * it does at /brain.
 */
import BrainAtlas from "../BrainAtlas.vue";

export default {
  title: "Widgets/BrainAtlas",
  component: BrainAtlas,
  parameters: { layout: "fullscreen" },
  args: { autoplay: true },
  argTypes: {
    autoplay: {
      control: "boolean",
      description: "Start the tour on load (always off under reduced motion).",
    },
    modelUrl: {
      control: "text",
      description: "The atlas model. Defaults to the published brain-v1.glb.",
    },
  },
};

export const Default = {};

/** Tour paused: the brain waits in its first pose until someone drags it. */
export const Paused = { args: { autoplay: false } };

/** Stage above, panel below, as on a phone. */
export const Phone = { globals: { viewport: { value: "phone" } } };

/** The model is missing: the stage says so and the legend still works. */
export const LoadError = {
  args: { modelUrl: "/publicAssets/models/brain/missing.glb" },
};
