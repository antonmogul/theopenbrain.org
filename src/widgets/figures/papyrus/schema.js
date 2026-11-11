/*
 * Case 20 of the Edwin Smith papyrus (OPENBRAIN-87): History's second
 * widget. The case's four parts (title, examination, diagnosis, treatment)
 * as tabs; each is a card with its hieroglyphs on the front and Breasted's
 * translation on the back (OPENBRAIN-176).
 *
 * The hieroglyphs are the designers' (Open-Brain-Chapters, the four frames
 * under "FInal assets": 2878:65627, 2878:65736, 2878:67004 and 2878:66706;
 * the layout is 2879:48090). `scripts/figures/prepare-papyrus-art.mjs` turns
 * their SVG exports into ./art: the grounds removed, the layers kept (one
 * per sign, which the draw-in staggers), nothing redrawn. The translations
 * are the ones printed under each part in the figure's source (Breasted,
 * 1930, as adapted by Minagar et al., 2003).
 */
export default {
  id: "papyrus",
  name: "Edwin Smith papyrus, case 20",
  animationKey: "animationFoundationsFig4",
  /* Inline (below the two-column reader) the figure is as tall as the
     current part, not a screen-sized box, and runs the page's full width. */
  fitHeight: true,
  bleed: true,
  /** One per part, in the papyrus's order; the art files are in ./art. */
  parts: ["title", "examination", "diagnosis", "treatment"],
  fields: [
    {
      key: "figureLabel",
      label: "Figure label",
      type: "text",
      hint: "The label before the title, e.g. Wid 02.",
    },
    { key: "title", label: "Title", type: "text" },
    {
      key: "tabs",
      label: "Tabs",
      type: "list",
      artwork: true,
      itemLabels: ["Part 1", "Part 2", "Part 3", "Part 4"],
    },
    {
      key: "lines",
      label: "Column and line",
      type: "list",
      artwork: true,
      itemLabels: ["Title", "Examination", "Diagnosis", "Treatment"],
      hint: "Where each part sits on the papyrus, shown on the card above its hieroglyphs.",
    },
    {
      key: "translationLabel",
      label: "Translation label",
      type: "text",
      hint: "Heads the back of the card.",
    },
    {
      key: "translations",
      label: "Translations",
      type: "list",
      multiline: true,
      artwork: true,
      itemLabels: ["Title", "Examination", "Diagnosis", "Treatment"],
    },
    {
      key: "flip",
      label: "Turn the card",
      type: "list",
      artwork: true,
      itemLabels: ["On the hieroglyphs", "On the translation"],
      hint: "The button under the card, on each of its sides.",
    },
    {
      key: "caption",
      label: "Legend",
      type: "textarea",
      // The database's legend predates the translations (it doesn't credit
      // Breasted), so this widget's own wording wins until it is edited here.
      artwork: true,
      hint: "The figure legend, with its sources.",
    },
  ],
  defaults: {
    figureLabel: "Wid 02",
    title: "The Edwin Smith papyrus, case 20",
    tabs: ["Title", "Examination", "Diagnosis", "Treatment"],
    lines: ["VII 22", "VII 22 – VIII 3", "VIII 3 – 4", "VIII 4 – 5"],
    translations: [
      "Instructions concerning a wound in his temple, penetrating to the bone, (and) perforating his temporal bone.",
      "If thou examinest a man having a wound in his temple, penetrating to the bone, (and) perforating his temporal bone, while his two eyes are blood-shot, he discharges blood from both his nostrils, and a little drops; if thou puttest thy fingers on the mouth of that wound (and) he shudder exceedingly; if thou ask of him concerning his malady and he speak not to thee; while copious tears fall from both his eyes, so that he thrusts his hand often to his face that he may wipe both his eyes with the back of his hand as a child does, and knows not that he does so, (conclusion follows in diagnosis).",
      "Thou shouldst say concerning him: “One having a wound in his temple, penetrating to the bone, (and) perforating his temporal bone; while he discharges blood from both his nostrils, he suffers with stiffness in his neck, (and) he is speechless. An ailment not to be treated.”",
      "Now when thou findest that man speechless, his [relief] shall be sitting; soften his head with grease, (and) pour [milk] into both his ears.",
    ],
    translationLabel: "Translation",
    flip: ["Read the translation", "See the hieroglyphs"],
    caption:
      "Case 20 of the Edwin Smith Papyrus. Translation after Breasted (1930). Adapted from Minagar et al., 2003.",
  },
};
