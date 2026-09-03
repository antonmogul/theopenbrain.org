/*
 * Views/Widgets/Phrenology3DView — the model-viewer skull at /phrenology-3d
 * (History chapter). No props; the GLB is served from publicAssets.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import Phrenology3DView from "../Phrenology3DView.vue";

export default {
  title: "Views/Widgets/Phrenology3DView",
  component: Phrenology3DView,
  parameters: { layout: "fullscreen" },
  render: () => ({
    components: { Phrenology3DView, ViewStoryShell },
    template: `<ViewStoryShell label="Phrenology3DView" path="/phrenology-3d"><Phrenology3DView /></ViewStoryShell>`,
  }),
};

export const Default = {};
