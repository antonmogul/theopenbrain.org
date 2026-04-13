<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useQuizzes } from "@/composables/useQuizzes";

import QuizProgress from "@/components/quiz/QuizProgress.vue";
import QuizQuestion from "@/components/quiz/QuizQuestion.vue";
import QuizResults from "@/components/quiz/QuizResults.vue";

const props = defineProps({
  quizId: { type: String, required: true },
});

const emit = defineEmits(["close"]);

const {
  currentQuiz,
  questions,
  currentQuestion,
  currentQuestionIndex,
  answers,
  loading,
  error,
  timeRemaining,
  progress,
  isLastQuestion,
  isFirstQuestion,
  answeredCount,
  fetchQuiz,
  startQuiz,
  answerQuestion,
  nextQuestion,
  previousQuestion,
  goToQuestion,
  submitQuiz,
  resetQuiz,
  stopTimer,
} = useQuizzes();

const quizState = ref("loading");
const results = ref(null);
const showConfirmSubmit = ref(false);

onMounted(async () => {
  if (props.quizId) {
    try {
      const quiz = await fetchQuiz(props.quizId);
      currentQuiz.value = quiz;
      quizState.value = "intro";
    } catch (e) {
      console.error("QuizPanel: Error loading quiz:", e);
      quizState.value = "error";
    }
  }
});

onUnmounted(() => {
  stopTimer();
  resetQuiz();
});

watch(
  () => timeRemaining.value,
  (newTime) => {
    if (newTime === 0 && quizState.value === "taking") {
      handleSubmitQuiz();
    }
  }
);

async function handleStartQuiz() {
  try {
    await startQuiz(props.quizId);
    quizState.value = "taking";
  } catch (e) {
    console.error("QuizPanel: Error starting quiz:", e);
  }
}

function handleAnswer(answer) {
  if (currentQuestion.value) {
    answerQuestion(currentQuestion.value.id, answer);
  }
}

function handleNext() {
  if (isLastQuestion.value) {
    showConfirmSubmit.value = true;
  } else {
    nextQuestion();
  }
}

async function handleSubmitQuiz() {
  showConfirmSubmit.value = false;
  try {
    results.value = await submitQuiz();
    quizState.value = "results";
  } catch (e) {
    console.error("QuizPanel: Error submitting quiz:", e);
  }
}

function handleReview() {
  quizState.value = "review";
}

async function handleRetry() {
  resetQuiz();
  try {
    await startQuiz(props.quizId);
    quizState.value = "taking";
  } catch (e) {
    console.error("QuizPanel: Error restarting quiz:", e);
  }
}

function handleGoToQuestion(index) {
  goToQuestion(index);
}
</script>

