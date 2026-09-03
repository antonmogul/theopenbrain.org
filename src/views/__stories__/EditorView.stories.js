/*
 * Views/Admin/EditorView — the legacy TipTap chapter editor at /editor.
 *
 * Route-level view, no props. It gates on useAuth().isCreator, so the two
 * stories differ only in the mocked role: a creator sees the editor, anyone
 * else sees the access notice.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import { apiFixtures } from "@/stories/openBrainFixtures";
import EditorView from "../EditorView.vue";

export default {
  title: "Views/Admin/EditorView",
  component: EditorView,
  parameters: {
    auth: { authenticated: true, role: "creator" },
    api: apiFixtures,
    layout: "fullscreen",
  },
  render: () => ({
    components: { EditorView, ViewStoryShell },
    template: `
      <ViewStoryShell label="EditorView" path="/editor">
        <EditorView />
      </ViewStoryShell>`,
  }),
};

export const LegacyEditor = {};

/** A signed-in student: the view refuses with its role notice. */
export const NotACreator = {
  parameters: { auth: { authenticated: true, role: "student" } },
};
