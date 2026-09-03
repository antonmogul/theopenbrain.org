/*
 * Chapter/Highlighting/HighlightActionBar — the edit-mode buttons inside the
 * toolbar pill (note, tag, delete, overflow). Presentational: the four
 * booleans mark which panel is open; each button only emits.
 */
import HighlightActionBar from "../HighlightActionBar.vue";
import { chapterFrame } from "../../__stories__/chapterFixtures";

export default {
  title: "Chapter/Highlighting/HighlightActionBar",
  component: HighlightActionBar,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: {
    notePanelActive: false,
    tagPanelActive: false,
    deleteConfirmActive: false,
    overflowOpen: false,
  },
  argTypes: {
    notePanelActive: { control: "boolean" },
    tagPanelActive: { control: "boolean" },
    deleteConfirmActive: { control: "boolean" },
    overflowOpen: { control: "boolean" },
  },
  render: chapterFrame(HighlightActionBar, {
    template: `<div style="min-height:160px;padding:24px;"><StoryComponent v-bind="args" /></div>`,
  }),
};

export const Default = {};

export const OverflowOpen = { args: { overflowOpen: true } };

export const NotePanelActive = { args: { notePanelActive: true } };

export const TagPanelActive = { args: { tagPanelActive: true } };

export const DeleteConfirmActive = { args: { deleteConfirmActive: true } };
