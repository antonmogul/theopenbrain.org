/**
 * Slide templates, shown at /deck/templates (T1–T15 in the Claude Design
 * handoff). Each is a layout with placeholder copy: to use one in a deck,
 * copy its entry into that deck's data file and replace the text and images.
 */

const PARAGRAPH =
  "Supporting paragraph. Two to four sentences that expand on the heading, written in plain language for a funder audience.";

const column = (heading) => ({ heading, text: PARAGRAPH });

export const DECK_TEMPLATES = [
  {
    id: "t1-section",
    label: "T1 · Section divider",
    notes: "Template: section divider.",
    layout: "section",
    props: {
      eyebrow: "T1 · Section divider",
      number: "07",
      title: "Section title",
      lead: "One line that frames what this section covers.",
    },
  },
  {
    id: "t2-text",
    label: "T2 · Text",
    notes: "Template: text-heavy single column with a sidebar note.",
    layout: "text",
    props: {
      eyebrow: "T2 · Text",
      title: "Headline for a text-heavy slide",
      lead: "A lead paragraph that states the main point in one or two sentences.",
      paragraphs: [
        "Body copy goes here. Use this layout for narrative slides: background, rationale, methodology or impact. Keep paragraphs short, three to five sentences each, and split into a second paragraph rather than letting one run long.",
        "A second paragraph continues the argument. If the slide needs more than three paragraphs, move the detail into the appendix or speaker notes.",
      ],
      note: {
        label: "Note",
        text: "A sidebar for a definition, key fact or source.",
      },
    },
  },
  {
    id: "t3-two-columns",
    label: "T3 · Two columns",
    notes: "Template: two-column text.",
    layout: "columns",
    props: {
      eyebrow: "T3 · Two columns",
      title: "Headline for two ideas",
      items: [column("First heading"), column("Second heading")],
    },
  },
  {
    id: "t4-three-columns",
    label: "T4 · Three columns",
    notes: "Template: three-column text.",
    layout: "columns",
    props: {
      eyebrow: "T4 · Three columns",
      title: "Headline for three ideas",
      items: [
        column("First heading"),
        column("Second heading"),
        column("Third heading"),
      ],
    },
  },
  {
    id: "t5-two-by-two",
    label: "T5 · Two by two",
    notes: "Template: two rows of two-column text, for denser comparisons.",
    layout: "columns",
    props: {
      eyebrow: "T5 · Two by two",
      title: "Headline for four related points",
      items: [
        column("First heading"),
        column("Second heading"),
        column("Third heading"),
        column("Fourth heading"),
      ],
    },
  },
  {
    id: "t6-statement",
    label: "T6 · Statement",
    notes: "Template: single statement or quote.",
    layout: "statement",
    props: {
      eyebrow: "T6 · Statement",
      quote:
        "A single statement or quotation that carries the slide on its own.",
      name: "Name Surname",
      role: "Role · Institution",
    },
  },
  {
    id: "t7-image-text",
    label: "T7 · Image and text",
    notes: "Template: full-bleed image with text.",
    layout: "imageText",
    props: {
      eyebrow: "T7 · Image and text",
      title: "Headline next to an image",
      text: "Supporting paragraph about the image: what it shows and why it matters.",
      credit: "Image credit",
      image: { src: "", alt: "", placeholder: "Full-height image" },
    },
  },
  {
    id: "t8-figures",
    label: "T8 · Key figures",
    notes: "Template: three key figures. Use only real, sourced numbers.",
    layout: "figures",
    props: {
      eyebrow: "T8 · Key figures",
      title: "Headline for the numbers",
      figures: [
        { value: "00", label: "What this number measures" },
        { value: "00", label: "What this number measures" },
        { value: "00", label: "What this number measures" },
      ],
      source: "Source",
    },
  },
  {
    id: "t9-browser",
    label: "T9 · Browser",
    notes:
      "Template: browser mockup, full width. Use a 16:9 desktop screenshot.",
    layout: "screen",
    props: {
      wide: true,
      eyebrow: "T9 · Browser",
      title: "Screen title",
      text: "One line describing what the screen shows.",
      screen: { placeholder: "Desktop screenshot, 16:9" },
    },
  },
  {
    id: "t10-browser-text",
    label: "T10 · Browser and text",
    notes: "Template: browser mockup with explanatory text.",
    layout: "screen",
    props: {
      device: "browser",
      eyebrow: "T10 · Browser and text",
      title: "Feature name",
      text: "What the feature does and who it helps, in two or three sentences.",
      details: ["First detail", "Second detail", "Third detail"],
      screen: { placeholder: "Desktop screenshot" },
    },
  },
  {
    id: "t11-phones",
    label: "T11 · Phones",
    notes: "Template: three phone screens with captions.",
    layout: "phones",
    props: {
      eyebrow: "T11 · Phones",
      title: "Headline for a mobile flow",
      screens: [
        { heading: "Step one", caption: "Short caption" },
        { heading: "Step two", caption: "Short caption" },
        { heading: "Step three", caption: "Short caption" },
      ],
    },
  },
  {
    id: "t12-phone-text",
    label: "T12 · Phone and text",
    notes: "Template: single phone screen with text.",
    layout: "screen",
    props: {
      device: "phone",
      eyebrow: "T12 · Phone and text",
      title: "Feature on mobile",
      text: "What the student sees on their phone, and why it matters for studying on the go.",
      screen: { placeholder: "Phone screen" },
    },
  },
  {
    id: "t13-tablet",
    label: "T13 · Tablet",
    notes: "Template: tablet screen with text.",
    layout: "screen",
    props: {
      device: "tablet",
      eyebrow: "T13 · Tablet",
      title: "Feature on tablet",
      text: "What the screen shows, in two or three sentences.",
      screen: { placeholder: "Tablet screenshot, 4:3 landscape" },
    },
  },
  {
    id: "t14-devices",
    label: "T14 · All devices",
    notes:
      "Template: browser, tablet and phone together, to show the book works everywhere.",
    layout: "devices",
    props: {
      eyebrow: "T14 · All devices",
      title: "Works on every screen",
    },
  },
  {
    id: "t15-quote-break",
    label: "T15 · Quote break",
    notes: "Template: break slide with a quote over a full-bleed image.",
    layout: "quote",
    props: {
      eyebrow: "T15 · Quote break",
      quote: "A short, memorable quote that gives the room a pause.",
      name: "Name Surname",
      role: "Role · Institution",
      credit: "Image credit",
      image: { src: "", alt: "", placeholder: "Full-bleed background image" },
    },
  },
];
