<script setup>
/*
 * Book collection — reader-area components: reader UI atoms plus the quiz,
 * flashcard, lab and AI-tutor feature components. All rendered live with the
 * representative props verified by the catalog audit. Components that needed a
 * Pinia store / router / network to mount were excluded by that audit and are
 * not imported here.
 */
import { ref } from "vue";
import Specimen from "./Specimen.vue";

import ActionButton from "@/components/UI/ActionButton.vue";
import SourceElement from "@/components/UI/SourceElement.vue";
import StartEndIcon from "@/components/UI/StartEndIcon.vue";

import FlashcardCard from "@/components/flashcard/FlashcardCard.vue";
import FlashcardRating from "@/components/flashcard/FlashcardRating.vue";
import FlashcardStats from "@/components/flashcard/FlashcardStats.vue";

import Question from "@/components/quiz/Question.vue";
import QuizIntro from "@/components/quiz/QuizIntro.vue";
import QuizProgress from "@/components/quiz/QuizProgress.vue";
import QuizQuestion from "@/components/quiz/QuizQuestion.vue";
import QuizResults from "@/components/quiz/QuizResults.vue";
import QuizReview from "@/components/quiz/QuizReview.vue";

import StudyStats from "@/components/student/StudyStats.vue";

import CodeOutput from "@/components/lab/CodeOutput.vue";
import TestResults from "@/components/lab/TestResults.vue";
import CodeEditor from "@/components/lab/CodeEditor.vue";

import AITutorChat from "@/components/ai/AITutorChat.vue";

const code = ref("print('hello')");

// --- Sample data (from the verified catalog inventory) ---
const flashcard = { front_text: "Photoreceptor", back_text: "A neuron that converts light into electrical signals." };
const flashcardStats = { correct: 9, incorrect: 2, skipped: 1, duration: 185, totalCards: 12 };

const question = { q: "Which cell detects light", a: ["Rod", "Astrocyte", "Microglia"], c: 0 };
const quiz = {
  title: "The Retina",
  description: "Test your understanding of retinal anatomy.",
  quiz_questions: [{}, {}, {}, {}, {}],
  time_limit_minutes: 10,
  passing_score: 70,
};
const progressQuestions = Array.from({ length: 8 }, (_, i) => ({ id: `q${i + 1}` }));
const quizQuestion = {
  question_text: "Which cell first transduces light?",
  question_type: "multiple_choice",
  options: ["Rod", "Bipolar cell", "Ganglion cell"],
  correct_answer: "Rod",
  explanation: "Rods and cones are the photoreceptors.",
};
const reviewQuestions = [
  { id: "q1", question_text: "Which cell first transduces light?", question_type: "multiple_choice", options: ["Rod", "Bipolar cell"], correct_answer: "Rod" },
];

const studyStats = { timeSpentThisWeek: 5400, modulesCompleted: 3, highlightsMade: 24, notesTaken: 7 };
const codeResult = { output: "Hello, world!\n42", error: "", plots: [] };
const testResults = [
  { name: "returns correct sum", passed: true },
  { name: "handles empty list", passed: false, expected: "0", actual: "None" },
];
const messages = [
  { id: "1", role: "user", content: "What is a rod cell?", created_at: "2026-06-30T12:00:00Z" },
  { id: "2", role: "assistant", content: "A rod is a photoreceptor specialized for low-light vision.", created_at: "2026-06-30T12:00:05Z" },
];
</script>

