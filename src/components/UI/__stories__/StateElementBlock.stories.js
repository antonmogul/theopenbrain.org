/*
 * Legacy/StateElementBlock — boxed variant of StateElement.
 *
 * Same contract, block layout: the active state fills violet, and when
 * `praefix` is set every row shows its icon (inverted on the active row).
 */
import StateElementBlock from "../StateElementBlock.vue";

export default {
  title: "Legacy/StateElementBlock",
  component: StateElementBlock,
  tags: ["autodocs"],
  argTypes: {
    states: { control: "object" },
    activeState: { control: { type: "number", min: 0 } },
    praefix: {
      control: "select",
      options: ["", "retinalCircuits", "retinalCellTypes"],
    },
    iconsIndex: { control: "object", description: "Accepted but unused here." },
  },
  args: {
    states: ["Rod pathway", "Cone pathway", "Melanopsin pathway"],
    activeState: 0,
    praefix: "",
    iconsIndex: {},
  },
  render: (args) => ({
    components: { StateElementBlock },
    setup: () => ({ args }),
    template: `
      <div style="max-width:300px;">
        <StateElementBlock v-bind="args" @on-click="args.activeState = $event.index" />
      </div>`,
  }),
};

export const Blocks = {};

export const WithIcons = {
  args: {
    states: ["Photoreceptors", "Bipolar cells", "Ganglion cells"],
    activeState: 1,
    praefix: "retinalCellTypes",
  },
};
