/*
 * Chapter/EndOfChapterCallout — the wrap-up panel at the foot of a chapter:
 * reading stats, key takeaways, and CTAs onward.
 *
 * Renders <router-link>, so it depends on the memory router installed in
 * .storybook/preview.js. Nothing story-local is needed for that.
 *
 * The stats are props, already computed by the parent from composables, which
 * is what makes this component storyable at all — no data fetching happens
 * inside it.
 */
import EndOfChapterCallout from "../EndOfChapterCallout.vue";

const TAKEAWAYS = [
  "Photoreceptors convert light into electrical signals through phototransduction.",
  "Bipolar cells split the signal into ON and OFF pathways.",
  "Direction-selective ganglion cells encode motion, not just brightness.",
];

export default {
  title: "Chapter/EndOfChapterCallout",
  component: EndOfChapterCallout,
  tags: ["autodocs"],
  argTypes: {
    chapterNumber: { control: "text" },
    chapterTitle: { control: "text" },
    keyTakeaways: { control: "object" },
    highlightCount: { control: { type: "number", min: 0 } },
    noteCount: { control: { type: "number", min: 0 } },
    timeSpentSeconds: {
      control: { type: "number", min: 0 },
      description: "Seconds; the component formats this for display.",
    },
    progressPercent: { control: { type: "range", min: 0, max: 100, step: 1 } },
    nextChapter: {
      control: "object",
      description:
        "Shape { number, slug, title }. null hides the next-chapter CTA.",
    },
  },
  args: {
    chapterNumber: 1,
    chapterTitle: "The Retina",
    keyTakeaways: TAKEAWAYS,
    highlightCount: 14,
    noteCount: 3,
    timeSpentSeconds: 2820,
    progressPercent: 100,
    nextChapter: { number: 2, slug: "visual-cortex", title: "Visual Cortex" },
  },
  render: (args) => ({
    components: { EndOfChapterCallout },
    setup: () => ({ args }),
    template: `<div style="max-width:860px;"><EndOfChapterCallout v-bind="args" /></div>`,
  }),
};

export const Playground = {};

/** A reader who finished and annotated as they went. */
export const Completed = {};

/**
 * A reader who skimmed: no highlights, no notes, part-read. Worth its own
 * story — the empty stats are the common case and the easiest to leave ugly.
 */
export const NoEngagement = {
  args: {
    highlightCount: 0,
    noteCount: 0,
    timeSpentSeconds: 240,
    progressPercent: 38,
  },
};

/** Last chapter in the book — no onward CTA. */
export const FinalChapter = {
  args: { chapterNumber: 7, chapterTitle: "Attention", nextChapter: null },
};

/** No takeaways authored yet — the layout must not collapse. */
export const WithoutTakeaways = { args: { keyTakeaways: [] } };
