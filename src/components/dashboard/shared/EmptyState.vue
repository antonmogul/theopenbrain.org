<script setup>
// Centered empty state: optional icon slot + title + message + action.
// Token-based; action falls back to a shared Button rendering actionLabel.
import Button from "./Button.vue";
defineProps({
  title: { type: String, default: "Nothing here yet" },
  message: { type: String, default: "" },
  actionLabel: { type: String, default: "" },
});
defineEmits(["action"]);
</script>

<template>
  <div class="state">
    <div v-if="$slots.icon" class="state-icon"><slot name="icon" /></div>
    <h3 class="state-title">{{ title }}</h3>
    <p v-if="message" class="state-msg">{{ message }}</p>
    <div v-if="$slots.action || actionLabel" class="state-action">
      <slot name="action">
        <Button v-if="actionLabel" variant="outline" size="sm" @click="$emit('action')">{{ actionLabel }}</Button>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.state { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 48px 24px; gap: 8px; }
.state-icon { color: rgb(var(--color-mute)); opacity: 0.6; margin-bottom: 8px; }
.state-title { font-family: var(--font-body); font-size: 1.8rem; font-weight: 500; color: rgb(var(--color-ink)); margin: 0; }
.state-msg { font-family: var(--font-body); font-size: 1.4rem; color: rgb(var(--color-mute)); margin: 0; max-width: 42rem; line-height: 1.5; }
.state-action { margin-top: 12px; }
</style>
