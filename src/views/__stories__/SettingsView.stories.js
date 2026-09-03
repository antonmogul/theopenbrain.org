/*
 * Views/Admin/SettingsView — reader preferences and profile at /settings.
 *
 * Route-level view, no props. Preference changes write to localStorage
 * (usePreferences) and the mocked user_preferences table; the profile comes
 * from the supabase-js double.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import { apiFixtures } from "@/stories/openBrainFixtures";
import SettingsView from "../SettingsView.vue";

export default {
  title: "Views/Admin/SettingsView",
  component: SettingsView,
  parameters: {
    auth: { authenticated: true, role: "creator" },
    api: apiFixtures,
    layout: "fullscreen",
  },
  render: () => ({
    components: { SettingsView, ViewStoryShell },
    template: `
      <ViewStoryShell label="SettingsView" path="/settings">
        <SettingsView />
      </ViewStoryShell>`,
  }),
};

export const ReaderSettings = {};
