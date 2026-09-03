/*
 * Dashboard/DashboardRail — the left navigation column of every dashboard.
 *
 * Nav items carry optional `count` and `soon` flags; the user block and the
 * footer are slots with sensible defaults. `backTo` empty turns the back link
 * into a button that emits `back`.
 */
import DashboardRail from "../DashboardRail.vue";

const CREATOR_NAV = [
  { id: "overview", label: "Overview", icon: "grid" },
  { id: "chapters", label: "Chapters", icon: "book", count: 12 },
  { id: "media", label: "Media", icon: "image" },
  { id: "analytics", label: "Analytics", icon: "chart", soon: true },
];

const STUDENT_NAV = [
  { id: "overview", label: "Overview", icon: "grid" },
  { id: "courses", label: "Courses", icon: "graduation", count: 2 },
  { id: "highlights", label: "Highlights", icon: "highlight", count: 31 },
  { id: "notes", label: "Notes", icon: "notes" },
  { id: "progress", label: "Progress", icon: "progress" },
  { id: "settings", label: "Settings", icon: "settings" },
];

export default {
  title: "Dashboard/DashboardRail",
  component: DashboardRail,
  tags: ["autodocs"],
  argTypes: {
    navItems: {
      control: "object",
      description: "[{ id, label, icon?, count?, soon? }]",
    },
    activeSection: {
      control: "select",
      options: CREATOR_NAV.map((item) => item.id),
    },
    displayName: { control: "text" },
    email: { control: "text" },
    role: { control: "text" },
    backLabel: { control: "text" },
    backTo: {
      control: "text",
      description: "Route for the back link; empty renders a button.",
    },
    showBack: { control: "boolean" },
  },
  args: {
    navItems: CREATOR_NAV,
    activeSection: "chapters",
    displayName: "Dr Stuart Trenholm",
    email: "stuart@example.org",
    role: "Creator",
    backLabel: "Back to book",
    backTo: "/",
    showBack: true,
  },
  render: (args) => ({
    components: { DashboardRail },
    setup: () => ({ args }),
    template: `
      <div style="max-width:260px;">
        <DashboardRail v-bind="args" @update:activeSection="args.activeSection = $event" />
      </div>`,
  }),
};

export const Creator = {};

export const Student = {
  args: {
    navItems: STUDENT_NAV,
    activeSection: "highlights",
    displayName: "Maya Chen",
    email: "maya@example.org",
    role: "Student",
  },
  argTypes: {
    activeSection: {
      control: "select",
      options: STUDENT_NAV.map((item) => item.id),
    },
  },
};

export const WithoutBackLink = { args: { showBack: false } };

/** Empty `backTo` swaps the router link for a button emitting `back`. */
export const BackAsButton = { args: { backTo: "", backLabel: "Close" } };

/** Custom user block via the `user` slot. */
export const CustomUserSlot = {
  render: (args) => ({
    components: { DashboardRail },
    setup: () => ({ args }),
    template: `
      <div style="max-width:260px;">
        <DashboardRail v-bind="args" @update:activeSection="args.activeSection = $event">
          <template #user>
            <div style="padding:16px 12px; font-family:var(--font-mono); font-size:12px;">
              NEUR 101 · Fall 2026
            </div>
          </template>
        </DashboardRail>
      </div>`,
  }),
};
