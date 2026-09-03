/*
 * Views/Widgets/WidgetLibraryView — the widget gallery at /widgets, which
 * renders each Vue port beside the author's original HTML from
 * src/widgets/source/. No props; entries come from src/widgets/catalog.js.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import WidgetLibraryView from "../WidgetLibraryView.vue";

export default {
  title: "Views/Widgets/WidgetLibraryView",
  component: WidgetLibraryView,
  parameters: { layout: "fullscreen" },
  render: () => ({
    components: { WidgetLibraryView, ViewStoryShell },
    template: `<ViewStoryShell label="WidgetLibraryView" path="/widgets"><WidgetLibraryView /></ViewStoryShell>`,
  }),
};

export const Default = {};
