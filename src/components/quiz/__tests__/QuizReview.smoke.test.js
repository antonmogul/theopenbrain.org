import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import QuizReview from "@/components/quiz/QuizReview.vue";

describe("QuizReview (render smoke)", () => {
    const questions = [
        { id: "q1", question_text: "Q1?", question_type: "multiple_choice", options: ["a", "b"], correct_answer: "a" },
        { id: "q2", question_text: "Q2?", question_type: "true_false", correct_answer: "true" },
    ];
    const answers = { q1: "a", q2: "false" };

    it("renders a question per item and the header", () => {
        const w = mount(QuizReview, { props: { questions, answers } });
        expect(w.text()).toContain("Review Your Answers");
        expect(w.findAllComponents({ name: "QuizQuestion" })).toHaveLength(2);
    });

    it("emits retry and exit from the action buttons", async () => {
        const w = mount(QuizReview, { props: { questions, answers } });
        const retry = w.findAll("button").find((b) => b.text() === "Try Again");
        await retry.trigger("click");
        expect(w.emitted("retry")).toBeTruthy();

        const cont = w.findAll("button").find((b) => b.text() === "Continue Learning");
        await cont.trigger("click");
        expect(w.emitted("exit")).toBeTruthy();
    });
});
