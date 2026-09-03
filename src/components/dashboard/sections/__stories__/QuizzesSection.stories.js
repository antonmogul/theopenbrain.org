/*
 * Dashboard/Sections/QuizzesSection — quiz list, inline quiz editor, and the
 * question modal.
 *
 * Three surfaces share one component: the card grid, the editor panel
 * (`showQuizEditor`), and the question modal (`showQuestionEditor`) nested in
 * it. Questions only render while `editingQuiz` is set, so the editing story
 * is the one that shows the full form.
 */
import QuizzesSection from "../QuizzesSection.vue";

const QUESTIONS = [
  {
    id: "qq1",
    question_text: "Which retinal cell releases glutamate in darkness?",
    question_type: "multiple_choice",
    options: [
      "Photoreceptor",
      "Horizontal cell",
      "Amacrine cell",
      "Ganglion cell",
    ],
    correct_answer: "Photoreceptor",
    points: 1,
  },
  {
    id: "qq2",
    question_text: "Rods saturate in bright daylight.",
    question_type: "true_false",
    correct_answer: "true",
    points: 2,
  },
];

const QUIZ = {
  id: "q1",
  title: "Retinal circuits",
  questionCount: 8,
  time_limit_minutes: 15,
  passing_score: 70,
  attemptCount: 329,
  avgScore: 82,
  passRate: 76,
  status: "published",
};

const quizForm = () => ({
  title: "Retinal circuits knowledge check",
  description: "Check the core concepts before continuing.",
  time_limit_minutes: 15,
  passing_score: 70,
  allow_multiple_attempts: true,
  show_correct_answers: true,
  questions: [],
});

const questionForm = () => ({
  question_text: "Which retinal cell releases glutamate in darkness?",
  question_type: "multiple_choice",
  options: [
    "Photoreceptor",
    "Horizontal cell",
    "Amacrine cell",
    "Ganglion cell",
  ],
  correct_answer: "Photoreceptor",
  points: 1,
});

export default {
  title: "Dashboard/Sections/QuizzesSection",
  component: QuizzesSection,
  tags: ["autodocs"],
  argTypes: {
    quizzes: { control: "object" },
    quizzesLoading: { control: "boolean" },
    quizzesError: { control: "text" },
    editingQuiz: {
      control: "object",
      description: "Non-null switches the editor to edit mode with questions.",
    },
    editingQuestion: { control: "object" },
    showQuizEditor: {
      control: "boolean",
      description: "v-model:showQuizEditor",
    },
    quizForm: { control: "object", description: "v-model:quizForm" },
    showQuestionEditor: {
      control: "boolean",
      description: "v-model:showQuestionEditor",
    },
    questionForm: { control: "object", description: "v-model:questionForm" },
  },
  args: {
    quizzes: [QUIZ],
    quizzesLoading: false,
    quizzesError: null,
    editingQuiz: null,
    editingQuestion: null,
    showQuizEditor: false,
    quizForm: quizForm(),
    showQuestionEditor: false,
    questionForm: questionForm(),
  },
  render: (args) => ({
    components: { QuizzesSection },
    setup: () => ({ args }),
    template: `
      <QuizzesSection
        v-bind="args"
        @update:showQuizEditor="args.showQuizEditor = $event"
        @update:quizForm="args.quizForm = $event"
        @update:showQuestionEditor="args.showQuestionEditor = $event"
        @update:questionForm="args.questionForm = $event"
        @open-quiz="args.showQuizEditor = true"
        @close-quiz="args.showQuizEditor = false"
        @open-question="args.showQuestionEditor = true"
        @close-question="args.showQuestionEditor = false"
      />`,
  }),
};

export const Populated = {};

/** The inline editor for a brand-new quiz — no questions section yet. */
export const NewQuizEditor = { args: { showQuizEditor: true } };

/** Editing an existing quiz: the questions list is shown. */
export const EditingWithQuestions = {
  args: {
    showQuizEditor: true,
    editingQuiz: QUIZ,
    quizForm: { ...quizForm(), questions: QUESTIONS },
  },
};

/** The question modal on top of the editor. */
export const QuestionEditor = {
  args: {
    showQuizEditor: true,
    editingQuiz: QUIZ,
    quizForm: { ...quizForm(), questions: QUESTIONS },
    showQuestionEditor: true,
  },
};

export const Empty = { args: { quizzes: [] } };

export const Loading = { args: { quizzesLoading: true } };

export const LoadError = {
  args: { quizzesError: "Quizzes could not be loaded." },
};
