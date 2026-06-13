<script setup>
// label + hint on the left, action on the right; optional left media. Bottom
// hairline. Extracted from SettingsAccountSection .rows-card .row.
defineProps({
  label: { type: String, default: "" },
  hint: { type: String, default: "" },
  interactive: { type: Boolean, default: false },
  divider: { type: Boolean, default: true },
});
defineEmits(["click"]);
</script>

<template>
  <div
    class="list-row" :class="{ interactive, divider }"
    @click="interactive && $emit('click', $event)"
  >
    <div v-if="$slots.media" class="row-media"><slot name="media" /></div>
    <div class="row-text">
      <div class="row-label"><slot name="label">{{ label }}</slot></div>
      <div v-if="hint || $slots.hint" class="row-hint"><slot name="hint">{{ hint }}</slot></div>
    </div>
    <div v-if="$slots.default || $slots.action" class="row-action">
      <slot name="action"><slot /></slot>
    </div>
  </div>
</template>

<style scoped>
.list-row { display: flex; align-items: center; gap: 16px; padding: 14px 0; }
.list-row.divider { border-bottom: 1px solid rgb(var(--color-line)); }
.list-row.interactive { cursor: pointer; }
.list-row.interactive:hover { background: rgb(var(--color-ink) / 0.03); }
.row-media { flex: none; }
.row-text { flex: 1; min-width: 0; }
.row-label { font-family: var(--font-body); font-size: 1.5rem; color: rgb(var(--color-ink)); }
.row-hint { font-family: var(--font-body); font-size: 1.3rem; color: rgb(var(--color-mute)); margin-top: 2px; line-height: 1.45; }
.row-action { flex: none; }
</style>
