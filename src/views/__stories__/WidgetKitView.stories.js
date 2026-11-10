/*
 * Views/Widgets/WidgetKitView — /widget-kit (OPENBRAIN-165): the widget skill
 * to download and the guide for building widgets in Claude. No props, no
 * data: the guide is docs/widget-kit-guide.md, bundled.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import WidgetKitView from "../WidgetKitView.vue";

export default {
  title: "Views/Widgets/WidgetKitView",
  component: WidgetKitView,
  parameters: { layout: "fullscreen" },
  render: () => ({
    components: { WidgetKitView, ViewStoryShell },
    template: `<ViewStoryShell label="WidgetKitView" path="/widget-kit"><WidgetKitView /></ViewStoryShell>`,
  }),
};

export const Default = {};

/** On a phone. */
export const Phone = { globals: { viewport: { value: "phone" } } };
