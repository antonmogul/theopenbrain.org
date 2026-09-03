import { useGeneral } from "@/stores";
import { useAuthStore } from "@/stores/auth";
import AuthForm from "../AuthForm.vue";
import MenuAuth from "../MenuAuth.vue";
import MenuTutorial from "../MenuTutorial.vue";
import NavDrawer from "../NavDrawer.vue";

export default {
  title: "Foundations/Navigation",
  parameters: { layout: "fullscreen" },
};

export const AuthFormLogin = {
  render: () => ({
    components: { AuthForm },
    template: `<div style="max-width:420px;padding:32px"><AuthForm view="login" variant="drawer"/></div>`,
  }),
};
export const AuthFormRegister = {
  render: () => ({
    components: { AuthForm },
    template: `<div style="max-width:420px;padding:32px"><AuthForm view="register" variant="drawer"/></div>`,
  }),
};
export const AuthFormForgotPassword = {
  render: () => ({
    components: { AuthForm },
    template: `<div style="max-width:420px;padding:32px"><AuthForm view="forgot" variant="drawer"/></div>`,
  }),
};

export const AuthPanelOpen = {
  render: () => ({
    components: { MenuAuth },
    setup() {
      const auth = useAuthStore();
      auth.$patch({
        activeAuth: true,
        authView: "login",
        authError: null,
        authSuccess: null,
      });
    },
    template: `<MenuAuth/>`,
  }),
};

export const TutorialHelpControl = {
  render: () => ({
    components: { MenuTutorial },
    template: `<div style="min-height:240px;padding:32px;background:#111;color:white"><MenuTutorial/></div>`,
  }),
};

export const NavDrawerCatalog = {
  parameters: {
    api: {
      "modules?select=": [
        {
          id: "foundations",
          order_index: 2,
          title: "Foundations of Neuroscience",
          slug: "foundations-of-neuroscience",
          status: "published",
        },
        {
          id: "attention",
          order_index: 3,
          title: "Attention and Working Memory",
          slug: "attention-working-memory",
          status: "draft",
        },
      ],
    },
  },
  render: () => ({
    components: { NavDrawer },
    setup() {
      const store = useGeneral();
      store.activeMenu = true;
    },
    template: `<div style="min-height:720px"><NavDrawer/></div>`,
  }),
};
