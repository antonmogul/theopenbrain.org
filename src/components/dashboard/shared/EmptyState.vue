<script setup>
/**
 * EmptyState Component
 *
 * Displays a message when there's no data with optional action button.
 */

defineProps({
  title: {
    type: String,
    default: 'No data found',
  },
  message: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: 'folder', // folder, search, document, users
  },
  actionLabel: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['action']);

const icons = {
  folder: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />`,
  search: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />`,
  document: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />`,
  users: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />`,
};
</script>

<template>
  <div class="py-12 text-center">
    <div class="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
      <svg
        class="w-6 h-6 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        v-html="icons[icon] || icons.folder"
      />
    </div>
    <h3 class="text-lg font-medium text-gray-900 mb-1">{{ title }}</h3>
    <p v-if="message" class="text-sm text-gray-500 mb-4">{{ message }}</p>
    <slot name="action">
      <button
        v-if="actionLabel"
        @click="emit('action')"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        {{ actionLabel }}
      </button>
    </slot>
  </div>
</template>
