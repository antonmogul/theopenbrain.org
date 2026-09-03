/*
 * Student/Quiz/QuizReview — every question of an attempt, graded.
 *
 * Presentational wrapper around QuizQuestion in its `showResult` state;
 * `answers` is keyed by question id, so a missing key renders as unanswered.
 */
import { fn } from "storybook/test";
import QuizReview from "../QuizReview.vue";
import { quizQuestions } from "@/stories/openBrainFixtures";

const ANSWERS = { "question-1": "Rods and cones", "question-2": "False" };

export default {
  title: "Student/Quiz/QuizReview",
  component: QuizReview,
  tags: ["autodocs"],
  argTypes: {
    questions: { control: "object" },
    answers: { control: "object", description: "Keyed by question id." },
    onExit: { description: "Back to the dashboard." },
    onRetry: { description: "Start another attempt." },
  },
  args: {
    questions: quizQuestions,
    answers: ANSWERS,
    onExit: fn(),
    onRetry: fn(),
  },
  render: (args) => ({
    components: { QuizReview },
    setup: () => ({ args }),
    template: `<div style="max-width:800px;"><QuizReview v-bind="args" /></div>`,
  }),
};

/** One right, one wrong. */
export const Default = {};

export const AllCorrect = {
  args: { answers: { "question-1": "Rods and cones", "question-2": "True" } },
};

/** Timed out before answering: correct options shown, nothing marked wrong. */
export const Unanswered = { args: { answers: {} } };
