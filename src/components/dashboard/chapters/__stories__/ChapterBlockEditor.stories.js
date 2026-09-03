/*
 * Dashboard/Chapters/ChapterBlockEditor — section + paragraph block editor.
 *
 * Sections and paragraphs arrive as two flat lists (the Supabase shape);
 * `saveStatus` is free text and the component colours it as an error when it
 * contains "Error".
 */
import ChapterBlockEditor from "../ChapterBlockEditor.vue";
import { blockEditorParagraphs, blockEditorSections } from "./chapterFixtures";

export default {
  title: "Dashboard/Chapters/ChapterBlockEditor",
  component: ChapterBlockEditor,
  tags: ["autodocs"],
  argTypes: {
    sections: {
      control: "object",
      description: "[{ id, title, order_index }]",
    },
    paragraphs: {
      control: "object",
      description: "[{ id, section_id, order_index, content, content_text }]",
    },
    mediaItems: { control: "object" },
    saving: { control: "boolean" },
    saveStatus: {
      control: "text",
      description:
        "Status line; containing “Error” switches to the error tone.",
    },
  },
  args: {
    sections: blockEditorSections,
    paragraphs: blockEditorParagraphs,
    mediaItems: [],
    saving: false,
    saveStatus: "All changes saved",
  },
  render: (args) => ({
    components: { ChapterBlockEditor },
    setup: () => ({ args }),
    template: `<ChapterBlockEditor v-bind="args" />`,
  }),
};

export const Populated = {};

export const Empty = {
  args: { sections: [], paragraphs: [], saveStatus: "" },
};

export const Saving = { args: { saving: true, saveStatus: "Saving…" } };

export const SaveError = {
  args: { saveStatus: "Error: the paragraph could not be saved." },
};

/**
 * A paragraph linked to a media item: the block shows the media badge with
 * the item's title, resolved from `mediaItems` by `animation_id`.
 */
export const WithAttachedMedia = {
  args: {
    paragraphs: blockEditorParagraphs.map((paragraph, index) =>
      index === 0
        ? { ...paragraph, animation_id: "m1", animation_trigger: "scroll" }
        : paragraph
    ),
    mediaItems: [
      {
        id: "m1",
        title: "Phototransduction cascade",
        animation_key: "phototransduction",
        media_type: "lottie",
      },
    ],
  },
};
