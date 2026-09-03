/*
 * Dashboard/Sections/AnalyticsSection — creator "Analytics" panel.
 *
 * Presentational: the parent owns useDashboardAnalytics and passes its state
 * down, so every state here is a prop. `formatDuration` is a required function
 * prop and therefore has no control.
 */
import AnalyticsSection from "../AnalyticsSection.vue";

const RANGE_OPTIONS = [
  { value: "7days", label: "7 days" },
  { value: "30days", label: "30 days" },
  { value: "90days", label: "90 days" },
];

const METRICS = {
  activeUsers: 1248,
  totalPageViews: 18342,
  avgTimeOnContent: 522,
  quizCompletionRate: 78,
};

const CHART = {
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  datasets: [{ label: "Readers", data: [112, 164, 142, 208, 231] }],
};

const CONTENT = [
  {
    id: "retina",
    title: "The Retina",
    views: 5810,
    avgTime: 684,
    completionRate: 72,
  },
  {
    id: "foundations",
    title: "Foundations of Neuroscience",
    views: 2940,
    avgTime: 510,
    completionRate: 64,
  },
];

const QUIZZES = [
  {
    id: "q1",
    title: "Retinal circuits check",
    attempts: 329,
    avgScore: 82,
    passRate: 76,
  },
];

const HIGHLIGHTS = [
  {
    id: "h1",
    selected_text: "Direction-selective ganglion cells respond preferentially…",
    highlight_count: 48,
  },
];

const formatDuration = (seconds) => `${Math.round(seconds / 60)} min`;

export default {
  title: "Dashboard/Sections/AnalyticsSection",
  component: AnalyticsSection,
  tags: ["autodocs"],
  argTypes: {
    analyticsLoading: { control: "boolean" },
    analyticsError: {
      control: "text",
      description: "Non-empty shows ErrorState.",
    },
    analyticsDateRange: {
      control: "select",
      options: RANGE_OPTIONS.map((option) => option.value),
    },
    analyticsRangeOptions: { control: "object" },
    analyticsMetrics: { control: "object" },
    analyticsChartData: { control: "object" },
    contentPerformance: { control: "object" },
    quizPerformance: { control: "object" },
    trendingHighlights: { control: "object" },
    formatDuration: {
      control: false,
      description: "Seconds → label. Function prop; no control.",
    },
  },
  args: {
    analyticsLoading: false,
    analyticsError: null,
    analyticsDateRange: "30days",
    analyticsRangeOptions: RANGE_OPTIONS,
    analyticsMetrics: METRICS,
    analyticsChartData: CHART,
    contentPerformance: CONTENT,
    quizPerformance: QUIZZES,
    trendingHighlights: HIGHLIGHTS,
    formatDuration,
  },
  render: (args) => ({
    components: { AnalyticsSection },
    setup: () => ({ args }),
    template: `<AnalyticsSection v-bind="args" @range-change="args.analyticsDateRange = $event" />`,
  }),
};

export const Populated = {};

export const LoadError = {
  args: { analyticsError: "Analytics are temporarily unavailable." },
};

export const Loading = { args: { analyticsLoading: true } };

/** No traffic in the window: every card and list shows its empty state. */
export const Empty = {
  args: {
    analyticsMetrics: {
      activeUsers: 0,
      totalPageViews: 0,
      avgTimeOnContent: 0,
      quizCompletionRate: 0,
    },
    analyticsChartData: { labels: [], datasets: [] },
    contentPerformance: [],
    quizPerformance: [],
    trendingHighlights: [],
  },
};
