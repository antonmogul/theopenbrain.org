/*
 * Phototransduction: a step-through figure (see ../step-through/StepThrough.vue),
 * matched to theopenbrain.org (v0.2.3). The steps follow the Lottie's
 * timeline (`frames`: where each step starts, then the end), so their count
 * is fixed; each legend item lights up the Lottie layer in `legendArt`.
 */
export default {
  id: "phototransduction",
  name: "Phototransduction",
  animationKey: "animationPhototransduction",
  /** The Lottie artwork this schema was written for (cache key). */
  lottieVersion: "v0.2.3",
  frames: [0, 48, 96, 144, 192, 240, 336, 432, 528],
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
      icon: "/publicAssets/icons/fullScreenAnimations/transducin.svg",
      highlight: "transducinHighlight",
    },
    {
      icon: "/publicAssets/icons/fullScreenAnimations/alphaSubunit.svg",
      highlight: "alphaSubunitHighlight",
    },
    {
      icon: "/publicAssets/icons/fullScreenAnimations/phosphodiesterasePDE.svg",
      highlight: "phosphodiesterasePdeHighlight",
    },
    {
      icon: "/publicAssets/icons/fullScreenAnimations/cGMP.svg",
      highlight: "cgmpHighlight",
    },
    {
      icon: "/publicAssets/icons/fullScreenAnimations/gMP.svg",
      highlight: "gmpHighlight",
    },
    {
      icon: "/publicAssets/icons/fullScreenAnimations/na.svg",
      highlight: "naHighlight",
    },
    {
      icon: "/publicAssets/icons/fullScreenAnimations/ionChannel.svg",
      highlight: "ionChannelHighlight",
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
      optional: true,
      hint: "Shown over the figure until the reader closes it.",
    },
    {
      key: "states",
      label: "Steps",
      type: "list",
      itemLabels: [
        "Step 1",
        "Step 2",
        "Step 3",
        "Step 4",
        "Step 5",
        "Step 6",
        "Step 7",
        "Step 8",
      ],
      hint: "One per stretch of the animation, in order.",
    },
    {
      key: "legend",
      label: "Legend",
      type: "list",
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
      ],
      hint: "Each label lights up its part of the drawing when clicked.",
    },
  ],
  defaults: {
    title: "Phototransduction",
    infoText:
      "In the dark, the photoreceptor outer segment maintains a high concentration of the small molecule cGMP (cyclic guanosine monophosphate), which tonically activates cGMP-gated cationic channels. This results in Na<sup>+</sup> and Ca<sup>2+</sup> inflow in the outer segment, which balances an ongoing efflux of K<sup>+</sup> ions in the inner segment. This ionic flux results in a relatively depolarized resting membrane potential (Vm) of ~-30mV in darkness. Rhodopsin is a G-protein coupled receptor. It becomes enzymatically active following photon absorption and in turn activates the G-protein transducin. Transducin is composed of α, β, and γ subunits, and upon activation, releases its βγ subunit. Its α subunit in turn activates a phosphodiesterase (PDE) that then hydrolyzes cGMP molecules. The resulting decrease in intracellular [cGMP] in the outer segment leads to the closure of cGMP-gated cation channels<sup>28</sup>. Since the efflux of K<sup>+</sup> ions continues in the inner segment, closing cGMP-gated channels in the outer segment results in photoreceptor membrane hyperpolarization, leading to a decrease in glutamate release. This light-evoked hyperpolarization is called a photovoltage, and its amplitude and duration depend on the luminance, size and duration of the light flash. Finally, an activated rhodopsin molecule needs to be de-activated, otherwise the phototransduction cascade would continue endlessly. Phototransduction terminates when an activated rhodopsin is phosphorylated by a membrane-bound enzyme called rhodopsin kinase. The addition of a phosphate to rhodopsin leads to its binding by a protein called arrestin, which ejects the rhodopsin kinase, and quenches rhodopsin’s ability to activate transducin by breaking the bond between all-trans retinal and opsin<sup>28,29,42</sup>.",
    states: [
      "Rod is in the dark. Rhodopsin is inactive. The rod membrane is depolarized",
      "A flash of light, and a photon activates rhodopsin",
      "Retinal changes conformation",
      "Activated rhodopsin in turn activates transducin",
      "The alpha subunit of transducin activates phosphodiesterase (PDE)",
      "PDE converts cGMP into GMP, leading to a decrease in intracellular [cGMP]",
      "cGMP-gated ion channels close",
      "The rod membrane hyperpolarizes",
    ],
    legend: [
      "Rhodopsin",
      "Retinal",
      "Transducin",
      "α subunit",
      "Phosphodiesterase (PDE)",
      "cGMP",
      "GMP",
      "Na<sup>+</sup>",
      "Ion channel",
    ],
  },
};
