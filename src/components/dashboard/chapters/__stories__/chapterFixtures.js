/*
 * Fixtures shared by the Chapter Wizard step stories and ChapterBlockEditor.
 *
 * Not a story file — Storybook's glob only picks up *.stories.js — so this
 * adds no sidebar entry. One chapter, two sections, three paragraphs with
 * block content, one reference: enough to exercise every step's non-empty
 * path without a real import.
 */

export const chapterMeta = {
  title: "Foundations of Neuroscience",
  description:
    "Cells, circuits, signalling, and the core methods used to study the nervous system.",
  slug: "foundations-of-neuroscience",
  order_index: 2,
};

export const emptyMeta = {
  title: "",
  description: "",
  slug: "",
  order_index: 1,
};

export const chapterSections = [
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

export const chapterReferences = [
  {
    number: 1,
    authors: "Kandel ER et al.",
    year: "2021",
    title: "Principles of Neural Science",
    journal: "McGraw Hill",
  },
];

/** The block editor takes sections and paragraphs as two flat lists. */
export const blockEditorSections = chapterSections.map(
  ({ id, title, order_index }) => ({ id, title, order_index })
);

export const blockEditorParagraphs = chapterSections.flatMap((section) =>
  section.paragraphs.map((paragraph) => ({
    ...paragraph,
    section_id: section.id,
  }))
);
