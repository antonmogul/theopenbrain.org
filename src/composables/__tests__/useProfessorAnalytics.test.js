import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";

// Mock the API client boundary so the composable's network calls are
// deterministic. authedRequest is the single function all dashboard composables
// use; we control its resolved value per test.
vi.mock("@/services/api/client", () => ({
    authedRequest: vi.fn(),
}));

import { authedRequest } from "@/services/api/client";
import { useProfessorAnalytics } from "@/composables/useProfessorAnalytics";

describe("useProfessorAnalytics", () => {
    let profile;

    beforeEach(() => {
        vi.clearAllMocks();
        profile = ref({ id: "prof-1" });
    });

    it("fetchAnalytics builds per-course performance rows", async () => {
        authedRequest.mockImplementation((endpoint) => {
            if (endpoint === "courses?professor_id=eq.prof-1&select=id,title") {
                return Promise.resolve([{ id: "c1", title: "Course A" }]);
            }
            if (endpoint === "course_enrollments?course_id=eq.c1&select=student_id") {
                return Promise.resolve([{ student_id: "s1" }, { student_id: "s2" }]);
            }
            if (endpoint.startsWith("reading_progress?course_id=eq.c1")) {
                return Promise.resolve([
                    { is_completed: true, time_spent_seconds: 120 },
                    { is_completed: false, time_spent_seconds: 240 },
                ]);
            }
            return Promise.resolve([]);
        });

        const { courseAnalytics, fetchAnalytics } = useProfessorAnalytics(profile);

        await fetchAnalytics();

        expect(courseAnalytics.value).toHaveLength(1);
        const row = courseAnalytics.value[0];
        expect(row.studentCount).toBe(2);
        // 1 of 2 completed → 50%
        expect(row.completionRate).toBe(50);
        // (120 + 240) / 2 / 60 = 3 minutes
        expect(row.avgTimeSpent).toBe(3);
    });

    it("fetchAnalytics short-circuits to empty when professor has no courses", async () => {
        authedRequest.mockResolvedValueOnce([]);
        const { courseAnalytics, fetchAnalytics } = useProfessorAnalytics(profile);

        await fetchAnalytics();

        expect(courseAnalytics.value).toEqual([]);
        expect(authedRequest).toHaveBeenCalledTimes(1);
    });

    it("fetchAnalytics applies the selected date-range window to reading_progress", async () => {
        authedRequest.mockImplementation((endpoint) => {
            if (endpoint === "courses?professor_id=eq.prof-1&select=id,title") {
                return Promise.resolve([{ id: "c1", title: "Course A" }]);
            }
            return Promise.resolve([]);
        });

        const { analyticsDateRange, fetchAnalytics } =
            useProfessorAnalytics(profile);
        analyticsDateRange.value = "90days";

        await fetchAnalytics();

        const progressCall = authedRequest.mock.calls.find((c) =>
            c[0].startsWith("reading_progress?course_id=eq.c1")
        );
        expect(progressCall[0]).toContain("last_accessed_at=gte.");
        // A 90-day window starts well before a 7-day one; sanity check the date
        // is meaningfully in the past (more than 80 days).
        const since = progressCall[0].split("last_accessed_at=gte.")[1];
        const ageDays = (Date.now() - new Date(since).getTime()) / 86400000;
        expect(ageDays).toBeGreaterThan(80);
    });

    it("fetchAnalytics sets error on failure and resets loading", async () => {
        authedRequest.mockRejectedValueOnce(new Error("boom"));
        const { analyticsError, analyticsLoading, fetchAnalytics } =
            useProfessorAnalytics(profile);

        await fetchAnalytics();

        expect(analyticsError.value).toBe("boom");
        expect(analyticsLoading.value).toBe(false);
    });
});
