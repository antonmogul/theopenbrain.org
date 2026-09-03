/*
 * Views/Widgets/ContrastResponseGainView — the contrast-response / gain
 * widget at /contrast-response (Attention chapter). No props.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import ContrastResponseGainView from "../ContrastResponseGainView.vue";

export default {
  title: "Views/Widgets/ContrastResponseGainView",
  component: ContrastResponseGainView,
  parameters: { layout: "fullscreen" },
  render: () => ({
    components: { ContrastResponseGainView, ViewStoryShell },
    template: `<ViewStoryShell label="ContrastResponseGainView" path="/contrast-response"><ContrastResponseGainView /></ViewStoryShell>`,
  }),
};

export const Default = {};
