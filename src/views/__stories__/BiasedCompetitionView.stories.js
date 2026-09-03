/*
 * Views/Widgets/BiasedCompetitionView — the biased-competition attention
 * widget at /biased-competition (Attention chapter). No props; self-contained
 * canvas maths.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import BiasedCompetitionView from "../BiasedCompetitionView.vue";

export default {
  title: "Views/Widgets/BiasedCompetitionView",
  component: BiasedCompetitionView,
  parameters: { layout: "fullscreen" },
  render: () => ({
    components: { BiasedCompetitionView, ViewStoryShell },
    template: `<ViewStoryShell label="BiasedCompetitionView" path="/biased-competition"><BiasedCompetitionView /></ViewStoryShell>`,
  }),
};

export const Default = {};
