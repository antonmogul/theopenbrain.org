import { ref } from "vue";
import { authedRequest as supabaseRest } from "@/services/api/client";

/**
 * Professor-dashboard "Collaboration" section: courses the professor has shared
 * (published) and published courses available from other professors.
 *
 * Extracted verbatim from ProfessorDashboardView.vue (#12 — professor dashboard
 * section composables). Behavior unchanged; only relocated. The `profile` ref is
 * passed in so the composable stays self-contained.
 *
 * Note: the section's "Clone" action reuses duplicateCourse from
 * useProfessorCourses — that stays with course CRUD, not here.
 *
 * @param {import('vue').Ref} profile - the authenticated user's profile ref
 */
export function useProfessorCollaboration(profile) {
    // ---- state ----
    const sharedCourses = ref([]);
    const sharedCoursesLoading = ref(false);
    const mySharedCourses = ref([]);

    // ---- fetch ----
    async function fetchSharedCourses() {
        sharedCoursesLoading.value = true;

        try {
            // Fetch courses marked as shared by other professors
            // For now, we'll simulate this with courses that have visibility set
            const data = await supabaseRest(
                `courses?is_published=eq.true&professor_id=neq.${profile.value?.id}&select=*,profiles(full_name,institution)`
            );
            sharedCourses.value = data;

            // Fetch my courses that I've shared
            const myCourses = await supabaseRest(
                `courses?professor_id=eq.${profile.value?.id}&is_published=eq.true&select=*`
            );
            mySharedCourses.value = myCourses;
        } catch (err) {
            console.error("Error fetching shared courses:", err);
        } finally {
            sharedCoursesLoading.value = false;
        }
    }

    return {
        // state
        sharedCourses,
        sharedCoursesLoading,
        mySharedCourses,
        // fetch
        fetchSharedCourses,
    };
}
