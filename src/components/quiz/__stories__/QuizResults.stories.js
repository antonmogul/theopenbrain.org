/*
 * Student/Quiz/QuizResults — the score screen after an attempt.
 *
 * The ring, the headline and the message all key off `score` against
 * `passingScore`; pass and fail are the two treatments worth checking.
 */
import { fn } from "storybook/test";
import QuizResults from "../QuizResults.vue";

export default {
  title: "Student/Quiz/QuizResults",
  component: QuizResults,
  tags: ["autodocs"],
  argTypes: {
    score: {
      control: { type: "range", min: 0, max: 100 },
      description: "Percent.",
    },
    passed: { control: "boolean" },
    correctCount: { control: { type: "number", min: 0 } },
    total: { control: { type: "number", min: 1 } },
    passingScore: { control: { type: "number", min: 0, max: 100 } },
    timeTaken: {
      control: { type: "number", min: 0 },
      description: "Seconds; null hides the time stat.",
    },
    onRetry: { description: "Start another attempt." },
    onReview: { description: "Open the answer review." },
    onClose: { description: "Back to the dashboard." },
  },
  args: {
    score: 86,
    passed: true,
    correctCount: 6,
    total: 7,
    passingScore: 70,
    timeTaken: 436,
    onRetry: fn(),
    onReview: fn(),
    onClose: fn(),
  },
  render: (args) => ({
    components: { QuizResults },
    setup: () => ({ args }),
    template: `<div style="max-width:640px;"><QuizResults v-bind="args" /></div>`,
  }),
};

/** Passed comfortably. */
export const Default = {};

/** Below the pass mark: accent ring and the encouragement copy. */
export const Failed = {
  args: { score: 43, passed: false, correctCount: 3, total: 7, timeTaken: 512 },
};

/** A full ring. */
export const Perfect = {
  args: { score: 100, passed: true, correctCount: 7, total: 7, timeTaken: 301 },
};

/** Exactly on the pass mark. */
export const BorderlinePass = {
  args: { score: 70, passed: true, correctCount: 5, total: 7 },
};

/** Untimed attempt — no time stat. */
export const NoTimeRecorded = { args: { timeTaken: null } };
