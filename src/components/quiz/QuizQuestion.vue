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
.quiz-question {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.question-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.question-type {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
  font-weight: 500;
}

.question-number {
  font-size: 0.75rem;
  color: #9ca3af;
  font-weight: 500;
}

.question-text {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1.25rem;
  font-weight: 500;
  color: #1f2937;
  line-height: 1.5;
  margin: 0 0 1.5rem 0;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.options-list button {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1rem;
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
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  flex-shrink: 0;
}

.border-blue-500 .option-letter {
  background: #3b82f6;
  color: white;
}

.border-green-500 .option-letter {
  background: #22c55e;
  color: white;
}

.border-red-500 .option-letter {
  background: #ef4444;
  color: white;
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
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1rem;
  transition: all 0.15s;
}

.answer-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.answer-input:disabled {
  background: #f9fafb;
}

.answer-input.correct {
  border-color: #22c55e;
  background: #f0fdf4;
}

.answer-input.incorrect {
  border-color: #ef4444;
  background: #fef2f2;
}

.correct-answer-hint {
  margin: 0.75rem 0 0 0;
  font-size: 0.875rem;
  color: #16a34a;
}

.explanation {
  margin-top: 1.5rem;
  padding: 1rem;
  background: #f0f9ff;
  border-radius: 8px;
  border-left: 3px solid #3b82f6;
}

.explanation-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e40af;
  margin-bottom: 0.5rem;
}

.explanation-text {
  font-size: 0.9375rem;
  color: #374151;
  line-height: 1.5;
  margin: 0;
}

/* Tailwind-like utility classes */
.border-gray-200 {
  border-color: #e5e7eb;
}
.border-gray-300 {
  border-color: #d1d5db;
}
.border-blue-500 {
  border-color: #3b82f6;
}
.border-green-500 {
  border-color: #22c55e;
}
.border-red-500 {
  border-color: #ef4444;
}
.bg-blue-50 {
  background-color: #eff6ff;
}
.bg-green-50 {
  background-color: #f0fdf4;
}
.bg-red-50 {
  background-color: #fef2f2;
}
.bg-gray-50 {
  background-color: #f9fafb;
}
.text-green-500 {
  color: #22c55e;
}
.text-red-500 {
  color: #ef4444;
}
</style>
