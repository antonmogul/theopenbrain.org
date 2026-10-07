/*
 * ON & OFF bipolar cells: a switch figure (see ../switch/SwitchFigure.vue),
 * matched to theopenbrain.org (v0.2.3), where it plays at half speed. Each
 * switch shows its own Lottie (`variants`, in order); the legend's symbols
 * are `legendArt`, one per label.
 */
export default {
  id: "on-off",
  name: "ON & OFF bipolar cells",
  animationKey: "animationOnOff",
  lottieVersion: "v0.2.3",
  speed: 0.5,
  variants: [
    {
      file: "/publicAssets/animations/animationOnOffDark.json",
      stillFrame: 264,
    },
    {
      file: "/publicAssets/animations/animationOnOffLight.json",
      stillFrame: 264,
    },
  ],
  legendArt: [
    {
      icon: "/publicAssets/icons/switchFigures/g-protein.svg",
    },
    {
      icon: "/publicAssets/icons/switchFigures/alpha-subunit.svg",
    },
    {
      icon: "/publicAssets/icons/switchFigures/na-plus.svg",
    },
    {
      icon: "/publicAssets/icons/switchFigures/glutamate.svg",
    },
    {
      icon: "/publicAssets/icons/switchFigures/glutamate-receptor.svg",
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
      itemLabels: ["Item 1", "Item 2", "Item 3", "Item 4", "Item 5"],
      hint: "Each label sits beside its symbol.",
    },
  ],
  defaults: {
    title: "ON & OFF bipolar cells",
    switches: ["Dark", "Light"],
    legend: [
      "G protein",
      "α subunit",
      "Na+",
      "Glutamate",
      "Glutamate receptor",
    ],
  },
};
