/*
 * Views/Widgets/PsychometricFunctionView — the psychometric function box
 * widget at /psychometric-function (Attention chapter). No props; maths in
 * src/helper/psychometric.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import PsychometricFunctionView from "../PsychometricFunctionView.vue";

export default {
  title: "Views/Widgets/PsychometricFunctionView",
  component: PsychometricFunctionView,
  parameters: { layout: "fullscreen" },
  render: () => ({
    components: { PsychometricFunctionView, ViewStoryShell },
    template: `<ViewStoryShell label="PsychometricFunctionView" path="/psychometric-function"><PsychometricFunctionView /></ViewStoryShell>`,
  }),
};

export const Default = {};
