/*
 * Foundations/EmptyState — the "nothing here yet" panel.
 *
 * `actionLabel` renders a call-to-action button that emits `action`; leave it
 * empty for the passive form used inside tables and cards.
 */
import EmptyState from "../EmptyState.vue";

export default {
  title: "Foundations/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
  argTypes: {
    title: { control: "text" },
    message: { control: "text" },
    actionLabel: {
      control: "text",
      description: "Empty string hides the button.",
    },
  },
  args: {
    title: "No draft chapters",
    message: "Start a chapter or import an existing manuscript.",
    actionLabel: "Create chapter",
  },
  render: (args) => ({
    components: { EmptyState },
    setup: () => ({ args }),
    template: `<div style="max-width:560px;"><EmptyState v-bind="args" /></div>`,
  }),
};

export const WithAction = {};

export const MessageOnly = { args: { actionLabel: "" } };

/** Title alone — the compact form DataTable uses for zero rows. */
export const Minimal = {
  args: { title: "No data", message: "", actionLabel: "" },
};

/** The optional `icon` slot above the title. */
export const WithIcon = {
  render: (args) => ({
    components: { EmptyState },
    setup: () => ({ args }),
    template: `
      <div style="max-width:560px;">
        <EmptyState v-bind="args">
          <template #icon>📄</template>
        </EmptyState>
      </div>`,
  }),
};
