/*
 * Student/Quiz/QuizQuestion — one question, answering or reviewing.
 *
 * `showResult` flips the card from interactive to graded: options lock, the
 * correct answer is marked, a wrong pick is flagged and the explanation shows.
 * Both states of all three question types are here because the graded look
 * is otherwise only reachable by finishing a whole attempt.
 */
import { fn } from "storybook/test";
import QuizQuestion from "../QuizQuestion.vue";
import { quizQuestions } from "@/stories/openBrainFixtures";

const [MULTIPLE_CHOICE, TRUE_FALSE] = quizQuestions;
const SHORT_ANSWER = {
  id: "question-3",
  question_text: "Name the photopigment found in rod photoreceptors.",
  question_type: "short_answer",
  correct_answer: "Rhodopsin",
  explanation:
    "Rhodopsin is the opsin–retinal complex that makes rods so sensitive to dim light.",
};

export default {
  title: "Student/Quiz/QuizQuestion",
  component: QuizQuestion,
  tags: ["autodocs"],
  argTypes: {
    question: {
      control: "object",
      description:
        "`question_type` is multiple_choice, true_false or short_answer.",
    },
    selectedAnswer: { control: "text" },
    showResult: {
      control: "boolean",
      description: "Grade the answer and lock the inputs.",
    },
    questionNumber: { control: { type: "number", min: 1 } },
    onAnswer: { description: "Emitted with the chosen option or typed text." },
  },
  args: {
    question: MULTIPLE_CHOICE,
    selectedAnswer: null,
    showResult: false,
    questionNumber: 1,
    onAnswer: fn(),
  },
  render: (args) => ({
    components: { QuizQuestion },
    setup: () => ({ args }),
    template: `<div style="max-width:720px;"><QuizQuestion v-bind="args" /></div>`,
  }),
};

/** Unanswered multiple choice. */
export const Default = {};

/** An option picked, not yet graded. */
export const Selected = { args: { selectedAnswer: "Rods and cones" } };

/** Graded: the right answer, with the explanation. */
export const CorrectResult = {
  args: { selectedAnswer: "Rods and cones", showResult: true },
};

/** Graded: a wrong pick flagged next to the correct option. */
export const IncorrectResult = {
  args: { selectedAnswer: "Bipolar cells", showResult: true },
};

/** True/false generates its own two options. */
export const TrueFalse = { args: { question: TRUE_FALSE, questionNumber: 2 } };

/** Short answer is a text input instead of options. */
export const ShortAnswer = {
  args: { question: SHORT_ANSWER, questionNumber: 3 },
};

/** Short answer is graded case-insensitively. */
export const ShortAnswerGraded = {
  args: {
    question: SHORT_ANSWER,
    questionNumber: 3,
    selectedAnswer: "rhodopsin",
    showResult: true,
  },
};

/** Options stored as a JSON string (older rows) are parsed. */
export const OptionsAsJson = {
  args: {
    question: {
      ...MULTIPLE_CHOICE,
      options: JSON.stringify(MULTIPLE_CHOICE.options),
    },
  },
};
