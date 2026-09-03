/*
 * Chapter/Highlighting/HighlightRenderer — renders a paragraph's text with
 * <mark> wrappers for each highlight's [start_offset, end_offset) range.
 * Purely prop-driven; clicking a mark emits `highlight-click`.
 */
import HighlightRenderer from "../HighlightRenderer.vue";
import { chapterFrame, highlights } from "./chapterFixtures";

const PARAGRAPH =
  "Rods support dim-light vision, while cone pathways preserve colour and fine spatial detail.";

export default {
  title: "Chapter/Highlighting/HighlightRenderer",
  component: HighlightRenderer,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: {
    text: PARAGRAPH,
    paragraphId: "photoreceptors-1",
    highlights: [
      { ...highlights[0], start_offset: 0, end_offset: 29 },
      { ...highlights[1], start_offset: 37, end_offset: 50 },
    ],
  },
  argTypes: {
    text: { control: "text" },
    paragraphId: { control: "text" },
    highlights: {
      control: "object",
      description:
        "[{ id, start_offset, end_offset, color }] — offsets into `text`; colour yellow | green | blue | pink | purple.",
    },
  },
  render: chapterFrame(HighlightRenderer, {
    template: `<p style="max-width:680px;font:22px/1.65 var(--font-body);"><StoryComponent v-bind="args" /></p>`,
  }),
};

export const Default = {};

/** No highlights — must render the plain text unchanged. */
export const PlainText = { args: { highlights: [] } };

/** One mark per colour, for checking the swatches against the prose. */
export const EveryColour = {
  args: {
    highlights: [
      { id: "h-yellow", color: "yellow", start_offset: 0, end_offset: 4 },
      { id: "h-green", color: "green", start_offset: 13, end_offset: 22 },
      { id: "h-blue", color: "blue", start_offset: 37, end_offset: 50 },
      { id: "h-pink", color: "pink", start_offset: 60, end_offset: 66 },
      { id: "h-purple", color: "purple", start_offset: 76, end_offset: 83 },
    ],
  },
};
