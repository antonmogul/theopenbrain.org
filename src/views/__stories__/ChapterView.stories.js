/*
 * Views/Student/ChapterView — the reader at /chapter/:number/:slug.
 *
 * No props: the chapter tree is fetched by slug (modules → sections →
 * paragraphs → animations) through the Storybook API double and pushed into
 * the useText store. The reader components have their own Chapter/* stories;
 * this is the assembled page.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import ChapterView from "../ChapterView.vue";
import { apiFixtures } from "@/stories/openBrainFixtures";

export default {
  title: "Views/Student/ChapterView",
  component: ChapterView,
  parameters: {
    layout: "fullscreen",
    auth: { authenticated: true, role: "student" },
    api: apiFixtures,
  },
  render: () => ({
    components: { ChapterView, ViewStoryShell },
    template: `<ViewStoryShell label="ChapterView" path="/chapter/3/foundations-of-neuroscience"><ChapterView /></ViewStoryShell>`,
  }),
};

/** Chapter 3 for a signed-in student. */
export const Default = {};
