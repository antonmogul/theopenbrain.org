<script setup>
// Icons on the deck's role slides. They are the dashboard's own nav glyphs
// (DashboardNavIcon), so the deck matches the product, plus the two the
// dashboard has no use for: a globe (the public reader) and code brackets
// (Python labs).
import DashboardNavIcon from "@/components/dashboard/shared/DashboardNavIcon.vue";

defineProps({
  name: { type: String, required: true },
  // Rendered size in design pixels.
  size: { type: Number, default: 52 },
  strokeWidth: { type: Number, default: 1.8 },
});
</script>

<template>
  <svg
    v-if="name === 'globe' || name === 'code'"
    class="deck-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'globe'">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path
        d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
      />
    </template>
    <template v-else>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </template>
  </svg>
  <DashboardNavIcon
    v-else
    class="deck-icon"
    :name="name"
    :style="{ width: `${size}px`, height: `${size}px`, strokeWidth }"
  />
</template>

<style scoped>
.deck-icon {
  flex: none;
}
</style>
