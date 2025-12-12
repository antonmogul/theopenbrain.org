<script setup>
/**
 * TrendingHighlights Component
 *
 * Displays most highlighted text passages.
 */

defineProps({
  highlights: {
    type: Array,
    required: true,
  },
});
</script>

<template>
  <div class="bg-white border border-gray-200 rounded-lg">
    <div class="px-4 py-3 border-b border-gray-200">
      <h3 class="text-sm font-medium text-gray-700">Trending Highlights</h3>
    </div>

    <div v-if="highlights.length > 0" class="divide-y divide-gray-100">
      <div
        v-for="(highlight, index) in highlights"
        :key="index"
        class="p-4"
      >
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center">
            <span class="text-xs font-medium text-yellow-700">{{ index + 1 }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-gray-700 line-clamp-2">
              "{{ highlight.text }}"
            </p>
            <div class="mt-1 flex items-center gap-2 text-xs text-gray-500">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              {{ highlight.count }} highlights
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="p-8 text-center text-gray-500">
      <svg class="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
      <p class="text-sm">No highlights yet</p>
    </div>
  </div>
</template>
