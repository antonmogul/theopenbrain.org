import { describe, it, expect } from "vitest";
import { mountSection } from "@/test/mountSection";
import QuizzesSection from "@/components/dashboard/sections/QuizzesSection.vue";

const emptyQuizForm = {
    title: "",
    description: "",
    time_limit_minutes: 15,
    passing_score: 70,
    allow_multiple_attempts: true,
    show_correct_answers: true,
    questions: [],
};
const emptyQuestionForm = {
    question_text: "",
    question_type: "multiple_choice",
    options: ["", "", "", ""],
    correct_answer: "",
    points: 1,
};

describe("QuizzesSection (render smoke)", () => {
    const base = {
        quizzes: [],
        quizzesLoading: false,
        quizzesError: null,
        editingQuiz: null,
        editingQuestion: null,
        showQuizEditor: false,
        quizForm: emptyQuizForm,
        showQuestionEditor: false,
        questionForm: emptyQuestionForm,
    };

    it("renders empty state with no quizzes and editor closed", () => {
        const w = mountSection(QuizzesSection, base);
        expect(w.exists()).toBe(true);
        expect(w.text()).toContain("No quizzes yet");
    });

    it("emits open-quiz from the New quiz button", async () => {
        const w = mountSection(QuizzesSection, {
            ...base,
            quizzes: [{ id: "q1", title: "Quiz A", questionCount: 0, time_limit_minutes: 10, passing_score: 70, attemptCount: 0, avgScore: 0, passRate: 0 }],
        });
        const btn = w.findAll("button").find((b) => b.text() === "New quiz");
        await btn.trigger("click");
        expect(w.emitted("open-quiz")).toBeTruthy();
    });

    it("renders the quiz editor panel when showQuizEditor is true", () => {
        const w = mountSection(QuizzesSection, { ...base, showQuizEditor: true });
        expect(w.text()).toContain("New quiz");
        expect(w.text()).toContain("Quiz title");
    });

    it("renders a quiz card per quiz in the list", () => {
        const w = mountSection(QuizzesSection, {
            ...base,
            quizzes: [{ id: "q1", title: "Quiz A", questionCount: 3, time_limit_minutes: 10, passing_score: 70, attemptCount: 5, avgScore: 80, passRate: 60 }],
        });
        expect(w.text()).toContain("Quiz A");
        expect(w.text()).toContain("3 questions");
    });
});
