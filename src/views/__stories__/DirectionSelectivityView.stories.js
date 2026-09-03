/*
 * Views/Widgets/DirectionSelectivityView — the direction-selectivity widget
 * at /direction-selectivity (Retina chapter). No props; its Python model runs
 * on the Storybook Pyodide mock, not a CDN runtime.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import DirectionSelectivityView from "../DirectionSelectivityView.vue";

export default {
  title: "Views/Widgets/DirectionSelectivityView",
  component: DirectionSelectivityView,
  parameters: { layout: "fullscreen" },
  render: () => ({
    components: { DirectionSelectivityView, ViewStoryShell },
    template: `<ViewStoryShell label="DirectionSelectivityView" path="/direction-selectivity"><DirectionSelectivityView /></ViewStoryShell>`,
  }),
};

export const Default = {};
