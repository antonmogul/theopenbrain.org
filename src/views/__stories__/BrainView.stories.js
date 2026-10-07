/*
 * Views/Widgets/BrainView — the brain atlas page at /brain (OPENBRAIN-127).
 * No props; see Widgets/BrainAtlas for the component's states.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import BrainView from "../BrainView.vue";

export default {
  title: "Views/Widgets/BrainView",
  component: BrainView,
  parameters: { layout: "fullscreen" },
  render: () => ({
    components: { BrainView, ViewStoryShell },
    template: `<ViewStoryShell label="BrainView" path="/brain"><BrainView /></ViewStoryShell>`,
  }),
};

export const Default = {};
