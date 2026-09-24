/*
 * Object motion sensitivity: a switch figure (see ../switch/SwitchFigure.vue), matched to
 * theopenbrain.org (v0.2.3). Each switch shows its own Lottie (`variants`,
 * in order); the legend's symbols are `legendArt`, one per label.
 */
export default {
  id: "object-motion",
  name: "Object motion sensitivity",
  animationKey: "animationObjectMotionSensitivity",
  lottieVersion: "v0.2.3",
  variants: [
    {
      file: "/publicAssets/animations/animationObjectMotionSensitivitySymmetric.json",
    },
    {
      file: "/publicAssets/animations/animationObjectMotionSensitivityAsymmetric.json",
    },
  ],
  legendArt: [
    {
      icon: "/publicAssets/icons/switchFigures/photoreceptors.svg",
    },
    {
      icon: "/publicAssets/icons/switchFigures/horizontal-cells.svg",
    },
    {
      icon: "/publicAssets/icons/switchFigures/bipolar-cells.svg",
    },
    {
      icon: "/publicAssets/icons/switchFigures/amacrine-cells.svg",
    },
    {
      icon: "/publicAssets/icons/switchFigures/ganglion-cells.svg",
    },
    {
      icon: "/publicAssets/icons/switchFigures/hyperpolarization.svg",
    },
    {
      icon: "/publicAssets/icons/switchFigures/depolarization.svg",
    },
    {
      icon: "/publicAssets/icons/switchFigures/spike-train.svg",
    },
    {
      icon: "/publicAssets/icons/switchFigures/special.svg",
    },
    {
      icon: "/publicAssets/icons/switchFigures/inhibition.svg",
    },
    {
      icon: "/publicAssets/icons/switchFigures/excitation.svg",
    },
    {
      icon: "/publicAssets/icons/switchFigures/gap-junction.svg",
    },
  ],
  fields: [
    {
      key: "title",
      label: "Title",
      type: "text",
    },
    {
      key: "switches",
      label: "Switch",
      type: "list",
      artwork: true,
      itemLabels: ["Button 1", "Button 2"],
      hint: "One per version of the drawing, in order.",
    },
    {
      key: "legend",
      label: "Legend",
      type: "list",
      artwork: true,
      itemLabels: [
        "Item 1",
        "Item 2",
        "Item 3",
        "Item 4",
        "Item 5",
        "Item 6",
        "Item 7",
        "Item 8",
        "Item 9",
        "Item 10",
        "Item 11",
        "Item 12",
      ],
      hint: "Each label sits beside its symbol.",
    },
  ],
  defaults: {
    title: "Object motion sensitivity",
    switches: ["Symmetric", "Asymmetric"],
    legend: [
      "Photoreceptors",
      "Horizontal cells",
      "Bipolar cells",
      "Amacrine cells",
      "Ganglion cells",
      "Hyperpolarization",
      "Depolarization",
      "Spike train",
      "Spike train",
      "Inhibition",
      "Excitation",
      "Gap junction",
    ],
  },
};
