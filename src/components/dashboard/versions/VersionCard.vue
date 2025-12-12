<script setup>
/**
 * VersionCard Component
 *
 * Displays a single content version with actions.
 */

import { computed } from 'vue';
import StatusBadge from '../shared/StatusBadge.vue';
import { STATUS } from '@/constants/dashboard';

const props = defineProps({
  version: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['publish', 'archive', 'delete', 'edit']);

const formattedDate = computed(() => {
  if (!props.version.created_at) return 'Unknown';
  return new Date(props.version.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
});

const publishedDate = computed(() => {
  if (!props.version.published_at) return null;
  return new Date(props.version.published_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
});

const canPublish = computed(() => props.version.status === STATUS.DRAFT);
const canArchive = computed(() => props.version.status === STATUS.PUBLISHED);
</script>

<template>
  <div class="bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
    <div class="p-4">
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-3">
          <!-- Version icon -->
          <div class="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>

          <div>
            <h3 class="font-semibold text-gray-900">
              v{{ version.version_number }}
            </h3>
            <p class="text-sm text-gray-500">
              Created {{ formattedDate }}
            </p>
          </div>
        </div>

        <StatusBadge :status="version.status" />
      </div>

      <!-- Release notes -->
      <div v-if="version.release_notes" class="mt-3">
        <p class="text-sm text-gray-600 line-clamp-2">
          {{ version.release_notes }}
        </p>
      </div>

      <!-- Stats -->
      <div class="mt-4 flex items-center gap-4 text-sm text-gray-500">
        <span class="flex items-center gap-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          {{ version.moduleCount || 0 }} modules
        </span>
        <span v-if="publishedDate" class="flex items-center gap-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Published {{ publishedDate }}
        </span>
      </div>
    </div>

    <!-- Actions -->
    <div class="px-4 py-3 bg-gray-50 border-t border-gray-100 rounded-b-lg flex items-center justify-end gap-2">
      <button
        v-if="canPublish"
        @click="emit('publish', version)"
        class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-md transition-colors"
      >
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        Publish
      </button>
      <button
        v-if="canArchive"
        @click="emit('archive', version)"
        class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
      >
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
        Archive
      </button>
      <button
        @click="emit('edit', version)"
        class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
      >
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Edit
      </button>
      <button
        @click="emit('delete', version)"
        class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
      >
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Delete
      </button>
    </div>
  </div>
</template>
