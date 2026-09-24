/*
 * Views/Widgets/NormalizationModelView — the normalization model of
 * attention at /normalization-model (Attention chapter). No props; maths in
 * src/helper/normalizationModel.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import NormalizationModelView from "../NormalizationModelView.vue";

export default {
  title: "Views/Widgets/NormalizationModelView",
  component: NormalizationModelView,
  parameters: { layout: "fullscreen" },
  render: () => ({
    components: { NormalizationModelView, ViewStoryShell },
    template: `<ViewStoryShell label="NormalizationModelView" path="/normalization-model"><NormalizationModelView /></ViewStoryShell>`,
  }),
};

export const Default = {};
