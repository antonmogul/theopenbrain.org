/*
 * Foundations/LoadingState — spinner + message.
 *
 * `inline` is the small form for buttons and table cells; the block form
 * centres itself in whatever container it is given.
 */
import LoadingState from "../LoadingState.vue";

export default {
  title: "Foundations/LoadingState",
  component: LoadingState,
  tags: ["autodocs"],
  argTypes: {
    message: { control: "text" },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    inline: { control: "boolean" },
  },
  args: {
    message: "Loading course analytics…",
    size: "lg",
    inline: false,
  },
  render: (args) => ({
    components: { LoadingState },
    setup: () => ({ args }),
    template: `<LoadingState v-bind="args" />`,
  }),
};

export const Large = {};

export const Inline = {
  args: { inline: true, size: "sm", message: "Saving…" },
};

export const Sizes = {
  render: () => ({
    components: { LoadingState },
    template: `
      <div style="display:grid; gap:24px;">
        <LoadingState size="sm" message="size='sm'" />
        <LoadingState size="md" message="size='md'" />
        <LoadingState size="lg" message="size='lg'" />
      </div>`,
  }),
};
