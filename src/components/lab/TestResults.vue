<script setup>
import { computed } from "vue";

const props = defineProps({
  results: {
    type: Array,
    default: () => [],
  },
  passed: {
    type: Boolean,
    default: false,
  },
});

const passedCount = computed(() => {
  return props.results.filter((r) => r.passed).length;
});

const totalCount = computed(() => {
  return props.results.length;
});
</script>

<template>
  <div
    class="test-results rounded-lg border overflow-hidden"
    :class="passed ? 'border-green-500' : 'border-yellow-500'"
    data-testid="test-results"
  >
    <!-- Header -->
    <div
      class="test-header px-4 py-3 flex items-center justify-between"
      :class="passed ? 'bg-green-500/10' : 'bg-yellow-500/10'"
    >
      <div class="flex items-center gap-2">
        <!-- Checkmark or warning icon -->
        <svg
          v-if="passed"
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="text-green-400"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="text-yellow-400"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <span :class="passed ? 'text-green-300' : 'text-yellow-300'" class="font-medium">
          {{ passed ? "All Tests Passed!" : "Some Tests Failed" }}
        </span>
      </div>
      <span class="text-sm" :class="passed ? 'text-green-400' : 'text-yellow-400'">
        {{ passedCount }}/{{ totalCount }} passed
      </span>
    </div>

    <!-- Test list -->
    <div class="test-list bg-gray-900 divide-y divide-gray-800">
      <div
        v-for="(test, index) in results"
        :key="index"
        class="test-item p-4 flex items-start gap-3"
      >
        <!-- Pass/fail icon -->
        <svg
          v-if="test.passed"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="text-green-400 flex-shrink-0 mt-0.5"
        >
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="text-red-400 flex-shrink-0 mt-0.5"
        >
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>

        <!-- Test details -->
        <div class="flex-1">
          <p class="text-gray-200 font-medium">{{ test.name }}</p>

          <!-- Show expected vs actual for failed tests -->
          <div v-if="!test.passed && !test.error" class="mt-2 text-sm space-y-1">
            <p class="text-gray-400">
              Expected: <span class="text-green-400 font-mono">{{ test.expected }}</span>
            </p>
            <p class="text-gray-400">
              Actual: <span class="text-red-400 font-mono">{{ test.actual }}</span>
            </p>
          </div>

          <!-- Show error if test threw an exception -->
          <div v-if="test.error" class="mt-2">
            <p class="text-red-400 text-sm font-mono">{{ test.error }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.test-list {
  max-height: 350px;
  overflow-y: auto;
}
</style>
