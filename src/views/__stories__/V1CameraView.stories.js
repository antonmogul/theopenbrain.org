/*
 * Views/Widgets/V1CameraView — the WebGL2 V1 receptive-field camera at
 * /v1-camera (V1 chapter). No props. Needs WebGL2 and camera access; where
 * either is missing, ViewStoryShell shows its capability error instead.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import V1CameraView from "../V1CameraView.vue";

export default {
  title: "Views/Widgets/V1CameraView",
  component: V1CameraView,
  parameters: { layout: "fullscreen" },
  render: () => ({
    components: { V1CameraView, ViewStoryShell },
    template: `<ViewStoryShell label="V1CameraView" path="/v1-camera"><V1CameraView /></ViewStoryShell>`,
  }),
};

export const Default = {};
