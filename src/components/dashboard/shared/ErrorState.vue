<script setup>
// Centered error state with retry. Warn-toned icon; retry uses shared Button.
import Button from "./Button.vue";
defineProps({
  title: { type: String, default: "Something went wrong" },
  message: { type: String, default: "" },
  retryLabel: { type: String, default: "Try again" },
  showRetry: { type: Boolean, default: true },
});
defineEmits(["retry"]);
</script>

<template>
  <div class="state">
    <div class="state-icon"><slot name="icon">⚠</slot></div>
    <h3 class="state-title">{{ title }}</h3>
    <p v-if="message" class="state-msg">{{ message }}</p>
    <div v-if="showRetry || $slots.action" class="state-action">
      <slot name="action">
        <Button variant="outline" size="sm" @click="$emit('retry')">{{ retryLabel }}</Button>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.state { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 48px 24px; gap: 8px; }
.state-icon { color: rgb(var(--color-warn)); font-size: 2.4rem; margin-bottom: 4px; }
.state-title { font-family: var(--font-body); font-size: 1.8rem; font-weight: 500; color: rgb(var(--color-ink)); margin: 0; }
.state-msg { font-family: var(--font-body); font-size: 1.4rem; color: rgb(var(--color-mute)); margin: 0; max-width: 42rem; line-height: 1.5; }
.state-action { margin-top: 12px; }
</style>
