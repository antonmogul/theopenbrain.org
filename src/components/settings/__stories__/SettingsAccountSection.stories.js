/*
 * Foundations/Settings/SettingsAccountSection — password, sign-out and the
 * presentational account rows.
 *
 * No props. Change-password calls useAuth.updatePassword (the Storybook auth
 * double resolves it), the 2FA / connected-accounts / subscription rows are
 * visual only, and sign-out routes to "/" on the memory router.
 */
import SettingsAccountSection from "../SettingsAccountSection.vue";

export default {
  title: "Foundations/Settings/SettingsAccountSection",
  component: SettingsAccountSection,
  tags: ["autodocs"],
  parameters: { layout: "padded", auth: { authenticated: true } },
  render: () => ({
    components: { SettingsAccountSection },
    template: `<div style="max-width:760px;"><SettingsAccountSection /></div>`,
  }),
};

export const Default = {};
