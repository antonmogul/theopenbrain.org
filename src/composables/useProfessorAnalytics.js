import { ref } from "vue";
import { authedRequest as supabaseRest } from "@/services/api/client";

/**
 * Professor-dashboard "Analytics" section: per-course performance (student count,
 * completion rate, avg time spent) over a selectable date range.
 *
 * Extracted verbatim from ProfessorDashboardView.vue (#12 — professor dashboard
 * section composables). Behavior unchanged; only relocated. Owns its own
 * `analyticsDateRange` (the view watches it to refetch); `profile` is passed in
 * to scope the query to the professor's courses.
 *
 * @param {import('vue').Ref} profile - the authenticated user's profile ref
 */
export function useProfessorAnalytics(profile) {
    // ---- state ----
    const analyticsLoading = ref(false);
    const analyticsError = ref(null);
    const analyticsDateRange = ref("7days");
    const courseAnalytics = ref([]);
    const studentProgress = ref([]);

    // ---- fetch ----
    async function fetchAnalytics() {
        analyticsLoading.value = true;
        analyticsError.value = null;

        try {
            const coursesData = await supabaseRest(
                `courses?professor_id=eq.${profile.value?.id}&select=id,title`
            );

            if (coursesData.length === 0) {
                courseAnalytics.value = [];
                return;
            }

            // QW-1: honour the selected date range by filtering reading_progress on
            // last_accessed_at. Same window switch the Creator dashboard uses.
            const now = Date.now();
            const dayMs = 24 * 60 * 60 * 1000;
            let startDate;
            switch (analyticsDateRange.value) {
                case "30days":
                    startDate = new Date(now - 30 * dayMs);
                    break;
                case "90days":
                    startDate = new Date(now - 90 * dayMs);
                    break;
                case "7days":
                default:
                    startDate = new Date(now - 7 * dayMs);
                    break;
            }
            const sinceFilter = `&last_accessed_at=gte.${startDate.toISOString()}`;

            // Get progress data for each course
            const analyticsData = await Promise.all(
                coursesData.map(async (course) => {
                    const enrollments = await supabaseRest(
                        `course_enrollments?course_id=eq.${course.id}&select=student_id`
                    );

                    const progress = await supabaseRest(
                        `reading_progress?course_id=eq.${course.id}&select=is_completed,time_spent_seconds${sinceFilter}`
                    );

                    const completedCount = progress.filter(p => p.is_completed).length;
                    const totalTime = progress.reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0);

                    return {
                        course_id: course.id,
                        title: course.title,
                        studentCount: enrollments.length,
                        completionRate: progress.length ? Math.round((completedCount / progress.length) * 100) : 0,
                        avgTimeSpent: progress.length ? Math.round(totalTime / progress.length / 60) : 0, // in minutes
                    };
                })
            );

            courseAnalytics.value = analyticsData;
        } catch (err) {
            console.error("Error fetching analytics:", err);
            analyticsError.value = err.message;
        } finally {
            analyticsLoading.value = false;
        }
    }

    return {
        // state
        analyticsLoading,
        analyticsError,
        analyticsDateRange,
        courseAnalytics,
        studentProgress,
        // fetch
        fetchAnalytics,
    };
}
