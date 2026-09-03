/*
 * Dashboard/Sections/UsersSection — accounts list with role stats, filter,
 * search, pager and the user detail modal.
 *
 * Filter/search/page are one-way props with matching emits (the parent owns
 * the query); `selectedUser` is a defineModel that opens the detail modal.
 */
import UsersSection from "../UsersSection.vue";

const USERS = [
  {
    id: "u1",
    full_name: "Dr Stuart Trenholm",
    email: "stuart@example.org",
    role: "creator",
    institution: "Montreal Neurological Institute",
    creator_bio: "Retinal circuits and visual processing.",
    created_at: "2026-06-01T00:00:00Z",
  },
  {
    id: "u2",
    full_name: "Ada Lovelace",
    email: "ada@example.org",
    role: "professor",
    institution: "McGill University",
    professor_department: "Physiology",
    created_at: "2026-07-14T00:00:00Z",
  },
  {
    id: "u3",
    full_name: "Noor Okafor",
    email: "noor@example.org",
    role: "student",
    student_year: "U2",
    student_major: "Neuroscience",
    created_at: "2026-08-20T00:00:00Z",
  },
];

const FILTERS = [
  { value: "all", label: "All" },
  { value: "creator", label: "Creators" },
  { value: "professor", label: "Professors" },
  { value: "student", label: "Students" },
];

const ROLES = [
  { value: "creator", label: "Creator" },
  { value: "professor", label: "Professor" },
  { value: "student", label: "Student" },
];

export default {
  title: "Dashboard/Sections/UsersSection",
  component: UsersSection,
  tags: ["autodocs"],
  argTypes: {
    users: { control: "object" },
    usersLoading: { control: "boolean" },
    usersError: { control: "text" },
    usersFilter: {
      control: "select",
      options: FILTERS.map((option) => option.value),
    },
    usersFilterOptions: { control: "object" },
    usersSearch: { control: "text" },
    usersPage: { control: { type: "number", min: 1 } },
    usersTotalPages: { control: { type: "number", min: 1 } },
    usersTotalCount: { control: { type: "number", min: 0 } },
    userRoleBreakdown: { control: "object" },
    roleSelectOptions: { control: "object" },
    selectedUser: {
      control: "object",
      description: "v-model:selectedUser — non-null opens the detail modal.",
    },
  },
  args: {
    users: USERS,
    usersLoading: false,
    usersError: null,
    usersFilter: "all",
    usersFilterOptions: FILTERS,
    usersSearch: "",
    usersPage: 1,
    usersTotalPages: 1,
    usersTotalCount: 48,
    userRoleBreakdown: { creators: 1, professors: 12, students: 35 },
    roleSelectOptions: ROLES,
    selectedUser: null,
  },
  render: (args) => ({
    components: { UsersSection },
    setup: () => ({ args }),
    template: `
      <UsersSection
        v-bind="args"
        @update:selectedUser="args.selectedUser = $event"
        @select="args.selectedUser = $event"
        @filter="args.usersFilter = $event"
        @search="args.usersSearch = $event"
        @page="args.usersPage = $event"
      />`,
  }),
};

export const Populated = {};

export const Loading = {
  args: { usersLoading: true, usersFilterOptions: [], roleSelectOptions: [] },
};

export const LoadError = {
  args: { usersError: "The profiles table could not be read." },
};

export const Empty = { args: { users: [], usersTotalCount: 0 } };

/** Page 2 of 3 — the pager renders below the list. */
export const Paginated = { args: { usersPage: 2, usersTotalPages: 3 } };

/** Detail modal open on a professor (shows the department row). */
export const DetailOpen = { args: { selectedUser: USERS[1] } };
