/*
 * Foundations/Forms/SegmentedControl — exclusive option strip.
 *
 * Used for analytics date ranges and reader preference pickers. `modelValue`
 * must match one option's `value`; the control is a plain string v-model.
 */
import SegmentedControl from "../SegmentedControl.vue";

const RANGES = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

export default {
  title: "Foundations/Forms/SegmentedControl",
  component: SegmentedControl,
  tags: ["autodocs"],
  argTypes: {
    modelValue: {
      control: "select",
      options: RANGES.map((option) => option.value),
    },
    options: { control: "object", description: "[{ value, label }]" },
    ariaLabel: { control: "text" },
  },
  args: {
    modelValue: "30d",
    options: RANGES,
    ariaLabel: "Analytics range",
  },
  render: (args) => ({
    components: { SegmentedControl },
    setup: () => ({ args }),
    template: `<SegmentedControl v-bind="args" @update:modelValue="args.modelValue = $event" />`,
  }),
};

export const Range = {};

export const TwoOptions = {
  args: {
    modelValue: "light",
    options: [
      { value: "light", label: "Light" },
      { value: "dark", label: "Dark" },
    ],
    ariaLabel: "Theme",
  },
  argTypes: { modelValue: { control: "select", options: ["light", "dark"] } },
};
