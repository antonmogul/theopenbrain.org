import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import HomeView from "../HomeView.vue";
import StyleGuideView from "../StyleGuideView.vue";

const viewStory = (View, label, path) => ({
  render: () => ({
    components: { View, ViewStoryShell },
    data: () => ({ label, path }),
    template:
      '<ViewStoryShell :label="label" :path="path"><View /></ViewStoryShell>',
  }),
});

export default {
  title: "Foundations/Full-page Views",
  parameters: { layout: "fullscreen" },
};
export const Home = viewStory(HomeView, "HomeView", "/");
export const LivingStyleguide = viewStory(
  StyleGuideView,
  "StyleGuideView",
  "/styleguide"
);
