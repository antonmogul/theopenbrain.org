/*
 * Foundations/DataTable — sortable, optionally selectable table.
 *
 * Column definitions drive headers and cells; `cell-<key>` scoped slots let a
 * consumer swap in a badge or link without giving up sorting.
 */
import DataTable from "../DataTable.vue";
import StatusBadge from "../StatusBadge.vue";

const COLUMNS = [
  { key: "title", label: "Chapter", sortable: true },
  { key: "owner", label: "Owner" },
  { key: "status", label: "Status" },
];

const ROWS = [
  {
    id: "retina",
    title: "The Retina",
    owner: "Stuart Trenholm",
    status: "published",
  },
  {
    id: "foundations",
    title: "Foundations of Neuroscience",
    owner: "Editorial team",
    status: "draft",
  },
  {
    id: "attention",
    title: "Attention and Working Memory",
    owner: "Editorial team",
    status: "draft",
  },
];

export default {
  title: "Foundations/DataTable",
  component: DataTable,
  tags: ["autodocs"],
  argTypes: {
    columns: {
      control: "object",
      description: "[{ key, label, sortable?, width?, align? }]",
    },
    data: { control: "object" },
    rowKey: { control: "text" },
    selectable: { control: "boolean", description: "Checkbox column." },
    hoverable: { control: "boolean" },
    striped: { control: "boolean" },
    dense: { control: "boolean" },
  },
  args: {
    columns: COLUMNS,
    data: ROWS,
    rowKey: "id",
    selectable: false,
    hoverable: true,
    striped: false,
    dense: false,
  },
  render: (args) => ({
    components: { DataTable },
    setup: () => ({ args }),
    template: `<div style="max-width:760px;"><DataTable v-bind="args" /></div>`,
  }),
};

export const Playground = {};

export const Selectable = { args: { selectable: true } };

export const Striped = { args: { striped: true } };

export const Dense = { args: { dense: true } };

/** Zero rows render the `empty` slot (an EmptyState by default). */
export const Empty = { args: { data: [] } };

/** A scoped `cell-status` slot swaps the raw string for a StatusBadge. */
export const CustomCells = {
  render: (args) => ({
    components: { DataTable, StatusBadge },
    setup: () => ({ args }),
    template: `
      <div style="max-width:760px;">
        <DataTable v-bind="args">
          <template #cell-status="{ value }">
            <StatusBadge :status="value" dot />
          </template>
        </DataTable>
      </div>`,
  }),
};
