/*
 * Views/Widgets/VisualPathwayLesionsView — the visual-pathway lesion
 * explorer at /visual-pathway (Retina / V1 chapter). No props.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import VisualPathwayLesionsView from "../VisualPathwayLesionsView.vue";

export default {
  title: "Views/Widgets/VisualPathwayLesionsView",
  component: VisualPathwayLesionsView,
  parameters: { layout: "fullscreen" },
  render: () => ({
    components: { VisualPathwayLesionsView, ViewStoryShell },
    template: `<ViewStoryShell label="VisualPathwayLesionsView" path="/visual-pathway"><VisualPathwayLesionsView /></ViewStoryShell>`,
  }),
};

export const Default = {};
