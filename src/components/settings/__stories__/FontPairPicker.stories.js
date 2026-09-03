/*
 * Foundations/Settings/FontPairPicker — font pairing picker (retired from
 * the app).
 *
 * No props: it binds to `fontPair` on usePreferences, which sets
 * `data-fontpair` on <html>, so picking a card re-fonts the Storybook canvas.
 * The Storybook decorator pins IBM Plex again on the next story load.
 */
import FontPairPicker from "../FontPairPicker.vue";

export default {
  title: "Foundations/Settings/FontPairPicker",
  component: FontPairPicker,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  render: () => ({
    components: { FontPairPicker },
    template: `<FontPairPicker />`,
  }),
};

export const Default = {};

/** The five cards wrapping on a phone. */
export const Mobile = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
};
