/*
 * Views/Student/ChapterOverviewView — the chapter overview at /chapter/:number.
 *
 * No props: reads the chapter number from the route and the module from
 * `modules?`, served by the Storybook API double.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import ChapterOverviewView from "../ChapterOverviewView.vue";
import { apiFixtures } from "@/stories/openBrainFixtures";

export default {
  title: "Views/Student/ChapterOverviewView",
  component: ChapterOverviewView,
  parameters: {
    layout: "fullscreen",
    auth: { authenticated: true, role: "student" },
    api: apiFixtures,
  },
  render: () => ({
    components: { ChapterOverviewView, ViewStoryShell },
    template: `<ViewStoryShell label="ChapterOverviewView" path="/chapter/3"><ChapterOverviewView /></ViewStoryShell>`,
  }),
};

/** Chapter 3, Foundations of Neuroscience. */
export const Default = {};
