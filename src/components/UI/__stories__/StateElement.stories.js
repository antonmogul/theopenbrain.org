/*
 * Legacy/StateElement — the vertical state list beside an interactive figure.
 *
 * Absolutely positioned, so the story gives it a relative frame. `iconsIndex`
 * flags which rows get an icon from /publicAssets/icons/<praefix>/.
 */
import StateElement from "../StateElement.vue";

const CELL_STATES = ["Photoreceptors", "Bipolar cells", "Ganglion cells"];

export default {
  title: "Legacy/StateElement",
  component: StateElement,
  tags: ["autodocs"],
  argTypes: {
    states: { control: "object" },
    activeState: { control: { type: "number", min: 0 } },
    praefix: {
      control: "select",
      options: ["", "retinalCircuits", "retinalCellTypes"],
    },
    iconsIndex: {
      control: "object",
      description: "{ [index]: true } — rows that show an icon.",
    },
  },
  args: {
    states: ["Darkness", "Dim light", "Bright light"],
    activeState: 1,
    praefix: "",
    iconsIndex: {},
  },
  render: (args) => ({
    components: { StateElement },
    setup: () => ({ args }),
    template: `
      <div style="position:relative; min-height:260px;">
        <StateElement v-bind="args" @on-click="args.activeState = $event.index" />
      </div>`,
  }),
};

export const List = {};

export const WithIcons = {
  args: {
    states: CELL_STATES,
    activeState: 0,
    praefix: "retinalCellTypes",
    iconsIndex: { 0: true, 1: true, 2: true },
  },
};
