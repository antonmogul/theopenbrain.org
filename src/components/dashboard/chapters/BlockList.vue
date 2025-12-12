<script setup>
/**
 * BlockList Component
 *
 * Displays a draggable list of content blocks (sections and paragraphs).
 */

import { BLOCK_TYPES } from '@/constants/dashboard';

const props = defineProps({
  blocks: {
    type: Array,
    required: true,
  },
  selectedBlockId: {
    type: String,
    default: null,
  },
  highlightedBlockId: {
    type: String,
    default: null,
  },
  draggedBlockId: {
    type: String,
    default: null,
  },
  dragOverBlockId: {
    type: String,
    default: null,
  },
});

const emit = defineEmits([
  'select',
  'drag-start',
  'drag-over',
  'drag-leave',
  'drop',
  'drag-end',
]);

function handleDragStart(e, block) {
  if (block.type === BLOCK_TYPES.SECTION) return;
  emit('drag-start', e, block);
}

function handleDragOver(e, block) {
  e.preventDefault();
  if (block.type === BLOCK_TYPES.SECTION) return;
  emit('drag-over', e, block);
}

function handleDrop(e, block) {
  emit('drop', e, block);
}
</script>

<template>
  <div class="divide-y divide-gray-100">
    <div
      v-for="block in blocks"
      :key="block.id"
      :draggable="block.type !== BLOCK_TYPES.SECTION"
      @dragstart="handleDragStart($event, block)"
      @dragover="handleDragOver($event, block)"
      @dragleave="emit('drag-leave')"
      @drop="handleDrop($event, block)"
      @dragend="emit('drag-end')"
      @click="emit('select', block)"
      :class="[
        'transition-all cursor-pointer',
        block.type === BLOCK_TYPES.SECTION
          ? 'bg-gray-50 px-3 py-2 font-medium text-sm text-gray-700'
          : 'px-3 py-2 hover:bg-gray-50',
        selectedBlockId === block.id && 'bg-indigo-50 border-l-2 border-indigo-500',
        highlightedBlockId === block.id && 'bg-yellow-50',
        draggedBlockId === block.id && 'opacity-50',
        dragOverBlockId === block.id && 'border-t-2 border-indigo-400',
      ]"
    >
      <!-- Section header -->
      <template v-if="block.type === BLOCK_TYPES.SECTION">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          <span>{{ block.title }}</span>
        </div>
      </template>

      <!-- Paragraph block -->
      <template v-else>
        <div class="flex items-start gap-2">
          <!-- Drag handle -->
          <div class="flex-shrink-0 mt-1 text-gray-300 cursor-grab active:cursor-grabbing">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 6a2 2 0 100-4 2 2 0 000 4zm0 8a2 2 0 100-4 2 2 0 000 4zm0 8a2 2 0 100-4 2 2 0 000 4zm8-16a2 2 0 100-4 2 2 0 000 4zm0 8a2 2 0 100-4 2 2 0 000 4zm0 8a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
          </div>

          <!-- Content preview -->
          <div class="flex-1 min-w-0">
            <p
              :class="[
                'text-sm truncate',
                block.isSubsectionHeader ? 'font-medium text-gray-700' : 'text-gray-600',
              ]"
            >
              {{ block.preview || 'Empty paragraph' }}
            </p>
            <div class="flex items-center gap-2 mt-1 text-xs text-gray-400">
              <span>{{ block.wordCount }} words</span>
              <span v-if="block.isSubsectionHeader" class="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">
                Subsection
              </span>
            </div>
          </div>

          <!-- Edit indicator -->
          <div v-if="selectedBlockId === block.id" class="flex-shrink-0">
            <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
        </div>
      </template>
    </div>

    <!-- Empty state -->
    <div v-if="blocks.length === 0" class="p-4 text-center text-sm text-gray-500">
      No content blocks available
    </div>
  </div>
</template>
