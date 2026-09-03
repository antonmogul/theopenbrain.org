/*
 * Chapter/Highlighting/HighlightToolbar — the floating pill that appears over
 * a text selection (create) or an existing highlight (edit). It teleports to
 * <body> and positions itself at `position`, so the frame here is only the
 * backdrop copy. The sub-units (colour picker, action bar, panels) have their
 * own stories under Chapter/Highlighting.
 */
import HighlightToolbar from "../HighlightToolbar.vue";
import { chapterFrame, highlights } from "./chapterFixtures";

export default {
  title: "Chapter/Highlighting/HighlightToolbar",
  component: HighlightToolbar,
  parameters: { layout: "centered" },
  args: {
    visible: true,
    mode: "create",
    position: { x: 80, y: 100 },
    selection: { text: "Rods support dim-light vision" },
    activeHighlight: null,
  },
  argTypes: {
    visible: { control: "boolean" },
    mode: { control: "select", options: ["create", "edit"] },
    position: {
      control: "object",
      description: "{ x, y } in viewport px; the toolbar is fixed-positioned.",
    },
    selection: {
      control: "object",
      description: "{ text } of the pending selection (create mode).",
    },
    activeHighlight: {
      control: "object",
      description: "The highlight being edited (edit mode).",
    },
  },
  render: chapterFrame(HighlightToolbar, {
    template: `<div style="min-width:620px;min-height:300px;padding:48px;font:18px/1.6 var(--font-body);">{{ args.mode === "edit" ? "Edit the active highlight." : "Select a colour for the passage." }}<StoryComponent v-bind="args" /></div>`,
  }),
};

/** Create mode: colour dots and a cancel. */
export const Default = {};

/** Edit mode: the active colour is ticked and the action bar is shown. */
export const Edit = {
  args: { mode: "edit", activeHighlight: highlights[0], selection: null },
};

/** Not visible — nothing is teleported. */
export const Hidden = { args: { visible: false } };
