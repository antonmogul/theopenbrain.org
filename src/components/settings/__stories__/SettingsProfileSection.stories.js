/*
 * Foundations/Settings/SettingsProfileSection — the editable profile card.
 *
 * No props: it reads `user` from useAuth and the `profiles` row through
 * useProfile (supabase-js), so the states are driven by `parameters.auth`
 * and `parameters.supabase`. Saving writes to the Storybook double only.
 */
import SettingsProfileSection from "../SettingsProfileSection.vue";

const PROFILE = {
  id: "storybook-student",
  full_name: "Maya Chen",
  bio: "Second-year neuroscience student; reading the retina chapter for NEUR 101.",
  student_major: "Student",
  location: "Montréal, QC",
};

export default {
  title: "Foundations/Settings/SettingsProfileSection",
  component: SettingsProfileSection,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    auth: { authenticated: true, name: "Maya Chen" },
    supabase: { profiles: [PROFILE] },
  },
  render: () => ({
    components: { SettingsProfileSection },
    template: `<div style="max-width:760px;"><SettingsProfileSection /></div>`,
  }),
};

/** Signed in with a saved profile. */
export const Default = {};

/** Nobody signed in and no profile row: empty form, "?" avatar. */
export const Anonymous = {
  parameters: { auth: { authenticated: false }, supabase: { profiles: [] } },
};

/** Signed in for the first time: no profiles row yet, initials from email. */
export const NewAccount = {
  parameters: { supabase: { profiles: [] } },
};
