/*
 * Legacy/LegendElement — collapsible icon legend for the retina figures.
 *
 * Icons resolve to /publicAssets/icons/<iconPraefix>/<slug(label)>.svg, so the
 * labels here match real files under retinalCircuits / retinalCellTypes.
 * "special" is the one label the component relabels ("Spike train").
 */
import LegendElement from "../LegendElement.vue";

export default {
  title: "Legacy/LegendElement",
  component: LegendElement,
  tags: ["autodocs"],
  argTypes: {
    legend: {
      control: "object",
      description: "Labels; slugged to icon files.",
    },
    iconPraefix: {
      control: "select",
      options: ["retinalCircuits", "retinalCellTypes"],
      description: "Icon folder under /publicAssets/icons/.",
    },
  },
  args: {
    legend: ["photoreceptors", "bipolar cells", "ganglion cells", "special"],
    iconPraefix: "retinalCircuits",
  },
  render: (args) => ({
    components: { LegendElement },
    setup: () => ({ args }),
    template: `<LegendElement :legend="args.legend" :icon-praefix="args.iconPraefix" />`,
  }),
};

export const NeuralSignals = {};

export const CellTypes = {
  args: {
    legend: [
      "photoreceptors",
      "horizontal cells",
      "bipolar cells",
      "amacrine cells",
      "ganglion cells",
    ],
    iconPraefix: "retinalCellTypes",
  },
};
