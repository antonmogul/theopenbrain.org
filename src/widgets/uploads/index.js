/*
 * Uploaded widgets, kept as files (OPENBRAIN-135).
 *
 * Every widget built with the widget kit (public/widget-kit/) lives here as
 * its own `<slug>.html`, the file a creator uploads in Dashboard → Widgets.
 * The database copy (widget_uploads) is what readers get; this folder is the
 * source to review, test and re-upload. Each file has a story
 * (Widgets/Uploads) and runs the Studio's checks in
 * src/__tests__/widgetUploads.test.js.
 *
 * To add one: drop `<slug>.html` here and add an entry below.
 */
export const UPLOADED_WIDGETS = [
  {
    slug: "attn-sdt",
    title: "Signal detection theory",
    description:
      "Drag the criterion and change d′: hit and false-alarm rates, the ROC point, and Arjun's two observer comparisons.",
    author: "Arjun Krishnaswamy · design: Malpeso Studio",
    ramp: "lear",
    chapter: "attention-and-working-memory",
  },
  {
    slug: "attn-posner-cueing",
    title: "Posner cueing task",
    description:
      "Fifty trials of the Posner task: respond to a faint dot after a valid or invalid cue and see your own reaction times.",
    author: "Arjun Krishnaswamy · design: Malpeso Studio",
    ramp: "lear",
    chapter: "attention-and-working-memory",
  },
  {
    slug: "attn-contrast-response-gain",
    title: "Contrast gain or response gain",
    description:
      "A V4 neuron's contrast-response curve with attention as contrast gain or response gain, and where the effect peaks.",
    author: "Arjun Krishnaswamy · design: Malpeso Studio",
    ramp: "lear",
    chapter: "attention-and-working-memory",
  },
  {
    slug: "attn-feature-attention",
    title: "Feature-based attention",
    description:
      "Attend the fixation cross, the preferred or the null direction and watch an MT neuron's response change (after Treue & Martinez-Trujillo, 1999).",
    author: "Arjun Krishnaswamy · design: Malpeso Studio",
    ramp: "lear",
    chapter: "attention-and-working-memory",
  },
  {
    slug: "loewi-vagusstoff",
    title: "Loewi's Vagusstoff, 1921",
    description:
      "A narrated recreation of Loewi's 1921 experiment and his Figure 1: the frog heart, the vagus fluid, and the first neurotransmitter.",
    author: "Stuart Trenholm",
    ramp: "fund",
    chapter: "foundations-of-neuroscience",
  },
  {
    slug: "attn-helmholtz",
    title: "Helmholtz's black room",
    description:
      "Covert attention: keep your eyes on the + and report a letter that flashed off to one side, first without and then with a cue.",
    author: "Design: Malpeso Studio",
    ramp: "lear",
    chapter: "attention-and-working-memory",
  },
  {
    slug: "attn-biased-competition",
    title: "Attention biases competition between stimuli",
    description:
      "Two stimuli in one V4 receptive field: the response follows the attended one (after Moran & Desimone, 1985).",
    author: "After Arjun's widget; design: Malpeso Studio",
    ramp: "lear",
    chapter: "attention-and-working-memory",
  },

  // The Retina: Stuart's 1 October 2026 set (OPENBRAIN-141). The chapter's
  // clickable animations rebuilt as widgets, with narration that can be
  // turned on; nine are the half-page figures in the pane, four (marked
  // "full width") replace the chapter's full-screen animations.
  {
    slug: "retina-photoreceptors",
    title: "Photoreceptors",
    description:
      "A rod and a cone: highlight the outer segment, its disks and opsins, the connecting cilium, inner segment, mitochondria and nucleus.",
    author: "Stuart Trenholm",
    ramp: "perc",
    chapter: "the-retina",
  },
  {
    slug: "retina-refraction-errors",
    title: "Refractive errors",
    description:
      "Full width. The normal eye, myopia, hyperopia and astigmatism: where the image falls, uncorrected and corrected, narrated.",
    author: "Stuart Trenholm",
    ramp: "perc",
    chapter: "the-retina",
  },
  {
    slug: "retina-pupillary-light-reflex",
    title: "Pathway for the pupillary light reflex",
    description:
      "Full width. Retina, pretectal nucleus, Edinger-Westphal nucleus, ciliary ganglion, iris: the five steps of the reflex, narrated.",
    author: "Stuart Trenholm",
    ramp: "perc",
    chapter: "the-retina",
  },
  {
    slug: "retina-phototransduction",
    title: "Phototransduction",
    description:
      "Full width. From the rod in the dark to its hyperpolarized membrane: rhodopsin, transducin, PDE and the cGMP-gated channels in eight narrated steps.",
    author: "Stuart Trenholm",
    ramp: "perc",
    chapter: "the-retina",
  },
  {
    slug: "retina-visual-cycle",
    title: "The visual cycle",
    description:
      "Full width. Retinal from 11-cis to all-trans and back again through the pigment epithelium, carried by IRBP, in six narrated steps.",
    author: "Stuart Trenholm",
    ramp: "perc",
    chapter: "the-retina",
  },
  {
    slug: "retina-on-off-bipolar-cells",
    title: "ON and OFF bipolar cells",
    description:
      "Dark and Light: how the photoreceptor's glutamate is copied by the OFF bipolar cell and inverted by the ON bipolar cell, three narrated steps each.",
    author: "Stuart Trenholm",
    ramp: "perc",
    chapter: "the-retina",
  },
  {
    slug: "retina-center-surround",
    title: "Center-surround receptive fields",
    description:
      "Center and Center + surround: a ganglion cell's response to a spot of light in the center of its receptive field, and when the surround is lit too.",
    author: "Stuart Trenholm",
    ramp: "perc",
    chapter: "the-retina",
  },
  {
    slug: "retina-direction-selectivity",
    title: "Direction selectivity",
    description:
      "Preferred and Null: a direction-selective ganglion cell firing to motion one way and staying quiet to motion the other way.",
    author: "Stuart Trenholm",
    ramp: "perc",
    chapter: "the-retina",
  },
  {
    slug: "retina-object-motion-sensitivity",
    title: "Object motion sensitivity",
    description:
      "Symmetric and Asymmetric: an object-motion-sensitive ganglion cell fires when an object moves differently from its background, not when the whole scene moves together.",
    author: "Stuart Trenholm",
    ramp: "perc",
    chapter: "the-retina",
  },
  {
    slug: "retina-light-sensitive-ganglion-cells",
    title: "Light-sensitive ganglion cells",
    description:
      "An intrinsically photosensitive ganglion cell responding to light on its own, with its melanopsin.",
    author: "Stuart Trenholm",
    ramp: "perc",
    chapter: "the-retina",
  },
  {
    slug: "retina-rod-vs-cone-circuits",
    title: "Rod and cone circuits",
    description:
      "Day and Night: which circuit carries the signal from the photoreceptors to the ganglion cells in each.",
    author: "Stuart Trenholm",
    ramp: "perc",
    chapter: "the-retina",
  },
  {
    slug: "retina-retinal-cell-types",
    title: "Retinal cell types",
    description:
      "The retina in cross-section: highlight each cell class (photoreceptors, horizontal, bipolar, amacrine and ganglion cells) and each layer.",
    author: "Stuart Trenholm",
    ramp: "perc",
    chapter: "the-retina",
  },
  {
    slug: "retina-synaptic-architecture",
    title: "Synaptic architecture",
    description:
      "The retina's wiring: switch on excitation, inhibition and gap junctions to see where each kind of synapse sits.",
    author: "Stuart Trenholm",
    ramp: "perc",
    chapter: "the-retina",
  },
  {
    slug: "retina-retinabox",
    title: "RetINaBox",
    description:
      "Build a retinal circuit: wire photoreceptors, bipolar and ganglion cells and watch the circuit turn a light stimulus into spikes. Version 3, with guided tutorials.",
    author: "Stuart Trenholm",
    ramp: "perc",
    chapter: "the-retina",
  },
];

// Loaded on demand: the files are large (Loewi's embeds its narration).
const files = import.meta.glob("./*.html", {
  query: "?raw",
  import: "default",
});

/** The widget's HTML, or null when there is no file for the slug. */
export async function loadWidgetHtml(slug) {
  const load = files[`./${slug}.html`];
  return load ? load() : null;
}
