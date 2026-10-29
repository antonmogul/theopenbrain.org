/*
 * Widgets/BrainAtlas — the 3D brain atlas (OPENBRAIN-127), mounted on its
 * own. Vite copies public/ into the Storybook build, so the model and the
 * poster are served here and the stage renders as it does at /brain.
 *
 * Storybook runs under reduced motion by default (the Motion toolbar), so
 * every story here holds the brain still; the Poster story is the home
 * cover's case (OPENBRAIN-158), where that means the poster alone and no
 * three.js at all. Switch Motion to "App motion" to see the tour and the
 * poster-to-canvas crossfade.
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
    stillUnderReducedMotion: {
      control: "boolean",
      description:
        "Under reduced motion keep the poster and never fetch the stage (the home cover).",
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

/**
 * The poster only (OPENBRAIN-158): under reduced motion the home cover
 * never fetches the stage; the contents link into the chapters on their
 * own. With Motion set to "App motion" this story becomes Default.
 */
export const Poster = { args: { stillUnderReducedMotion: true } };
