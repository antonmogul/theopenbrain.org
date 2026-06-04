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
/* Quiz progress — prototype QuizQuestion header: mono counters, magenta
   progress bar, numbered chips (ink current, teal answered). */
.quiz-progress {
  background: transparent;
  padding: 0;
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
  gap: 0.2rem;
}

.question-count {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  color: rgb(var(--color-ink));
}

.question-count strong {
  font-weight: 600;
}

.answered-count {
  font-family: var(--font-mono);
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(var(--color-mute));
}

.timer {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.9rem;
  border: 1px solid rgb(var(--color-line));
  border-radius: 999px;
  color: rgb(var(--color-ink));
}

.timer.time-low {
  border-color: rgb(var(--color-accent));
  color: rgb(var(--color-accent));
  animation: pulse-warning 1s infinite;
}

@keyframes pulse-warning {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.time-value {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  font-variant-numeric: tabular-nums;
}

.progress-bar-container {
  height: 4px;
  background: rgb(var(--color-ink) / 0.08);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: rgb(var(--color-accent));
  transition: width 0.3s ease;
}

.question-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}

.nav-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgb(var(--color-line));
  background: transparent;
  font-family: var(--font-mono);
  font-size: 1.1rem;
  color: rgb(var(--color-ink));
  cursor: pointer;
  transition: border-color 0.12s ease, background 0.12s ease, color 0.12s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-dot:hover {
  border-color: rgb(var(--color-ink));
}

.nav-dot.current {
  border-color: rgb(var(--color-ink));
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
}

.nav-dot.answered:not(.current) {
  border-color: rgb(var(--color-complete));
  background: rgb(var(--color-complete) / 0.12);
  color: rgb(var(--color-complete));
}
</style>
