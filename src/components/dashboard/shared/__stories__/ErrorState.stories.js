/*
 * Foundations/ErrorState — failed-load panel with an optional retry.
 *
 * Every section renders this when its composable reports an error; `retry`
 * re-emits the section's `fetch`.
 */
import ErrorState from "../ErrorState.vue";

export default {
  title: "Foundations/ErrorState",
  component: ErrorState,
  tags: ["autodocs"],
  argTypes: {
    title: { control: "text" },
    message: { control: "text" },
    retryLabel: { control: "text" },
    showRetry: { control: "boolean" },
  },
  args: {
    title: "Couldn’t load collaborators",
    message: "Check your connection and try again.",
    retryLabel: "Retry",
    showRetry: true,
  },
  render: (args) => ({
    components: { ErrorState },
    setup: () => ({ args }),
    template: `<div style="max-width:560px;"><ErrorState v-bind="args" /></div>`,
  }),
};

export const WithRetry = {};

export const WithoutRetry = { args: { showRetry: false } };

/** Defaults only — the generic fallback copy. */
export const Defaults = {
  args: { title: "Something went wrong", message: "", retryLabel: "Try again" },
};
