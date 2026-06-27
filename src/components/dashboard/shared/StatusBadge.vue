<script setup>
// Small status pill. Token `variant` replaces the old Tailwind STATUS_COLORS
// map. Optional `status` convenience maps known domain statuses → variant + label.
import { computed } from "vue";
const props = defineProps({
  variant: { type: String, default: "neutral" }, // neutral | accent | complete | warn
  status: { type: String, default: "" },
  size: { type: String, default: "sm" }, // sm | md | lg
  dot: { type: Boolean, default: false },
});
const STATUS_MAP = {
  published: "complete", active: "complete", completed: "complete", passed: "complete",
  draft: "warn", pending: "warn", failed: "warn",
  archived: "neutral", inactive: "neutral",
};
const resolved = computed(() => (props.status ? STATUS_MAP[props.status.toLowerCase()] || "neutral" : props.variant));
const autoLabel = computed(() => (props.status ? props.status.charAt(0).toUpperCase() + props.status.slice(1) : ""));
</script>

<template>
  <span class="badge" :class="[`v-${resolved}`, `s-${size}`]">
    <span v-if="dot" class="dot" aria-hidden="true" />
    <slot>{{ autoLabel }}</slot>
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.06em;
  border-radius: 999px; border: 1px solid transparent; white-space: nowrap;
}
.s-sm { font-size: 1rem; padding: 3px 9px; }
.s-md { font-size: 1.1rem; padding: 4px 11px; }
.s-lg { font-size: 1.3rem; padding: 6px 14px; }
.dot { width: 6px; height: 6px; border-radius: 999px; background: currentColor; }
.v-neutral { color: rgb(var(--color-mute)); background: rgb(var(--color-mute) / 0.1); }
.v-accent { color: rgb(var(--color-accent)); background: rgb(var(--color-accent) / 0.1); }
.v-complete { color: rgb(var(--color-complete)); background: rgb(var(--color-complete) / 0.12); }
.v-warn { color: rgb(var(--color-warn)); background: rgb(var(--color-warn) / 0.12); }
</style>
