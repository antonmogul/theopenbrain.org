/*
 * Chapter/Opener/OpenerTocArt: the contents with a picture per section
 * (OPENBRAIN-174), on the History chapter's outline and art. Point at a
 * section: its picture comes in and, once the pointer rests, its parts open.
 * The Narrow story is the phone layout: picture above the list, a tap opens
 * a section.
 */
import OpenerTocArt from "../OpenerTocArt.vue";

const part = (id, slug, title) => ({
  id,
  slug,
  kind: "box",
  title,
  anchor: `#${id}`,
});
const section = (label, slug, title, subsections = []) => ({
  id: `s-${slug}`,
  slug,
  kind: label === "0" ? "intro" : "section",
  label,
  title,
  anchor: `#s-${slug}`,
  subsections,
});

export const historyOutline = [
  section("0", "introduction", "Introduction"),
  section("1", "where-is-my-mind", "Where is my mind?", [
    part(
      "b1",
      "box-sacred-disease",
      "Hippocrates: the sacred disease and the four humours"
    ),
    part(
      "b2",
      "box-rete-mirabile",
      "Failures in comparative neuroanatomy: The rete mirabile and hippocampus minor"
    ),
  ]),
  section(
    "2",
    "do-different-parts",
    "Do different parts of the brain do different things?",
    [
      part(
        "b3",
        "box-descartes",
        "Separating mind from body: Descartes and dualism"
      ),
      part(
        "b4",
        "box-electrical-stim",
        "Electrical stimulation of the human brain: The story of Mary Rafferty and Roberts Bartholow"
      ),
      part(
        "b5",
        "box-psychosurgery",
        "The doctor with an icepick: A brief history of psychosurgeries"
      ),
      part("b6", "box-penfield", "Wilder Penfield and the Montreal Procedure"),
    ]
  ),
  section(
    "3",
    "basic-functional-unit",
    "What's the basic functional unit of the brain?",
    [
      part(
        "b7",
        "box-ngf",
        "The developing brain: The discovery of nerve growth factor and chemoaffinity"
      ),
    ]
  ),
  section("4", "how-neurons-communicate", "How do neurons communicate?"),
  section("5", "closing-words", "Closing words"),
  section("6", "references", "References"),
];

export default {
  title: "Chapter/Opener/OpenerTocArt",
  component: OpenerTocArt,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    design: {
      type: "figma",
      url: "https://www.figma.com/design/Yv7WvZSoabK2t5fNtsChvf/Open-Brain-Chapters?node-id=3258-31335",
    },
  },
  argTypes: {
    title: { control: "text" },
    subtitle: { control: "text" },
  },
  args: {
    title: "Foundations of Neuroscience",
    subtitle: "Debates that framed our understanding of the brain",
    chapterSlug: "foundations-of-neuroscience",
    outline: historyOutline,
  },
  render: (args) => ({
    components: { OpenerTocArt },
    setup: () => ({ args }),
    // The reader's class, for its <section> rules, which this block resets.
    template: `<div class="chapter-reader" data-chapter="fund"><OpenerTocArt v-bind="args" /></div>`,
  }),
};

export const History = {};

/** Below the two-column reader: the picture above the list; tap to open. */
export const Narrow = {
  globals: { viewport: { value: "phone" } },
};

/** A section with no picture of its own shows the chapter's first. */
export const SomeWithoutArt = {
  args: {
    outline: [
      ...historyOutline.slice(0, 3),
      section("3", "a-new-section", "A section added since the art was drawn"),
    ],
  },
};
