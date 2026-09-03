/*
 * Student/Quiz/QuizIntro — the screen before an attempt starts.
 *
 * Presentational: QuizView owns quiz state and the timer; this only reads the
 * quiz metadata and emits `start` / `exit`.
 */
import { fn } from "storybook/test";
import QuizIntro from "../QuizIntro.vue";
import { quizFixture } from "@/stories/openBrainFixtures";

export default {
  title: "Student/Quiz/QuizIntro",
  component: QuizIntro,
  tags: ["autodocs"],
  argTypes: {
    quiz: {
      control: "object",
      description: "Quiz row with its `quiz_questions`.",
    },
    onStart: { description: "Start the attempt." },
    onExit: { description: "Cancel back to the dashboard." },
  },
  args: { quiz: quizFixture, onStart: fn(), onExit: fn() },
  render: (args) => ({
    components: { QuizIntro },
    setup: () => ({ args }),
    template: `<div style="max-width:720px;"><QuizIntro v-bind="args" /></div>`,
  }),
};

export const Default = {};

/** No time limit — only the question count and pass mark are shown. */
export const Untimed = {
  args: { quiz: { ...quizFixture, time_limit_minutes: null } },
};

/** Title only; no description paragraph. */
export const NoDescription = {
  args: { quiz: { ...quizFixture, description: "" } },
};

/** A long description and a stricter pass mark. */
export const LongDescription = {
  args: {
    quiz: {
      ...quizFixture,
      passing_score: 85,
      description:
        "This assessment covers phototransduction, the layered organisation of the retina, the centre–surround receptive field and the first steps of the visual pathway. You may consult the chapter, but the clock keeps running while you do.",
    },
  },
};
