/*
 * Views/Widgets/PosnerCueingView — the Posner cueing task at /posner-cueing
 * (Attention chapter). No props.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import PosnerCueingView from "../PosnerCueingView.vue";

export default {
  title: "Views/Widgets/PosnerCueingView",
  component: PosnerCueingView,
  parameters: { layout: "fullscreen" },
  render: () => ({
    components: { PosnerCueingView, ViewStoryShell },
    template: `<ViewStoryShell label="PosnerCueingView" path="/posner-cueing"><PosnerCueingView /></ViewStoryShell>`,
  }),
};

export const Default = {};
