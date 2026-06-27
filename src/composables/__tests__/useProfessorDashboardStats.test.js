import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";

// Mock the API client boundary so the composable's network calls are
// deterministic. authedRequest is the single function all dashboard composables
// use; we control its resolved value per test.
vi.mock("@/services/api/client", () => ({
    authedRequest: vi.fn(),
}));

import { authedRequest } from "@/services/api/client";
import { useProfessorDashboardStats } from "@/composables/useProfessorDashboardStats";

describe("useProfessorDashboardStats", () => {
    let profile;

    beforeEach(() => {
        vi.clearAllMocks();
        profile = ref({ id: "prof-1" });
    });

    it("fetchDashboardStats aggregates courses, unique students, and avg completion", async () => {
        authedRequest.mockImplementation((endpoint) => {
            if (endpoint === "courses?professor_id=eq.prof-1&select=id") {
                return Promise.resolve([{ id: "c1" }, { id: "c2" }]);
            }
            if (
                endpoint ===
                "course_enrollments?course_id=in.(c1,c2)&select=student_id"
            ) {
                // s1 appears twice → uniqueStudents = 2
                return Promise.resolve([
                    { student_id: "s1" },
                    { student_id: "s1" },
                    { student_id: "s2" },
                ]);
            }
            if (
                endpoint ===
                "reading_progress?course_id=in.(c1,c2)&select=is_completed"
            ) {
                return Promise.resolve([
                    { is_completed: true },
                    { is_completed: false },
                    { is_completed: true },
                    { is_completed: true },
                ]);
            }
            return Promise.resolve([]);
        });

        const { dashboardStats, fetchDashboardStats } =
            useProfessorDashboardStats(profile);

        await fetchDashboardStats();

        expect(dashboardStats.value.totalCourses).toBe(2);
        expect(dashboardStats.value.activeStudents).toBe(2);
        // 3 of 4 completed → 75%
        expect(dashboardStats.value.avgCompletion).toBe(75);
    });

    it("fetchDashboardStats skips student/progress queries when professor has no courses", async () => {
        authedRequest.mockResolvedValue([]);
        const { dashboardStats, fetchDashboardStats } =
            useProfessorDashboardStats(profile);

        await fetchDashboardStats();

        expect(dashboardStats.value.totalCourses).toBe(0);
        expect(dashboardStats.value.activeStudents).toBe(0);
        // Only the courses query ran.
        expect(authedRequest).toHaveBeenCalledTimes(1);
    });

    it("fetchDashboardStats swallows a progress-query error but keeps other stats", async () => {
        authedRequest.mockImplementation((endpoint) => {
            if (endpoint === "courses?professor_id=eq.prof-1&select=id") {
                return Promise.resolve([{ id: "c1" }]);
            }
            if (
                endpoint ===
                "course_enrollments?course_id=in.(c1)&select=student_id"
            ) {
                return Promise.resolve([{ student_id: "s1" }]);
            }
            // reading_progress fails — guarded inner try/catch
            return Promise.reject(new Error("progress boom"));
        });

        const { dashboardStats, fetchDashboardStats } =
            useProfessorDashboardStats(profile);

        await fetchDashboardStats();

        // Courses + students survived the inner failure; completion stays 0.
        expect(dashboardStats.value.totalCourses).toBe(1);
        expect(dashboardStats.value.activeStudents).toBe(1);
        expect(dashboardStats.value.avgCompletion).toBe(0);
    });

    it("fetchDashboardStats swallows an outer error without throwing", async () => {
        authedRequest.mockRejectedValueOnce(new Error("courses boom"));
        const { dashboardStats, fetchDashboardStats } =
            useProfessorDashboardStats(profile);

        await expect(fetchDashboardStats()).resolves.toBeUndefined();
        expect(dashboardStats.value.totalCourses).toBe(0);
    });
});
