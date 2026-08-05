<script setup>
// Quiz "intro" screen (#16 split). Presentational: shows quiz metadata before
// the attempt starts. The parent QuizView owns quiz state and the timer.
defineProps({
  quiz: { type: Object, required: true },
});

defineEmits(["exit", "start"]);
</script>

<template>
  <div class="intro-container">
    <div class="intro-card">
      <p class="quiz-eyebrow">Assessment</p>

      <h1 class="quiz-title">{{ quiz.title }}</h1>

      <p v-if="quiz.description" class="quiz-description">
        {{ quiz.description }}
      </p>

      <div class="quiz-meta">
        <div class="meta-item">
          <span class="meta-value">{{ quiz.quiz_questions?.length || 0 }}</span>
          <span class="meta-label">Questions</span>
        </div>
        <div v-if="quiz.time_limit_minutes" class="meta-item">
          <span class="meta-value">{{ quiz.time_limit_minutes }}</span>
          <span class="meta-label">Minutes</span>
        </div>
        <div class="meta-item">
          <span class="meta-value">{{ quiz.passing_score || 70 }}%</span>
          <span class="meta-label">to Pass</span>
        </div>
      </div>

      <div class="intro-actions">
        <button @click="$emit('exit')" class="btn-secondary">Cancel</button>
        <button
          @click="$emit('start')"
          class="btn-primary"
          data-testid="start-quiz"
        >
          Start Quiz →
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.intro-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
}
.intro-card {
  background: transparent;
  padding: 1.5625rem;
  max-width: 480px;
  width: 100%;
  text-align: center;
}
.quiz-eyebrow {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgb(var(--color-accent));
  margin: 0 0 0.875rem;
}
.quiz-title {
  font-family: var(--font-body);
  font-size: 2rem;
  font-weight: 500;
  line-height: 1.05;
  letter-spacing: -0.01em;
  color: rgb(var(--color-ink));
  margin: 0 0 0.875rem 0;
}
.quiz-description {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 0.9375rem;
  color: rgb(var(--color-ink) / 0.7);
  line-height: 1.55;
  margin: 0 0 1.5rem 0;
}
.quiz-meta {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 1px solid rgb(var(--color-line));
  margin-bottom: 1.5rem;
}
.meta-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem 0.625rem;
  border-right: 1px solid rgb(var(--color-line));
}
.meta-item:last-child {
  border-right: none;
}
.meta-value {
  font-family: var(--font-body);
  font-size: 1.625rem;
  font-weight: 500;
  line-height: 1;
  color: rgb(var(--color-ink));
}
.meta-label {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgb(var(--color-mute));
  margin-top: 6px;
}
.intro-actions {
  display: flex;
  gap: 0.625rem;
  justify-content: center;
}

/* Shared pill buttons (kept local so this screen is self-contained) */
.btn-primary,
.btn-secondary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3125rem;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition:
    background 0.12s ease,
    color 0.12s ease,
    border-color 0.12s ease;
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
</style>
