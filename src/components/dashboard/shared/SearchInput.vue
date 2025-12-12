<script setup>
/**
 * SearchInput Component
 *
 * A search input with icon and clear button.
 */

import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: 'Search...',
  },
  debounce: {
    type: Number,
    default: 300,
  },
});

const emit = defineEmits(['update:modelValue', 'search']);

const localValue = ref(props.modelValue);
let debounceTimer = null;

watch(() => props.modelValue, (val) => {
  localValue.value = val;
});

function handleInput(e) {
  localValue.value = e.target.value;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    emit('update:modelValue', localValue.value);
    emit('search', localValue.value);
  }, props.debounce);
}

function clear() {
  localValue.value = '';
  emit('update:modelValue', '');
  emit('search', '');
}
</script>

<template>
  <div class="relative">
    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <svg
        class="h-5 w-5 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    </div>
    <input
      type="text"
      :value="localValue"
      @input="handleInput"
      :placeholder="placeholder"
      class="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
    />
    <button
      v-if="localValue"
      @click="clear"
      class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
    >
      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</template>
