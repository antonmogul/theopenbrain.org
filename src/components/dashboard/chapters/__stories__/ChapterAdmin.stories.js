import ChapterBlockEditor from "../ChapterBlockEditor.vue";
import WizardStepImport from "../WizardStepImport.vue";
import WizardStepMeta from "../WizardStepMeta.vue";
import WizardStepReview from "../WizardStepReview.vue";
import WizardStepStructure from "../WizardStepStructure.vue";

export default {
  title: "Admin/Chapter Authoring",
  parameters: { layout: "padded" },
};

const meta = {
  title: "Foundations of Neuroscience",
  description:
    "Cells, circuits, signalling, and the core methods used to study the nervous system.",
  slug: "foundations-of-neuroscience",
  order_index: 2,
};
const sections = [
  {
    id: "s1",
    title: "Cells of the nervous system",
    order_index: 0,
    paragraphs: [
      {
        id: "p1",
        order_index: 0,
        content_text:
          "Neurons communicate through electrical and chemical signals.",
        content: {
          blocks: [
            { type: "heading", level: 2, content: "Neurons and glia" },
            {
              type: "text",
              content:
                "Neurons communicate through electrical and chemical signals.",
            },
          ],
        },
      },
      {
        id: "p2",
        order_index: 1,
        content_text:
          "Glial cells support, insulate, and regulate neural circuits.",
        content: {
          blocks: [
            {
              type: "text",
              content:
                "Glial cells support, insulate, and regulate neural circuits.",
            },
          ],
        },
      },
    ],
  },
  {
    id: "s2",
    title: "Membrane potentials",
    order_index: 1,
    paragraphs: [
      {
        id: "p3",
        order_index: 0,
        content_text: "Ion gradients establish the resting membrane potential.",
        content: {
          blocks: [
            {
              type: "text",
              content:
                "Ion gradients establish the resting membrane potential.",
            },
            {
              type: "blockquote",
              content: "Voltage is always a difference between two points.",
            },
          ],
        },
      },
    ],
  },
];
const references = [
  {
    number: 1,
    authors: "Kandel ER et al.",
    year: "2021",
    title: "Principles of Neural Science",
    journal: "McGraw Hill",
  },
];

export const ChapterBlockEditorPopulated = {
  render: () => ({
    components: { ChapterBlockEditor },
    data: () => ({
      sections: sections.map(({ id, title, order_index }) => ({
        id,
        title,
        order_index,
      })),
      paragraphs: sections.flatMap((section) =>
        section.paragraphs.map((paragraph) => ({
          ...paragraph,
          section_id: section.id,
        }))
      ),
    }),
    template: `<ChapterBlockEditor :sections="sections" :paragraphs="paragraphs" save-status="All changes saved" />`,
  }),
};

export const ChapterBlockEditorEmpty = {
  render: () => ({
    components: { ChapterBlockEditor },
    template: `<ChapterBlockEditor :sections="[]" :paragraphs="[]" />`,
  }),
};
export const WizardMetadata = {
  render: () => ({
    components: { WizardStepMeta },
    data: () => ({ meta: { ...meta } }),
    template: `<WizardStepMeta v-model="meta" :existing-chapter-count="1" />`,
  }),
};
export const WizardImport = {
  render: () => ({
    components: { WizardStepImport },
    data: () => ({ sections, references }),
    template: `<WizardStepImport :sections="sections" :references="references" />`,
  }),
};
export const WizardStructure = {
  render: () => ({
    components: { WizardStepStructure },
    data: () => ({ sections: structuredClone(sections), references }),
    template: `<WizardStepStructure :sections="sections" :references="references" @update:sections="sections = $event" />`,
  }),
};
export const WizardStructureEmpty = {
  render: () => ({
    components: { WizardStepStructure },
    template: `<WizardStepStructure :sections="[]" :references="[]" />`,
  }),
};
export const WizardReview = {
  render: () => ({
    components: { WizardStepReview },
    data: () => ({ meta, sections, references }),
    template: `<WizardStepReview :meta="meta" :sections="sections" :references="references" />`,
  }),
};
export const WizardReviewError = {
  render: () => ({
    components: { WizardStepReview },
    data: () => ({ meta, sections, references }),
    template: `<WizardStepReview :meta="meta" :sections="sections" :references="references" create-error="The draft could not be created. Check your connection." />`,
  }),
};
