<script setup>
// HighlightToolbar sub-unit (#18 split): the row of color swatches.
// Presentational — the parent (HighlightToolbar) owns selection/highlight state
// and decides whether a pick means "create" or "change color" via the `mode`
// prop. Children only render swatches and emit `pick` with the chosen value.
// Swatch background colors stay theme-fixed and are bound inline from
// HIGHLIGHT_COLORS (single source of truth).
import { HIGHLIGHT_COLORS } from "@/composables/useHighlights";

defineProps({
  mode: {
    type: String,
    default: "create",
    validator: (v) => ["create", "edit"].includes(v),
  },
  activeColor: {
    type: String,
    default: null,
  },
});

defineEmits(["pick"]);
</script>

<template>
  <div class="hl-colors">
    <button
      v-for="color in HIGHLIGHT_COLORS"
      :key="color.value"
      @click="$emit('pick', color.value)"
      class="hl-color-dot"
      :class="{
        'dot-active': mode === 'edit' && activeColor === color.value,
      }"
      :style="{ backgroundColor: color.hex }"
      :title="color.name"
      :data-testid="`highlight-${color.value}`"
    >
      <!-- Checkmark for active color in edit mode -->
      <svg
        v-if="mode === 'edit' && activeColor === color.value"
        class="dot-check"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <polyline points="2,6 5,9 10,3" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
/* Color dots. Swatch background colors are bound inline from HIGHLIGHT_COLORS
   (see template); they stay theme-fixed by design. */
.hl-colors {
  display: flex;
  align-items: center;
  gap: 4px;
}

.hl-color-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.12s ease, border-color 0.12s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.hl-color-dot:hover {
  transform: scale(1.15);
}

.hl-color-dot.dot-active {
  border-color: rgb(var(--color-ink) / 0.8);
}

/* The checkmark sits on a fixed light swatch, so it keeps a fixed dark ink to
   remain legible regardless of [data-theme]. */
.dot-check {
  width: 10px;
  height: 10px;
  color: #1a1a1a;
}
</style>
