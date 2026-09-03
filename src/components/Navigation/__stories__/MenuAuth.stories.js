/*
 * Foundations/Navigation/MenuAuth — the legacy slide-in auth panel.
 *
 * No props: open state and the active tab live in the auth Pinia store, and
 * the signed-in view comes from useAuth. The story exposes both as
 * story-only controls (patched into the store) and uses `parameters.auth`
 * for the signed-in case.
 */
import { watchEffect } from "vue";
import { useAuthStore } from "@/stores/auth";
import MenuAuth from "../MenuAuth.vue";

export default {
  title: "Foundations/Navigation/MenuAuth",
  component: MenuAuth,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  argTypes: {
    open: {
      control: "boolean",
      description: "Story-only: authStore.activeAuth.",
    },
    view: {
      control: "inline-radio",
      options: ["login", "register", "forgot"],
      description: "Story-only: authStore.authView (ignored when signed in).",
    },
  },
  args: { open: true, view: "login" },
  render: (args) => ({
    components: { MenuAuth },
    setup() {
      const auth = useAuthStore();
      watchEffect(() => {
        auth.$patch({
          activeAuth: args.open,
          authView: args.view,
          authError: null,
          authSuccess: null,
        });
      });
    },
    template: `<div style="min-height:720px;"><MenuAuth /></div>`,
  }),
};

export const LoginOpen = {};

export const RegisterOpen = { args: { view: "register" } };

export const ForgotPasswordOpen = { args: { view: "forgot" } };

/** Authenticated: email, role badge, Dashboard and Log Out. */
export const SignedIn = {
  parameters: {
    auth: {
      authenticated: true,
      role: "creator",
      name: "Dr Stuart Trenholm",
      email: "stuart@example.org",
    },
  },
};

export const Closed = { args: { open: false } };
