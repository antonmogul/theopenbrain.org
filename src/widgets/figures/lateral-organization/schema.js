/*
 * Lateral organization: the split figure (see ../split/SplitFigure.vue),
 * matched to theopenbrain.org (v0.2.3). Scrolling through it runs two
 * Lotties together: the retina's layers on the left, each layer's mosaic on
 * the right, captioned while its `layers` frames are on screen. The host
 * gives it `scrollLength` of page to scrub through.
 */
export default {
  id: "lateral-organization",
  name: "Lateral organization",
  animationKey: "animationLatteralOrganization",
  lottieVersion: "v0.2.3",
  scrollLength: "700vh",
  left: "/publicAssets/animations/animationLatteralOrganizationLeft.json",
  right: "/publicAssets/animations/animationLatteralOrganizationRight.json",
  /** Both files' length; the scroll and the captions run on it alone. */
  frames: 192,
  startFrame: 20,
  layers: [
    {
      from: 60,
      to: 100,
    },
    {
      from: 110,
      to: 138,
    },
    {
      from: 156,
      to: 178,
    },
  ],
  fields: [
    {
      key: "title",
      label: "Title",
      type: "text",
    },
    {
      key: "infos",
      label: "Captions",
      type: "list",
      artwork: true,
      itemLabels: ["Layer 1", "Layer 2", "Layer 3"],
      hint: "What each image shows, as it comes into view.",
    },
    {
      key: "sources",
      label: "Sources",
      type: "list",
      artwork: true,
      itemLabels: ["Layer 1", "Layer 2", "Layer 3"],
      hint: "Where each image comes from.",
    },
  ],
  defaults: {
    title: "Lateral organization",
    infos: [
      "Cone mosaic in the fovea.",
      "Retinal half mosaic: Red, cone terminals; Green, horizontal cell mosaic; Blue, bipolar cell mosaic.",
      "ON alpha ganglion cell mosaic from cat retina.",
    ],
    sources: [
      "Source Wikipedia.",
      "Source Webvision (Luna, Fisher and Lewis).",
      "Source Wässle et al., 1981, Nature.",
    ],
  },
};
