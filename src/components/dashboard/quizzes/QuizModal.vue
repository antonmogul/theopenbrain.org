<script setup>
/**
 * QuizModal Component
 *
 * Modal for creating/editing quizzes.
 */

import { computed } from 'vue';
import BaseModal from '../shared/BaseModal.vue';

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

const title = computed(() => props.editing ? 'Edit Quiz' : 'Create New Quiz');

function updateField(field, value) {
  emit('update:form', { ...props.form, [field]: value });
}

function handleSubmit() {
  if (!props.form.title) return;
  emit('submit');
}
</script>

<template>
  <BaseModal :show="show" :title="title" size="lg" @close="emit('close')">
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Basic info -->
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label for="title" class="block text-sm font-medium text-gray-700 mb-1">
            Title <span class="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            :value="form.title"
            @input="updateField('title', $event.target.value)"
            placeholder="Quiz title"
            class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            required
          />
        </div>

        <div class="sm:col-span-2">
          <label for="description" class="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            :value="form.description"
            @input="updateField('description', $event.target.value)"
            placeholder="Describe this quiz..."
            rows="3"
            class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      <!-- Settings -->
      <div class="border-t border-gray-200 pt-6">
        <h4 class="text-sm font-medium text-gray-900 mb-4">Quiz Settings</h4>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label for="time_limit" class="block text-sm font-medium text-gray-700 mb-1">
              Time Limit (minutes)
            </label>
            <input
              id="time_limit"
              type="number"
              min="1"
              max="180"
              :value="form.time_limit_minutes"
              @input="updateField('time_limit_minutes', parseInt($event.target.value))"
              class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label for="passing_score" class="block text-sm font-medium text-gray-700 mb-1">
              Passing Score (%)
            </label>
            <input
              id="passing_score"
              type="number"
              min="0"
              max="100"
              :value="form.passing_score"
              @input="updateField('passing_score', parseInt($event.target.value))"
              class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        <!-- Toggles -->
        <div class="mt-4 space-y-3">
          <label class="flex items-center">
            <input
              type="checkbox"
              :checked="form.allow_multiple_attempts"
              @change="updateField('allow_multiple_attempts', $event.target.checked)"
              class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span class="ml-2 text-sm text-gray-700">Allow multiple attempts</span>
          </label>

          <label class="flex items-center">
            <input
              type="checkbox"
              :checked="form.show_correct_answers"
              @change="updateField('show_correct_answers', $event.target.checked)"
              class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span class="ml-2 text-sm text-gray-700">Show correct answers after submission</span>
          </label>
        </div>
      </div>

      <!-- Questions summary (if editing) -->
      <div v-if="editing && form.questions?.length > 0" class="border-t border-gray-200 pt-6">
        <div class="flex items-center justify-between mb-2">
          <h4 class="text-sm font-medium text-gray-900">Questions</h4>
          <span class="text-sm text-gray-500">{{ form.questions.length }} questions</span>
        </div>
        <p class="text-sm text-gray-500">
          Use the "Questions" button on the quiz card to manage questions.
        </p>
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
          :disabled="loading || !form.title"
          class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <svg
            v-if="loading"
            class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {{ editing ? 'Update Quiz' : 'Create Quiz' }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>
