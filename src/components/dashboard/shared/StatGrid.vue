<script setup>
// The bordered, evenly-divided stat row from SettingsView (.stats-grid). Lays
// out StatCards or arbitrary stat slots. Collapses to 2 columns under 767px.
defineProps({
  columns: { type: Number, default: 4 },
  bordered: { type: Boolean, default: true },
});
</script>

<template>
  <div class="stat-grid" :class="{ bordered }" :style="{ '--cols': columns }">
    <slot />
  </div>
</template>

<style scoped>
.stat-grid { display: grid; grid-template-columns: repeat(var(--cols), 1fr); }
.stat-grid:not(.bordered) { gap: 16px; }
.stat-grid.bordered {
  border-top: 1px solid rgb(var(--color-line));
  border-bottom: 1px solid rgb(var(--color-line));
}
.stat-grid.bordered :slotted(*) { border-right: 1px solid rgb(var(--color-line)); }
.stat-grid.bordered :slotted(*:last-child) { border-right: 0; }
@media (max-width: 767px) { .stat-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
