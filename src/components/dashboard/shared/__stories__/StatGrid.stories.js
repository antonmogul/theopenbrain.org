/*
 * Dashboard/StatGrid — responsive grid for StatCards.
 *
 * `columns` is the desktop count; the grid collapses on its own below that.
 * `bordered` draws the hairline between cells that the analytics section
 * relies on.
 */
import StatGrid from "../StatGrid.vue";
import StatCard from "../StatCard.vue";

export default {
  title: "Dashboard/StatGrid",
  component: StatGrid,
  tags: ["autodocs"],
  argTypes: {
    columns: { control: { type: "number", min: 1, max: 6 } },
    bordered: { control: "boolean" },
  },
  args: { columns: 4, bordered: true },
  render: (args) => ({
    components: { StatGrid, StatCard },
    setup: () => ({ args }),
    template: `
      <StatGrid v-bind="args">
        <StatCard label="Active readers" :value="1248" :delta="12" delta-label="this month" />
        <StatCard label="Chapters" :value="12" />
        <StatCard label="Completion" :value="68" suffix="%" />
        <StatCard label="Projected" preview />
      </StatGrid>`,
  }),
};

/** Four metrics including a preview card — the analytics header row. */
export const Analytics = {};

export const TwoColumns = { args: { columns: 2 } };

export const Borderless = { args: { bordered: false } };
