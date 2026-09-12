/*
 * Chapter/Opener/ChapterOpener — the dark block every chapter starts with:
 * full-viewport cover, then title + numbered TOC (OPENBRAIN-32). Fixtures
 * only: the module row and the transformed chapter shape the reader holds.
 * The ramp (accent) comes from data-chapter on the wrapper, exactly as the
 * router sets it on <html> in the app.
 */
import ChapterOpener from "../ChapterOpener.vue";

const retinaText = {
  intro: [
    {
      id: "intro",
      title: "The Retina",
      sectionTitle: "Introduction",
      paragraphs: [],
    },
  ],
  sections: [
    {
      id: "s1",
      kind: "section",
      title: "Story of the eye",
      paragraphs: [
        {
          subSection: [
            { id: "a", title: "Intromission and extramission", paragraphs: [] },
            { id: "b", title: "The retina is identified", paragraphs: [] },
          ],
        },
      ],
    },
    {
      id: "s2",
      kind: "section",
      title: "Organization and cell types in the retina",
      paragraphs: [],
    },
    {
      id: "s3",
      kind: "section",
      title: "Photoreceptors and phototransduction",
      paragraphs: [],
    },
    {
      id: "s4",
      kind: "section",
      title: "Horizontal cells and feedback",
      paragraphs: [],
    },
  ],
};

const attentionText = {
  intro: [
    {
      id: "intro",
      title: "Attention and Working Memory",
      sectionTitle: "Introduction",
      paragraphs: [],
    },
  ],
  sections: [
    {
      id: "s1",
      kind: "section",
      title: "The story of attention",
      paragraphs: [],
    },
    {
      id: "s2",
      kind: "section",
      title: "Attention is measured behaviorally",
      paragraphs: [
        {
          subSection: [
            { id: "a", title: "The cocktail party problem", paragraphs: [] },
            { id: "b", title: "Signal detection theory", paragraphs: [] },
            {
              id: "c",
              title: "Attention improves discriminability and reaction time",
              paragraphs: [],
            },
          ],
        },
      ],
    },
    {
      id: "s3",
      kind: "section",
      title: "Neural correlates of visual attention",
      paragraphs: [
        {
          subSection: [
            {
              id: "d",
              title:
                "Stimuli evoke stronger firing from visual neurons when attention is directed",
              paragraphs: [],
            },
            {
              id: "e",
              title: "The normalization model of attention",
              paragraphs: [],
            },
          ],
        },
      ],
    },
    {
      id: "s4",
      kind: "section",
      title: "Population effects of visual attention",
      paragraphs: [],
    },
    { id: "s5", kind: "section", title: "Working memory", paragraphs: [] },
  ],
};

const foundationsText = {
  intro: [
    {
      id: "intro",
      title: "Foundations of Neuroscience",
      sectionTitle: "Introduction",
      paragraphs: [],
    },
  ],
  sections: [
    { id: "s1", kind: "section", title: "Where is my mind?", paragraphs: [] },
    {
      id: "s2",
      kind: "section",
      title: "Do different parts of the brain do different things?",
      paragraphs: [],
    },
    {
      id: "s3",
      kind: "section",
      title: "What's the basic functional unit of the brain?",
      paragraphs: [],
    },
    {
      id: "s4",
      kind: "section",
      title: "How do neurons communicate?",
      paragraphs: [],
    },
    { id: "s5", kind: "section", title: "Closing words", paragraphs: [] },
    {
      id: "b1",
      kind: "box",
      title: "Separating mind from body: Descartes and dualism",
      paragraphs: [],
    },
    {
      id: "b2",
      kind: "box",
      title: "The doctor with an icepick: A brief history of psychosurgeries",
      paragraphs: [],
    },
    {
      id: "b3",
      kind: "box",
      title: "Wilder Penfield and the Montreal Procedure",
      paragraphs: [],
    },
  ],
};

export default {
  title: "Chapter/Opener/ChapterOpener",
  component: ChapterOpener,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Hero + title/TOC block. `data-chapter` on the wrapper selects the ramp, as the router does on `<html>`. " +
          "The component is `position: absolute` in the reader; the story wrapper makes it relative so it flows.",
      },
    },
  },
  render: (args) => ({
    components: { ChapterOpener },
    setup: () => ({ args }),
    template: `
      <div :data-chapter="args.ramp" style="position:relative; min-height: 100vh;">
        <style>.chapter-opener{position:relative !important}</style>
        <ChapterOpener :module="args.module" :text="args.text" />
      </div>`,
  }),
};

export const Retina = {
  args: {
    ramp: "perc",
    module: {
      slug: "the-retina",
      title: "The Retina",
      description:
        "An interactive exploration of retinal anatomy, photoreceptors, neural circuits, and visual processing.",
    },
    text: retinaText,
  },
};

export const Attention = {
  args: {
    ramp: "lear",
    module: {
      slug: "attention-and-working-memory",
      title: "Attention",
      description: "Debates that framed our understanding of the brain",
    },
    text: attentionText,
  },
};

export const Foundations = {
  args: {
    ramp: "fund",
    module: {
      slug: "foundations-of-neuroscience",
      title: "Foundations of Neuroscience",
      description:
        "A brief survey of the ideas surrounding the brain, told through four debates that helped frame our modern understanding.",
    },
    text: foundationsText,
  },
};
