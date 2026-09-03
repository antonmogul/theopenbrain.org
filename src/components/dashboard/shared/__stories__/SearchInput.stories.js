/*
 * Foundations/Forms/SearchInput — debounced text search.
 *
 * `search` fires after `debounce` ms of quiet; `update:modelValue` fires on
 * every keystroke. Stories set debounce to 0 so typing is visible at once.
 */
import SearchInput from "../SearchInput.vue";

export default {
  title: "Foundations/Forms/SearchInput",
  component: SearchInput,
  tags: ["autodocs"],
  argTypes: {
    modelValue: { control: "text" },
    placeholder: { control: "text" },
    debounce: {
      control: { type: "number", min: 0, step: 50 },
      description: "Milliseconds before `search` emits.",
    },
  },
  args: {
    modelValue: "retinal circuits",
    placeholder: "Search chapters…",
    debounce: 0,
  },
  render: (args) => ({
    components: { SearchInput },
    setup: () => ({ args }),
    template: `
      <div style="max-width:420px; display:grid; gap:8px;">
        <SearchInput v-bind="args" @update:modelValue="args.modelValue = $event" />
        <small style="font-family:var(--font-mono); color:rgb(var(--color-mute));">value: “{{ args.modelValue }}”</small>
      </div>`,
  }),
};

export const Populated = {};

export const Empty = { args: { modelValue: "" } };

/** Production default: 300 ms debounce on `search`. */
export const Debounced = { args: { debounce: 300 } };
