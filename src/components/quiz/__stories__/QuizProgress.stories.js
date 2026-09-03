/*
 * Student/Quiz/QuizProgress — position, timer and optional question nav.
 *
 * The timer states are the reason this has its own stories. `timeRemaining` is
 * seconds and drives a warning treatment as it runs down; the boundary is easy
 * to regress and impossible to see from a single default render.
 */
import QuizProgress from "../QuizProgress.vue";
import { quizQuestions } from "@/stories/openBrainFixtures";

const QUESTIONS = Array.from({ length: 8 }, (_, i) => ({
  id: `q${i + 1}`,
  question_text: `Question ${i + 1}`,
}));

// Answered: 1, 2, 3, 5 — deliberately non-contiguous so the nav shows
// answered/unanswered interleaved rather than a clean prefix.
const ANSWERS = { q1: "a", q2: "b", q3: "a", q5: "c" };

export default {
  title: "Student/Quiz/QuizProgress",
  component: QuizProgress,
  tags: ["autodocs"],
  argTypes: {
    current: { control: { type: "number", min: 1 }, description: "1-indexed." },
    total: { control: { type: "number", min: 1 } },
    timeRemaining: {
      control: { type: "number", min: 0 },
      description: "Seconds. 0 hides the timer.",
    },
    answeredCount: { control: { type: "number", min: 0 } },
    showQuestionNav: { control: "boolean" },
    answers: { control: "object" },
    questions: { control: "object" },
  },
  args: {
    current: 4,
    total: 8,
    timeRemaining: 900,
    answeredCount: 4,
    showQuestionNav: false,
    answers: ANSWERS,
    questions: QUESTIONS,
  },
  render: (args) => ({
    components: { QuizProgress },
    setup: () => ({ args }),
    template: `<div style="max-width:720px;"><QuizProgress v-bind="args" /></div>`,
  }),
};

export const Playground = {};

/** No timer — an untimed quiz passes 0. */
export const Untimed = { args: { timeRemaining: 0 } };

/** Plenty of time left. */
export const TimerHealthy = { args: { timeRemaining: 900 } };

/** Under a minute — the state a student actually feels. */
export const TimerCritical = { args: { timeRemaining: 45 } };

/** The jump-to-question grid, with answered/unanswered interleaved. */
export const WithQuestionNav = { args: { showQuestionNav: true } };

/** First question, nothing answered — the opening frame of every attempt. */
export const JustStarted = {
  args: { current: 1, answeredCount: 0, answers: {}, timeRemaining: 1800 },
};

/** Last question, all answered — the frame before submit. */
export const Complete = {
  args: {
    current: 8,
    answeredCount: 8,
    showQuestionNav: true,
    answers: Object.fromEntries(QUESTIONS.map((q) => [q.id, "a"])),
    timeRemaining: 120,
  },
};

/**
 * The shared Foundations fixture on its last question with under a minute
 * left — the scenario the old Student/Quizzes catalog carried.
 */
export const FoundationsLastQuestion = {
  args: {
    current: 2,
    total: 2,
    timeRemaining: 54,
    answeredCount: 1,
    showQuestionNav: true,
    questions: quizQuestions,
    answers: { "question-1": "Rods and cones" },
  },
};
