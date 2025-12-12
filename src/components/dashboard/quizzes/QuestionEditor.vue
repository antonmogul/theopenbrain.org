<script setup>
/**
 * QuestionEditor Component
 *
 * Modal for creating/editing quiz questions.
 */

import { computed } from 'vue';
import BaseModal from '../shared/BaseModal.vue';
import { QUESTION_TYPES } from '@/constants/dashboard';

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  editing: {
    type: Boolean,
    default: false,
  },
  form: {
    type: Object,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['close', 'submit', 'update:form']);

const title = computed(() => props.editing ? 'Edit Question' : 'Add Question');

const questionTypes = [
  { value: QUESTION_TYPES.MULTIPLE_CHOICE, label: 'Multiple Choice' },
  { value: QUESTION_TYPES.TRUE_FALSE, label: 'True/False' },
  { value: QUESTION_TYPES.SHORT_ANSWER, label: 'Short Answer' },
];

function updateField(field, value) {
  emit('update:form', { ...props.form, [field]: value });
}

function updateOption(index, value) {
  const options = [...props.form.options];
  options[index] = value;
  updateField('options', options);
}

function addOption() {
  updateField('options', [...props.form.options, '']);
}

function removeOption(index) {
  const options = props.form.options.filter((_, i) => i !== index);
  updateField('options', options);

  // Reset correct answer if it was removed
  if (props.form.correct_answer === props.form.options[index]) {
    updateField('correct_answer', '');
  }
}

function handleSubmit() {
  if (!props.form.question_text) return;
  emit('submit');
}
</script>

<template>
  <BaseModal :show="show" :title="title" size="lg" @close="emit('close')">
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Question text -->
      <div>
        <label for="question_text" class="block text-sm font-medium text-gray-700 mb-1">
          Question <span class="text-red-500">*</span>
        </label>
        <textarea
          id="question_text"
          :value="form.question_text"
          @input="updateField('question_text', $event.target.value)"
          placeholder="Enter your question..."
          rows="3"
          class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          required
        />
      </div>

      <!-- Question type and points -->
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label for="question_type" class="block text-sm font-medium text-gray-700 mb-1">
            Question Type
          </label>
          <select
            id="question_type"
            :value="form.question_type"
            @change="updateField('question_type', $event.target.value)"
            class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option v-for="type in questionTypes" :key="type.value" :value="type.value">
              {{ type.label }}
            </option>
          </select>
        </div>

        <div>
          <label for="points" class="block text-sm font-medium text-gray-700 mb-1">
            Points
          </label>
          <input
            id="points"
            type="number"
            min="1"
            :value="form.points"
            @input="updateField('points', parseInt($event.target.value))"
            class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      <!-- Options (for multiple choice) -->
      <div v-if="form.question_type === QUESTION_TYPES.MULTIPLE_CHOICE">
        <div class="flex items-center justify-between mb-2">
          <label class="block text-sm font-medium text-gray-700">
            Answer Options
          </label>
          <button
            type="button"
            @click="addOption"
            class="text-sm text-indigo-600 hover:text-indigo-700"
          >
            + Add option
          </button>
        </div>

        <div class="space-y-2">
          <div
            v-for="(option, index) in form.options"
            :key="index"
            class="flex items-center gap-2"
          >
            <input
              type="radio"
              :name="'correct-answer'"
              :value="option"
              :checked="form.correct_answer === option"
              @change="updateField('correct_answer', option)"
              class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
              :disabled="!option"
            />
            <input
              type="text"
              :value="option"
              @input="updateOption(index, $event.target.value)"
              :placeholder="`Option ${index + 1}`"
              class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            <button
              v-if="form.options.length > 2"
              type="button"
              @click="removeOption(index)"
              class="p-1 text-gray-400 hover:text-red-600"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <p class="mt-2 text-xs text-gray-500">Select the correct answer by clicking the radio button</p>
      </div>

      <!-- True/False options -->
      <div v-else-if="form.question_type === QUESTION_TYPES.TRUE_FALSE">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Correct Answer
        </label>
        <div class="flex gap-4">
          <label class="flex items-center">
            <input
              type="radio"
              :checked="form.correct_answer === 'true'"
              @change="updateField('correct_answer', 'true')"
              class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
            />
            <span class="ml-2 text-sm text-gray-700">True</span>
          </label>
          <label class="flex items-center">
            <input
              type="radio"
              :checked="form.correct_answer === 'false'"
              @change="updateField('correct_answer', 'false')"
              class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
            />
            <span class="ml-2 text-sm text-gray-700">False</span>
          </label>
        </div>
      </div>

      <!-- Short answer -->
      <div v-else-if="form.question_type === QUESTION_TYPES.SHORT_ANSWER">
        <label for="correct_answer" class="block text-sm font-medium text-gray-700 mb-1">
          Correct Answer
        </label>
        <input
          id="correct_answer"
          type="text"
          :value="form.correct_answer"
          @input="updateField('correct_answer', $event.target.value)"
          placeholder="Enter the expected answer"
          class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        <p class="mt-1 text-xs text-gray-500">Answers will be compared case-insensitively</p>
      </div>
    </form>

    <template #footer>
      <div class="flex justify-end gap-3">
        <button
          type="button"
          @click="emit('close')"
          :disabled="loading"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          @click="handleSubmit"
          :disabled="loading || !form.question_text"
          class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {{ editing ? 'Update Question' : 'Add Question' }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>
