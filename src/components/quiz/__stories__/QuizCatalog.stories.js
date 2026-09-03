import Question from "../Question.vue";
import QuizCard from "../QuizCard.vue";
import QuizIntro from "../QuizIntro.vue";
import QuizProgress from "../QuizProgress.vue";
import QuizQuestion from "../QuizQuestion.vue";
import QuizResults from "../QuizResults.vue";
import QuizReview from "../QuizReview.vue";
import {
  apiFixtures,
  quizFixture,
  quizQuestions,
} from "@/stories/openBrainFixtures";

export default {
  title: "Student/Quizzes",
  parameters: { auth: { authenticated: true }, api: apiFixtures },
  decorators: [
    () => ({
      template: '<div style="max-width:900px;padding:24px"><story /></div>',
    }),
  ],
};

export const LegacyQuestion = {
  render: () => ({
    components: { Question },
    data: () => ({
      question: {
        q: "Which cell detects light",
        a: ["Rod", "Astrocyte", "Microglia"],
        c: 0,
      },
    }),
    template:
      '<div style="position:relative;min-height:420px"><Question :question="question" :num="1" /></div>',
  }),
};
export const AvailableQuiz = {
  render: () => ({
    components: { QuizCard },
    data: () => ({ quiz: quizFixture }),
    template: '<QuizCard :quiz="quiz" />',
  }),
};
export const Introduction = {
  render: () => ({
    components: { QuizIntro },
    data: () => ({ quiz: quizFixture }),
    template: '<QuizIntro :quiz="quiz" />',
  }),
};
export const TimedProgress = {
  render: () => ({
    components: { QuizProgress },
    data: () => ({
      questions: quizQuestions,
      answers: { "question-1": "Rods and cones" },
    }),
    template:
      '<QuizProgress :current="2" :total="2" :time-remaining="54" :answered-count="1" :show-question-nav="true" :questions="questions" :answers="answers" />',
  }),
};
export const AnswerFeedback = {
  render: () => ({
    components: { QuizQuestion },
    data: () => ({ question: quizQuestions[0] }),
    template:
      '<QuizQuestion :question="question" selected-answer="Bipolar cells" :show-result="true" :question-number="1" />',
  }),
};
export const PassedResults = {
  render: () => ({
    components: { QuizResults },
    template:
      '<QuizResults :score="86" :passed="true" :correct-count="6" :total="7" :time-taken="436" />',
  }),
};
export const ReviewAnswers = {
  render: () => ({
    components: { QuizReview },
    data: () => ({
      questions: quizQuestions,
      answers: { "question-1": "Rods and cones", "question-2": "False" },
    }),
    template: '<QuizReview :questions="questions" :answers="answers" />',
  }),
};
