/*
 * Views/Admin/ProfessorDashboardView — courses, students, assessments and
 * analytics for a professor at /professor.
 *
 * Route-level view, no props. Every professor composable takes the mocked
 * profile and reads through the REST client, so the fixtures decide what the
 * cards show.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import { apiFixtures } from "@/stories/openBrainFixtures";
import ProfessorDashboardView from "../ProfessorDashboardView.vue";

export default {
  title: "Views/Admin/ProfessorDashboardView",
  component: ProfessorDashboardView,
  parameters: {
    auth: {
      authenticated: true,
      role: "professor",
      name: "Dr. Stuart Trenholm",
      email: "stuart@example.org",
    },
    api: apiFixtures,
    layout: "fullscreen",
  },
  render: () => ({
    components: { ProfessorDashboardView, ViewStoryShell },
    template: `
      <ViewStoryShell label="ProfessorDashboardView" path="/professor">
        <ProfessorDashboardView />
      </ViewStoryShell>`,
  }),
};

export const ProfessorDashboard = {};
