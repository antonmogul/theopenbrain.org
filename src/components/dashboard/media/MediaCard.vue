<script setup>
/**
 * MediaCard Component
 *
 * Displays a single media item with preview and actions.
 */

import { computed } from 'vue';
import { MEDIA_TYPES } from '@/constants/dashboard';

const props = defineProps({
  media: {
    type: Object,
    required: true,
  },
  selected: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['select', 'delete']);

const typeLabel = computed(() => {
  const labels = {
    [MEDIA_TYPES.LOTTIE]: 'Lottie',
    [MEDIA_TYPES.VIDEO]: 'Video',
    [MEDIA_TYPES.IMAGE]: 'Image',
    [MEDIA_TYPES.YOUTUBE]: 'YouTube',
  };
  return labels[props.media.animation_type] || 'Unknown';
});

const typeColor = computed(() => {
  const colors = {
    [MEDIA_TYPES.LOTTIE]: 'bg-purple-100 text-purple-700',
    [MEDIA_TYPES.VIDEO]: 'bg-blue-100 text-blue-700',
    [MEDIA_TYPES.IMAGE]: 'bg-green-100 text-green-700',
    [MEDIA_TYPES.YOUTUBE]: 'bg-red-100 text-red-700',
  };
  return colors[props.media.animation_type] || 'bg-gray-100 text-gray-700';
});

const typeIcon = computed(() => {
  const icons = {
    [MEDIA_TYPES.LOTTIE]: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />`,
    [MEDIA_TYPES.VIDEO]: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />`,
    [MEDIA_TYPES.IMAGE]: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />`,
    [MEDIA_TYPES.YOUTUBE]: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />`,
  };
  return icons[props.media.animation_type] || icons[MEDIA_TYPES.IMAGE];
});
</script>

<template>
  <div
    :class="[
      'bg-white border rounded-lg overflow-hidden cursor-pointer transition-all',
      selected
        ? 'border-indigo-500 ring-2 ring-indigo-200'
        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm',
    ]"
    @click="emit('select', media)"
  >
    <!-- Thumbnail / Preview -->
    <div class="aspect-video bg-gray-100 relative">
      <img
        v-if="media.thumbnail_path"
        :src="media.thumbnail_path"
        :alt="media.title"
        class="w-full h-full object-cover"
      />
      <div v-else class="w-full h-full flex items-center justify-center">
        <svg
          class="w-12 h-12 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          v-html="typeIcon"
        />
      </div>

      <!-- Type badge -->
      <span
        :class="[
          'absolute top-2 left-2 px-2 py-0.5 text-xs font-medium rounded',
          typeColor,
        ]"
      >
        {{ typeLabel }}
      </span>

      <!-- Delete button -->
      <button
        @click.stop="emit('delete', media)"
        class="absolute top-2 right-2 p-1.5 bg-white/80 hover:bg-white rounded-full text-gray-500 hover:text-red-600 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>

    <!-- Info -->
    <div class="p-3">
      <h3 class="font-medium text-gray-900 truncate">
        {{ media.title || 'Untitled' }}
      </h3>
      <p class="text-sm text-gray-500 truncate mt-0.5">
        {{ media.animation_key }}
      </p>
    </div>
  </div>
</template>
