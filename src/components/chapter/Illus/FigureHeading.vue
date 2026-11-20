<script setup>
// The record heading for figures whose artwork does not own a toolbar.
// Keep the label identical to the shell, rail and search; never number a
// placement or infer its number from an animation key.
import { computed } from "vue";
import { railFigureLabel } from "@/helper/railFigure";
const props = defineProps({
  record: { type: Object, required: true },
  ground: { type: String, default: "paper" },
});
const label = computed(() => railFigureLabel(props.record));
</script>

<template>
  <div v-if="label" class="figure-heading" :class="`figure-heading--${ground}`">
    <span class="figure-heading__label">{{ label }}</span>
    <span class="figure-heading__title">{{ record.title }}</span>
  </div>
</template>

<style scoped>
/* History's toolbar dimensions, with its leading icon's space reserved.
   Paper follows OPENBRAIN-66: chapter-deep label, the paper pane's ink. */
.figure-heading {
  --heading-ink: var(--color-ink);
  --heading-accent: var(--color-chapter-deep);
  flex: none;
  display: grid;
  grid-template-columns: 3.125rem minmax(0, 1fr);
  gap: 0.5rem;
  align-items: start;
  width: 100%;
  padding: 1.875rem 0.875rem 1.875rem 2.25rem;
  font-family: var(--font-mono);
  line-height: 1.3;
  text-align: left;
  color: rgb(var(--heading-ink));
  background: rgb(var(--color-bg));
}
.figure-heading--dark,
.figure-pane--dark .figure-heading {
  --heading-ink: 255 255 255;
  --heading-accent: var(--color-warn);
  background: rgb(var(--color-dark-surface));
}
.figure-pane--paper .figure-heading {
  background: rgb(var(--color-bg));
  --heading-ink: var(--color-ink);
  --heading-accent: var(--color-chapter-deep);
}
.figure-heading__label {
  color: rgb(var(--heading-accent));
  font-size: 0.65625rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.figure-heading__title {
  min-width: 0;
  font-size: 0.71875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
</style>
