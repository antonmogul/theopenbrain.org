/*
 * Chapter/Highlighting/HighlightNotePanel — the note editor under the
 * toolbar. The note text is a v-model (`note`) the parent shares; Save emits.
 * The textarea autofocuses on mount, as it does when the parent opens it.
 */
import HighlightNotePanel from "../HighlightNotePanel.vue";
import { chapterFrame } from "../../__stories__/chapterFixtures";

export default {
  title: "Chapter/Highlighting/HighlightNotePanel",
  component: HighlightNotePanel,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { note: "" },
  argTypes: {
    note: { control: "text", description: "v-model:note — the draft text." },
  },
  render: chapterFrame(HighlightNotePanel),
};

/** Empty: placeholder showing. */
export const Default = {};

export const LongNote = {
  args: {
    note: "Relate rod saturation to the transition from scotopic to photopic vision before the exam.",
  },
};
