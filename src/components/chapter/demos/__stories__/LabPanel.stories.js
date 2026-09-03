/*
 * Chapter/Demos/LabPanel — a Python code lab inside a DemoModal: the lab's
 * instructions, editor, run/reset/solution controls and test results. The
 * lab is loaded through the (mocked) API client; Pyodide is mocked too, so
 * nothing downloads. `labId` picks the lab.
 */
import LabPanel from "../LabPanel.vue";
import { lab, modalFrame } from "../../__stories__/chapterFixtures";

export default {
  title: "Chapter/Demos/LabPanel",
  component: LabPanel,
  parameters: { layout: "fullscreen" },
  args: { labId: lab.id },
  argTypes: {
    labId: { control: "text", description: "The lab to load." },
  },
  render: modalFrame(LabPanel),
};

/** Loaded and ready to run. */
export const Default = {
  parameters: {
    auth: { role: "student" },
    api: {
      "code_labs?id=eq.cone-response-lab": [lab],
      code_submissions: [],
    },
  },
};

/**
 * The lab does not exist. useCodeLabs logs the failure; the story smoke
 * expects that console error by this story's id (scripts/storybook-all-smoke.mjs).
 */
export const LoadError = {
  args: { labId: "missing-lab" },
  parameters: { api: { "code_labs?id=eq.missing-lab": [] } },
};

/** The lab request never resolves — the loading state stays up. */
export const Loading = {
  args: { labId: "loading-lab" },
  parameters: {
    auth: { role: "student" },
    api: { "code_labs?id=eq.loading-lab": () => new Promise(() => {}) },
  },
};
