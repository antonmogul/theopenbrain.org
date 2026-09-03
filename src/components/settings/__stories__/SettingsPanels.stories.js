/*
 * Foundations/Settings/SettingsPanels — the stacked settings sections, as
 * rendered by SettingsView and inline in the student dashboard.
 *
 * No props. Profile and Account are functional (see their own stories); the
 * email and privacy toggles are presentational state local to the panel.
 */
import SettingsPanels from "../SettingsPanels.vue";

const PROFILE = {
  id: "storybook-student",
  full_name: "Maya Chen",
  bio: "Second-year neuroscience student; reading the retina chapter for NEUR 101.",
  student_major: "Student",
  location: "Montréal, QC",
};

export default {
  title: "Foundations/Settings/SettingsPanels",
  component: SettingsPanels,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    auth: { authenticated: true, name: "Maya Chen" },
    supabase: { profiles: [PROFILE] },
  },
  render: () => ({
    components: { SettingsPanels },
    template: `<div style="max-width:760px;"><SettingsPanels /></div>`,
  }),
};

/** Signed in with a saved profile. */
export const Default = {};

/** The full stack at phone width. */
export const Mobile = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
};

/** Nobody signed in and no profile row. */
export const Anonymous = {
  parameters: { auth: { authenticated: false }, supabase: { profiles: [] } },
};
