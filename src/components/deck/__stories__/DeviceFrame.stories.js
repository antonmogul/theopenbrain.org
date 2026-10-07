/*
 * Deck/DeviceFrame — a browser window, phone or tablet around a screenshot.
 * Design-pixel sizes, shown at half size.
 */
import DeviceFrame from "../DeviceFrame.vue";

export default {
  title: "Deck/DeviceFrame",
  component: DeviceFrame,
  argTypes: {
    kind: { control: "inline-radio", options: ["browser", "phone", "tablet"] },
  },
  args: { kind: "browser", width: 1200, height: 700, src: "" },
  render: (args) => ({
    components: { DeviceFrame },
    setup: () => ({ args }),
    template: `
      <div style="padding: 24px; zoom: 0.5">
        <DeviceFrame v-bind="args" />
      </div>`,
  }),
};

/** Placeholder screen. */
export const Browser = {};

/** With a screenshot. */
export const BrowserWithScreenshot = {
  args: {
    src: "/publicAssets/images/attention-matisse-reader.jpg",
    alt: "The reader",
  },
};

export const Phone = { args: { kind: "phone", width: 385, height: 820 } };

export const Tablet = { args: { kind: "tablet", width: 1060, height: 800 } };
