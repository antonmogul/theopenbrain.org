/*
 * Foundations/Navigation/NavDrawer — the contents drawer (OPENBRAIN-78;
 * Maura's sketch of 23 Nov). The book's mark in the reader's top bar opens
 * it: "See full table of contents" and a home icon, the numbered chapters
 * (the one being read opens to its sections in the reader), and the
 * account at the foot, or Sign in. Its ✕ sits over the mark.
 *
 * "See full table of contents" shows the chapter library
 * (Chapter/ChaptersLibrary) beside the drawer from 768px; below that it
 * goes to /chapters.
 *
 * No props: open state is useGeneral.activeMenu, the chapter list comes
 * from useChapterCatalog (mocked through `parameters.api`), and the foot
 * follows useAuth. `open` is a story-only control written into the store.
 */
import { watchEffect } from "vue";
import { useGeneral } from "@/stores";
import NavDrawer from "../NavDrawer.vue";
import { apiFixtures } from "@/stories/openBrainFixtures";

export default {
  title: "Foundations/Navigation/NavDrawer",
  component: NavDrawer,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    api: apiFixtures,
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
    template: `<div style="min-height:720px; padding:6rem 2rem 2rem 24rem; background:rgb(var(--color-paper)); color:rgb(var(--color-ink));">The page behind the drawer dims; it does not blur or move.<NavDrawer /></div>`,
  }),
};

/** Signed out: Sign in at the foot. */
export const Anonymous = {};

/** Signed in: the account at the foot, with dashboard, settings and log out. */
export const SignedIn = {
  parameters: {
    auth: { authenticated: true, role: "student", name: "Maya Chen" },
  },
};

/** "See full table of contents": the library beside the drawer. */
export const WithChapters = {
  parameters: {
    auth: { authenticated: true, role: "student", name: "Maya Chen" },
  },
  play: async () => {
    document.querySelector('[data-testid="drawer-contents-link"]')?.click();
    await new Promise((r) => setTimeout(r, 600));
  },
};

/** A phone: the drawer leaves a strip of the page to tap. */
export const Mobile = {
  globals: { viewport: { value: "phone" } },
};

export const Closed = { args: { open: false } };
