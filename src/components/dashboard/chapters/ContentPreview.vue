<script setup>
/**
 * ContentPreview Component
 *
 * Displays a preview of chapter content with block highlighting.
 */

import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
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
});

const emit = defineEmits(['block-visible']);

const containerRef = ref(null);
let observer = null;

function setupScrollObserver() {
  if (!containerRef.value) return;

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          emit('block-visible', entry.target.dataset.blockId);
        }
      });
    },
    {
      root: containerRef.value,
      threshold: 0.5,
    }
  );

  nextTick(() => {
    const blockElements = containerRef.value?.querySelectorAll('[data-block-id]');
    blockElements?.forEach((el) => observer.observe(el));
  });
}

function scrollToBlock(blockId) {
  if (!containerRef.value) return;

  const blockEl = containerRef.value.querySelector(`[data-block-id="${blockId}"]`);
  if (blockEl) {
    blockEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

watch(() => props.selectedBlockId, (newId) => {
  if (newId) {
    nextTick(() => scrollToBlock(newId));
  }
});

onMounted(() => {
  setupScrollObserver();
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
});

// Expose scroll method
defineExpose({ scrollToBlock });
</script>

<template>
  <div
    ref="containerRef"
    class="h-full overflow-y-auto p-6 bg-white"
  >
    <div class="max-w-2xl mx-auto prose prose-sm">
      <template v-for="block in blocks" :key="block.id">
        <!-- Section header -->
        <h2
          v-if="block.type === BLOCK_TYPES.SECTION"
          :data-block-id="block.id"
          class="text-xl font-bold text-gray-900 mt-8 mb-4 first:mt-0"
        >
          {{ block.title }}
        </h2>

        <!-- Paragraph content -->
        <div
          v-else
          :data-block-id="block.id"
          :class="[
            'rounded-lg transition-all p-2 -mx-2',
            selectedBlockId === block.id && 'bg-indigo-50 ring-2 ring-indigo-200',
          ]"
        >
          <h3
            v-if="block.isSubsectionHeader"
            class="text-lg font-semibold text-gray-800 mb-2"
          >
            {{ block.preview }}
          </h3>
          <div
            v-else
            class="text-gray-700"
            v-html="block.htmlContent || '<p class=\'text-gray-400 italic\'>Empty paragraph</p>'"
          />
        </div>
      </template>

      <!-- Empty state -->
      <div v-if="blocks.length === 0" class="text-center py-12 text-gray-500">
        <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p>Select a chapter to preview its content</p>
      </div>
    </div>
  </div>
</template>
