/*
 * The visual cycle: a step-through figure (see ../step-through/StepThrough.vue),
 * matched to theopenbrain.org (v0.2.3). The steps follow the Lottie's
 * timeline (`frames`: where each step starts, then the end), so their count
 * is fixed; each legend item lights up the Lottie layer in `legendArt`.
 */
export default {
  id: "visual-cycle",
  name: "The visual cycle",
  animationKey: "animationTheVisualCycle",
  frames: [0, 72, 120, 240, 312, 432, 480],
  legendArt: [
    {
      icon: "/publicAssets/icons/fullScreenAnimations/rhodopsin.svg",
      highlight: "rhodopsinHighlight",
    },
    {
      icon: "/publicAssets/icons/fullScreenAnimations/retinal.svg",
      highlight: "retinalHighlight",
    },
    {
      icon: "/publicAssets/icons/fullScreenAnimations/rod.svg",
      highlight: "rodHighlight",
    },
    {
      icon: "/publicAssets/icons/fullScreenAnimations/rPERetinalPigmentEpithelium.svg",
      highlight: "rPERetinalPigmentEpitheliumHighlight",
    },
    {
      icon: "/publicAssets/icons/fullScreenAnimations/iRBP.svg",
      highlight: "irbpHighlight",
    },
  ],
  fields: [
    {
      key: "title",
      label: "Title",
      type: "text",
    },
    {
      key: "infoText",
      label: "Introduction",
      type: "textarea",
      hint: "Shown over the figure until the reader closes it.",
    },
    {
      key: "states",
      label: "Steps",
      type: "list",
      itemLabels: ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5", "Step 6"],
      hint: "One per stretch of the animation, in order.",
    },
    {
      key: "legend",
      label: "Legend",
      type: "list",
      itemLabels: ["Item 1", "Item 2", "Item 3", "Item 4", "Item 5"],
      hint: "Each label lights up its part of the drawing when clicked.",
    },
  ],
  defaults: {
    title: "The visual cycle",
    infoText:
      "When rhodopsin absorbs a photon, its light-catching 11-cis retinal chromophore is isomerized into all-trans retinal. This latter form cannot be used for photon absorption, and the retina undertakes a complex series of steps to convert all-trans retinal back to photo-activatable 11-cis retinal. Following binding of arrestin, the bond between all-trans retinal and the opsin is broken. The all-trans aldehyde is released and quickly converted to all-trans retinol by membrane bound retinal dehydrogenase, which is in turn bound by an all-trans retinol binding protein. From here, a transport protein called interphotoreceptor retinoid-binding protein (IRBP) takes all-trans retinol on an inter-cellular journey into the retina pigment epithelium, which intercalates with photoreceptor outer segments. The retina pigment epithelium contains a pair of enzymes&nbsp;&mdash;&nbsp;retinyl-ester isomerase which converts all-trans retinol to 11-cis retinol, and 11-cis retinol dehydrogenase which uses ATP to convert 11-cis retinol back into 11-cis retinal. The regenerated 11-cis retinal is highly insoluble and is quickly bound by an IRBP which encapsulates the molecule, which makes the return trip out of retina pigment epithelium and back into the photoreceptor outer segment, where it is released and binds anew with an opsin<sup>28,41</sup>.</sup>",
    states: [
      "Rhodopsin absorps a photon of light and retinal changes from 11-cis to all-trans",
      "All-trans retinal exits the rod",
      "All-trans retinal binds to IRBP, which transports it into the RPE",
      "In the RPE, All-trans retinal undergoes further changes until restored to 11-cis",
      "11-cis retinal binds to IRBP and is shuttled out of the RPE",
      "11-cis retinal re-enters the rod where it can get activated by light again",
    ],
    legend: [
      "Rhodopsin",
      "Retinal",
      "Rod",
      "RPE (Retinal pigment epithelium)",
      "IRBP",
    ],
  },
};
