import AccentSwatches from "../AccentSwatches.vue";
import FontPairPicker from "../FontPairPicker.vue";
import SettingsAccountSection from "../SettingsAccountSection.vue";
import SettingsPanels from "../SettingsPanels.vue";
import SettingsProfileSection from "../SettingsProfileSection.vue";
import ThemeCards from "../ThemeCards.vue";

export default {
  title: "Foundations/Settings",
  parameters: { layout: "padded" },
};

export const AccentSwatchesPicker = {
  render: () => ({
    components: { AccentSwatches },
    template: `<div style="max-width:520px"><AccentSwatches/></div>`,
  }),
};
export const FontPairPickerResponsive = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: () => ({
    components: { FontPairPicker },
    template: `<FontPairPicker/>`,
  }),
};
export const ThemeCardsPicker = {
  render: () => ({
    components: { ThemeCards },
    template: `<div style="max-width:680px"><ThemeCards/></div>`,
  }),
};
export const SettingsProfileAnonymous = {
  parameters: { supabase: { profiles: [] } },
  render: () => ({
    components: { SettingsProfileSection },
    template: `<div style="max-width:760px"><SettingsProfileSection/></div>`,
  }),
};
export const SettingsAccount = {
  render: () => ({
    components: { SettingsAccountSection },
    template: `<div style="max-width:760px"><SettingsAccountSection/></div>`,
  }),
};
export const SettingsPanelsMobile = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
    supabase: { profiles: [] },
  },
  render: () => ({
    components: { SettingsPanels },
    template: `<div style="max-width:760px"><SettingsPanels/></div>`,
  }),
};
