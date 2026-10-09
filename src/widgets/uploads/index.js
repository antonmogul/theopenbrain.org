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
