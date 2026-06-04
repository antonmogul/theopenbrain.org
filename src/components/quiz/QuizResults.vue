<script setup>
import { computed } from "vue";

const props = defineProps({
  score: {
    type: Number,
    required: true,
  },
  passed: {
    type: Boolean,
    required: true,
  },
  correctCount: {
    type: Number,
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
  passingScore: {
    type: Number,
    default: 70,
  },
  timeTaken: {
    type: Number,
    default: null,
  },
});

const emit = defineEmits(["retry", "review", "close"]);

// Calculate stroke dasharray for circular progress
const circumference = 2 * Math.PI * 56; // radius = 56
const strokeDashoffset = computed(() => {
  return circumference - (props.score / 100) * circumference;
});

// Format time taken
const formattedTime = computed(() => {
  if (!props.timeTaken) return null;
  const mins = Math.floor(props.timeTaken / 60);
  const secs = props.timeTaken % 60;
  if (mins === 0) return `${secs} seconds`;
  return `${mins}m ${secs}s`;
});

// Performance message based on score
const performanceMessage = computed(() => {
  if (props.score >= 90) return "Excellent work!";
  if (props.score >= 80) return "Great job!";
  if (props.score >= 70) return "Good effort!";
  if (props.score >= 50) return "Keep practicing!";
  return "Don't give up!";
});
</script>

<template>
  <div class="quiz-results" data-testid="quiz-results">
    <!-- Score Circle -->
    <div class="score-circle-container">
      <svg class="score-circle" viewBox="0 0 128 128">
        <!-- Background circle -->
        <circle
          cx="64"
          cy="64"
          r="56"
          fill="none"
          stroke="rgb(var(--color-ink) / 0.08)"
          stroke-width="10"
        />
        <!-- Progress circle — teal pass / magenta fail (design semantics) -->
        <circle
          cx="64"
          cy="64"
          r="56"
          fill="none"
          :stroke="passed ? 'rgb(var(--color-complete))' : 'rgb(var(--color-accent))'"
          stroke-width="10"
          stroke-linecap="round"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="strokeDashoffset"
          class="progress-circle"
        />
      </svg>
      <div class="score-value">
        <span class="score-number">{{ score }}</span>
        <span class="score-percent">%</span>
      </div>
    </div>

    <!-- Result Message -->
    <div class="result-message" :class="{ passed: passed, failed: !passed }">
      <h2 class="result-title">
        {{ passed ? "Congratulations!" : "Keep Practicing!" }}
      </h2>
      <p class="performance-message">{{ performanceMessage }}</p>
    </div>

    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon correct">
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
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ correctCount }}</span>
          <span class="stat-label">Correct</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon incorrect">
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
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ total - correctCount }}</span>
          <span class="stat-label">Incorrect</span>
        </div>
      </div>

      <div v-if="formattedTime" class="stat-card">
        <div class="stat-icon time">
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
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ formattedTime }}</span>
          <span class="stat-label">Time Taken</span>
        </div>
      </div>
    </div>

    <!-- Passing info -->
    <p v-if="!passed" class="passing-info">
      You need <strong>{{ passingScore }}%</strong> to pass this quiz.
    </p>

    <!-- Actions -->
    <div class="actions">
      <button @click="$emit('review')" class="btn-secondary" data-testid="review-btn">
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
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
        Review Answers
      </button>

      <button @click="$emit('retry')" class="btn-outline" data-testid="retry-btn">
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
          <polyline points="23 4 23 10 17 10"></polyline>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
        </svg>
        Try Again
      </button>

      <button @click="$emit('close')" class="btn-primary" data-testid="continue-btn">
        Continue Learning
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Quiz results — token-driven, teal pass / magenta fail. */
.quiz-results {
  background: transparent;
  padding: 2rem;
  max-width: 480px;
  margin: 0 auto;
  text-align: center;
  font-family: var(--font-body);
  color: rgb(var(--color-ink));
}

.score-circle-container {
  position: relative;
  width: 160px;
  height: 160px;
  margin: 0 auto 1.5rem;
}

.score-circle {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.progress-circle {
  transition: stroke-dashoffset 1s ease-out;
}

.score-value {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.score-number {
  font-family: var(--font-body);
  font-size: 3.2rem;
  font-weight: 500;
  color: rgb(var(--color-ink));
}

.score-percent {
  font-size: 1.6rem;
  font-weight: 500;
  color: rgb(var(--color-mute));
  margin-left: 2px;
}

.result-message {
  margin-bottom: 1.5rem;
}

.result-title {
  font-family: var(--font-body);
  font-size: 2rem;
  font-weight: 500;
  margin: 0 0 0.25rem 0;
}

.result-message.passed .result-title {
  color: rgb(var(--color-complete));
}

.result-message.failed .result-title {
  color: rgb(var(--color-accent));
}

.performance-message {
  font-style: italic;
  font-size: 1.5rem;
  color: rgb(var(--color-ink) / 0.7);
  margin: 0;
}

.stats-grid {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 1px solid rgb(var(--color-line));
  border-radius: 4px;
}

.stat-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon.correct {
  background: rgb(var(--color-complete) / 0.15);
  color: rgb(var(--color-complete));
}

.stat-icon.incorrect {
  background: rgb(var(--color-accent) / 0.15);
  color: rgb(var(--color-accent));
}

.stat-icon.time {
  background: rgb(var(--color-ink) / 0.06);
  color: rgb(var(--color-mute));
}

.stat-content {
  display: flex;
  flex-direction: column;
  text-align: left;
}

.stat-value {
  font-family: var(--font-body);
  font-size: 1.4rem;
  font-weight: 500;
  color: rgb(var(--color-ink));
}

.stat-label {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgb(var(--color-mute));
}

.passing-info {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  color: rgb(var(--color-mute));
  margin: 0 0 1.5rem 0;
}

.passing-info strong {
  color: rgb(var(--color-ink));
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.btn-primary,
.btn-secondary,
.btn-outline {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.8rem 1.6rem;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
}

.btn-primary {
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
  border: 1px solid rgb(var(--color-ink));
}

.btn-primary:hover {
  background: rgb(var(--color-ink) / 0.85);
}

.btn-secondary,
.btn-outline {
  background: transparent;
  color: rgb(var(--color-ink));
  border: 1px solid rgb(var(--color-ink) / 0.85);
}

.btn-secondary:hover,
.btn-outline:hover {
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
}
</style>
