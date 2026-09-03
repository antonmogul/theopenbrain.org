/*
 * Foundations/Settings/ThemeCards — System / Light / Dark picker (retired
 * from the app, which pins light).
 *
 * No props: it binds to `theme` on usePreferences. In the app that pref is
 * forced to light; here a click really does switch `data-theme` on <html>
 * until the next story loads, which is the one place dark can be inspected.
 */
import ThemeCards from "../ThemeCards.vue";

export default {
  title: "Foundations/Settings/ThemeCards",
  component: ThemeCards,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  render: () => ({
    components: { ThemeCards },
    template: `<div style="max-width:680px;"><ThemeCards /></div>`,
  }),
};

export const Default = {};
