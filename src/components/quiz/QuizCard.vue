<script setup>
import { ref, onMounted } from "vue";
import { useQuizzes } from "@/composables/useQuizzes";

const props = defineProps({
  quiz: {
    type: Object,
    required: true,
  },
  showStartButton: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["start"]);

const { getBestScore } = useQuizzes();
const bestScore = ref(null);
const loadingScore = ref(true);

onMounted(async () => {
  try {
    bestScore.value = await getBestScore(props.quiz.id);
  } catch (e) {
    console.error("QuizCard: Error fetching best score:", e);
  } finally {
    loadingScore.value = false;
  }
});

function handleStart() {
  emit("start", props.quiz.id);
}

// Get question count from the quiz data
const questionCount =
  props.quiz.quiz_questions?.length ||
  props.quiz.quiz_questions?.[0]?.count ||
  0;
</script>

<template>
  <div class="quiz-card" data-testid="quiz-card">
    <div class="card-header">
      <h3 class="quiz-title">{{ quiz.title }}</h3>
      <div v-if="bestScore !== null" class="best-score">
        <span class="score-label">Best:</span>
        <span
          class="score-value"
          :class="bestScore >= (quiz.passing_score || 70) ? 'passed' : 'failed'"
        >
          {{ bestScore }}%
        </span>
      </div>
    </div>

    <p v-if="quiz.description" class="quiz-description">
      {{ quiz.description }}
    </p>

    <div class="quiz-meta">
      <div class="meta-item">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
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
        <span>{{ questionCount }} questions</span>
      </div>

      <div v-if="quiz.time_limit_minutes" class="meta-item">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
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
        <span>{{ quiz.time_limit_minutes }} min</span>
      </div>

      <div class="meta-item">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
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
        <span>Pass: {{ quiz.passing_score || 70 }}%</span>
      </div>
    </div>

    <button
      v-if="showStartButton"
      @click="handleStart"
      class="start-btn"
      data-testid="start-quiz-btn"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg>
      Start Quiz
    </button>
  </div>
</template>

<style scoped>
.quiz-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 1.5rem;
  transition: all 0.2s;
}

.quiz-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.quiz-title {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.best-score {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.score-label {
  font-size: 0.75rem;
  color: #6b7280;
}

.score-value {
  font-size: 0.875rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
}

.score-value.passed {
  background: #dcfce7;
  color: #16a34a;
}

.score-value.failed {
  background: #fef2f2;
  color: #dc2626;
}

.quiz-description {
  font-size: 0.9375rem;
  color: #6b7280;
  line-height: 1.5;
  margin: 0 0 1rem 0;
}

.quiz-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.meta-item svg {
  color: #9ca3af;
}

.start-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.start-btn:hover {
  background: #2563eb;
}

.start-btn svg {
  margin-left: -2px;
}
</style>
