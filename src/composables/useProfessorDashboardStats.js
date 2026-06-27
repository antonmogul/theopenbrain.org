import { ref } from "vue";
import { authedRequest as supabaseRest } from "@/services/api/client";

/**
 * Professor-dashboard "Dashboard" (home) section: the top-of-page aggregate
 * stats — total courses, active students, avg completion.
 *
 * Extracted verbatim from ProfessorDashboardView.vue (#12 — professor dashboard
 * section composables). Behavior unchanged; only relocated. The `profile` ref is
 * passed in so the composable stays self-contained and the single source of
 * auth truth (useAuth) is not re-derived here.
 *
 * @param {import('vue').Ref} profile - the authenticated user's profile ref
 */
export function useProfessorDashboardStats(profile) {
    // ---- state ----
    const dashboardStats = ref({
        totalCourses: 0,
        activeStudents: 0,
        pendingAssessments: 0,
        avgCompletion: 0,
    });

    // ---- fetch ----
    async function fetchDashboardStats() {
        try {
            // Fetch courses count
            const coursesData = await supabaseRest(
                `courses?professor_id=eq.${profile.value?.id}&select=id`
            );
            dashboardStats.value.totalCourses = coursesData.length;

            // Fetch active students (enrolled in professor's courses)
            if (coursesData.length > 0) {
                const courseIds = coursesData.map(c => c.id).join(",");
                const enrollments = await supabaseRest(
                    `course_enrollments?course_id=in.(${courseIds})&select=student_id`
                );
                const uniqueStudents = new Set(enrollments.map(e => e.student_id));
                dashboardStats.value.activeStudents = uniqueStudents.size;

                // QW-2: average completion across all of the professor's courses.
                // One query over reading_progress, guarded so a failure here doesn't
                // wipe out the other stats.
                try {
                    const progress = await supabaseRest(
                        `reading_progress?course_id=in.(${courseIds})&select=is_completed`
                    );
                    const total = progress.length;
                    const completed = progress.filter(p => p.is_completed).length;
                    dashboardStats.value.avgCompletion = total
                        ? Math.round((completed / total) * 100)
                        : 0;
                } catch (progressErr) {
                    console.error("Error fetching avg completion:", progressErr);
                }
            }
        } catch (err) {
            console.error("Error fetching dashboard stats:", err);
        }
    }

    return {
        // state
        dashboardStats,
        // actions
        fetchDashboardStats,
    };
}
