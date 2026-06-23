import { ref } from "vue";
import { authedRequest as supabaseRest } from "@/services/api/client";

/**
 * Professor-dashboard "Assessments" section: quizzes attached to the professor's
 * courses (with per-quiz attempt/score/question stats), the inline assessment
 * editor, and assessment CRUD.
 *
 * Extracted verbatim from ProfessorDashboardView.vue (#12 — professor dashboard
 * section composables). Behavior unchanged; only relocated.
 *
 * Depends on two refs from sibling state:
 *   - `profile` for created_by on new assessments and for scoping the fetch to
 *     the professor's courses.
 *   - `courses` so a brand-new assessment defaults its course_id to the first
 *     course, exactly as the view did (`courses.value[0]?.id`).
 *
 * @param {import('vue').Ref} profile - the authenticated user's profile ref
 * @param {import('vue').Ref} courses - the professor's courses list ref
 */
export function useProfessorAssessments(profile, courses) {
    // ---- state ----
    const assessments = ref([]);
    const assessmentsLoading = ref(false);
    const assessmentsError = ref(null);
    const showAssessmentEditor = ref(false);
    const editingAssessment = ref(null);
    const assessmentForm = ref({
        title: "",
        description: "",
        course_id: null,
        time_limit_minutes: 30,
        passing_score: 70,
        max_attempts: 1,
        available_from: "",
        available_until: "",
        questions: [],
    });

    // ---- fetch ----
    async function fetchAssessments() {
        assessmentsLoading.value = true;
        assessmentsError.value = null;

        try {
            // Fetch quizzes created by this professor or attached to their courses
            const coursesData = await supabaseRest(
                `courses?professor_id=eq.${profile.value?.id}&select=id`
            );

            if (coursesData.length === 0) {
                assessments.value = [];
                return;
            }

            const courseIds = coursesData.map(c => c.id).join(",");
            const data = await supabaseRest(
                `quizzes?course_id=in.(${courseIds})&select=*,courses(title)&order=created_at.desc`
            );

            // Get attempt stats for each quiz
            const assessmentsWithStats = await Promise.all(
                data.map(async (quiz) => {
                    const attempts = await supabaseRest(
                        `quiz_attempts?quiz_id=eq.${quiz.id}&select=status,score,total_points`
                    );
                    const completedAttempts = attempts.filter(a => a.status === "completed");
                    const avgScore = completedAttempts.length
                        ? Math.round(
                            completedAttempts.reduce((sum, a) => sum + (a.score / a.total_points) * 100, 0) /
                            completedAttempts.length
                        )
                        : 0;

                    const questions = await supabaseRest(
                        `quiz_questions?quiz_id=eq.${quiz.id}&select=id`
                    );

                    return {
                        ...quiz,
                        attemptCount: attempts.length,
                        avgScore,
                        questionCount: questions.length,
                    };
                })
            );

            assessments.value = assessmentsWithStats;
        } catch (err) {
            console.error("Error fetching assessments:", err);
            assessmentsError.value = err.message;
        } finally {
            assessmentsLoading.value = false;
        }
    }

    // ---- CRUD ----
    function openAssessmentEditor(assessment = null) {
        if (assessment) {
            editingAssessment.value = assessment;
            assessmentForm.value = {
                title: assessment.title,
                description: assessment.description || "",
                course_id: assessment.course_id,
                time_limit_minutes: assessment.time_limit_minutes || 30,
                passing_score: assessment.passing_score || 70,
                max_attempts: assessment.max_attempts || 1,
                available_from: assessment.available_from || "",
                available_until: assessment.available_until || "",
                questions: [],
            };
        } else {
            editingAssessment.value = null;
            assessmentForm.value = {
                title: "",
                description: "",
                course_id: courses.value[0]?.id || null,
                time_limit_minutes: 30,
                passing_score: 70,
                max_attempts: 1,
                available_from: "",
                available_until: "",
                questions: [],
            };
        }
        showAssessmentEditor.value = true;
    }

    function closeAssessmentEditor() {
        showAssessmentEditor.value = false;
        editingAssessment.value = null;
    }

    async function saveAssessment() {
        try {
            const assessmentData = {
                title: assessmentForm.value.title,
                description: assessmentForm.value.description,
                course_id: assessmentForm.value.course_id,
                time_limit_minutes: assessmentForm.value.time_limit_minutes,
                passing_score: assessmentForm.value.passing_score,
                allow_multiple_attempts: assessmentForm.value.max_attempts > 1,
            };

            if (editingAssessment.value) {
                await supabaseRest(`quizzes?id=eq.${editingAssessment.value.id}`, {
                    method: "PATCH",
                    body: JSON.stringify(assessmentData),
                });
            } else {
                assessmentData.created_by = profile.value?.id;
                await supabaseRest("quizzes", {
                    method: "POST",
                    headers: { Prefer: "return=representation" },
                    body: JSON.stringify(assessmentData),
                });
            }

            closeAssessmentEditor();
            await fetchAssessments();
        } catch (err) {
            console.error("Error saving assessment:", err);
            alert("Failed to save assessment: " + err.message);
        }
    }

    async function deleteAssessment(assessmentId) {
        if (!confirm("Are you sure you want to delete this assessment?")) return;

        try {
            await supabaseRest(`quiz_questions?quiz_id=eq.${assessmentId}`, {
                method: "DELETE",
            });
            await supabaseRest(`quiz_attempts?quiz_id=eq.${assessmentId}`, {
                method: "DELETE",
            });
            await supabaseRest(`quizzes?id=eq.${assessmentId}`, {
                method: "DELETE",
            });
            await fetchAssessments();
        } catch (err) {
            console.error("Error deleting assessment:", err);
            alert("Failed to delete assessment: " + err.message);
        }
    }

    return {
        // state
        assessments,
        assessmentsLoading,
        assessmentsError,
        showAssessmentEditor,
        editingAssessment,
        assessmentForm,
        // fetch
        fetchAssessments,
        // CRUD
        openAssessmentEditor,
        closeAssessmentEditor,
        saveAssessment,
        deleteAssessment,
    };
}
