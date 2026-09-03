/*
 * Legacy/OverlayInfo — the first-visit "Enter" splash.
 *
 * No props: the copy is hard-coded and "Enter" sets useGeneral.hasBeenVisited
 * plus a localStorage flag. Fullscreen because the overlay is position:fixed.
 */
import OverlayInfo from "../OverlayInfo.vue";

export default {
  title: "Legacy/OverlayInfo",
  component: OverlayInfo,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  render: () => ({
    components: { OverlayInfo },
    template: `<div style="min-height:640px;"><OverlayInfo /></div>`,
  }),
};

export const Introduction = {};
