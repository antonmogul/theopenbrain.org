<script setup>
/**
 * FilterChips Component
 *
 * A set of filter chips/pills for filtering data.
 */

defineProps({
  options: {
    type: Array,
    required: true,
    // Expected format: [{ value: string, label: string, count?: number }]
  },
  modelValue: {
    type: String,
    default: '',
  },
  showCounts: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue']);
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <button
      v-for="option in options"
      :key="option.value"
      @click="emit('update:modelValue', option.value)"
      :class="[
        'inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
        modelValue === option.value
          ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
          : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200',
      ]"
    >
      {{ option.label }}
      <span
        v-if="showCounts && option.count !== undefined"
        :class="[
          'ml-1.5 px-1.5 py-0.5 rounded-full text-xs',
          modelValue === option.value
            ? 'bg-indigo-200 text-indigo-900'
            : 'bg-gray-200 text-gray-600',
        ]"
      >
        {{ option.count }}
      </span>
    </button>
  </div>
</template>
