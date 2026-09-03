/*
 * Views/Widgets/PhrenologyView — the 2D SVG phrenology head at /phrenology
 * (History chapter). No props; hotspot data from src/mocks/phrenology.js.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import PhrenologyView from "../PhrenologyView.vue";

export default {
  title: "Views/Widgets/PhrenologyView",
  component: PhrenologyView,
  parameters: { layout: "fullscreen" },
  render: () => ({
    components: { PhrenologyView, ViewStoryShell },
    template: `<ViewStoryShell label="PhrenologyView" path="/phrenology"><PhrenologyView /></ViewStoryShell>`,
  }),
};

export const Default = {};
