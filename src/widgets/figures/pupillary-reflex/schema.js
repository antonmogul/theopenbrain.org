/*
 * Pupillary light reflex: a step-through figure (see ../step-through/StepThrough.vue),
 * matched to theopenbrain.org (v0.2.3). The steps follow the Lottie's
 * timeline (`frames`: where each step starts, then the end), so their count
 * is fixed; each legend item lights up the Lottie layer in `legendArt`.
 */
export default {
  id: "pupillary-reflex",
  name: "Pupillary light reflex",
  animationKey: "animationPupillaryLightreflex",
  /** The Lottie artwork this schema was written for (cache key). */
  lottieVersion: "v0.2.3",
  frames: [0, 48, 96, 144, 192, 264],
  legendArt: [
    {
      icon: "/publicAssets/icons/fullScreenAnimations/pretectalNucleus.svg",
      highlight: "pretectalNucleusHighlight",
    },
    {
      icon: "/publicAssets/icons/fullScreenAnimations/edingerWestphalNucleus.svg",
      highlight: "edingerWestphalNucleusHighlight",
    },
    {
      icon: "/publicAssets/icons/fullScreenAnimations/ciliaryGanglion.svg",
      highlight: "ciliaryGanglionHighlight",
    },
    {
      icon: "/publicAssets/icons/fullScreenAnimations/pupil.svg",
      highlight: "pupilHighlight",
    },
  ],
  fields: [
    {
      key: "title",
      label: "Title",
      type: "text",
    },
    {
      key: "states",
      label: "Steps",
      type: "list",
      itemLabels: ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"],
      hint: "One per stretch of the animation, in order.",
    },
    {
      key: "legend",
      label: "Legend",
      type: "list",
      itemLabels: ["Item 1", "Item 2", "Item 3", "Item 4"],
      hint: "Each label lights up its part of the drawing when clicked.",
    },
  ],
  defaults: {
    title: "Pathway for the pupillary light reflex",
    states: [
      "Light shines into an eye, activating the retina",
      "Retinal ganglion cell axons project bilaterally to the pretectal olivary nucleus",
      "Each pretectal nucleus projects bilaterally to the Edinger-Westphal Nucleus",
      "The Edinger-Westphal nucleus projects ipsilaterally to the ciliary ganglion",
      "Postganglionic parasympathetic neurons project ipsilaterally to the iris spinster muscle, resulting in pupil constriction",
    ],
    legend: [
      "Pretectal nucleus",
      "Edinger-Westphal nucleus",
      "Ciliary ganglion",
      "Pupil",
    ],
  },
};
