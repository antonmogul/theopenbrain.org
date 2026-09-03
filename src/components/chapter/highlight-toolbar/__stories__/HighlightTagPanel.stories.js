/*
 * Chapter/Highlighting/HighlightTagPanel — tag chips plus the "Add tag…"
 * input. `tags` is a prop; the input text is a v-model (`tagInput`).
 * Removing a chip and key presses in the input only emit.
 */
import HighlightTagPanel from "../HighlightTagPanel.vue";
import { chapterFrame } from "../../__stories__/chapterFixtures";

export default {
  title: "Chapter/Highlighting/HighlightTagPanel",
  component: HighlightTagPanel,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { tags: ["photoreceptors", "exam", "visual-coding"], tagInput: "" },
  argTypes: {
    tags: { control: "object" },
    tagInput: {
      control: "text",
      description: "v-model:tagInput — text typed but not yet added.",
    },
  },
  render: chapterFrame(HighlightTagPanel),
};

export const Default = {};

/** No tags yet — just the input. */
export const Empty = { args: { tags: [] } };

/** Mid-entry: a partial tag in the input. */
export const Typing = { args: { tagInput: "reti" } };
