/*
 * Views/Widgets/CorbettaPetView — the Corbetta PET attention widget at
 * /corbetta-pet (Attention chapter). No props; the photo is served from
 * public/publicAssets/images/widgets/.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import CorbettaPetView from "../CorbettaPetView.vue";

export default {
  title: "Views/Widgets/CorbettaPetView",
  component: CorbettaPetView,
  parameters: { layout: "fullscreen" },
  render: () => ({
    components: { CorbettaPetView, ViewStoryShell },
    template: `<ViewStoryShell label="CorbettaPetView" path="/corbetta-pet"><CorbettaPetView /></ViewStoryShell>`,
  }),
};

export const Default = {};
