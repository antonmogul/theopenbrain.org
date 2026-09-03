/*
 * Views/Admin/ChapterWizardView — the four-step Chapter Wizard.
 *
 * Route-level view, no props. In the app /dashboard/chapter/new redirects to
 * /dashboard?section=chapter-wizard; the story mounts the view directly on
 * the legacy path.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import { apiFixtures } from "@/stories/openBrainFixtures";
import ChapterWizardView from "../ChapterWizardView.vue";

export default {
  title: "Views/Admin/ChapterWizardView",
  component: ChapterWizardView,
  parameters: {
    auth: { authenticated: true, role: "creator" },
    api: apiFixtures,
    layout: "fullscreen",
  },
  render: () => ({
    components: { ChapterWizardView, ViewStoryShell },
    template: `
      <ViewStoryShell label="ChapterWizardView" path="/dashboard/chapter/new">
        <ChapterWizardView />
      </ViewStoryShell>`,
  }),
};

export const ChapterWizard = {};
