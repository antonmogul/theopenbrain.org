<script setup>
import { computed } from "vue";

const props = defineProps({
  question: {
    type: Object,
    required: true,
  },
  selectedAnswer: {
    type: String,
    default: null,
  },
  showResult: {
    type: Boolean,
    default: false,
  },
  questionNumber: {
    type: Number,
    default: 1,
  },
});

const emit = defineEmits(["answer"]);

const questionTypes = {
  multiple_choice: "Multiple Choice",
  true_false: "True / False",
  short_answer: "Short Answer",
};

function selectAnswer(answer) {
  if (!props.showResult) {
    emit("answer", answer);
  }
}

// Get options based on question type
const options = computed(() => {
  if (props.question.question_type === "true_false") {
    return ["True", "False"];
  }
  // Parse options if stored as JSON string
  if (typeof props.question.options === "string") {
    try {
      return JSON.parse(props.question.options);
    } catch (e) {
      return [];
    }
  }
  return props.question.options || [];
});

// Check if current answer is correct
const isAnswerCorrect = computed(() => {
  if (!props.showResult || !props.selectedAnswer) return null;
  if (props.question.question_type === "short_answer") {
    return (
      props.selectedAnswer.toLowerCase().trim() ===
      props.question.correct_answer.toLowerCase().trim()
    );
  }
  return props.selectedAnswer === props.question.correct_answer;
});

// Get option styling based on state
function getOptionClass(option) {
  const classes = [
    "w-full text-left p-4 rounded-lg border-2 transition-all",
  ];

  if (props.showResult) {
    // Show correct answer
    if (option === props.question.correct_answer) {
      classes.push("border-green-500 bg-green-50");
    }
    // Show wrong selected answer
    else if (
      props.selectedAnswer === option &&
      option !== props.question.correct_answer
    ) {
      classes.push("border-red-500 bg-red-50");
    } else {
      classes.push("border-gray-200 opacity-60");
    }
  } else {
    // Interactive state
    if (props.selectedAnswer === option) {
      classes.push("border-blue-500 bg-blue-50");
    } else {
      classes.push("border-gray-200 hover:border-gray-300 hover:bg-gray-50");
    }
  }

  return classes.join(" ");
}
</script>

<template>
  <div class="quiz-question" data-testid="quiz-question">
    <div class="question-header">
      <span class="question-type">{{
        questionTypes[question.question_type] || "Question"
      }}</span>
      <span class="question-number">Q{{ questionNumber }}</span>
    </div>

    <h3 class="question-text">
      {{ question.question_text }}
    </h3>

    <!-- Multiple Choice / True-False Options -->
    <div
      v-if="question.question_type !== 'short_answer'"
      class="options-list"
      data-testid="question-options"
    >
      <button
        v-for="(option, index) in options"
        :key="index"
        @click="selectAnswer(option)"
        :class="getOptionClass(option)"
        :disabled="showResult"
        :data-testid="`option-${index}`"
      >
        <div class="option-content">
          <span class="option-letter">
            {{ String.fromCharCode(65 + index) }}
          </span>
          <span class="option-text">{{ option }}</span>

          <!-- Result indicators -->
          <span v-if="showResult" class="result-indicator">
            <svg
              v-if="option === question.correct_answer"
              class="text-green-500"
              data-testid="answer-correct"
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
            <svg
              v-else-if="
                selectedAnswer === option &&
                option !== question.correct_answer
              "
              class="text-red-500"
              data-testid="answer-incorrect"
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
          </span>
        </div>
      </button>
    </div>

    <!-- Short Answer Input -->
    <div v-else class="short-answer-input">
      <input
        type="text"
        :value="selectedAnswer"
        @input="$emit('answer', $event.target.value)"
        :disabled="showResult"
        class="answer-input"
        :class="{
          correct: showResult && isAnswerCorrect,
          incorrect: showResult && !isAnswerCorrect && selectedAnswer,
        }"
        placeholder="Type your answer..."
        data-testid="short-answer-input"
      />

      <!-- Show correct answer if wrong -->
      <p
        v-if="showResult && !isAnswerCorrect"
        class="correct-answer-hint"
      >
        Correct answer: <strong>{{ question.correct_answer }}</strong>
      </p>
    </div>

    <!-- Explanation (shown after submit) -->
    <div v-if="showResult && question.explanation" class="explanation">
      <div class="explanation-header">
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
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        Explanation
      </div>
      <p class="explanation-text">{{ question.explanation }}</p>
    </div>
  </div>
