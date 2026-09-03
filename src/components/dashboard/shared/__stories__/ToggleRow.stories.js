/*
 * Foundations/Forms/ToggleRow — label + hint + Switch as one settings row.
 *
 * `preview` marks a preference that is displayed but not yet persisted; it
 * renders the PreviewTag and keeps the switch inert.
 */
import ToggleRow from "../ToggleRow.vue";

export default {
  title: "Foundations/Forms/ToggleRow",
  component: ToggleRow,
  tags: ["autodocs"],
  argTypes: {
    label: { control: "text" },
    hint: { control: "text" },
    checked: { control: "boolean", description: "v-model:checked" },
    disabled: { control: "boolean" },
    preview: { control: "boolean" },
  },
  args: {
    label: "Weekly reader digest",
    hint: "Email a concise summary of course activity every Friday.",
    checked: true,
    disabled: false,
    preview: false,
  },
  render: (args) => ({
    components: { ToggleRow },
    setup: () => ({ args }),
    template: `
      <div style="max-width:560px;">
        <ToggleRow v-bind="args" @update:checked="args.checked = $event" />
      </div>`,
  }),
};

export const Preference = {};

export const Off = { args: { checked: false } };

export const Disabled = { args: { disabled: true } };

export const Preview = {
  args: { preview: true, label: "Sync notes to Zotero", hint: "" },
};
