/*
 * Dashboard/Sections/WidgetStudio — build a widget in Claude, upload it here
 * (OPENBRAIN-105): the kit, the upload, the three-width check and the list
 * of uploads. The list comes from the mocked API.
 */
import WidgetStudio from "../WidgetStudio.vue";

const UPLOADS = [
  {
    id: "u1",
    slug: "horizontal-cells-lateral-inhibition",
    title: "Horizontal cells: lateral inhibition",
    description: "How horizontal-cell feedback exaggerates edges.",
    author: "Stuart Trenholm",
    ramp: "perc",
    status: "published",
    checks: [
      { id: "runs", ok: true },
      { id: "fits", ok: true },
      { id: "size", ok: true },
    ],
    updated_at: "2026-09-26T10:00:00Z",
  },
  {
    id: "u2",
    slug: "attention-spotlight",
    title: "Attention spotlight",
    author: "Arjun Krishnaswamy",
    ramp: "lear",
    status: "draft",
    checks: [],
    updated_at: "2026-09-25T15:00:00Z",
  },
];

export default {
  title: "Dashboard/Sections/WidgetStudio",
  component: WidgetStudio,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    auth: { authenticated: true, role: "creator", name: "Anton Morrison" },
    api: { "widget_uploads?": UPLOADS },
  },
  render: () => ({
    components: { WidgetStudio },
    template: `<div style="padding:32px;max-width:1280px;"><WidgetStudio /></div>`,
  }),
};

export const Default = {};

/** Nothing uploaded yet. */
export const Empty = { parameters: { api: { "widget_uploads?": [] } } };
