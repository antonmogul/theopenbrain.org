/*
 * Views/Admin/ChapterEditorView — the chapter block page at
 * /dashboard/chapters/:slug (OPENBRAIN-60). Loads a module, its sections,
 * paragraphs and media from the mocked API, and renders every block as the
 * reader shows it; clicking a block opens it for editing.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import { editorApi } from "@/components/chapterEditor/__stories__/chapterEditorFixtures";
import ChapterEditorView from "../ChapterEditorView.vue";

export default {
  title: "Views/Admin/ChapterEditorView",
  component: ChapterEditorView,
  parameters: {
    auth: { authenticated: true, role: "creator" },
    api: editorApi,
    layout: "fullscreen",
  },
  render: () => ({
    components: { ChapterEditorView, ViewStoryShell },
    template: `
      <ViewStoryShell label="ChapterEditorView" path="/dashboard/chapters/attention-and-working-memory">
        <ChapterEditorView />
      </ViewStoryShell>`,
  }),
};

/** A draft chapter: edits need no confirmation. */
export const DraftChapter = {};

/** A published chapter shows the "edits go live" note. */
export const PublishedChapter = {
  parameters: {
    api: {
      ...editorApi,
      "modules?": [{ ...editorApi["modules?"][0], status: "published" }],
    },
  },
};
