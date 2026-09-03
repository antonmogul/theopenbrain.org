/*
 * Dashboard/DashboardShell — rail + content frame shared by all dashboards.
 *
 * `accent` re-stamps data-accent on the shell only, so a dashboard can carry
 * its own ramp without touching the reader's preference. The mobile story is
 * the responsive check: the rail collapses above the content.
 */
import DashboardShell from "../DashboardShell.vue";
import SectionHeader from "../SectionHeader.vue";
import BaseCard from "../BaseCard.vue";

const NAV = [
  { id: "overview", label: "Overview", icon: "grid" },
  { id: "chapters", label: "Chapters", icon: "book", count: 12 },
  { id: "media", label: "Media", icon: "image" },
  { id: "analytics", label: "Analytics", icon: "chart", soon: true },
];

export default {
  title: "Dashboard/DashboardShell",
  component: DashboardShell,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  argTypes: {
    navItems: { control: "object" },
    activeSection: {
      control: "select",
      options: NAV.map((item) => item.id),
    },
    displayName: { control: "text" },
    email: { control: "text" },
    role: { control: "text" },
    accent: {
      control: "inline-radio",
      options: ["magenta", "teal", "amber", "mono"],
    },
    backLabel: { control: "text" },
    backTo: { control: "text" },
    showBack: { control: "boolean" },
  },
  args: {
    navItems: NAV,
    activeSection: "overview",
    displayName: "Dr Stuart Trenholm",
    email: "stuart@example.org",
    role: "Creator",
    accent: "magenta",
    backLabel: "Back to book",
    backTo: "/",
    showBack: true,
  },
  render: (args) => ({
    components: { DashboardShell, SectionHeader, BaseCard },
    setup: () => ({ args }),
    template: `
      <DashboardShell v-bind="args" @update:activeSection="args.activeSection = $event">
        <SectionHeader
          eyebrow="01 · Overview"
          title="Open Brain administration"
          subtitle="Review chapters, collaborators, and publishing status."
        />
        <BaseCard><p>12 chapters · 4 collaborators · 2 drafts</p></BaseCard>
      </DashboardShell>`,
  }),
};

export const Desktop = {};

/** Teal accent at phone width — the rail must stack, not overflow. */
export const Mobile = {
  args: { accent: "teal" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
};

export const AmberAccent = { args: { accent: "amber" } };

export const MonoAccent = { args: { accent: "mono" } };
