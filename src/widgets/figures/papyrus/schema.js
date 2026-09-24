/*
 * Case 20 of the Edwin Smith papyrus (OPENBRAIN-87): History Figure 4. The
 * case's four parts (title, examination, diagnosis, treatment) as tabs, each
 * with its hieroglyphs and Breasted's translation.
 *
 * The hieroglyphs are Figma's (Open-Brain-Chapters: layout 2045:21322, the
 * parts 50:7937, 50:8454, 199:9074 and 199:8379), exported as SVG with the
 * dark ground removed and the column markers in the chapter's accent. The
 * translations are the ones printed under each part in the figure's source
 * (Breasted, 1930, as adapted by Minagar et al., 2003).
 */
export default {
  id: "papyrus",
  name: "Edwin Smith papyrus, case 20",
  animationKey: "animationFoundationsFig4",
  /** One per part, in the papyrus's order; the art files are in ./art. */
  parts: ["title", "examination", "diagnosis", "treatment"],
  fields: [
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
      hint: "Where each part sits on the papyrus, shown above its hieroglyphs.",
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
      key: "caption",
      label: "Legend",
      type: "textarea",
      hint: "The figure legend, with its source.",
    },
  ],
  defaults: {
    title: "The Edwin Smith papyrus, case 20",
    tabs: ["Title", "Examination", "Diagnosis", "Treatment"],
    lines: ["VII 22", "VII 22 – VIII 3", "VIII 3 – 4", "VIII 4 – 5"],
    translations: [
      "Instructions concerning a wound in his temple, penetrating to the bone, (and) perforating his temporal bone.",
      "If thou examinest a man having a wound in his temple, penetrating to the bone, (and) perforating his temporal bone, while his two eyes are blood-shot, he discharges blood from both his nostrils, and a little drops; if thou puttest thy fingers on the mouth of that wound (and) he shudder exceedingly; if thou ask of him concerning his malady and he speak not to thee; while copious tears fall from both his eyes, so that he thrusts his hand often to his face that he may wipe both his eyes with the back of his hand as a child does, and knows not that he does so, (conclusion follows in diagnosis).",
      "Thou shouldst say concerning him: “One having a wound in his temple, penetrating to the bone, (and) perforating his temporal bone; while he discharges blood from both his nostrils, he suffers with stiffness in his neck, (and) he is speechless. An ailment not to be treated.”",
      "Now when thou findest that man speechless, his [relief] shall be sitting; soften his head with grease, (and) pour [milk] into both his ears.",
    ],
    caption:
      "Case 20 of the Edwin Smith Papyrus. Translation after Breasted (1930). Adapted from Minagar et al., 2003.",
  },
};
