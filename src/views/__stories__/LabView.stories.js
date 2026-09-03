/*
 * Views/Student/LabView — a Python lab at /lab/:labId.
 *
 * No props: the lab row comes from `code_labs?` through the Storybook API
 * double, and Run goes to the deterministic Pyodide mock rather than a CDN.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import LabView from "../LabView.vue";
import { apiFixtures } from "@/stories/openBrainFixtures";

export default {
  title: "Views/Student/LabView",
  component: LabView,
  parameters: {
    layout: "fullscreen",
    auth: { authenticated: true, role: "student" },
    api: apiFixtures,
  },
  render: () => ({
    components: { LabView, ViewStoryShell },
    template: `<ViewStoryShell label="LabView" path="/lab/lab-neuron"><LabView /></ViewStoryShell>`,
  }),
};

/** The leaky integrate-and-fire lab with its starter code. */
export const Default = {};
