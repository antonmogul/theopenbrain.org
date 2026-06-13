<script setup>
// Numbered-eyebrow section header: "NN · Title" → h2 → subtitle. Optional
// right-aligned actions slot and preview marker. Extracted from SettingsView.
import PreviewTag from "./PreviewTag.vue";
defineProps({
  eyebrow: { type: String, default: "" },
  title: { type: String, required: true },
  subtitle: { type: String, default: "" },
  preview: { type: Boolean, default: false },
});
</script>

<template>
  <header class="section-header">
    <div class="header-row">
      <div class="header-text">
        <p v-if="eyebrow" class="eyebrow">
          {{ eyebrow }} <PreviewTag v-if="preview" />
        </p>
        <h2>{{ title }}</h2>
      </div>
      <div v-if="$slots.actions" class="header-actions"><slot name="actions" /></div>
    </div>
    <p v-if="subtitle || $slots.default" class="subtitle">
      <slot>{{ subtitle }}</slot>
    </p>
  </header>
</template>

<style scoped>
.section-header { margin-bottom: 28px; }
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.header-actions { flex: none; display: flex; align-items: center; gap: 8px; padding-top: 4px; }
.eyebrow {
  font-family: var(--font-mono); font-size: 1.1rem; text-transform: uppercase;
  letter-spacing: 0.12em; color: rgb(var(--color-mute)); margin: 0 0 10px;
}
h2 {
  font-family: var(--font-body); font-size: 3.2rem; font-weight: 500;
  line-height: 1.1; letter-spacing: -0.012em; margin: 0;
}
.subtitle {
  font-family: var(--font-body); font-size: 1.6rem; line-height: 1.5;
  color: rgb(var(--color-mute)); margin: 8px 0 0; max-width: 64rem;
}
</style>
