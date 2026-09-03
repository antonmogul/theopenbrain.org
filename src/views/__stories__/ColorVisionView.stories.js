/*
 * Views/Widgets/ColorVisionView — the colour-vision / cone-explorer widget at
 * /color-vision (Retina chapter). No props; self-contained maths.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import ColorVisionView from "../ColorVisionView.vue";

export default {
  title: "Views/Widgets/ColorVisionView",
  component: ColorVisionView,
  parameters: { layout: "fullscreen" },
  render: () => ({
    components: { ColorVisionView, ViewStoryShell },
    template: `<ViewStoryShell label="ColorVisionView" path="/color-vision"><ColorVisionView /></ViewStoryShell>`,
  }),
};

export const Default = {};
