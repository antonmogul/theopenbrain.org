/*
 * Chapter/Opener/OpenerToc — the dark title + numbered TOC block
 * (OPENBRAIN-32, Figma attn/toc 1495:34232). Outline fixtures use the shape
 * useChapterOutline.buildOutline() produces: intro "0", sections 1..n,
 * breakout boxes lettered.
 */
import OpenerToc from "../OpenerToc.vue";

const sub = (id, title) => ({ id, title, anchor: `#${id}` });

const attentionOutline = [
  {
    id: "intro",
    kind: "intro",
    label: "0",
    title: "Introduction",
    anchor: "#intro",
    subsections: [],
  },
  {
    id: "s1",
    kind: "section",
    label: "1",
    title: "Attention is measured behaviorally",
    anchor: "#s1",
    subsections: [
      sub("a", "The cocktail party problem"),
      sub("b", "Signal detection theory"),
      sub("c", "Attention improves discriminability and reaction time"),
    ],
  },
  {
    id: "s2",
    kind: "section",
    label: "2",
    title: "Neural correlates of visual attention",
    anchor: "#s2",
    subsections: [
      sub(
        "d",
        "Stimuli evoke stronger firing from visual neurons when attention is directed"
      ),
      sub("e", "The normalization model of attention"),
    ],
  },
  {
    id: "s3",
    kind: "section",
    label: "3",
    title: "Population effects of visual attention",
    anchor: "#s3",
    subsections: [
      sub(
        "f",
        "Attention improves signal-to-noise ratio by reducing shared variability among neurons"
      ),
      sub(
        "g",
        "Populations of neurons reveal highly dynamic fluctuations in attention state"
      ),
    ],
  },
  {
    id: "s4",
    kind: "section",
    label: "4",
    title: "Working memory",
    anchor: "#s4",
    subsections: [sub("h", "Hemispatial neglect")],
  },
];

/* Foundations: 14 sections including lettered breakout boxes — the long case. */
const foundationsOutline = [
  {
    id: "intro",
    kind: "intro",
    label: "0",
    title: "Introduction",
    anchor: "#intro",
    subsections: [],
  },
  ...[
    "Where is my mind?",
    "Do different parts of the brain do different things?",
    "What's the basic functional unit of the brain?",
    "How do neurons communicate?",
    "Closing words",
  ].map((title, i) => ({
    id: `s${i + 1}`,
    kind: "section",
    label: String(i + 1),
    title,
    anchor: `#s${i + 1}`,
    subsections: [],
  })),
  ...[
    "Separating mind from body: Descartes and dualism",
    "Failures in comparative neuroanatomy: The rete mirabile and hippocampus minor",
    "The doctor with an icepick: A brief history of psychosurgeries",
    "Electrical stimulation of the human brain: The story of Mary Rafferty",
    "Wilder Penfield and the Montreal Procedure",
    "The developing brain: The discovery of nerve growth factor",
    "Hippocrates: On the Sacred Disease ~400 BCE",
    "Humoral theory",
  ].map((title, i) => ({
    id: `b${i + 1}`,
    kind: "box",
    label: String.fromCharCode(65 + i),
    title,
    anchor: `#b${i + 1}`,
    subsections: [],
  })),
  {
    id: "refs",
    kind: "section",
    label: "6",
    title: "References",
    anchor: "#refs",
    subsections: [],
  },
];

export default {
  title: "Chapter/Opener/OpenerToc",
  component: OpenerToc,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  argTypes: {
    title: { control: "text" },
    subtitle: { control: "text" },
    ramp: {
      control: "select",
      options: ["fund", "perc", "move", "lear", "deve"],
    },
  },
  render: (args) => ({
    components: { OpenerToc },
    setup: () => ({ args }),
    template: `<div :data-chapter="args.ramp"><OpenerToc :title="args.title" :subtitle="args.subtitle" :outline="args.outline" /></div>`,
  }),
};

export const Attention = {
  args: {
    ramp: "lear",
    title: "Attention",
    subtitle: "Debates that framed our understanding of the brain",
    outline: attentionOutline,
  },
};

/** The long case: Foundations' fourteen sections with lettered breakout boxes. */
export const FoundationsLong = {
  args: {
    ramp: "fund",
    title: "Foundations of Neuroscience",
    subtitle: "Debates that framed our understanding of the brain",
    outline: foundationsOutline,
  },
};

export const NoSubtitle = {
  args: {
    ramp: "perc",
    title: "The Retina",
    subtitle: "",
    outline: attentionOutline.slice(0, 3),
  },
};
