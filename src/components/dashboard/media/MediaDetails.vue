<script setup>
/**
 * MediaDetails Component
 *
 * Displays detailed information about a selected media item.
 */

import { computed } from 'vue';
import { MEDIA_TYPES } from '@/constants/dashboard';

const props = defineProps({
  media: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['close', 'edit', 'delete']);

const formattedDate = computed(() => {
  if (!props.media?.created_at) return 'Unknown';
  return new Date(props.media.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
});

const typeLabel = computed(() => {
  const labels = {
    [MEDIA_TYPES.LOTTIE]: 'Lottie Animation',
    [MEDIA_TYPES.VIDEO]: 'Video',
    [MEDIA_TYPES.IMAGE]: 'Image',
    [MEDIA_TYPES.YOUTUBE]: 'YouTube Video',
  };
  return labels[props.media?.animation_type] || 'Unknown';
});
</script>

<template>
  <div v-if="media" class="bg-white border border-gray-200 rounded-lg overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
      <h3 class="font-semibold text-gray-900">Media Details</h3>
      <button
        @click="emit('close')"
        class="text-gray-400 hover:text-gray-500"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Preview -->
    <div class="aspect-video bg-gray-100">
      <img
        v-if="media.thumbnail_path || media.file_path"
        :src="media.thumbnail_path || media.file_path"
        :alt="media.title"
        class="w-full h-full object-contain"
      />
      <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
        <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    </div>

    <!-- Details -->
    <div class="p-4 space-y-4">
      <div>
        <h4 class="text-lg font-semibold text-gray-900">{{ media.title || 'Untitled' }}</h4>
        <p class="text-sm text-gray-500">{{ typeLabel }}</p>
      </div>

      <div v-if="media.description" class="text-sm text-gray-600">
        {{ media.description }}
      </div>

      <dl class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt class="text-gray-500">Animation Key</dt>
          <dd class="font-mono text-gray-900 mt-0.5">{{ media.animation_key }}</dd>
        </div>
        <div>
          <dt class="text-gray-500">Created</dt>
          <dd class="text-gray-900 mt-0.5">{{ formattedDate }}</dd>
        </div>
        <div v-if="media.component_name">
          <dt class="text-gray-500">Component</dt>
          <dd class="font-mono text-gray-900 mt-0.5">{{ media.component_name }}</dd>
        </div>
        <div v-if="media.file_path">
          <dt class="text-gray-500">File Path</dt>
          <dd class="font-mono text-gray-900 mt-0.5 text-xs truncate" :title="media.file_path">
            {{ media.file_path }}
          </dd>
        </div>
      </dl>

      <!-- Metadata -->
      <div v-if="media.metadata && Object.keys(media.metadata).length > 0">
        <h5 class="text-sm font-medium text-gray-700 mb-2">Metadata</h5>
        <pre class="text-xs bg-gray-50 rounded p-2 overflow-auto max-h-32">{{ JSON.stringify(media.metadata, null, 2) }}</pre>
      </div>
    </div>

    <!-- Actions -->
    <div class="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
      <button
        @click="emit('edit', media)"
        class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
      >
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Edit
      </button>
      <button
        @click="emit('delete', media)"
        class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
      >
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Delete
      </button>
    </div>
  </div>

  <!-- Empty state -->
  <div v-else class="bg-white border border-gray-200 rounded-lg p-8 text-center">
    <svg class="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
    <p class="text-gray-500">Select a media item to view details</p>
  </div>
</template>
