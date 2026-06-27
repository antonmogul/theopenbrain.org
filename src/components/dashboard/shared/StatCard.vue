<script setup>
// Big-number stat: value + mono uppercase label, optional delta + icon.
// Replaces MetricCard. Delta tone maps to semantic tokens (not hardcoded green/red).
import { computed } from "vue";
import PreviewTag from "./PreviewTag.vue";
const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: "" },
  prefix: { type: String, default: "" },
  suffix: { type: String, default: "" },
  delta: { type: Number, default: null },
  deltaLabel: { type: String, default: "" },
  tone: { type: String, default: "auto" }, // auto | accent | complete | warn | mute
  preview: { type: Boolean, default: false },
});
const display = computed(() => {
  if (props.preview) return "—";
  return typeof props.value === "number" ? props.value.toLocaleString() : props.value;
});
const deltaTone = computed(() => {
  if (props.tone !== "auto") return props.tone;
  if (props.delta == null) return "mute";
  return props.delta >= 0 ? "complete" : "warn";
});
</script>

<template>
  <div class="stat pad">
    <span class="stat-value">{{ prefix }}{{ display }}{{ preview ? "" : suffix }}</span>
    <span class="stat-label">{{ label }} <PreviewTag v-if="preview" /></span>
    <span v-if="delta != null && !preview" class="stat-delta" :class="`t-${deltaTone}`">
      {{ delta >= 0 ? "+" : "" }}{{ delta }}% {{ deltaLabel }}
    </span>
  </div>
</template>

<style scoped>
.stat.pad { padding: 20px 10px; }
.stat-value {
  display: block; font-family: var(--font-body); font-size: 3.2rem;
  font-weight: 500; line-height: 1; letter-spacing: -0.01em; color: rgb(var(--color-ink));
}
.stat-label {
  display: block; font-family: var(--font-mono); font-size: 1rem;
  text-transform: uppercase; letter-spacing: 0.1em; color: rgb(var(--color-mute)); margin-top: 6px;
}
.stat-delta { display: block; font-family: var(--font-mono); font-size: 1.1rem; margin-top: 6px; }
.t-complete { color: rgb(var(--color-complete)); }
.t-warn { color: rgb(var(--color-warn)); }
.t-accent { color: rgb(var(--color-accent)); }
.t-mute { color: rgb(var(--color-mute)); }
</style>
