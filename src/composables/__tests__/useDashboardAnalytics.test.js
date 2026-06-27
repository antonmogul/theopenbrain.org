import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/services/api/client", () => ({ authedRequest: vi.fn() }));
import { authedRequest } from "@/services/api/client";
import { useDashboardAnalytics } from "@/composables/useDashboardAnalytics";

describe("useDashboardAnalytics", () => {
    beforeEach(() => vi.clearAllMocks());

    it("formatDuration renders s / m s / h m", () => {
        const { formatDuration } = useDashboardAnalytics();
        expect(formatDuration(0)).toBe("0s");
        expect(formatDuration(45)).toBe("45s");
        expect(formatDuration(90)).toBe("1m 30s");
        expect(formatDuration(3661)).toBe("1h 1m");
    });

    it("fetchAnalytics computes activeUsers + pageViews from events", async () => {
        authedRequest.mockImplementation((endpoint) => {
            if (endpoint.startsWith("analytics_events")) {
                return Promise.resolve([
                    {
                        user_id: "a",
                        event_type: "page_view",
                        created_at: "2026-06-20T00:00:00Z",
                    },
                    {
                        user_id: "a",
                        event_type: "page_view",
                        created_at: "2026-06-20T01:00:00Z",
                    },
                    {
                        user_id: "b",
                        event_type: "click",
                        created_at: "2026-06-20T00:00:00Z",
                    },
                ]);
            }
            return Promise.resolve([]); // progress, attempts, modules, quizzes, highlights
        });
        const { analyticsMetrics, fetchAnalytics } = useDashboardAnalytics();
        await fetchAnalytics();
        expect(analyticsMetrics.value.activeUsers).toBe(2);
        expect(analyticsMetrics.value.totalPageViews).toBe(2);
    });

    it("fetchAnalytics sets error and resets loading on failure", async () => {
        authedRequest.mockRejectedValueOnce(new Error("net"));
        const { analyticsError, analyticsLoading, fetchAnalytics } =
            useDashboardAnalytics();
        await fetchAnalytics();
        expect(analyticsError.value).toBe("net");
        expect(analyticsLoading.value).toBe(false);
    });
});
