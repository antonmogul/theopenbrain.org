<script setup>
// Bordered token surface card (SettingsView .bordered-card / .rows-card).
import { computed } from "vue";
const props = defineProps({
  padding: { type: String, default: "md" }, // none | sm | md | lg
  interactive: { type: Boolean, default: false },
  as: { type: String, default: "div" },
});
defineEmits(["click"]);
const tag = computed(() => props.as);
</script>

<template>
  <component
    :is="tag" class="base-card" :class="[`p-${padding}`, { interactive }]"
    @click="interactive && $emit('click', $event)"
  >
    <div v-if="$slots.header" class="card-header"><slot name="header" /></div>
    <slot />
    <div v-if="$slots.footer" class="card-footer"><slot name="footer" /></div>
  </component>
</template>

<style scoped>
.base-card {
  border: 1px solid rgb(var(--color-line));
  border-radius: 4px;
  background: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
  text-align: left;
  transition: border-color 0.12s ease;
}
.p-none { padding: 0; }
.p-sm { padding: 12px; }
.p-md { padding: 20px; }
.p-lg { padding: 28px; }
.interactive { cursor: pointer; }
.interactive:hover { border-color: rgb(var(--color-ink) / 0.35); }
.card-header { border-bottom: 1px solid rgb(var(--color-line)); margin: -20px -20px 16px; padding: 16px 20px; }
.card-footer { border-top: 1px solid rgb(var(--color-line)); margin: 16px -20px -20px; padding: 16px 20px; }
</style>
