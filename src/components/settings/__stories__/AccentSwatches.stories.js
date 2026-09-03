/*
 * Foundations/Settings/AccentSwatches — accent picker (retired from the app).
 *
 * No props: it reads and writes `accent` on usePreferences, which stamps
 * `data-accent` on <html>. Clicking a swatch therefore recolours the Storybook
 * canvas itself and overrides the Accent toolbar until the next story loads.
 */
import AccentSwatches from "../AccentSwatches.vue";

export default {
  title: "Foundations/Settings/AccentSwatches",
  component: AccentSwatches,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  render: () => ({
    components: { AccentSwatches },
    template: `<div style="max-width:520px;"><AccentSwatches /></div>`,
  }),
};

export const Default = {};
