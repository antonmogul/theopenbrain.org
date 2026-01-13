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
.stats-container {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  max-width: 480px;
  margin: 0 auto;
  text-align: center;
}

.stats-header {
  margin-bottom: 1.5rem;
}

.checkmark-icon {
  width: 64px;
  height: 64px;
  background: #dcfce7;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  color: #16a34a;
}

.stats-title {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 0.25rem 0;
}

.performance-message {
  font-size: 1rem;
  color: #6b7280;
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: #f9fafb;
  border-radius: 12px;
  padding: 1rem;
}

.stat-card.accuracy.high {
  background: #dcfce7;
}

.stat-card.accuracy.low {
  background: #fef2f2;
}

.stat-card.correct {
  background: #dcfce7;
}

.stat-card.incorrect {
  background: #fef3c7;
}

.stat-card.skipped {
  background: #f3f4f6;
}

.stat-card.time {
  background: #eff6ff;
}

.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
}

.stat-card.accuracy.high .stat-value {
  color: #16a34a;
}

.stat-card.accuracy.low .stat-value {
  color: #dc2626;
}

.stat-card.correct .stat-value {
  color: #16a34a;
}

.stat-card.incorrect .stat-value {
  color: #d97706;
}

.stat-card.time .stat-value {
  color: #3b82f6;
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: #6b7280;
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
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-primary {
  background: #8b5cf6;
  color: white;
  border: none;
}

.btn-primary:hover {
  background: #7c3aed;
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #f3f4f6;
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