<template>
  <div class="quiz-panel">
    <!-- Loading -->
    <div v-if="quizState === 'loading' || loading" class="state-center">
      <div class="spinner"></div>
      <p>Loading quiz...</p>
    </div>

    <!-- Error -->
    <div v-else-if="quizState === 'error' || error" class="state-center">
      <p class="error-text">{{ error || "Unable to load quiz" }}</p>
      <button @click="emit('close')" class="btn-primary">Close</button>
    </div>

    <!-- Intro -->
    <div v-else-if="quizState === 'intro' && currentQuiz" class="intro">
      <h3 class="intro-title">{{ currentQuiz.title }}</h3>
      <p v-if="currentQuiz.description" class="intro-desc">{{ currentQuiz.description }}</p>

      <div class="intro-meta">
        <span>{{ currentQuiz.quiz_questions?.length || 0 }} Questions</span>
        <span v-if="currentQuiz.time_limit_minutes">{{ currentQuiz.time_limit_minutes }} min</span>
        <span>{{ currentQuiz.passing_score || 70 }}% to pass</span>
      </div>

      <div class="intro-actions">
        <button @click="emit('close')" class="btn-secondary">Cancel</button>
        <button @click="handleStartQuiz" class="btn-primary">Start Quiz</button>
      </div>
    </div>

    <!-- Taking -->
    <div v-else-if="quizState === 'taking'" class="taking">
      <QuizProgress
        :current="progress.current"
        :total="progress.total"
        :time-remaining="timeRemaining"
        :answered-count="answeredCount"
        :show-question-nav="true"
        :questions="questions"
        :answers="answers"
        @go-to-question="handleGoToQuestion"
      />

      <div class="question-area">
        <QuizQuestion
          v-if="currentQuestion"
          :question="currentQuestion"
          :selected-answer="answers[currentQuestion.id]"
          :question-number="currentQuestionIndex + 1"
          :show-result="false"
          @answer="handleAnswer"
        />
      </div>

      <div class="nav-row">
        <button @click="previousQuestion" :disabled="isFirstQuestion" class="btn-secondary">Previous</button>
        <button @click="handleNext" class="btn-primary">
          {{ isLastQuestion ? "Submit Quiz" : "Next" }}
        </button>
      </div>
    </div>

    <!-- Results -->
    <div v-else-if="quizState === 'results' && results" class="results">
      <QuizResults
        :score="results.score"
        :passed="results.passed"
        :correct-count="results.correctCount"
        :total="results.total"
        :passing-score="results.passingScore"
        :time-taken="results.timeTaken"
        @retry="handleRetry"
        @review="handleReview"
        @close="emit('close')"
      />
    </div>

    <!-- Review -->
    <div v-else-if="quizState === 'review'" class="review">
      <div class="review-questions">
        <QuizQuestion
          v-for="(question, index) in questions"
          :key="question.id"
          :question="question"
          :selected-answer="answers[question.id]"
          :question-number="index + 1"
          :show-result="true"
        />
      </div>
      <div class="review-actions">
        <button @click="handleRetry" class="btn-secondary">Try Again</button>
        <button @click="emit('close')" class="btn-primary">Done</button>
      </div>
    </div>

    <!-- Confirm Submit -->
    <div v-if="showConfirmSubmit" class="confirm-overlay" @click.self="showConfirmSubmit = false">
      <div class="confirm-box">
        <h3>Submit Quiz?</h3>
        <p v-if="answeredCount < questions.length">
          You answered {{ answeredCount }} of {{ questions.length }} questions.
          Unanswered questions will be marked incorrect.
        </p>
        <p v-else>Ready to submit?</p>
        <div class="confirm-actions">
          <button @click="showConfirmSubmit = false" class="btn-secondary">Go Back</button>
          <button @click="handleSubmitQuiz" class="btn-primary">Submit</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.quiz-panel {
  position: relative;
  min-height: 400px;
  font-size: 16px;
}

.state-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  gap: 16px;
  color: #6b7280;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-text {
  color: #dc2626;
  font-weight: 500;
}

/* Intro */
.intro {
  text-align: center;
  padding: 1rem 0;
}

.intro-title {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 28px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px;
}

.intro-desc {
  color: #6b7280;
  margin: 0 0 20px;
  line-height: 1.5;
  font-size: 16px;
}

.intro-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 20px;
  margin-bottom: 24px;
  font-size: 15px;
  color: #4b5563;
}

.intro-actions,
.nav-row,
.review-actions,
.confirm-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

/* Taking */
.taking {
  padding: 0.5rem 0;
}

.question-area {
  margin: 1.25rem 0;
}

/* Review */
.review-questions {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}

.review-actions {
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

/* Confirm overlay */
.confirm-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  z-index: 10;
}

.confirm-box {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 360px;
  width: 90%;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.confirm-box h3 {
  margin: 0 0 0.5rem;
  color: #1f2937;
}

.confirm-box p {
  color: #6b7280;
  margin: 0 0 1.25rem;
  font-size: 0.9375rem;
}

/* Buttons */
.btn-primary,
.btn-secondary {
  padding: 10px 20px;
  border-radius: 8px;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  border: none;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #f3f4f6;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
