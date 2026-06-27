import { ref, computed } from "vue";
import { authedRequest as supabaseRest } from "@/services/api/client";

/**
 * Professor-dashboard "Students" section: enrolled students across the
 * professor's courses, collapsed into a student-centric view with their
 * enrollments. Owns the course filter, the free-text search box, and the derived
 * filtered list.
 *
 * Extracted verbatim from ProfessorDashboardView.vue (#12 — professor dashboard
 * section composables). Behavior unchanged; only relocated. The `profile` ref is
 * passed in so the composable stays self-contained.
 *
 * @param {import('vue').Ref} profile - the authenticated user's profile ref
 */
export function useProfessorStudents(profile) {
    // ---- state ----
    const students = ref([]);
    const studentsLoading = ref(false);
    const studentsError = ref(null);
    const studentSearch = ref("");
    const selectedCourseFilter = ref("all");

    // ---- derived ----
    const filteredStudents = computed(() => {
        if (!studentSearch.value) return students.value;
        const search = studentSearch.value.toLowerCase();
        return students.value.filter(s =>
            s.full_name?.toLowerCase().includes(search) ||
            s.email?.toLowerCase().includes(search)
        );
    });

    // ---- fetch ----
    async function fetchStudents() {
        studentsLoading.value = true;
        studentsError.value = null;

        try {
            // Get all courses for this professor
            const coursesData = await supabaseRest(
                `courses?professor_id=eq.${profile.value?.id}&select=id,title`
            );

            if (coursesData.length === 0) {
                students.value = [];
                return;
            }

            const courseIds = coursesData.map(c => c.id).join(",");

            // Get enrollments with student profiles
            let endpoint = `course_enrollments?course_id=in.(${courseIds})&select=*,profiles(id,email,full_name,student_year,student_major),courses(id,title)`;

            if (selectedCourseFilter.value !== "all") {
                endpoint = `course_enrollments?course_id=eq.${selectedCourseFilter.value}&select=*,profiles(id,email,full_name,student_year,student_major),courses(id,title)`;
            }

            const enrollments = await supabaseRest(endpoint);

            // Map to student-centric view
            const studentMap = new Map();
            enrollments.forEach(enrollment => {
                const studentId = enrollment.profiles?.id;
                if (!studentId) return;

                if (!studentMap.has(studentId)) {
                    studentMap.set(studentId, {
                        ...enrollment.profiles,
                        enrollments: [],
                    });
                }
                studentMap.get(studentId).enrollments.push({
                    course_id: enrollment.course_id,
                    course_title: enrollment.courses?.title,
                    enrolled_at: enrollment.enrolled_at,
                    last_accessed_at: enrollment.last_accessed_at,
                });
            });

            students.value = Array.from(studentMap.values());
        } catch (err) {
            console.error("Error fetching students:", err);
            studentsError.value = err.message;
        } finally {
            studentsLoading.value = false;
        }
    }

    return {
        // state
        students,
        studentsLoading,
        studentsError,
        studentSearch,
        selectedCourseFilter,
        // derived
        filteredStudents,
        // fetch
        fetchStudents,
    };
}
