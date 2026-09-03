/*
 * Foundations/Forms/Switch — the bare toggle.
 *
 * Two-way via `checked` / `update:checked` (not modelValue). ToggleRow wraps
 * this with a label and hint; use Switch alone only inside custom rows.
 */
import Switch from "../Switch.vue";

export default {
  title: "Foundations/Forms/Switch",
  component: Switch,
  tags: ["autodocs"],
  argTypes: {
    checked: { control: "boolean", description: "v-model:checked" },
    disabled: { control: "boolean" },
  },
  args: { checked: true, disabled: false },
  render: (args) => ({
    components: { Switch },
    setup: () => ({ args }),
    template: `<Switch v-bind="args" @update:checked="args.checked = $event" />`,
  }),
};

export const Playground = {};

export const Off = { args: { checked: false } };

export const Disabled = { args: { checked: true, disabled: true } };

/** On, off and disabled side by side. */
export const States = {
  render: () => ({
    components: { Switch },
    template: `
      <div style="display:flex; gap:24px; align-items:center;">
        <Switch checked />
        <Switch :checked="false" />
        <Switch checked disabled />
      </div>`,
  }),
};