</template>

<style scoped>
/* Quiz question — prototype QuizQuestion: serif question, ghost-button options,
   teal=correct / magenta=wrong+selected (design-system semantics). Option-state
   class NAMES are kept (getOptionClass logic untouched); only what they paint
   is remapped to tokens. */
.quiz-question {
  background: transparent;
  padding: 0;
}

.question-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.question-type,
.question-number {
  font-family: var(--font-mono);
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgb(var(--color-mute));
}

.question-text {
  font-family: var(--font-body);
  font-size: 2.2rem;
  font-weight: 500;
  color: rgb(var(--color-ink));
  line-height: 1.25;
  margin: 0 0 2rem 0;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.options-list button {
  font-family: var(--font-body);
  font-size: 1.5rem;
  cursor: pointer;
}

.options-list button:disabled {
  cursor: default;
}

.option-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.option-letter {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgb(var(--color-ink) / 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 1.1rem;
  color: rgb(var(--color-mute));
  flex-shrink: 0;
}

.border-blue-500 .option-letter {
  background: rgb(var(--color-accent));
  color: #fff;
}

.border-green-500 .option-letter {
  background: rgb(var(--color-complete));
  color: #0a3d33;
}

.border-red-500 .option-letter {
  background: rgb(var(--color-accent));
  color: #fff;
}

.option-text {
  flex: 1;
}

.result-indicator {
  flex-shrink: 0;
}

.short-answer-input {
  margin-top: 1rem;
}

.answer-input {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 1px solid rgb(var(--color-line));
  border-radius: 6px;
  font-family: var(--font-body);
  font-size: 1.5rem;
  background: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
  transition: border-color 0.12s ease;
}

.answer-input:focus {
  outline: none;
  border-color: rgb(var(--color-ink));
}

.answer-input:disabled {
  background: rgb(var(--color-bg));
}

.answer-input.correct {
  border-color: rgb(var(--color-complete));
  background: rgb(var(--color-complete) / 0.08);
}

.answer-input.incorrect {
  border-color: rgb(var(--color-accent));
  background: rgb(var(--color-accent) / 0.08);
}

.correct-answer-hint {
  margin: 0.75rem 0 0 0;
  font-family: var(--font-mono);
  font-size: 1.1rem;
  color: rgb(var(--color-complete));
}

.explanation {
  margin-top: 1.5rem;
  padding: 1rem 1.2rem;
  background: rgb(var(--color-ink) / 0.03);
  border-radius: 4px;
  border-left: 3px solid rgb(var(--color-complete));
}

.explanation-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-mono);
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgb(var(--color-ink));
  margin-bottom: 0.5rem;
}

.explanation-text {
  font-size: 1.4rem;
  color: rgb(var(--color-ink) / 0.8);
  line-height: 1.55;
  margin: 0;
}

/* Option-state classes (names from getOptionClass) → tokens.
   teal = correct, magenta = wrong/selected. */
.options-list button {
  padding: 1rem 1.2rem !important;
  border-radius: 4px !important;
  border-width: 1px !important;
  transition: border-color 0.12s ease, background 0.12s ease !important;
}
.border-gray-200 {
  border-color: rgb(var(--color-line));
}
.border-gray-300 {
  border-color: rgb(var(--color-ink) / 0.3);
}
.border-blue-500 {
  border-color: rgb(var(--color-accent));
}
.border-green-500 {
  border-color: rgb(var(--color-complete));
}
.border-red-500 {
  border-color: rgb(var(--color-accent));
}
.bg-blue-50 {
  background-color: rgb(var(--color-accent) / 0.08);
}
.bg-green-50 {
  background-color: rgb(var(--color-complete) / 0.08);
}
.bg-red-50 {
  background-color: rgb(var(--color-accent) / 0.08);
}
.bg-gray-50 {
  background-color: rgb(var(--color-ink) / 0.04);
}
.text-green-500 {
  color: rgb(var(--color-complete));
}
.text-red-500 {
  color: rgb(var(--color-accent));
}
</style>
