<script setup>
/**
 * MediaDetails Component
 *
 * Displays detailed information about a selected media item,
 * including animation states, variants, and configuration.
 */

import { computed, ref, watch } from 'vue';
import { MEDIA_TYPES, INTERACTION_TYPE_LABELS } from '@/constants/dashboard';
import mediaApi from '@/services/api/media';

const props = defineProps({
  media: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['close', 'edit', 'delete']);

// States and variants loaded for the selected animation
const states = ref([]);
const variants = ref([]);
const statesLoading = ref(false);

// Fetch states and variants when media selection changes
watch(() => props.media?.id, async (newId) => {
  states.value = [];
  variants.value = [];
  if (!newId) return;

  statesLoading.value = true;
  try {
    const [s, v] = await Promise.all([
      mediaApi.fetchAnimationStates(newId),
      mediaApi.fetchAnimationVariants(newId),
    ]);
    states.value = s || [];
    variants.value = v || [];
  } catch (err) {
    console.error('Error fetching states/variants:', err);
  } finally {
    statesLoading.value = false;
  }
}, { immediate: true });

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
  return labels[props.media?.media_type] || labels[props.media?.animation_type] || 'Unknown';
});

const interactionLabel = computed(() => {
  return INTERACTION_TYPE_LABELS[props.media?.interaction_type] || props.media?.interaction_type || 'N/A';
});

const fileSizeFormatted = computed(() => {
  const bytes = props.media?.file_size_bytes;
  if (!bytes) return null;
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
});

// Separate states from highlights
const regularStates = computed(() =>
  states.value.filter(s => !s.is_highlight_state)
);
const highlightStates = computed(() =>
  states.value.filter(s => s.is_highlight_state)
);
</script>

<template>
  <div v-if="media" class="bg-white border border-gray-200 rounded-lg overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
      <h3 class="font-semibold text-gray-900">Animation Details</h3>
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
        v-if="media.thumbnail_path || media.file_path || media.image_file_url"
        :src="media.thumbnail_path || media.file_path || media.image_file_url"
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
        <div class="flex gap-2 mt-1">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            {{ typeLabel }}
          </span>
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
            {{ interactionLabel }}
          </span>
          <span v-if="media.scientific_domain" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            {{ media.scientific_domain }}
          </span>
        </div>
      </div>

      <div v-if="media.description" class="text-sm text-gray-600">
        {{ media.description }}
      </div>

      <dl class="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt class="text-gray-500">Animation Key</dt>
          <dd class="font-mono text-gray-900 mt-0.5 text-xs">{{ media.animation_key }}</dd>
        </div>
        <div>
          <dt class="text-gray-500">Component</dt>
          <dd class="font-mono text-gray-900 mt-0.5 text-xs">{{ media.component_name }}</dd>
        </div>
        <div>
          <dt class="text-gray-500">Created</dt>
          <dd class="text-gray-900 mt-0.5">{{ formattedDate }}</dd>
        </div>
        <div v-if="fileSizeFormatted">
          <dt class="text-gray-500">File Size</dt>
          <dd class="text-gray-900 mt-0.5">{{ fileSizeFormatted }}</dd>
        </div>
        <div v-if="media.load_priority">
          <dt class="text-gray-500">Priority</dt>
          <dd class="text-gray-900 mt-0.5 capitalize">{{ media.load_priority }}</dd>
        </div>
        <div v-if="media.lottie_file_url">
          <dt class="text-gray-500">Lottie URL</dt>
          <dd class="font-mono text-gray-900 mt-0.5 text-xs truncate" :title="media.lottie_file_url">
            {{ media.lottie_file_url }}
          </dd>
        </div>
      </dl>

      <!-- States Section -->
      <div v-if="statesLoading" class="text-sm text-gray-500 italic">Loading states...</div>
      <div v-else-if="regularStates.length > 0">
        <h5 class="text-sm font-medium text-gray-700 mb-2">States ({{ regularStates.length }})</h5>
        <ol class="text-xs space-y-1 bg-gray-50 rounded p-3 max-h-40 overflow-y-auto">
          <li
            v-for="(state, i) in regularStates"
            :key="state.id"
            class="flex gap-2"
          >
            <span class="text-gray-400 w-5 text-right shrink-0">{{ i + 1 }}.</span>
            <span class="text-gray-700">{{ state.state_description || state.state_label }}</span>
          </li>
        </ol>
      </div>

      <!-- Highlight States -->
      <div v-if="highlightStates.length > 0">
        <h5 class="text-sm font-medium text-gray-700 mb-2">Highlights ({{ highlightStates.length }})</h5>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="hs in highlightStates"
            :key="hs.id"
            class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800"
          >
            {{ hs.state_label }}
          </span>
        </div>
      </div>

      <!-- Variants Section -->
      <div v-if="variants.length > 0">
        <h5 class="text-sm font-medium text-gray-700 mb-2">Variants ({{ variants.length }})</h5>
        <div class="space-y-1">
          <div
            v-for="v in variants"
            :key="v.id"
            class="text-xs bg-gray-50 rounded px-3 py-2 flex justify-between"
          >
            <span class="font-medium text-gray-700">{{ v.variant_label }}</span>
            <span class="font-mono text-gray-400 truncate ml-2" :title="v.lottie_file_url">
              {{ v.lottie_file_url?.split('/').pop() }}
            </span>
          </div>
        </div>
      </div>

      <!-- Config (JSONB) -->
      <div v-if="media.config && Object.keys(media.config).length > 0">
        <h5 class="text-sm font-medium text-gray-700 mb-2">Configuration</h5>
        <pre class="text-xs bg-gray-50 rounded p-2 overflow-auto max-h-40 font-mono">{{ JSON.stringify(media.config, null, 2) }}</pre>
      </div>

      <!-- Legacy metadata fallback -->
      <div v-else-if="media.metadata && Object.keys(media.metadata).length > 0">
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
    <p class="text-gray-500">Select an animation to view details</p>
  </div>
</template>
