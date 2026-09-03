/*
 * Views/Widgets/SdtWidgetView — the signal-detection-theory widget at /sdt
 * (Attention chapter). No props; maths in src/helper/sdt.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import SdtWidgetView from "../SdtWidgetView.vue";

export default {
  title: "Views/Widgets/SdtWidgetView",
  component: SdtWidgetView,
  parameters: { layout: "fullscreen" },
  render: () => ({
    components: { SdtWidgetView, ViewStoryShell },
    template: `<ViewStoryShell label="SdtWidgetView" path="/sdt"><SdtWidgetView /></ViewStoryShell>`,
  }),
};

export const Default = {};
