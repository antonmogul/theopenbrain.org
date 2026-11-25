/*
 * Chapter/ChaptersLibrary — the chapter library as a component: the
 * whole of /chapters (Views/Student/ChaptersView), and `embedded` the copy
 * the reader's contents drawer shows beside itself for "See full table of
 * contents" (Foundations/Navigation/NavDrawer, OPENBRAIN-78).
 *
 * Embedded it is not the page's <main>, drops the account button and the
 * team link (the drawer has both), and folds by its own width, not the
 * window's.
 */
import ChaptersLibrary from "../ChaptersLibrary.vue";
import { apiFixtures } from "@/stories/openBrainFixtures";

export default {
  title: "Chapter/ChaptersLibrary",
  component: ChaptersLibrary,
  parameters: {
    layout: "fullscreen",
    auth: { authenticated: true, role: "student" },
    api: apiFixtures,
  },
  args: { embedded: false },
};

/** The page, signed in. */
export const Default = {};

/** Beside the drawer: 704px is what a 1024px window leaves. */
export const Embedded = {
  args: { embedded: true },
  render: (args) => ({
    components: { ChaptersLibrary },
    setup: () => ({ args }),
    template: `<div style="width:704px;height:100vh;overflow:auto"><ChaptersLibrary v-bind="args" /></div>`,
  }),
};

/** Embedded, signed out: no stats row. */
export const EmbeddedAnonymous = {
  ...Embedded,
  parameters: { auth: { authenticated: false } },
};
