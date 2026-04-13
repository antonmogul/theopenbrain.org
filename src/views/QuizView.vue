<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuizzes } from "@/composables/useQuizzes";
import { useAuth } from "@/composables/useAuth";

import QuizProgress from "@/components/quiz/QuizProgress.vue";
import QuizQuestion from "@/components/quiz/QuizQuestion.vue";
import QuizResults from "@/components/quiz/QuizResults.vue";

const route = useRoute();
const router = useRouter();
const { user, isAuthenticated } = useAuth();

const {
  currentQuiz,
  questions,
  currentQuestion,
  currentQuestionIndex,
  answers,
  loading,
  error,
  timeRemaining,
  formattedTimeRemaining,
  isTimeRunningLow,
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

// Quiz states
const quizState = ref("loading"); // loading, intro, taking, results, review
const results = ref(null);
const showConfirmSubmit = ref(false);

// Get quiz ID from route
const quizId = computed(() => route.params.quizId);

// Load quiz on mount
onMounted(async () => {
  if (!isAuthenticated.value) {
    router.push("/");
    return;
  }

  if (quizId.value) {
    try {
      const quiz = await fetchQuiz(quizId.value);
      currentQuiz.value = quiz;
      quizState.value = "intro";
    } catch (e) {
      console.error("QuizView: Error loading quiz:", e);
      quizState.value = "error";
    }
  }
});

// Cleanup on unmount
onUnmounted(() => {
  stopTimer();
  resetQuiz();
});

// Watch for time running out
watch(
  () => timeRemaining.value,
  (newTime) => {
    if (newTime === 0 && quizState.value === "taking") {
      handleSubmitQuiz();
    }
  }
);

// Start the quiz
async function handleStartQuiz() {
  try {
    await startQuiz(quizId.value);
    quizState.value = "taking";
  } catch (e) {
    console.error("QuizView: Error starting quiz:", e);
  }
}

// Handle answer selection
function handleAnswer(answer) {
  if (currentQuestion.value) {
    answerQuestion(currentQuestion.value.id, answer);
  }
}

// Handle next question
function handleNext() {
  if (isLastQuestion.value) {
    showConfirmSubmit.value = true;
  } else {
    nextQuestion();
  }
}

// Submit the quiz
async function handleSubmitQuiz() {
  showConfirmSubmit.value = false;
  try {
    results.value = await submitQuiz();
    quizState.value = "results";
  } catch (e) {
    console.error("QuizView: Error submitting quiz:", e);
  }
}

// Review answers
function handleReview() {
  quizState.value = "review";
}

// Retry quiz
async function handleRetry() {
  resetQuiz();
  try {
    await startQuiz(quizId.value);
    quizState.value = "taking";
  } catch (e) {
    console.error("QuizView: Error restarting quiz:", e);
  }
}

// Exit quiz
function handleExit() {
  router.push("/student");
}

// Go back to intro
function handleBack() {
  showConfirmSubmit.value = false;
}

// Navigate to specific question in review mode
function handleGoToQuestion(index) {
  goToQuestion(index);
}
</script>

<template>
  <div class="quiz-view">
    <!-- Loading State -->
    <div v-if="quizState === 'loading' || loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading quiz...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="quizState === 'error' || error" class="error-container">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <h2>Unable to load quiz</h2>
      <p>{{ error || "Quiz not found" }}</p>
      <button @click="handleExit" class="btn-primary">Go Back</button>
    </div>

    <!-- Quiz Intro -->
    <div v-else-if="quizState === 'intro' && currentQuiz" class="intro-container">
      <div class="intro-card">
        <div class="quiz-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>

        <h1 class="quiz-title">{{ currentQuiz.title }}</h1>

        <p v-if="currentQuiz.description" class="quiz-description">
          {{ currentQuiz.description }}
        </p>

        <div class="quiz-meta">
          <div class="meta-item">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
              ></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            <span>{{ currentQuiz.quiz_questions?.length || 0 }} Questions</span>
          </div>

          <div v-if="currentQuiz.time_limit_minutes" class="meta-item">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>{{ currentQuiz.time_limit_minutes }} Minutes</span>
          </div>

          <div class="meta-item">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>{{ currentQuiz.passing_score || 70 }}% to Pass</span>
          </div>
        </div>

        <div class="intro-actions">
          <button @click="handleExit" class="btn-secondary">Cancel</button>
          <button @click="handleStartQuiz" class="btn-primary" data-testid="start-quiz">
            Start Quiz
          </button>
        </div>
      </div>
    </div>

    <!-- Taking Quiz -->
    <div v-else-if="quizState === 'taking'" class="quiz-container">
      <div class="quiz-header">
        <button @click="handleExit" class="exit-btn" title="Exit Quiz">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <h2 class="header-title">{{ currentQuiz?.title }}</h2>
      </div>

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

      <div class="question-container">
        <QuizQuestion
          v-if="currentQuestion"
          :question="currentQuestion"
          :selected-answer="answers[currentQuestion.id]"
          :question-number="currentQuestionIndex + 1"
          :show-result="false"
          @answer="handleAnswer"
        />
      </div>

      <div class="quiz-navigation">
        <button
          @click="previousQuestion"
          :disabled="isFirstQuestion"
          class="nav-btn"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Previous
        </button>

        <button @click="handleNext" class="nav-btn primary" data-testid="next-question">
          {{ isLastQuestion ? "Submit Quiz" : "Next" }}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
    </div>

    <!-- Results -->
    <div v-else-if="quizState === 'results' && results" class="results-container">
      <QuizResults
        :score="results.score"
        :passed="results.passed"
        :correct-count="results.correctCount"
        :total="results.total"
        :passing-score="results.passingScore"
        :time-taken="results.timeTaken"
        @retry="handleRetry"
        @review="handleReview"
        @close="handleExit"
      />
    </div>

    <!-- Review Mode -->
    <div v-else-if="quizState === 'review'" class="review-container">
      <div class="review-header">
        <button @click="handleExit" class="btn-secondary">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Back to Dashboard
        </button>
        <h2>Review Your Answers</h2>
      </div>

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
        <button @click="handleExit" class="btn-primary">Continue Learning</button>
      </div>
    </div>

    <!-- Confirm Submit Modal -->
    <Teleport to="body">
      <div v-if="showConfirmSubmit" class="modal-overlay" @click.self="handleBack">
        <div class="confirm-modal">
          <h3>Submit Quiz?</h3>
          <p v-if="answeredCount < questions.length">
            You have answered {{ answeredCount }} of {{ questions.length }} questions.
            Unanswered questions will be marked as incorrect.
          </p>
          <p v-else>Are you ready to submit your answers?</p>
          <div class="modal-actions">
            <button @click="handleBack" class="btn-secondary">Go Back</button>
            <button @click="handleSubmitQuiz" class="btn-primary" data-testid="confirm-submit">
              Submit
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.quiz-view {
  min-height: 100vh;
  background: #f9fafb;
  padding: 1.5rem;
}

/* Loading State */
.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  gap: 1rem;
  color: #6b7280;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-container svg {
  color: #dc2626;
}

