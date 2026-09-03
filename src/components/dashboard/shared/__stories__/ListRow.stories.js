/*
 * Foundations/ListRow — label + hint row with media and action slots.
 *
 * The long-title story is the regression case: the label must truncate rather
 * than push the action slot off the row.
 */
import ListRow from "../ListRow.vue";
import PreviewTag from "../PreviewTag.vue";
import StatusBadge from "../StatusBadge.vue";

export default {
  title: "Foundations/ListRow",
  component: ListRow,
  tags: ["autodocs"],
  argTypes: {
    label: { control: "text" },
    hint: { control: "text" },
    interactive: { control: "boolean" },
    divider: { control: "boolean" },
  },
  args: {
    label: "The Retina",
    hint: "Last edited by Dr Trenholm · yesterday",
    interactive: false,
    divider: true,
  },
  render: (args) => ({
    components: { ListRow },
    setup: () => ({ args }),
    template: `<div style="max-width:520px;"><ListRow v-bind="args" /></div>`,
  }),
};

export const Playground = {};

/** Interactive row with a PreviewTag in the action slot and a long label. */
export const LongContent = {
  args: {
    label:
      "A deliberately long chapter title about retinal direction selectivity and motion encoding",
    interactive: true,
  },
  render: (args) => ({
    components: { ListRow, PreviewTag },
    setup: () => ({ args }),
    template: `
      <div style="max-width:520px;">
        <ListRow v-bind="args"><PreviewTag variant="beta" /></ListRow>
      </div>`,
  }),
};

/** `media` slot on the left, `action` slot on the right. */
export const WithMediaAndAction = {
  render: (args) => ({
    components: { ListRow, StatusBadge },
    setup: () => ({ args }),
    template: `
      <div style="max-width:520px;">
        <ListRow v-bind="args">
          <template #media>
            <span style="display:inline-grid; place-items:center; width:32px; height:32px; border-radius:50%; background:rgb(var(--color-accent)); color:white; font-family:var(--font-mono); font-size:12px;">01</span>
          </template>
          <template #action><StatusBadge status="published" dot /></template>
        </ListRow>
      </div>`,
  }),
};

export const NoDivider = { args: { divider: false } };
