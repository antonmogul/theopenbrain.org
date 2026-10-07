import { describe, it, expect } from "vitest";
import { mountSection } from "@/test/mountSection";
import AnalyticsSection from "@/components/dashboard/sections/AnalyticsSection.vue";

describe("AnalyticsSection (render smoke)", () => {
  const base = {
    analyticsLoading: false,
    analyticsError: null,
    analyticsDateRange: "7days",
    analyticsRangeOptions: [{ value: "7days", label: "7 days" }],
    analyticsMetrics: {
      activeUsers: 5,
      totalPageViews: 20,
      avgTimeOnContent: 90,
      quizCompletionRate: 60,
    },
    analyticsChartData: { labels: [], datasets: [] },
    contentPerformance: [],
    quizPerformance: [],
    trendingHighlights: [],
    formatDuration: (s) => `${s}s`,
  };

  it("renders metric values and empty chart state", () => {
    const w = mountSection(AnalyticsSection, base);
    expect(w.exists()).toBe(true);
    expect(w.text()).toContain("Unique signed-in users");
    expect(w.text()).toContain("Visit tracking is not currently emitted");
    expect(w.text()).toContain(
      "Anonymous unique visitors cannot be determined"
    );
    expect(w.text()).not.toContain("Avg time on content");
    expect(w.text()).toContain("No engagement data for this period");
  });

  it("labels unique users, repeated page views and views without IDs separately for each chapter", () => {
    const w = mountSection(AnalyticsSection, {
      ...base,
      analyticsMetrics: { ...base.analyticsMetrics, unassignedPageViews: 3 },
      contentPerformance: [
        {
          id: "retina",
          title: "The Retina",
          uniqueUsers: 2,
          views: 9,
          unidentifiedViews: 4,
        },
      ],
    });
    expect(w.text()).toContain(
      "2 unique signed-in users · 9 page views · 4 views without a user ID"
    );
    expect(w.text()).toContain(
      "3 recorded page views have no chapter assigned"
    );
  });

  it("renders chart bars when chart data is present", () => {
    const w = mountSection(AnalyticsSection, {
      ...base,
      analyticsChartData: {
        labels: ["Jun 1", "Jun 2"],
        datasets: [{ label: "Active Users", data: [3, 5] }],
      },
    });
    expect(w.findAll(".chart-bar-col")).toHaveLength(2);
  });

  it("emits range-change from the segmented control", async () => {
    const w = mountSection(AnalyticsSection, base);
    w.findComponent({ name: "SegmentedControl" }).vm.$emit(
      "update:modelValue",
      "30days"
    );
    await w.vm.$nextTick();
    expect(w.emitted("range-change")[0]).toEqual(["30days"]);
  });

  it("hides all metric and chapter data in the access-denied state", () => {
    const w = mountSection(AnalyticsSection, {
      ...base,
      analyticsAccessDenied: true,
      contentPerformance: [
        { id: "secret", title: "Internal chapter", views: 9, uniqueUsers: 3 },
      ],
    });
    expect(w.text()).toContain("Access denied");
    expect(w.text()).not.toContain("Internal chapter");
    expect(w.find(".stat-grid").exists()).toBe(false);
  });
});
