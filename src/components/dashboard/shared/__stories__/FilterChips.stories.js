/*
 * Foundations/Forms/FilterChips — single- or multi-select chip row.
 *
 * `modelValue` is a string in single mode and an array in `multiple` mode; the
 * two stories show both shapes because passing the wrong one fails silently.
 */
import FilterChips from "../FilterChips.vue";

const ROLES = [
  { value: "all", label: "All", count: 48 },
  { value: "professor", label: "Professors", count: 12 },
  { value: "student", label: "Students", count: 35 },
];

export default {
  title: "Foundations/Forms/FilterChips",
  component: FilterChips,
  tags: ["autodocs"],
  argTypes: {
    options: { control: "object", description: "[{ value, label, count? }]" },
    modelValue: {
      control: "object",
      description: "String (single) or array (multiple).",
    },
    showCounts: { control: "boolean" },
    multiple: { control: "boolean" },
  },
  args: {
    options: ROLES,
    modelValue: "all",
    showCounts: true,
    multiple: false,
  },
  render: (args) => ({
    components: { FilterChips },
    setup: () => ({ args }),
    template: `<FilterChips v-bind="args" @update:modelValue="args.modelValue = $event" />`,
  }),
};

export const SingleWithCounts = {};

export const WithoutCounts = { args: { showCounts: false } };

export const Multiple = {
  args: { multiple: true, modelValue: ["professor", "student"] },
};
