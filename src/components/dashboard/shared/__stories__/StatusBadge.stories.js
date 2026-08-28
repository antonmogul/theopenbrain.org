/*
 * Foundations/StatusBadge — variant pill, with a `status` shortcut that maps
 * domain words onto the four tones.
 *
 * Both routes into the same component are documented deliberately: the STATUS_MAP
 * is easy to miss when reading the props alone, and passing `status` where you
 * meant `variant` fails silently to neutral.
 */
import StatusBadge from "../StatusBadge.vue";

export default {
  title: "Foundations/StatusBadge",
  component: StatusBadge,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "inline-radio",
      options: ["neutral", "accent", "complete", "warn"],
      description: "Explicit tone. Ignored when `status` is set.",
    },
    status: {
      control: "select",
      options: [
        "",
        "published",
        "active",
        "completed",
        "passed",
        "draft",
        "pending",
        "failed",
        "archived",
        "inactive",
      ],
      description:
        "Domain word mapped to a tone via STATUS_MAP. Takes precedence over `variant`; an unmapped word falls back to neutral.",
    },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    dot: { control: "boolean", description: "Leading status dot." },
    default: { control: "text", description: "Label (slot)." },
  },
  args: {
    variant: "neutral",
    status: "",
    size: "sm",
    dot: false,
    default: "Draft",
  },
  render: (args) => ({
    components: { StatusBadge },
    setup: () => ({ args }),
    template: `<StatusBadge v-bind="args">{{ args.default }}</StatusBadge>`,
  }),
};

export const Playground = {};

export const Variants = {
  render: () => ({
    components: { StatusBadge },
    template: `
      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
        <StatusBadge variant="neutral">Neutral</StatusBadge>
        <StatusBadge variant="accent">Accent</StatusBadge>
        <StatusBadge variant="complete">Complete</StatusBadge>
        <StatusBadge variant="warn">Warn</StatusBadge>
      </div>`,
  }),
};

/**
 * Every word in STATUS_MAP, grouped by the tone it resolves to. This is the
 * story to check when adding a new status word — if it renders neutral, it
 * isn't in the map.
 */
export const StatusWords = {
  render: () => ({
    components: { StatusBadge },
    template: `
      <div style="display:flex; flex-direction:column; gap:14px;">
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <StatusBadge status="published" dot>published</StatusBadge>
          <StatusBadge status="active" dot>active</StatusBadge>
          <StatusBadge status="completed" dot>completed</StatusBadge>
          <StatusBadge status="passed" dot>passed</StatusBadge>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <StatusBadge status="draft" dot>draft</StatusBadge>
          <StatusBadge status="pending" dot>pending</StatusBadge>
          <StatusBadge status="failed" dot>failed</StatusBadge>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <StatusBadge status="archived" dot>archived</StatusBadge>
          <StatusBadge status="inactive" dot>inactive</StatusBadge>
          <StatusBadge status="not-in-the-map" dot>unmapped → neutral</StatusBadge>
        </div>
      </div>`,
  }),
};

export const Sizes = {
  render: () => ({
    components: { StatusBadge },
    template: `
      <div style="display:flex; gap:10px; align-items:center;">
        <StatusBadge size="sm" variant="accent">Small</StatusBadge>
        <StatusBadge size="md" variant="accent">Medium</StatusBadge>
        <StatusBadge size="lg" variant="accent">Large</StatusBadge>
      </div>`,
  }),
};
