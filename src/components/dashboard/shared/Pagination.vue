<script setup>
/**
 * Pagination Component
 *
 * Pagination controls with page info.
 */

import { computed } from 'vue';

const props = defineProps({
  currentPage: {
    type: Number,
    required: true,
  },
  totalPages: {
    type: Number,
    required: true,
  },
  totalItems: {
    type: Number,
    default: 0,
  },
  pageSize: {
    type: Number,
    default: 20,
  },
  showInfo: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['page-change']);

const fromItem = computed(() => (props.currentPage - 1) * props.pageSize + 1);
const toItem = computed(() => Math.min(props.currentPage * props.pageSize, props.totalItems));

const hasPrevious = computed(() => props.currentPage > 1);
const hasNext = computed(() => props.currentPage < props.totalPages);

// Generate page numbers to display
const visiblePages = computed(() => {
  const pages = [];
  const total = props.totalPages;
  const current = props.currentPage;

  if (total <= 7) {
    // Show all pages
    for (let i = 1; i <= total; i++) {
      pages.push(i);
    }
  } else {
    // Show first, last, and pages around current
    pages.push(1);

    if (current > 3) {
      pages.push('...');
    }

    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }

    if (current < total - 2) {
      pages.push('...');
    }

    pages.push(total);
  }

  return pages;
});

function goToPage(page) {
  if (page !== '...' && page !== props.currentPage) {
    emit('page-change', page);
  }
}
</script>

<template>
  <div class="flex items-center justify-between">
    <!-- Info -->
    <div v-if="showInfo && totalItems > 0" class="text-sm text-gray-700">
      Showing <span class="font-medium">{{ fromItem }}</span> to
      <span class="font-medium">{{ toItem }}</span> of
      <span class="font-medium">{{ totalItems }}</span> results
    </div>
    <div v-else-if="showInfo" class="text-sm text-gray-500">
      No results
    </div>

    <!-- Controls -->
    <nav v-if="totalPages > 1" class="flex items-center gap-1">
      <!-- Previous -->
      <button
        @click="goToPage(currentPage - 1)"
        :disabled="!hasPrevious"
        :class="[
          'p-2 rounded-md text-sm font-medium',
          hasPrevious
            ? 'text-gray-700 hover:bg-gray-100'
            : 'text-gray-300 cursor-not-allowed',
        ]"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <!-- Page numbers -->
      <template v-for="page in visiblePages" :key="page">
        <span
          v-if="page === '...'"
          class="px-3 py-2 text-sm text-gray-500"
        >
          ...
        </span>
        <button
          v-else
          @click="goToPage(page)"
          :class="[
            'px-3 py-2 rounded-md text-sm font-medium',
            page === currentPage
              ? 'bg-indigo-600 text-white'
              : 'text-gray-700 hover:bg-gray-100',
          ]"
        >
          {{ page }}
        </button>
      </template>

      <!-- Next -->
      <button
        @click="goToPage(currentPage + 1)"
        :disabled="!hasNext"
        :class="[
          'p-2 rounded-md text-sm font-medium',
          hasNext
            ? 'text-gray-700 hover:bg-gray-100'
            : 'text-gray-300 cursor-not-allowed',
        ]"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </nav>
  </div>
</template>
