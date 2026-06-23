<script setup>
// Quiz "review" screen (#16 split). Presentational: lists answered questions
// with results. Wraps the already-extracted QuizQuestion component.
import QuizQuestion from "@/components/quiz/QuizQuestion.vue";

defineProps({
    questions: { type: Array, default: () => [] },
    answers: { type: Object, default: () => ({}) },
});

defineEmits(["exit", "retry"]);
</script>

<template>
    <div class="review-container">
        <div class="review-header">
            <button @click="$emit('exit')" class="btn-secondary">
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
            <button @click="$emit('retry')" class="btn-secondary">Try Again</button>
            <button @click="$emit('exit')" class="btn-primary">Continue Learning</button>
        </div>
    </div>
</template>

<style scoped>
.review-container { max-width: 800px; margin: 0 auto; }
.review-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
.review-header h2 { font-family: var(--font-body); font-size: 2rem; font-weight: 500; color: rgb(var(--color-ink)); margin: 0; }
.review-questions { display: flex; flex-direction: column; gap: 1.5rem; }
.review-actions { display: flex; justify-content: center; gap: 1rem; margin-top: 2rem; padding: 1.5rem; background: white; border-radius: 12px; }

/* Shared pill buttons (kept local so this screen is self-contained) */
.btn-primary, .btn-secondary {
    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
    padding: 0.8rem 1.6rem; border-radius: 999px; font-family: var(--font-mono);
    font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.08em; cursor: pointer;
    transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
}
.btn-primary { background: rgb(var(--color-ink)); color: rgb(var(--color-paper)); border: 1px solid rgb(var(--color-ink)); }
.btn-primary:hover { background: rgb(var(--color-ink) / 0.85); }
.btn-secondary { background: transparent; color: rgb(var(--color-ink)); border: 1px solid rgb(var(--color-ink) / 0.85); }
.btn-secondary:hover { background: rgb(var(--color-ink)); color: rgb(var(--color-paper)); }
</style>
