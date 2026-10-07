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
    api: Object.fromEntries(
      Object.entries(apiFixtures).map(([key, value]) => [
        key,
        (endpoint) => {
          const params = new URLSearchParams(endpoint.split("?")[1]);
          const offset = Number(params.get("offset") || 0);
          const limit = Number(params.get("limit") || value.length);
          return Array.isArray(value)
            ? value.slice(offset, offset + limit)
            : value;
        },
      ])
    ),
    layout: "fullscreen",
  },
  args: { path: "/dashboard" },
  render: (args) => ({
    components: { DashboardView, ViewStoryShell },
    setup: () => ({ args }),
    template: `
      <ViewStoryShell label="DashboardView" :path="args.path">
        <DashboardView />
      </ViewStoryShell>`,
  }),
};

export const CreatorDashboard = {};

export const Feedback = { args: { path: "/dashboard?section=feedback" } };
export const RecordedAnalytics = {
  args: { path: "/dashboard?section=analytics" },
};
