import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import QuizIntro from "@/components/quiz/QuizIntro.vue";

describe("QuizIntro (render smoke)", () => {
    const quiz = {
        title: "Chapter 1 Quiz",
        description: "Test your knowledge",
        quiz_questions: [{}, {}, {}],
        time_limit_minutes: 15,
        passing_score: 80,
    };

    it("renders title, description and meta", () => {
        const w = mount(QuizIntro, { props: { quiz } });
        expect(w.text()).toContain("Chapter 1 Quiz");
        expect(w.text()).toContain("Test your knowledge");
        expect(w.text()).toContain("3"); // question count
        expect(w.text()).toContain("80%");
    });

    it("emits start when Start Quiz is clicked", async () => {
        const w = mount(QuizIntro, { props: { quiz } });
        await w.find('[data-testid="start-quiz"]').trigger("click");
        expect(w.emitted("start")).toBeTruthy();
    });

    it("emits exit when Cancel is clicked", async () => {
        const w = mount(QuizIntro, { props: { quiz } });
        const cancel = w.findAll("button").find((b) => b.text() === "Cancel");
        await cancel.trigger("click");
        expect(w.emitted("exit")).toBeTruthy();
    });
});
