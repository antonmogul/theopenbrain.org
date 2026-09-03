/*
 * Views/Widgets/TmtFeatureAttentionView — the feature-based attention widget
 * at /feature-attention (Attention chapter). No props.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import TmtFeatureAttentionView from "../TmtFeatureAttentionView.vue";

export default {
  title: "Views/Widgets/TmtFeatureAttentionView",
  component: TmtFeatureAttentionView,
  parameters: { layout: "fullscreen" },
  render: () => ({
    components: { TmtFeatureAttentionView, ViewStoryShell },
    template: `<ViewStoryShell label="TmtFeatureAttentionView" path="/feature-attention"><TmtFeatureAttentionView /></ViewStoryShell>`,
  }),
};

export const Default = {};
