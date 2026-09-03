/*
 * Foundations/Navigation/AuthForm — login / register / forgot-password form.
 *
 * Shared by NavDrawer (`variant="drawer"`, token-styled) and MenuAuth
 * (`variant="panel"`, white-on-dark Tailwind). `set-view` is how the form asks
 * its parent to switch tabs, so the story feeds it back into args.
 * Auth calls go through the Storybook auth mock; nothing leaves the page.
 */
import AuthForm from "../AuthForm.vue";

export default {
  title: "Foundations/Navigation/AuthForm",
  component: AuthForm,
  tags: ["autodocs"],
  argTypes: {
    view: { control: "inline-radio", options: ["login", "register", "forgot"] },
    variant: { control: "inline-radio", options: ["drawer", "panel"] },
  },
  args: { view: "login", variant: "drawer" },
  render: (args) => ({
    components: { AuthForm },
    setup: () => ({ args }),
    template: `
      <div
        style="max-width:420px; padding:32px;"
        :style="args.variant === 'panel' ? { background: '#111', color: 'white' } : {}"
      >
        <AuthForm v-bind="args" @set-view="args.view = $event" />
      </div>`,
  }),
};

export const Login = {};

export const Register = { args: { view: "register" } };

export const ForgotPassword = { args: { view: "forgot" } };

/** The MenuAuth skin, on the dark panel it is designed for. */
export const PanelVariant = { args: { variant: "panel" } };