<template>
  <div class="collection">
    <header class="col-head">
      <p class="t-label col-eyebrow">Components · Book</p>
      <h2 class="t-h2">Reader &amp; learning</h2>
      <p class="t-body-sm col-note">
        Components used in the reading experience — reader UI atoms plus the quiz,
        flashcard, code-lab and AI-tutor features. Shown with sample content.
      </p>
    </header>

    <!-- Actions -->
    <p class="t-label cat-eyebrow">Actions</p>
    <div class="grid">
      <Specimen name="ActionButton" import-path="UI/ActionButton.vue">
        <ActionButton text="Save" help="Saves your annotations" />
      </Specimen>
      <Specimen name="FlashcardRating" import-path="flashcard/FlashcardRating.vue">
        <FlashcardRating :disabled="false" />
      </Specimen>
    </div>

    <!-- Inputs -->
    <p class="t-label cat-eyebrow">Inputs</p>
    <div class="grid">
      <Specimen name="Question" import-path="quiz/Question.vue" note="legacy ch.1 quiz item">
        <Question :question="question" :num="1" />
      </Specimen>
      <Specimen name="QuizQuestion" import-path="quiz/QuizQuestion.vue" note="result shown">
        <QuizQuestion :question="quizQuestion" selected-answer="Rod" :show-result="true" :question-number="1" />
      </Specimen>
      <Specimen name="CodeEditor" import-path="lab/CodeEditor.vue">
        <CodeEditor v-model="code" language="python" :min-height="'180px'" />
      </Specimen>
    </div>

    <!-- Data display -->
    <p class="t-label cat-eyebrow">Data display</p>
    <div class="grid">
      <Specimen name="SourceElement" import-path="UI/SourceElement.vue">
        <SourceElement source="Source: Kandel, Principles of Neural Science" />
      </Specimen>
      <Specimen name="StartEndIcon" import-path="UI/StartEndIcon.vue">
        <StartEndIcon :paragraph="{ animation: { start: true } }" art="start" />
      </Specimen>
      <Specimen name="FlashcardCard" import-path="flashcard/FlashcardCard.vue">
        <FlashcardCard :card="flashcard" :is-flipped="false" :card-number="1" :total-cards="12" />
      </Specimen>
      <Specimen name="FlashcardStats" import-path="flashcard/FlashcardStats.vue">
        <FlashcardStats :stats="flashcardStats" />
      </Specimen>
      <Specimen name="QuizIntro" import-path="quiz/QuizIntro.vue">
        <QuizIntro :quiz="quiz" />
      </Specimen>
      <Specimen name="QuizReview" import-path="quiz/QuizReview.vue">
        <QuizReview :questions="reviewQuestions" :answers="{ q1: 'Rod' }" />
      </Specimen>
      <Specimen name="StudyStats" import-path="student/StudyStats.vue">
        <StudyStats :stats="studyStats" />
      </Specimen>
      <Specimen name="CodeOutput" import-path="lab/CodeOutput.vue">
        <CodeOutput :result="codeResult" :loading="false" />
      </Specimen>
      <Specimen name="AITutorChat" import-path="ai/AITutorChat.vue">
        <AITutorChat :messages="messages" :loading="false" :streaming="false" />
      </Specimen>
    </div>

    <!-- Feedback -->
    <p class="t-label cat-eyebrow">Feedback</p>
    <div class="grid">
      <Specimen name="QuizProgress" import-path="quiz/QuizProgress.vue">
        <QuizProgress
          :current="3"
          :total="8"
          :time-remaining="245"
          :answered-count="2"
          :show-question-nav="true"
          :answers="{ q1: 'A' }"
          :questions="progressQuestions"
        />
      </Specimen>
      <Specimen name="QuizResults" import-path="quiz/QuizResults.vue">
        <QuizResults :score="82" :passed="true" :correct-count="6" :total="8" :passing-score="70" :time-taken="240" />
      </Specimen>
      <Specimen name="TestResults" import-path="lab/TestResults.vue">
        <TestResults :results="testResults" :passed="false" />
      </Specimen>
    </div>
  </div>
</template>

<style scoped>
.col-head {
  margin-bottom: 3rem;
}
.col-eyebrow {
  color: rgb(var(--color-accent));
  margin-bottom: 0.75rem;
}
.col-note {
  color: rgb(var(--color-mute));
  max-width: 62ch;
  margin-top: 0.75rem;
}
.cat-eyebrow {
  color: rgb(var(--color-accent));
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgb(var(--color-line));
  margin: 3rem 0 1.5rem;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1.5rem;
}
</style>
