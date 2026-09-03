/*
 * Chapter/Text/BreakText — a dark pull-quote band inside the prose column.
 * The paragraph text is rendered with v-html, so inline markup survives.
 */
import BreakText from "../BreakText.vue";
import { proseFrame } from "../../__stories__/chapterFixtures";

export default {
  title: "Chapter/Text/BreakText",
  component: BreakText,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: {
    paragraph: {
      id: "key-idea",
      text: "The retina does not simply relay an image: it computes contrast, colour, and motion before signals reach the brain.",
    },
  },
  argTypes: {
    paragraph: {
      control: "object",
      description: "{ id, text }. Text is HTML.",
    },
  },
  render: proseFrame(BreakText),
};

export const Default = {};

/** A multi-sentence quote with inline emphasis. */
export const LongParagraph = {
  args: {
    paragraph: {
      id: "long-idea",
      text: "Every ganglion cell reports on a small patch of the world, but no two cell types report the same thing. <em>Midget</em> cells favour fine detail, <em>parasol</em> cells favour change over time, and the direction-selective cells care only about where things are going. The brain never sees the photograph — it sees the reports.",
    },
  },
};
