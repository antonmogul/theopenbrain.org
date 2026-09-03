/*
 * Student/Code Labs/TestResults — the graded test list under a lab.
 *
 * Each result is `{ name, passed, expected, actual, error }` from the Python
 * runner; a failed row shows expected vs actual unless it threw, in which
 * case the error text replaces them. `passed` is the overall verdict.
 */
import TestResults from "../TestResults.vue";

const MIXED = [
  { name: "resting potential is negative", passed: true },
  {
    name: "spike threshold is crossed",
    passed: false,
    expected: "-55 mV",
    actual: "-70 mV",
  },
  {
    name: "spike count matches the reference",
    passed: false,
    error: "NameError: name 'spikes' is not defined",
  },
];

export default {
  title: "Student/Code Labs/TestResults",
  component: TestResults,
  tags: ["autodocs"],
  argTypes: {
    results: {
      control: "object",
      description: "{ name, passed, expected?, actual?, error? }[]",
    },
    passed: {
      control: "boolean",
      description: "Overall verdict; drives the header colour.",
    },
  },
  args: { results: MIXED, passed: false },
  render: (args) => ({
    components: { TestResults },
    setup: () => ({ args }),
    template: `<div style="max-width:900px;"><TestResults v-bind="args" /></div>`,
  }),
};

/** One pass, one mismatch, one exception. */
export const Default = {};

export const AllPassed = {
  args: {
    passed: true,
    results: MIXED.map((result) => ({
      name: result.name,
      passed: true,
    })),
  },
};

export const AllFailed = {
  args: {
    passed: false,
    results: MIXED.map((result) => ({
      ...result,
      passed: false,
      expected: result.expected ?? "True",
      actual: result.actual ?? "False",
    })),
  },
};

/** A lab with no test cases yet. */
export const Empty = { args: { results: [], passed: true } };
