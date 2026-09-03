import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import ChapterWizardView from "../ChapterWizardView.vue";
import DashboardView from "../DashboardView.vue";
import EditorView from "../EditorView.vue";
import ProfessorDashboardView from "../ProfessorDashboardView.vue";
import SettingsView from "../SettingsView.vue";
import { apiFixtures } from "@/stories/openBrainFixtures";

const viewStory = (View, label, path) => ({
  render: () => ({
    components: { View, ViewStoryShell },
    data: () => ({ label, path }),
    template:
      '<ViewStoryShell :label="label" :path="path"><View /></ViewStoryShell>',
  }),
});

export default {
  title: "Admin/Full-page Views",
  parameters: {
    auth: { authenticated: true, role: "creator" },
    api: apiFixtures,
    layout: "fullscreen",
  },
};
export const CreatorDashboard = viewStory(
  DashboardView,
  "DashboardView",
  "/dashboard"
);
export const ChapterWizard = viewStory(
  ChapterWizardView,
  "ChapterWizardView",
  "/dashboard/chapter/new"
);
export const LegacyEditor = viewStory(EditorView, "EditorView", "/editor");
export const ProfessorDashboard = viewStory(
  ProfessorDashboardView,
  "ProfessorDashboardView",
  "/professor"
);
export const ReaderSettings = viewStory(
  SettingsView,
  "SettingsView",
  "/settings"
);
