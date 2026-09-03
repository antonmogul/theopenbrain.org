/*
 * Dashboard/StatCard — a single dashboard metric with optional delta.
 *
 * Filed under Dashboard rather than Foundations: it is generic-looking but knows
 * about deltas and a preview state, and the dashboards are its only consumer.
 * See .storybook/taxonomy.md — when torn, prefer the domain group.
 *
 * The `tone: "auto"` behaviour is the thing worth documenting: a positive
 * delta resolves to `complete`, a negative one to `warn`. That is right for
 * signups and wrong for anything where down is good, so the stories show both
 * the automatic and the overridden path.
 */
import StatCard from "../StatCard.vue";

export default {
  title: "Dashboard/StatCard",
  component: StatCard,
  tags: ["autodocs"],
  argTypes: {
    label: { control: "text" },
    value: {
      control: "text",
      description: "String or number; numbers get toLocaleString().",
    },
    prefix: { control: "text" },
    suffix: { control: "text" },
    delta: {
      control: "number",
      description:
        "null hides the delta row. Sign drives tone when tone='auto'.",
    },
    deltaLabel: { control: "text" },
    tone: {
      control: "inline-radio",
      options: ["auto", "accent", "complete", "warn", "mute"],
      description: "'auto' derives tone from the sign of `delta`.",
    },
    preview: {
      control: "boolean",
      description:
        "Renders an em dash instead of the value — the pre-data skeleton.",
    },
  },
  args: {
    label: "Active students",
    value: 1284,
    prefix: "",
    suffix: "",
    delta: 12.5,
    deltaLabel: "vs. last 30 days",
    tone: "auto",
    preview: false,
  },
  render: (args) => ({
    components: { StatCard },
    setup: () => ({ args }),
    template: `<div style="max-width:280px;"><StatCard v-bind="args" /></div>`,
  }),
};

export const Playground = {};

/** Positive delta → `complete` under tone="auto". */
export const TrendingUp = { args: { delta: 12.5 } };

/** Negative delta → `warn` under tone="auto". */
export const TrendingDown = {
  args: { delta: -8.2, label: "Completion rate", suffix: "%", value: 64 },
};

/**
 * Down is good here (fewer failed attempts), so `auto` would colour it wrong.
 * The explicit tone is the escape hatch.
 */
export const ToneOverride = {
  args: {
    label: "Failed quiz attempts",
    value: 23,
    delta: -41,
    deltaLabel: "vs. last month",
    tone: "complete",
  },
};

/** No delta available — the row is hidden, not rendered empty. */
export const NoDelta = { args: { delta: null, deltaLabel: "" } };

/** Awaiting data. */
export const PreviewState = { args: { preview: true, delta: null } };

/** Formatting affordances: prefix, suffix, and number localisation. */
export const Formatting = {
  render: () => ({
    components: { StatCard },
    template: `
      <div style="display:grid; grid-template-columns:repeat(3,minmax(0,220px)); gap:16px;">
        <StatCard label="Revenue" prefix="$" :value="48210" :delta="4.1" delta-label="vs. last month" />
        <StatCard label="Completion" :value="87" suffix="%" :delta="2.4" delta-label="vs. last week" />
        <StatCard label="Enrolments" :value="1284000" :delta="null" />
      </div>`,
  }),
};
