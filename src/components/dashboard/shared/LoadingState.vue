<script setup>
// Token spinner + optional message. Spinner respects [data-reduce-motion]
// globally via brand.css animation override.
defineProps({
  message: { type: String, default: "Loading…" },
  size: { type: String, default: "md" }, // sm | md | lg
  inline: { type: Boolean, default: false },
});
</script>

<template>
  <div class="loading" :class="[{ inline }, `s-${size}`]">
    <span class="spinner" aria-hidden="true" />
    <span v-if="message" class="loading-msg">{{ message }}</span>
  </div>
</template>

<style scoped>
.loading { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 48px 24px; }
.loading.inline { padding: 0; }
.spinner { border-radius: 999px; border: 2px solid rgb(var(--color-line)); border-top-color: rgb(var(--color-accent)); animation: ls-spin 0.7s linear infinite; }
.s-sm .spinner { width: 16px; height: 16px; }
.s-md .spinner { width: 22px; height: 22px; }
.s-lg .spinner { width: 32px; height: 32px; border-width: 3px; }
.loading-msg { font-family: var(--font-mono); font-size: 1.2rem; color: rgb(var(--color-mute)); text-transform: uppercase; letter-spacing: 0.08em; }
@keyframes ls-spin { to { transform: rotate(360deg); } }
</style>
