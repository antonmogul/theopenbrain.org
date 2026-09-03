/*
 * Foundations/ConfirmDialog — BaseModal preset for yes/no decisions.
 *
 * `variant` picks the confirm button's tone: `danger` for deletes, `warn` for
 * reversible-but-disruptive acts, `info` for plain confirmations.
 */
import ConfirmDialog from "../ConfirmDialog.vue";
import Button from "../Button.vue";

export default {
  title: "Foundations/ConfirmDialog",
  component: ConfirmDialog,
  tags: ["autodocs"],
  argTypes: {
    modelValue: { control: "boolean", description: "Open state (v-model)." },
    title: { control: "text" },
    message: { control: "text" },
    confirmLabel: { control: "text" },
    cancelLabel: { control: "text" },
    variant: { control: "inline-radio", options: ["danger", "warn", "info"] },
    loading: {
      control: "boolean",
      description: "Spinner on the confirm button while the action runs.",
    },
    show: { control: false, description: "Deprecated alias for modelValue." },
  },
  args: {
    modelValue: true,
    title: "Delete draft?",
    message: "This removes 14 paragraphs and cannot be undone.",
    confirmLabel: "Delete draft",
    cancelLabel: "Cancel",
    variant: "danger",
    loading: false,
  },
  render: (args) => ({
    components: { ConfirmDialog, Button },
    setup: () => ({ args }),
    template: `
      <div style="min-height:200px; padding:24px;">
        <Button variant="outline" @click="args.modelValue = true">Open dialog</Button>
        <ConfirmDialog
          v-bind="args"
          @update:modelValue="args.modelValue = $event"
          @cancel="args.modelValue = false"
          @confirm="args.modelValue = false"
        />
      </div>`,
  }),
};

export const Destructive = {};

export const Warning = {
  args: {
    variant: "warn",
    title: "Unpublish chapter?",
    message: "Enrolled readers lose access until it is published again.",
    confirmLabel: "Unpublish",
  },
};

export const Info = {
  args: {
    variant: "info",
    title: "Send invitations?",
    message: "12 collaborators will receive an email.",
    confirmLabel: "Send",
  },
};

/** The action is in flight; confirm is blocked. */
export const Loading = { args: { loading: true } };

export const Closed = { args: { modelValue: false } };
