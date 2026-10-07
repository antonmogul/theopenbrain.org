/*
 * Dashboard/ChapterEditor/ParagraphEditor — a paragraph open for editing on
 * the chapter block page (OPENBRAIN-60). Citations and figure references are
 * chips (nodes/InlineChip.vue); images, widgets and other structured blocks
 * are cards (nodes/BlockCard.vue). Both node views only render inside this
 * editor, so these stories are what cover them.
 */
import ParagraphEditor from "../ParagraphEditor.vue";
import { citedParagraphBlocks } from "./chapterEditorFixtures";

export default {
  title: "Dashboard/ChapterEditor/ParagraphEditor",
  component: ParagraphEditor,
  render: (args) => ({
    components: { ParagraphEditor },
    setup: () => ({ args }),
    template: `<div style="max-width: 46rem; padding: 24px"><ParagraphEditor v-bind="args" /></div>`,
  }),
};

/** Text with citation and figure chips; bold, italic and hover spans kept. */
export const CitedParagraph = { args: { blocks: citedParagraphBlocks } };

/** Structured blocks show as cards that can be selected and dragged. */
export const WithCards = {
  args: {
    blocks: [
      {
        type: "text",
        content: "A paragraph followed by its image and widget.",
      },
      { type: "image", src: "GABAergic", caption: "Starburst amacrine cell" },
      {
        type: "widget",
        widgetId: "sdt",
        kind: "breakout",
        title: "Signal Detection Theory",
      },
      { type: "footnote", number: 4, content: "Posner (1980)." },
    ],
  },
};

export const SaveFailed = {
  args: {
    blocks: citedParagraphBlocks,
    error: "The database didn't allow this change.",
  },
};
