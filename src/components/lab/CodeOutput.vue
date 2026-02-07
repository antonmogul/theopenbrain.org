<script setup>
defineProps({
  result: {
    type: Object,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});
</script>

<template>
  <div class="code-output rounded-lg border border-gray-700 overflow-hidden" data-testid="code-output">
    <!-- Header -->
    <div class="output-header bg-gray-800 px-4 py-2 flex items-center gap-2">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="text-gray-400"
      >
        <polyline points="4 17 10 11 4 5"></polyline>
        <line x1="12" y1="19" x2="20" y2="19"></line>
      </svg>
      <span class="text-sm text-gray-300 font-medium">Output</span>
    </div>

    <!-- Content area -->
    <div class="output-content bg-gray-900 p-4 min-h-[150px] max-h-[400px] overflow-y-auto">
      <!-- Loading state -->
      <div v-if="loading" class="flex items-center gap-3 text-gray-400">
        <svg
          class="animate-spin h-5 w-5"
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
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <span>Executing Python...</span>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="!result"
        class="text-gray-500 italic"
        data-testid="output-empty"
      >
        Run your code to see output here
      </div>

      <!-- Result display -->
      <div v-else class="space-y-4">
        <!-- Error display -->
        <div v-if="result.error" class="error-output" data-testid="output-error">
          <p class="text-red-400 font-medium mb-1">Error:</p>
          <pre class="text-red-300 text-sm whitespace-pre-wrap font-mono">{{ result.error }}</pre>
        </div>

        <!-- Standard output -->
        <div v-if="result.output" class="stdout-output" data-testid="output-stdout">
          <pre class="text-gray-100 text-sm whitespace-pre-wrap font-mono">{{ result.output }}</pre>
        </div>

        <!-- Plot images -->
        <div v-if="result.plots && result.plots.length > 0" class="plots-output space-y-4" data-testid="output-plots">
          <img
            v-for="(plot, index) in result.plots"
            :key="index"
            :src="`data:image/png;base64,${plot}`"
            :alt="`Plot ${index + 1}`"
            class="max-w-full rounded-lg border border-gray-700"
          />
        </div>

        <!-- No output message when code runs successfully but produces nothing -->
        <div
          v-if="!result.error && !result.output && (!result.plots || result.plots.length === 0)"
          class="text-gray-500 italic"
        >
          Code executed successfully (no output)
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.output-content {
  font-family: "IBM Plex Mono", "Fira Code", "Monaco", monospace;
}
</style>
