/*
 * Views/Widgets/HillyardErpView — the Hillyard auditory attention ERP widget
 * at /hillyard-erp (Attention chapter). No props.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import HillyardErpView from "../HillyardErpView.vue";

export default {
  title: "Views/Widgets/HillyardErpView",
  component: HillyardErpView,
  parameters: { layout: "fullscreen" },
  render: () => ({
    components: { HillyardErpView, ViewStoryShell },
    template: `<ViewStoryShell label="HillyardErpView" path="/hillyard-erp"><HillyardErpView /></ViewStoryShell>`,
  }),
};

export const Default = {};