.error-container h2 {
  margin: 0;
  color: #1f2937;
}

/* Intro State */
.intro-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
}

.intro-card {
  background: white;
  border-radius: 16px;
  padding: 2.5rem;
  max-width: 480px;
  width: 100%;
  text-align: center;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
}

.quiz-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: #eff6ff;
  border-radius: 50%;
  margin: 0 auto 1.5rem;
  color: #3b82f6;
}

.quiz-title {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1.75rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 0.75rem 0;
}

.quiz-description {
  font-size: 1rem;
  color: #6b7280;
  line-height: 1.5;
  margin: 0 0 1.5rem 0;
}

.quiz-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1.5rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #4b5563;
  font-size: 0.9375rem;
}

.meta-item svg {
  color: #9ca3af;
}

.intro-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

/* Quiz Container */
.quiz-container {
  max-width: 800px;
  margin: 0 auto;
}

.quiz-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.exit-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  transition: all 0.15s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.exit-btn:hover {
  background: #fef2f2;
  color: #dc2626;
}

.header-title {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.question-container {
  margin: 1.5rem 0;
}

.quiz-navigation {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.nav-btn:hover:not(:disabled) {
  background: #f3f4f6;
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.nav-btn.primary {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.nav-btn.primary:hover {
  background: #2563eb;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.confirm-modal {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 400px;
  width: 100%;
  text-align: center;
}

.confirm-modal h3 {
  margin: 0 0 0.75rem 0;
  color: #1f2937;
}

.confirm-modal p {
  color: #6b7280;
  margin: 0 0 1.5rem 0;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

/* Results */
.results-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  padding: 2rem;
}

/* Review */
.review-container {
  max-width: 800px;
  margin: 0 auto;
}

.review-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.review-header h2 {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.review-questions {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.review-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
  padding: 1.5rem;
  background: white;
  border-radius: 12px;
}

/* Buttons */
.btn-primary,
.btn-secondary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 0.9375rem;
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
</style>
