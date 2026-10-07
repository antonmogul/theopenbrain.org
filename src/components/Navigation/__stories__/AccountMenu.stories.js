/*
 * Foundations/Navigation/AccountMenu — who is signed in, the way back to
 * their dashboard, settings and log out (OPENBRAIN-90). In the reader's top
 * bar and on the dashboards. Signed out it is a "Sign in" button.
 */
import AccountMenu from "../AccountMenu.vue";

export default {
  title: "Foundations/Navigation/AccountMenu",
  component: AccountMenu,
  tags: ["autodocs"],
  render: (args) => ({
    components: { AccountMenu },
    setup: () => ({ args }),
    template: `<div style="display:flex;justify-content:flex-end;padding:16px 16px 260px;"><AccountMenu v-bind="args" /></div>`,
  }),
};

/** Signed out: the sign-in button. */
export const SignedOut = {};

/** A signed-in student; click the initials for the menu. */
export const Student = {
  parameters: {
    auth: { authenticated: true, role: "student", name: "Maya Chen" },
  },
};

/** A creator: "My dashboard" goes to the creator dashboard. */
export const Creator = {
  parameters: {
    auth: { authenticated: true, role: "creator", name: "Stuart Trenholm" },
  },
};
