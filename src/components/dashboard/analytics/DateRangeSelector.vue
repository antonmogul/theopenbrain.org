<script setup>
/**
 * DateRangeSelector Component
 *
 * Toggle buttons for selecting analytics date range.
 */

import { DATE_RANGES } from '@/constants/dashboard';

defineProps({
  modelValue: {
    type: String,
    default: DATE_RANGES.WEEK,
  },
});

const emit = defineEmits(['update:modelValue']);

const options = [
  { value: DATE_RANGES.WEEK, label: '7 Days' },
  { value: DATE_RANGES.MONTH, label: '30 Days' },
  { value: DATE_RANGES.QUARTER, label: '90 Days' },
];
</script>

<template>
  <div class="inline-flex bg-gray-100 rounded-lg p-1">
    <button
      v-for="option in options"
      :key="option.value"
      @click="emit('update:modelValue', option.value)"
      :class="[
        'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
        modelValue === option.value
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-600 hover:text-gray-900',
      ]"
    >
      {{ option.label }}
    </button>
  </div>
</template>
