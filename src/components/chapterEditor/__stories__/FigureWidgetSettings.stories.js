/*
 * Dashboard/ChapterEditor/FigureWidgetSettings — an interactive figure's
 * settings, built from its widget's schema (OPENBRAIN-80).
 */
import FigureWidgetSettings from "../FigureWidgetSettings.vue";

export default {
  title: "Dashboard/ChapterEditor/FigureWidgetSettings",
  component: FigureWidgetSettings,
  args: {
    open: true,
    uploadSlug: "the-retina",
    figure: {
      id: "rx",
      title: "Refraction errors",
      animation_key: "animationImpairedVision",
      media_type: "lottie",
      config: { toggle: "Corrected", fullscreen: true },
    },
    states: ["Normal eye (emmetropia)", "Myopia", "Hyperopia", "Astigmatism"],
    media: [
      {
        id: "cover",
        title: "Girl reading",
        media_type: "image",
        image_file_url: "/publicAssets/images/attention-matisse-reader.jpg",
      },
    ],
  },
};

/** As it opens for a figure nobody has edited. */
export const Original = {};

/** A figure with earlier edits: a new picture and correction label. */
export const Edited = {
  args: {
    figure: {
      id: "rx",
      title: "Refraction errors",
      animation_key: "animationImpairedVision",
      media_type: "lottie",
      config: {
        toggle: "Corrected",
        content: {
          toggle: "With glasses",
          image: "/publicAssets/images/attention-matisse-reader.jpg",
        },
      },
    },
  },
};

/** A step-through figure: its steps and legend labels (OPENBRAIN-81). */
export const StepThrough = {
  args: {
    figure: {
      id: "plr",
      title: "Pathway for the pupillary light reflex",
      animation_key: "animationPupillaryLightreflex",
      media_type: "lottie",
      config: { loop: true, fullscreen: true },
    },
    states: [
      "Light shines into an eye, activating the retina",
      "Retinal ganglion cells project bilaterally to the pretectal olivary nucleus",
      "Each pretectal nucleus projects bilaterally to the Edinger-Westphal Nucleus",
      "The Edinger-Westphal nucleus projects ipsilaterally to the ciliary ganglion",
      "Postganglionic parasympathetic neurons project ipsilaterally to the iris spinster muscle",
    ],
  },
};
