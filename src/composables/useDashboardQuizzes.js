import { ref } from "vue";
import { authedRequest as supabaseRest } from "@/services/api/client";

/**
 * Creator-dashboard "Quizzes" section: quiz list + per-quiz stats, the quiz
 * editor (with module/section binding and settings), and the nested question
 * editor (multiple-choice / other types).
 *
 * Extracted verbatim from DashboardView.vue (#10 — dashboard section
 * composables). Behavior unchanged; only relocated. Self-contained apart from
 * `profile` (passed in) for created_by on new quizzes.
 *
 * @param {import('vue').Ref} profile - the authenticated user's profile ref
 */
export function useDashboardQuizzes(profile) {
    // ---- state ----
    const quizzes = ref([]);
    const quizzesLoading = ref(false);
    const quizzesError = ref(null);
    const showQuizEditor = ref(false);
    const editingQuiz = ref(null);
    const quizForm = ref({
        title: "",
        description: "",
        module_id: null,
        section_id: null,
        time_limit_minutes: 15,
        passing_score: 70,
        allow_multiple_attempts: true,
        show_correct_answers: true,
        questions: [],
    });
    const showQuestionEditor = ref(false);
    const editingQuestion = ref(null);
    const questionForm = ref({
        question_text: "",
        question_type: "multiple_choice",
        options: ["", "", "", ""],
        correct_answer: "",
        points: 1,
    });

    // ---- fetch ----
    async function fetchQuizzes() {
        quizzesLoading.value = true;
        quizzesError.value = null;

        try {
            const data = await supabaseRest(
                "quizzes?select=*,modules(title)&order=created_at.desc",
            );

            // Get stats for each quiz
            const quizzesWithStats = await Promise.all(
                data.map(async (quiz) => {
                    const questions = await supabaseRest(
                        `quiz_questions?quiz_id=eq.${quiz.id}&select=id`,
                    );
                    const attempts = await supabaseRest(
                        `quiz_attempts?quiz_id=eq.${quiz.id}&select=score,total_points,status`,
                    );

                    const completedAttempts = attempts.filter(
                        (a) => a.status === "completed",
                    );
                    const avgScore = completedAttempts.length
                        ? Math.round(
                              completedAttempts.reduce(
                                  (sum, a) =>
                                      sum + (a.score / a.total_points) * 100,
                                  0,
                              ) / completedAttempts.length,
                          )
                        : 0;
                    const passRate = completedAttempts.length
                        ? Math.round(
                              (completedAttempts.filter(
                                  (a) =>
                                      (a.score / a.total_points) * 100 >=
                                      quiz.passing_score,
                              ).length /
                                  completedAttempts.length) *
                                  100,
                          )
                        : 0;

                    return {
                        ...quiz,
                        questionCount: questions.length,
                        attemptCount: attempts.length,
                        avgScore,
                        passRate,
                    };
                }),
            );

            quizzes.value = quizzesWithStats;
        } catch (err) {
            console.error("Error fetching quizzes:", err);
            quizzesError.value = err.message;
        } finally {
            quizzesLoading.value = false;
        }
    }

    // ---- quiz editor ----
    function openQuizEditor(quiz = null) {
        if (quiz) {
            editingQuiz.value = quiz;
            quizForm.value = {
                title: quiz.title,
                description: quiz.description || "",
                module_id: quiz.module_id,
                section_id: quiz.section_id,
                time_limit_minutes: quiz.time_limit_minutes || 15,
                passing_score: quiz.passing_score || 70,
                allow_multiple_attempts: quiz.allow_multiple_attempts ?? true,
                show_correct_answers: quiz.show_correct_answers ?? true,
                questions: [],
            };
            // Fetch questions
            fetchQuizQuestions(quiz.id);
        } else {
            editingQuiz.value = null;
            quizForm.value = {
                title: "",
                description: "",
                module_id: null,
                section_id: null,
                time_limit_minutes: 15,
                passing_score: 70,
                allow_multiple_attempts: true,
                show_correct_answers: true,
                questions: [],
            };
        }
        showQuizEditor.value = true;
    }

    async function fetchQuizQuestions(quizId) {
        try {
            const questions = await supabaseRest(
                `quiz_questions?quiz_id=eq.${quizId}&select=*&order=order_index.asc`,
            );
            quizForm.value.questions = questions;
        } catch (err) {
            console.error("Error fetching quiz questions:", err);
        }
    }

    function closeQuizEditor() {
        showQuizEditor.value = false;
        editingQuiz.value = null;
    }

    async function saveQuiz() {
        try {
            const quizData = {
                title: quizForm.value.title,
                description: quizForm.value.description,
                module_id: quizForm.value.module_id,
                section_id: quizForm.value.section_id,
                time_limit_minutes: quizForm.value.time_limit_minutes,
                passing_score: quizForm.value.passing_score,
                allow_multiple_attempts: quizForm.value.allow_multiple_attempts,
                show_correct_answers: quizForm.value.show_correct_answers,
            };

            if (editingQuiz.value) {
                await supabaseRest(`quizzes?id=eq.${editingQuiz.value.id}`, {
                    method: "PATCH",
                    body: JSON.stringify(quizData),
                });
            } else {
                quizData.created_by = profile.value?.id;
                await supabaseRest("quizzes", {
                    method: "POST",
                    headers: { Prefer: "return=representation" },
                    body: JSON.stringify(quizData),
                });
            }

            closeQuizEditor();
            await fetchQuizzes();
        } catch (err) {
            console.error("Error saving quiz:", err);
            alert("Failed to save quiz: " + err.message);
        }
    }

    async function deleteQuiz(quizId) {
        if (
            !confirm(
                "Are you sure you want to delete this quiz? All questions and attempts will be lost.",
            )
        )
            return;

        try {
            // Delete questions first
            await supabaseRest(`quiz_questions?quiz_id=eq.${quizId}`, {
                method: "DELETE",
            });
            // Delete attempts
            await supabaseRest(`quiz_attempts?quiz_id=eq.${quizId}`, {
                method: "DELETE",
            });
            // Delete quiz
            await supabaseRest(`quizzes?id=eq.${quizId}`, {
                method: "DELETE",
            });
            await fetchQuizzes();
        } catch (err) {
            console.error("Error deleting quiz:", err);
            alert("Failed to delete quiz: " + err.message);
        }
    }

    // ---- question editor ----
    function openQuestionEditor(question = null) {
        if (question) {
            editingQuestion.value = question;
            questionForm.value = {
                question_text: question.question_text,
                question_type: question.question_type,
                options: question.options || ["", "", "", ""],
                correct_answer: question.correct_answer || "",
                points: question.points || 1,
            };
        } else {
            editingQuestion.value = null;
            questionForm.value = {
                question_text: "",
                question_type: "multiple_choice",
                options: ["", "", "", ""],
                correct_answer: "",
                points: 1,
            };
        }
        showQuestionEditor.value = true;
    }

    function closeQuestionEditor() {
        showQuestionEditor.value = false;
        editingQuestion.value = null;
    }

    async function saveQuestion() {
        if (!editingQuiz.value) return;

        try {
            const questionData = {
                quiz_id: editingQuiz.value.id,
                question_text: questionForm.value.question_text,
                question_type: questionForm.value.question_type,
                options:
                    questionForm.value.question_type === "multiple_choice"
                        ? questionForm.value.options
                        : null,
                correct_answer: questionForm.value.correct_answer,
                points: questionForm.value.points,
                order_index: editingQuestion.value
                    ? editingQuestion.value.order_index
                    : quizForm.value.questions.length,
            };

            if (editingQuestion.value) {
                await supabaseRest(
                    `quiz_questions?id=eq.${editingQuestion.value.id}`,
                    {
                        method: "PATCH",
                        body: JSON.stringify(questionData),
                    },
                );
            } else {
                await supabaseRest("quiz_questions", {
                    method: "POST",
                    body: JSON.stringify(questionData),
                });
            }

            closeQuestionEditor();
            await fetchQuizQuestions(editingQuiz.value.id);
        } catch (err) {
            console.error("Error saving question:", err);
            alert("Failed to save question: " + err.message);
        }
    }

    async function deleteQuestion(questionId) {
        if (!confirm("Delete this question?")) return;

        try {
            await supabaseRest(`quiz_questions?id=eq.${questionId}`, {
                method: "DELETE",
            });
            await fetchQuizQuestions(editingQuiz.value.id);
        } catch (err) {
            console.error("Error deleting question:", err);
            alert("Failed to delete question: " + err.message);
        }
    }

    return {
        // state
        quizzes,
        quizzesLoading,
        quizzesError,
        showQuizEditor,
        editingQuiz,
        quizForm,
        showQuestionEditor,
        editingQuestion,
        questionForm,
        // quiz editor
        fetchQuizzes,
        openQuizEditor,
        fetchQuizQuestions,
        closeQuizEditor,
        saveQuiz,
        deleteQuiz,
        // question editor
        openQuestionEditor,
        closeQuestionEditor,
        saveQuestion,
        deleteQuestion,
    };
}
