/*
 * Views/Widgets/RetINaBoxView — the RetINaBox retinal-circuit simulator at
 * /retinabox (Retina chapter). No props; the largest single view in the app.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import RetINaBoxView from "../RetINaBoxView.vue";

export default {
  title: "Views/Widgets/RetINaBoxView",
  component: RetINaBoxView,
  parameters: { layout: "fullscreen" },
  render: () => ({
    components: { RetINaBoxView, ViewStoryShell },
    template: `<ViewStoryShell label="RetINaBoxView" path="/retinabox"><RetINaBoxView /></ViewStoryShell>`,
  }),
};

export const Default = {};
