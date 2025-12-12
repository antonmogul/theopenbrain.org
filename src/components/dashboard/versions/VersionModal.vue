<script setup>
/**
 * VersionModal Component
 *
 * Modal for creating/editing content versions.
 */

import { computed } from 'vue';
import BaseModal from '../shared/BaseModal.vue';

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  editing: {
    type: Boolean,
    default: false,
  },
  form: {
    type: Object,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['close', 'submit', 'update:form']);

const title = computed(() => props.editing ? 'Edit Version' : 'Create New Version');

function updateField(field, value) {
  emit('update:form', { ...props.form, [field]: value });
}

function handleSubmit() {
  if (!props.form.version_number) return;
  emit('submit');
}
</script>

<template>
  <BaseModal :show="show" :title="title" size="md" @close="emit('close')">
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Version number -->
      <div>
        <label for="version_number" class="block text-sm font-medium text-gray-700 mb-1">
          Version Number <span class="text-red-500">*</span>
        </label>
        <input
          id="version_number"
          type="text"
          :value="form.version_number"
          @input="updateField('version_number', $event.target.value)"
          placeholder="e.g., 1.0.0"
          class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          required
        />
        <p class="mt-1 text-xs text-gray-500">
          Use semantic versioning (e.g., 1.0.0, 2.1.3)
        </p>
      </div>

      <!-- Release notes -->
      <div>
        <label for="release_notes" class="block text-sm font-medium text-gray-700 mb-1">
          Release Notes
        </label>
        <textarea
          id="release_notes"
          :value="form.release_notes"
          @input="updateField('release_notes', $event.target.value)"
          placeholder="Describe the changes in this version..."
          rows="4"
          class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>
    </form>

    <template #footer>
      <div class="flex justify-end gap-3">
        <button
          type="button"
          @click="emit('close')"
          :disabled="loading"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          @click="handleSubmit"
          :disabled="loading || !form.version_number"
          class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <svg
            v-if="loading"
            class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {{ editing ? 'Update Version' : 'Create Version' }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>
