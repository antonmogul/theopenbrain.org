/*
 * Foundations/Navigation/NavDrawer — the reading navigator drawer.
 *
 * No props: open state is useGeneral.activeMenu, the chapter list comes from
 * useChapterCatalog (mocked through `parameters.api`), and the footer swaps
 * between Sign in and the user block on useAuth. `open` is a story-only
 * control written into the store.
 */
import { watchEffect } from "vue";
import { useGeneral } from "@/stores";
import NavDrawer from "../NavDrawer.vue";

const MODULES = [
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
];

export default {
  title: "Foundations/Navigation/NavDrawer",
  component: NavDrawer,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    api: { "modules?select=": MODULES },
  },
  argTypes: {
    open: {
      control: "boolean",
      description: "Story-only: useGeneral.activeMenu.",
    },
  },
  args: { open: true },
  render: (args) => ({
    components: { NavDrawer },
    setup() {
      const store = useGeneral();
      watchEffect(() => {
        store.activeMenu = args.open;
      });
    },
    template: `<div style="min-height:720px;"><NavDrawer /></div>`,
  }),
};

/** Anonymous reader: Sign in in the footer. */
export const Anonymous = {};

/** Signed-in student: name, initials and the chapter progress list. */
export const SignedIn = {
  parameters: {
    auth: { authenticated: true, role: "student", name: "Maya Chen" },
  },
};

export const Closed = { args: { open: false } };
