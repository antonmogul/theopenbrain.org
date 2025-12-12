<script setup>
/**
 * QuizCard Component
 *
 * Displays a single quiz with stats and actions.
 */

import { computed } from 'vue';
import StatusBadge from '../shared/StatusBadge.vue';

const props = defineProps({
  quiz: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['edit', 'delete', 'view-questions']);

const formattedDate = computed(() => {
  if (!props.quiz.created_at) return 'Unknown';
  return new Date(props.quiz.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
});

const passRateColor = computed(() => {
  const rate = props.quiz.passRate || 0;
  if (rate >= 70) return 'text-green-600';
  if (rate >= 50) return 'text-yellow-600';
  return 'text-red-600';
});
</script>

<template>
  <div class="bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
    <div class="p-4">
      <div class="flex items-start justify-between">
        <div class="flex-1 min-w-0">
          <h3 class="font-semibold text-gray-900 truncate">{{ quiz.title }}</h3>
          <p v-if="quiz.description" class="text-sm text-gray-500 mt-1 line-clamp-2">
            {{ quiz.description }}
          </p>
        </div>
        <StatusBadge :status="quiz.status || 'draft'" />
      </div>

      <!-- Stats grid -->
      <div class="mt-4 grid grid-cols-4 gap-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-gray-900">{{ quiz.questionCount || 0 }}</div>
          <div class="text-xs text-gray-500">Questions</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-gray-900">{{ quiz.attemptCount || 0 }}</div>
          <div class="text-xs text-gray-500">Attempts</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-gray-900">{{ quiz.avgScore || 0 }}%</div>
          <div class="text-xs text-gray-500">Avg Score</div>
        </div>
        <div class="text-center">
          <div :class="['text-2xl font-bold', passRateColor]">{{ quiz.passRate || 0 }}%</div>
          <div class="text-xs text-gray-500">Pass Rate</div>
        </div>
      </div>

      <!-- Quiz settings -->
      <div class="mt-4 flex flex-wrap gap-2">
        <span class="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
          <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {{ quiz.time_limit_minutes || 15 }} min
        </span>
        <span class="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
          <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {{ quiz.passing_score || 70 }}% to pass
        </span>
        <span
          v-if="quiz.allow_multiple_attempts"
          class="inline-flex items-center px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded"
        >
          Multiple attempts
        </span>
      </div>
    </div>

    <!-- Actions -->
    <div class="px-4 py-3 bg-gray-50 border-t border-gray-100 rounded-b-lg flex items-center justify-between">
      <span class="text-xs text-gray-400">Created {{ formattedDate }}</span>
      <div class="flex items-center gap-2">
        <button
          @click="emit('view-questions', quiz)"
          class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-md transition-colors"
        >
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Questions
        </button>
        <button
          @click="emit('edit', quiz)"
          class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
        >
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
        </button>
        <button
          @click="emit('delete', quiz)"
          class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
        >
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </button>
      </div>
    </div>
  </div>
</template>
