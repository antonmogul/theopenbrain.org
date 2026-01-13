<script setup>
import { computed } from "vue";

const props = defineProps({
  current: {
    type: Number,
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
  timeRemaining: {
    type: Number,
    default: 0,
  },
  answeredCount: {
    type: Number,
    default: 0,
  },
  showQuestionNav: {
    type: Boolean,
    default: false,
  },
  answers: {
    type: Object,
    default: () => ({}),
  },
  questions: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["go-to-question"]);

const progressPercentage = computed(() => {
  if (props.total === 0) return 0;
  return Math.round((props.current / props.total) * 100);
});

const formattedTime = computed(() => {
  if (!props.timeRemaining) return null;
  const mins = Math.floor(props.timeRemaining / 60);
  const secs = props.timeRemaining % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
});

const isTimeRunningLow = computed(() => props.timeRemaining > 0 && props.timeRemaining < 60);

function isQuestionAnswered(questionId) {
  return questionId in props.answers;
}

function goToQuestion(index) {
  emit("go-to-question", index);
}
</script>

<template>
  <div class="quiz-progress" data-testid="quiz-progress">
    <div class="progress-header">
      <div class="progress-info">
        <span class="question-count">
          Question <strong>{{ current }}</strong> of <strong>{{ total }}</strong>
        </span>
        <span class="answered-count">
          {{ answeredCount }} / {{ total }} answered
        </span>
      </div>

      <div v-if="formattedTime" class="timer" :class="{ 'time-low': isTimeRunningLow }" data-testid="quiz-timer">
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
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <span class="time-value">{{ formattedTime }}</span>
      </div>
    </div>

    <!-- Progress bar -->
    <div class="progress-bar-container">
      <div
        class="progress-bar"
        :style="{ width: progressPercentage + '%' }"
      ></div>
    </div>

    <!-- Question navigation dots (optional) -->
    <div v-if="showQuestionNav && questions.length > 0" class="question-nav">
      <button
        v-for="(question, index) in questions"
        :key="question.id"
        @click="goToQuestion(index)"
        class="nav-dot"
        :class="{
          'current': index === current - 1,
          'answered': isQuestionAnswered(question.id),
        }"
        :title="`Question ${index + 1}`"
      >
        {{ index + 1 }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.quiz-progress {
  background: white;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.progress-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.question-count {
  font-size: 0.9375rem;
  color: #374151;
}

.question-count strong {
  font-weight: 600;
  color: #1f2937;
}

.answered-count {
  font-size: 0.75rem;
  color: #9ca3af;
}

.timer {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: #f3f4f6;
  border-radius: 6px;
  color: #4b5563;
}

.timer.time-low {
  background: #fef2f2;
  color: #dc2626;
  animation: pulse-warning 1s infinite;
}

@keyframes pulse-warning {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.time-value {
  font-size: 0.9375rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.progress-bar-container {
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.question-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #f3f4f6;
}

.nav-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid #e5e7eb;
  background: white;
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-dot:hover {
  border-color: #3b82f6;
  color: #3b82f6;
}

.nav-dot.current {
  border-color: #3b82f6;
  background: #3b82f6;
  color: white;
}

.nav-dot.answered:not(.current) {
  border-color: #22c55e;
  background: #dcfce7;
  color: #16a34a;
}
</style>
