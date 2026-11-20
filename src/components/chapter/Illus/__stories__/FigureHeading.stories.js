import FigureHeading from "../FigureHeading.vue";

export default {
  title: "Chapter/Illustrations/FigureHeading",
  component: FigureHeading,
  parameters: { layout: "fullscreen" },
  args: { record: { figureNumber: 2, title: "Eye structure" } },
};

export const PaperPane = {
  decorators: [
    () => ({
      template: '<div class="figure-pane--paper"><story /></div>',
    }),
  ],
};
export const DarkPane = {
  decorators: [
    () => ({
      template: '<div class="figure-pane--dark"><story /></div>',
    }),
  ],
};
export const PhoneUpload = {
  args: {
    record: { figureNumber: 24, title: "Loewi's Vagusstoff, 1921" },
    ground: "dark",
  },
  decorators: [
    () => ({
      template: '<div style="width:390px;background:#1c1c1c"><story /></div>',
    }),
  ],
};
export const LongTitle = {
  args: {
    record: { figureNumber: 25, title: "Age related macular degeneration" },
  },
  decorators: [
    () => ({ template: '<div style="width:300px"><story /></div>' }),
  ],
};
export const Unnumbered = { args: { record: { title: "Unnumbered artwork" } } };
