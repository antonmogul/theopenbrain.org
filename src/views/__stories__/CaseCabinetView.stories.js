/*
 * Views/Widgets/CaseCabinetView — the History chapter's case-file cabinet
 * prototype at /case-cabinet. No props; data from src/mocks/caseFiles.js.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import CaseCabinetView from "../CaseCabinetView.vue";

export default {
  title: "Views/Widgets/CaseCabinetView",
  component: CaseCabinetView,
  parameters: { layout: "fullscreen" },
  render: () => ({
    components: { CaseCabinetView, ViewStoryShell },
    template: `<ViewStoryShell label="CaseCabinetView" path="/case-cabinet"><CaseCabinetView /></ViewStoryShell>`,
  }),
};

export const Default = {};
