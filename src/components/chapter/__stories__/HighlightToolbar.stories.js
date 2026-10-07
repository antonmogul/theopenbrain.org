/*
 * Chapter/Highlighting/HighlightToolbar — the floating pill that appears over
 * a text selection (create) or an existing highlight (edit). It teleports to
 * <body> and positions itself at `position`, so the frame here is only the
 * backdrop copy. The sub-units (colour picker, action bar, panels) have their
 * own stories under Chapter/Highlighting. In edit mode a "Share with readers"
 * switch sits by the pill: it sets the highlight's is_public, which counts
 * it (anonymously) into the chapter timeline's Trending layer (OPENBRAIN-128).
 * The switch is there only for a signed-in reader, once the database answers
 * rpc/trending_sharing_ready (useTrendingSharing): before the migration is
 * pushed, or offline, the edit toolbar has no share row. These stories are a
 * signed-in student on a database that answers true.
 * Above a passage (`position.above`) the toolbar grows upward from
 * `position.y`, so its full height never covers the passage.
 */
import HighlightToolbar from "../HighlightToolbar.vue";
import { chapterFrame, highlights } from "./chapterFixtures";

export default {
  title: "Chapter/Highlighting/HighlightToolbar",
  component: HighlightToolbar,
  parameters: {
    layout: "centered",
    auth: { role: "student" },
    api: { "rpc/trending_sharing_ready": true },
  },
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
      description:
        "{ x, y, above } in document px (useTextSelection). With above, y is the toolbar's bottom edge and it grows upward, pill nearest the passage.",
    },
    selection: {
      control: "object",
      description: "{ text } of the pending selection (create mode).",
    },
    activeHighlight: {
      control: "object",
      description:
        "The highlight being edited (edit mode); its is_public drives the share switch.",
    },
  },
  render: chapterFrame(HighlightToolbar, {
    template: `<div style="min-width:620px;min-height:300px;padding:48px;font:18px/1.6 var(--font-body);">{{ args.mode === "edit" ? "Edit the active highlight." : "Select a colour for the passage." }}<StoryComponent v-bind="args" /></div>`,
  }),
};

/** Create mode: colour dots, Note and a cancel. New highlights are private. */
export const Default = {};

/**
 * Edit mode: the active colour is ticked, the action bar is shown, and the
 * share switch is off (a private highlight).
 */
export const Edit = {
  args: { mode: "edit", activeHighlight: highlights[0], selection: null },
};

/**
 * Edit mode on a shared highlight: the switch is on. Toggling it emits
 * `update-highlight` with `{ id, updates: { is_public }, done }`; ChapterView
 * calls `done(saved)` once the save settles.
 */
export const Shared = {
  args: {
    mode: "edit",
    activeHighlight: { ...highlights[0], is_public: true },
    selection: null,
  },
};

/**
 * Above a highlight near the bottom of the window: anchored by its bottom
 * edge at `position.y`, it grows upward by its real height — the share row
 * included — with the pill nearest the passage.
 */
export const EditAbove = {
  args: {
    mode: "edit",
    activeHighlight: highlights[0],
    selection: null,
    position: { x: 80, y: 260, above: true },
  },
};

/**
 * Sharing that fails to save (offline, a server error): `done(false)` puts
 * the switch back and the row says so. Toggle the switch to see it.
 */
export const ShareFailed = {
  args: {
    mode: "edit",
    activeHighlight: highlights[0],
    selection: null,
    onUpdateHighlight: ({ done }) => done?.(false),
  },
};

/** Not visible — nothing is teleported. */
export const Hidden = { args: { visible: false } };
