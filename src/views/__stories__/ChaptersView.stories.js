/*
 * Views/Student/ChaptersView — the chapter library at /chapters.
 *
 * No props: the published modules come from `modules?`, the signed-in
 * reader's progress and counts from `reading_progress?` and the highlight /
 * note HEAD counts, all served by the Storybook API double.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import ChaptersView from "../ChaptersView.vue";
import { apiFixtures } from "@/stories/openBrainFixtures";

export default {
  title: "Views/Student/ChaptersView",
  component: ChaptersView,
  parameters: {
    layout: "fullscreen",
    auth: { authenticated: true, role: "student" },
    api: apiFixtures,
  },
  render: () => ({
    components: { ChaptersView, ViewStoryShell },
    template: `<ViewStoryShell label="ChaptersView" path="/chapters"><ChaptersView /></ViewStoryShell>`,
  }),
};

/** A signed-in student with one published chapter part-read. */
export const Default = {};

/** Anonymous visitor: no stats row, a sign-in call to action. */
export const Anonymous = { parameters: { auth: { authenticated: false } } };

/** Nothing published yet. */
export const EmptyLibrary = {
  parameters: { api: { ...apiFixtures, "modules?": [] } },
};
