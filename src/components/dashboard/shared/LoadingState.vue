<script setup>
/**
 * LoadingState Component
 *
 * Displays a loading spinner with optional message.
 */

defineProps({
  message: {
    type: String,
    default: 'Loading...',
  },
  size: {
    type: String,
    default: 'md', // sm, md, lg
  },
  inline: {
    type: Boolean,
    default: false,
  },
});

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};
</script>

<template>
  <div
    :class="[
      'flex items-center justify-center',
      inline ? 'inline-flex' : 'py-12',
    ]"
  >
    <div class="text-center">
      <svg
        :class="[sizeClasses[size], 'animate-spin text-indigo-600 mx-auto']"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <p v-if="message" class="mt-2 text-sm text-gray-500">{{ message }}</p>
    </div>
  </div>
</template>
