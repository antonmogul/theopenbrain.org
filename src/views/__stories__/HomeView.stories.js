/*
 * Views/Foundations/HomeView — the marketing home at /.
 *
 * No props. Signed-in users never see it in the app (the router guard sends
 * them to /chapters), so it is mounted anonymous here.
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
