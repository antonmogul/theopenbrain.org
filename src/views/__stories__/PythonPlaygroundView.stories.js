/*
 * Views/Widgets/PythonPlaygroundView — the /playground Pyodide sandbox.
 *
 * No props. Storybook aliases @/services/pythonRunner to a deterministic mock,
 * so Run never downloads a runtime: it resolves at once with a fixed output
 * line. DeterministicRun exercises that path in its play function, and
 * scripts/storybook-all-smoke.mjs asserts the same line for that story id.
 */
import { expect, userEvent, within } from "storybook/test";
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import PythonPlaygroundView from "../PythonPlaygroundView.vue";

export default {
  title: "Views/Widgets/PythonPlaygroundView",
  component: PythonPlaygroundView,
  parameters: { layout: "fullscreen" },
  render: () => ({
    components: { PythonPlaygroundView, ViewStoryShell },
    template: `<ViewStoryShell label="PythonPlaygroundView" path="/playground"><PythonPlaygroundView /></ViewStoryShell>`,
  }),
};

/** The first demo loaded, nothing run yet. */
export const Default = {};

/** Press Run: the mocked runner prints its fixed line into the output pane. */
export const DeterministicRun = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Run" }));
    await expect(
      await canvas.findByText("Storybook Python preview completed.")
    ).toBeVisible();
  },
};
