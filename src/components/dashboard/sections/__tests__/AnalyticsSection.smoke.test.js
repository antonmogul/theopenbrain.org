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
        expect(w.text()).toContain("Active users");
        expect(w.text()).toContain("No engagement data for this period");
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
        w.findComponent({ name: "SegmentedControl" }).vm.$emit("update:model-value", "30days");
        await w.vm.$nextTick();
        expect(w.emitted("range-change")[0]).toEqual(["30days"]);
    });
});
