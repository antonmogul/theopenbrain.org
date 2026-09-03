/*
 * Foundations/Pagination — page buttons with ellipsis windowing.
 *
 * The ellipsis logic is the thing to check here: first, middle and last pages
 * collapse differently, and a single page hides the nav entirely.
 */
import Pagination from "../Pagination.vue";

export default {
  title: "Foundations/Pagination",
  component: Pagination,
  tags: ["autodocs"],
  argTypes: {
    currentPage: { control: { type: "number", min: 1 } },
    totalPages: { control: { type: "number", min: 1 } },
    totalItems: { control: { type: "number", min: 0 } },
    pageSize: { control: { type: "number", min: 1 } },
    showInfo: { control: "boolean", description: "“Showing x–y of z” line." },
  },
  args: {
    currentPage: 6,
    totalPages: 14,
    totalItems: 274,
    pageSize: 20,
    showInfo: true,
  },
  render: (args) => ({
    components: { Pagination },
    setup: () => ({ args }),
    template: `<Pagination v-bind="args" @page-change="args.currentPage = $event" />`,
  }),
};

/** Deep in a long result set — ellipsis on both sides. */
export const LongResultSet = {};

export const FirstPage = { args: { currentPage: 1 } };

export const LastPage = { args: { currentPage: 14 } };

/** One page: the nav is hidden and only the info line remains. */
export const SinglePage = {
  args: { currentPage: 1, totalPages: 1, totalItems: 8 },
};

export const NoResults = {
  args: { currentPage: 1, totalPages: 1, totalItems: 0 },
};

export const WithoutInfo = { args: { showInfo: false } };
