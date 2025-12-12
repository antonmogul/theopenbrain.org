<script setup>
/**
 * ChapterCard Component
 *
 * Displays a single chapter with stats and expandable content.
 */

import { computed } from 'vue';
import StatusBadge from '../shared/StatusBadge.vue';

const props = defineProps({
  chapter: {
    type: Object,
    required: true,
  },
  expanded: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['toggle', 'edit', 'delete']);

const formattedDate = computed(() => {
  if (!props.chapter.updated_at) return 'Never';
  return new Date(props.chapter.updated_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
});
</script>

<template>
  <div
    :class="[
      'bg-white border rounded-lg transition-all',
      expanded ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-gray-200 hover:border-gray-300',
    ]"
  >
    <!-- Header -->
    <div
      class="flex items-center justify-between p-4 cursor-pointer"
      @click="emit('toggle', chapter.id)"
    >
      <div class="flex items-center gap-4">
        <!-- Expand/collapse icon -->
        <button class="text-gray-400 hover:text-gray-600">
          <svg
            :class="['w-5 h-5 transition-transform', expanded && 'rotate-90']"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <!-- Chapter info -->
        <div>
          <h3 class="font-medium text-gray-900">{{ chapter.title }}</h3>
          <p class="text-sm text-gray-500">{{ chapter.slug }}</p>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <!-- Stats -->
        <div class="hidden sm:flex items-center gap-4 text-sm text-gray-500">
          <span class="flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            {{ chapter.sectionCount }} sections
          </span>
          <span class="flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {{ chapter.paragraphCount }} paragraphs
          </span>
          <span class="flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ chapter.readingTime }} min read
          </span>
        </div>

        <!-- Status -->
        <StatusBadge :status="chapter.status" />

        <!-- Actions -->
        <div class="flex items-center gap-2" @click.stop>
          <button
            @click="emit('edit', chapter)"
            class="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
            title="Edit chapter"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            @click="emit('delete', chapter)"
            class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
            title="Delete chapter"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile stats -->
    <div class="sm:hidden px-4 pb-3 flex flex-wrap gap-3 text-sm text-gray-500">
      <span>{{ chapter.sectionCount }} sections</span>
      <span>{{ chapter.paragraphCount }} paragraphs</span>
      <span>{{ chapter.readingTime }} min read</span>
    </div>

    <!-- Last updated -->
    <div class="px-4 pb-3 text-xs text-gray-400">
      Last updated: {{ formattedDate }}
    </div>

    <!-- Expanded content slot -->
    <div v-if="expanded">
      <slot name="content" />
    </div>
  </div>
</template>
