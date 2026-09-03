/*
 * Views/Admin/DashboardView — the creator dashboard at /dashboard.
 *
 * Route-level view, no props: everything comes from useAuth (mocked as a
 * creator) and the REST client (apiFixtures). ViewStoryShell sets the memory
 * router to the real path before mounting.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import { apiFixtures } from "@/stories/openBrainFixtures";
import DashboardView from "../DashboardView.vue";

export default {
  title: "Views/Admin/DashboardView",
  component: DashboardView,
  parameters: {
    auth: { authenticated: true, role: "creator" },
    api: apiFixtures,
    layout: "fullscreen",
  },
  render: () => ({
    components: { DashboardView, ViewStoryShell },
    template: `
      <ViewStoryShell label="DashboardView" path="/dashboard">
        <DashboardView />
      </ViewStoryShell>`,
  }),
};

export const CreatorDashboard = {};
