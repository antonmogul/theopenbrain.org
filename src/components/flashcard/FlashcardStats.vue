<script setup>
import { computed } from "vue";

const props = defineProps({
  stats: {
    type: Object,
    required: true,
    // { correct, incorrect, skipped, duration, totalCards }
  },
});

defineEmits(["continue", "study-again"]);

const accuracy = computed(() => {
  const total = props.stats.correct + props.stats.incorrect;
  if (total === 0) return 0;
  return Math.round((props.stats.correct / total) * 100);
});

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
};

const performanceMessage = computed(() => {
  if (accuracy.value >= 90) return "Excellent memory!";
  if (accuracy.value >= 75) return "Great progress!";
  if (accuracy.value >= 50) return "Keep practicing!";
  return "Don't give up!";
});

const cardsReviewed = computed(() => props.stats.correct + props.stats.incorrect);
</script>

<template>
  <div class="stats-container" data-testid="flashcard-stats">
    <div class="stats-header">
      <div class="checkmark-icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
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
      <h2 class="stats-title">Session Complete!</h2>
      <p class="performance-message">{{ performanceMessage }}</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-value">{{ cardsReviewed }}</span>
        <span class="stat-label">Cards Reviewed</span>
      </div>

      <div class="stat-card accuracy" :class="{ 'high': accuracy >= 75, 'low': accuracy < 50 }">
        <span class="stat-value">{{ accuracy }}%</span>
        <span class="stat-label">Accuracy</span>
      </div>

      <div class="stat-card correct">
        <span class="stat-value">{{ stats.correct }}</span>
        <span class="stat-label">Correct</span>
      </div>

      <div class="stat-card incorrect">
        <span class="stat-value">{{ stats.incorrect }}</span>
        <span class="stat-label">Needs Review</span>
      </div>

      <div v-if="stats.skipped > 0" class="stat-card skipped">
        <span class="stat-value">{{ stats.skipped }}</span>
        <span class="stat-label">Skipped</span>
      </div>

      <div class="stat-card time">
        <span class="stat-value">{{ formatDuration(stats.duration) }}</span>
        <span class="stat-label">Study Time</span>
      </div>
    </div>

    <div class="stats-actions">
      <button
        @click="$emit('study-again')"
        class="btn-secondary"
        data-testid="study-again"
      >
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
        Study Again
      </button>

      <button
        @click="$emit('continue')"
        class="btn-primary"
        data-testid="continue-learning"
      >
        Continue Learning
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Flashcard session summary — token-driven; teal=correct/high, magenta=low,
   amber=incorrect. Bordered stat cards, mono labels, serif values. */
.stats-container {
  background: transparent;
  padding: 2rem;
  max-width: 480px;
  margin: 0 auto;
  text-align: center;
  font-family: var(--font-body);
  color: rgb(var(--color-ink));
}

.stats-header {
  margin-bottom: 1.5rem;
}

.checkmark-icon {
  width: 64px;
  height: 64px;
  background: rgb(var(--color-complete) / 0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  color: rgb(var(--color-complete));
}

.stats-title {
  font-family: var(--font-body);
  font-size: 2rem;
  font-weight: 500;
  color: rgb(var(--color-ink));
  margin: 0 0 0.25rem 0;
}

.performance-message {
  font-style: italic;
  font-size: 1.5rem;
  color: rgb(var(--color-ink) / 0.7);
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: transparent;
  border: 1px solid rgb(var(--color-line));
  border-radius: 4px;
  padding: 1rem;
}

.stat-value {
  display: block;
  font-family: var(--font-body);
  font-size: 2rem;
  font-weight: 500;
  color: rgb(var(--color-ink));
}

.stat-card.accuracy.high .stat-value,
.stat-card.correct .stat-value {
  color: rgb(var(--color-complete));
}

.stat-card.accuracy.low .stat-value {
  color: rgb(var(--color-accent));
}

.stat-card.incorrect .stat-value {
  color: rgb(var(--color-warn));
}

.stat-card.time .stat-value {
  color: rgb(var(--color-ink));
}

.stat-label {
  display: block;
  font-family: var(--font-mono);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgb(var(--color-mute));
  margin-top: 0.25rem;
}

.stats-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.btn-primary,
.btn-secondary {
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

.btn-secondary {
  background: transparent;
  color: rgb(var(--color-ink));
  border: 1px solid rgb(var(--color-ink) / 0.85);
}

.btn-secondary:hover {
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
}

/* Responsive */
@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .stats-actions {
    flex-direction: column;
  }
}
</style>
