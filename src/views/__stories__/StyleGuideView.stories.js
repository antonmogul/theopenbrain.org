/*
 * Views/Foundations/StyleGuideView — the living styleguide at /styleguide.
 *
 * No props: composes the Foundations/Styleguide/* sections with a rail. It
 * is an internal desktop-only route.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import StyleGuideView from "../StyleGuideView.vue";

export default {
  title: "Views/Foundations/StyleGuideView",
  component: StyleGuideView,
  parameters: { layout: "fullscreen" },
  render: () => ({
    components: { StyleGuideView, ViewStoryShell },
    template: `<ViewStoryShell label="StyleGuideView" path="/styleguide"><StyleGuideView /></ViewStoryShell>`,
  }),
};

export const Default = {};
