/*
 * Chapter/Text/ChapterAcknowledgements — the chapter's acknowledgements, at
 * the head of its back matter above the references (OPENBRAIN-200), in the
 * place and layout Further reading had. Data from helper/chapterCredits.js.
 */
import ChapterAcknowledgements from "../ChapterAcknowledgements.vue";
import { creditsForModule } from "@/helper/chapterCredits";

export default {
  title: "Chapter/Text/ChapterAcknowledgements",
  component: ChapterAcknowledgements,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: {
    paragraphs: creditsForModule({ slug: "foundations-of-neuroscience" })
      .acknowledgements,
  },
  argTypes: {
    paragraphs: {
      control: "object",
      description: "`creditsForModule(module).acknowledgements`: plain text.",
    },
  },
  render: (args) => ({
    components: { ChapterAcknowledgements },
    setup: () => ({ args }),
    template: `<div style="max-width:82.5rem;"><ChapterAcknowledgements v-bind="args" /></div>`,
  }),
};

/** History's. */
export const Default = {};

export const Mobile = {
  globals: { viewport: { value: "phone" } },
};
