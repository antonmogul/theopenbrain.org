/*
 * Student/Quiz/QuizCard — a quiz tile on the student dashboard.
 *
 * The card fetches the student's best score from `quiz_attempts` on mount, so
 * the score states are driven through `parameters.api` rather than props.
 */
import { fn } from "storybook/test";
import QuizCard from "../QuizCard.vue";
import { apiFixtures, quizFixture } from "@/stories/openBrainFixtures";

export default {
  title: "Student/Quiz/QuizCard",
  component: QuizCard,
  tags: ["autodocs"],
  parameters: { auth: { authenticated: true }, api: apiFixtures },
  argTypes: {
    quiz: {
      control: "object",
      description:
        "Quiz row with its `quiz_questions`; `passing_score` defaults to 70.",
    },
    showStartButton: { control: "boolean" },
    onStart: { description: "Emitted with the quiz id." },
  },
  args: { quiz: quizFixture, showStartButton: true, onStart: fn() },
  render: (args) => ({
    components: { QuizCard },
    setup: () => ({ args }),
    template: `<div style="max-width:520px;"><QuizCard v-bind="args" /></div>`,
  }),
};

/** Best attempt (86%) clears the 70% pass mark. */
export const Default = {};

/** A best attempt below the pass mark renders in the fail treatment. */
export const FailedBestScore = {
  parameters: { api: { ...apiFixtures, "quiz_attempts?": [{ score: 52 }] } },
};

/** No completed attempts yet — the score chip is absent. */
export const NoAttempts = {
  parameters: { api: { ...apiFixtures, "quiz_attempts?": [] } },
};

/** No time limit — the clock meta item disappears. */
export const Untimed = {
  args: { quiz: { ...quizFixture, time_limit_minutes: null } },
};

/** Embedded in a list that owns its own call to action. */
export const WithoutStartButton = { args: { showStartButton: false } };
