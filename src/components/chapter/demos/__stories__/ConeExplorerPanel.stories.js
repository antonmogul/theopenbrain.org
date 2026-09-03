/*
 * Chapter/Demos/ConeExplorerPanel — the interactive cone-sensitivity chart
 * (Chart.js) with per-cone sliders and colour-deficiency presets. No props;
 * all state is internal. Emits `close` for the hosting DemoModal.
 */
import ConeExplorerPanel from "../ConeExplorerPanel.vue";
import { modalFrame } from "../../__stories__/chapterFixtures";

export default {
  title: "Chapter/Demos/ConeExplorerPanel",
  component: ConeExplorerPanel,
  parameters: { layout: "fullscreen" },
  render: modalFrame(ConeExplorerPanel),
};

export const Default = {};
