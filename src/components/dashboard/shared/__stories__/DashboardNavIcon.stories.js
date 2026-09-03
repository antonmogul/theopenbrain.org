/*
 * Dashboard/DashboardNavIcon — the single SVG switch behind every rail item.
 *
 * Inherits currentColor. An unknown name falls back to a circle, which is
 * shown last so a typo in a nav definition is recognisable.
 */
import DashboardNavIcon from "../DashboardNavIcon.vue";

const ICONS = [
  "grid",
  "book",
  "layers",
  "image",
  "quiz",
  "flashcard",
  "highlight",
  "notes",
  "progress",
  "chart",
  "users",
  "folder",
  "clipboard",
  "graduation",
  "share",
  "settings",
];

export default {
  title: "Dashboard/DashboardNavIcon",
  component: DashboardNavIcon,
  tags: ["autodocs"],
  argTypes: {
    name: { control: "select", options: [...ICONS, "unknown"] },
  },
  args: { name: "book" },
  render: (args) => ({
    components: { DashboardNavIcon },
    setup: () => ({ args }),
    template: `<DashboardNavIcon v-bind="args" style="width:32px; height:32px;" />`,
  }),
};

export const Playground = {};

/** Every named glyph, plus the circle fallback for an unknown name. */
export const AllIcons = {
  render: () => ({
    components: { DashboardNavIcon },
    setup: () => ({ names: [...ICONS, "unknown"] }),
    template: `
      <div style="display:flex; flex-wrap:wrap; gap:24px;">
        <div v-for="name in names" :key="name" style="display:grid; gap:8px; justify-items:center; width:72px;">
          <DashboardNavIcon :name="name" />
          <small style="font-family:var(--font-mono); font-size:11px;">{{ name }}</small>
        </div>
      </div>`,
  }),
};

export const Fallback = { args: { name: "unknown" } };
