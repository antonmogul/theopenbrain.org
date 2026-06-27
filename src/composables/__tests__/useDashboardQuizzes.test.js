import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";

vi.mock("@/services/api/client", () => ({ authedRequest: vi.fn() }));
import { authedRequest } from "@/services/api/client";
import { useDashboardQuizzes } from "@/composables/useDashboardQuizzes";

describe("useDashboardQuizzes", () => {
    let profile;
    beforeEach(() => {
        vi.clearAllMocks();
        profile = ref({ id: "creator-1" });
    });

    it("openQuizEditor(null) resets form and opens editor", () => {
        const { openQuizEditor, showQuizEditor, editingQuiz, quizForm } =
            useDashboardQuizzes(profile);
        openQuizEditor(null);
        expect(showQuizEditor.value).toBe(true);
        expect(editingQuiz.value).toBe(null);
        expect(quizForm.value.title).toBe("");
        expect(quizForm.value.passing_score).toBe(70);
    });

    it("saveQuiz POSTs with created_by when creating new", async () => {
        authedRequest.mockResolvedValue([]);
        const { quizForm, saveQuiz } = useDashboardQuizzes(profile);
        quizForm.value.title = "Quiz A";
        await saveQuiz();
        const postCall = authedRequest.mock.calls.find((c) => c[0] === "quizzes");
        expect(postCall).toBeTruthy();
        const body = JSON.parse(postCall[1].body);
        expect(body.created_by).toBe("creator-1");
        expect(body.title).toBe("Quiz A");
    });

    it("saveQuestion is a no-op when no quiz is being edited", async () => {
        const { saveQuestion } = useDashboardQuizzes(profile);
        await saveQuestion();
        expect(authedRequest).not.toHaveBeenCalled();
    });

    it("deleteQuiz removes questions, attempts, then quiz", async () => {
        vi.spyOn(window, "confirm").mockReturnValue(true);
        authedRequest.mockResolvedValue([]);
        const { deleteQuiz } = useDashboardQuizzes(profile);
        await deleteQuiz("q1");
        const endpoints = authedRequest.mock.calls.map((c) => c[0]);
        expect(endpoints).toContain("quiz_questions?quiz_id=eq.q1");
        expect(endpoints).toContain("quiz_attempts?quiz_id=eq.q1");
        expect(endpoints).toContain("quizzes?id=eq.q1");
    });

    it("openQuestionEditor(question) loads existing values into the form", () => {
        const { openQuestionEditor, questionForm, showQuestionEditor } =
            useDashboardQuizzes(profile);
        openQuestionEditor({
            question_text: "Q?",
            question_type: "multiple_choice",
            options: ["a", "b"],
            correct_answer: "a",
            points: 3,
        });
        expect(showQuestionEditor.value).toBe(true);
        expect(questionForm.value.question_text).toBe("Q?");
        expect(questionForm.value.points).toBe(3);
    });
});
