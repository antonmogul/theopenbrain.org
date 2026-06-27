<script setup>
// Single- or multi-select pill row for filtering lists. SettingsView .hl-chip
// pill, token accent on selected. Supports optional counts.
const props = defineProps({
  options: { type: Array, required: true }, // [{ value, label, count? }]
  modelValue: { type: [String, Array], default: "" },
  showCounts: { type: Boolean, default: false },
  multiple: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue"]);
function isSelected(v) {
  return props.multiple ? (props.modelValue || []).includes(v) : props.modelValue === v;
}
function select(v) {
  if (!props.multiple) return emit("update:modelValue", v);
  const set = new Set(props.modelValue || []);
  if (set.has(v)) set.delete(v);
  else set.add(v);
  emit("update:modelValue", [...set]);
}
</script>

<template>
  <div class="chips">
    <button
      v-for="o in options" :key="o.value" type="button"
      class="chip" :class="{ on: isSelected(o.value) }" @click="select(o.value)"
    >
      {{ o.label }}<span v-if="showCounts && o.count != null" class="chip-count">{{ o.count }}</span>
    </button>
  </div>
</template>

<style scoped>
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px;
  border: 1px solid rgb(var(--color-line)); border-radius: 999px; background: transparent;
  font-family: var(--font-mono); font-size: 1.1rem; text-transform: uppercase;
  letter-spacing: 0.06em; color: rgb(var(--color-mute)); cursor: pointer;
  transition: border-color 0.12s ease, color 0.12s ease;
}
.chip:hover { color: rgb(var(--color-ink)); }
.chip.on { border-color: rgb(var(--color-accent)); color: rgb(var(--color-accent)); }
.chip-count { font-size: 1rem; opacity: 0.7; }
</style>
