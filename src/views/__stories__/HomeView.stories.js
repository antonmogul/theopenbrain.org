/*
 * Views/Foundations/HomeView — the book's front door at / (OPENBRAIN-158):
 * the brain atlas as the cover, the chapters as parts of it.
 *
 * No props. Signed-in users never see it in the app (the router guard sends
 * them to /chapters), so it is mounted anonymous here. Under Storybook's
 * default reduced motion the cover holds the poster and fetches no
 * three.js (Default); Live turns motion on, so the brain loads and fades in
 * over the poster as it does for most readers.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import HomeView from "../HomeView.vue";

export default {
  title: "Views/Foundations/HomeView",
  component: HomeView,
  parameters: { layout: "fullscreen" },
  render: () => ({
    components: { HomeView, ViewStoryShell },
    template: `<ViewStoryShell label="HomeView" path="/"><HomeView /></ViewStoryShell>`,
  }),
};

export const Default = {};

/** App motion: the live brain fades in over the poster and the tour plays. */
export const Live = { globals: { reduceMotion: false } };
