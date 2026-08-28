import HighlightRendererComponent from "../../HighlightRenderer.vue";
import HighlightToolbarComponent from "../../HighlightToolbar.vue";
import HighlightActionBarComponent from "../HighlightActionBar.vue";
import HighlightColorPickerComponent from "../HighlightColorPicker.vue";
import HighlightDeleteConfirmComponent from "../HighlightDeleteConfirm.vue";
import HighlightNotePanelComponent from "../HighlightNotePanel.vue";
import HighlightTagPanelComponent from "../HighlightTagPanel.vue";
import { chapterFrame, highlights } from "../../__stories__/chapterFixtures";

export default {
  title: "Chapter/Highlighting/ComponentCatalog",
  parameters: { layout: "centered" },
};

const paragraph =
  "Rods support dim-light vision, while cone pathways preserve colour and fine spatial detail.";

export const HighlightRenderer = {
  args: {
    text: paragraph,
    paragraphId: "photoreceptors-1",
    highlights: [
      { ...highlights[0], start_offset: 0, end_offset: 29 },
      { ...highlights[1], start_offset: 37, end_offset: 50 },
    ],
  },
  render: chapterFrame(HighlightRendererComponent, {
    template: `<p style="max-width:680px;font:22px/1.65 var(--font-body);"><StoryComponent v-bind="args" /></p>`,
  }),
};

export const HighlightRendererPlainText = {
  args: { text: paragraph, paragraphId: "photoreceptors-1", highlights: [] },
  render: chapterFrame(HighlightRendererComponent, {
    template: `<p style="max-width:680px;font:22px/1.65 var(--font-body);"><StoryComponent v-bind="args" /></p>`,
  }),
};

export const HighlightToolbarCreate = {
  args: {
    visible: true,
    mode: "create",
    position: { x: 80, y: 100 },
    selection: { text: "Rods support dim-light vision" },
  },
  render: chapterFrame(HighlightToolbarComponent, {
    template: `<div style="min-width:520px;min-height:260px;padding:48px;font:18px/1.6 var(--font-body);">Select a colour for the passage.<StoryComponent v-bind="args" /></div>`,
  }),
};

export const HighlightToolbarEdit = {
  args: {
    visible: true,
    mode: "edit",
    position: { x: 80, y: 100 },
    activeHighlight: highlights[0],
  },
  render: chapterFrame(HighlightToolbarComponent, {
    template: `<div style="min-width:620px;min-height:300px;padding:48px;font:18px/1.6 var(--font-body);">Edit the active highlight.<StoryComponent v-bind="args" /></div>`,
  }),
};

export const ColorPickerActiveBlue = {
  args: { mode: "edit", activeColor: "blue" },
  render: chapterFrame(HighlightColorPickerComponent),
};

export const ActionBarOverflow = {
  args: { overflowOpen: true, notePanelActive: false },
  render: chapterFrame(HighlightActionBarComponent, {
    template: `<div style="min-height:160px;padding:24px;"><StoryComponent v-bind="args" /></div>`,
  }),
};

export const NotePanelLongNote = {
  args: {
    note: "Relate rod saturation to the transition from scotopic to photopic vision before the exam.",
  },
  render: chapterFrame(HighlightNotePanelComponent),
};

export const TagPanelPopulated = {
  args: { tags: ["photoreceptors", "exam", "visual-coding"] },
  render: chapterFrame(HighlightTagPanelComponent),
};

export const DeleteConfirmation = {
  render: chapterFrame(HighlightDeleteConfirmComponent),
};
