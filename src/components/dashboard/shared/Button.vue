<script setup>
// One pill button covering the variants scattered across SettingsProfileSection/
// SettingsAccountSection. Mono uppercase, token-based.
import { computed } from "vue";
const props = defineProps({
  variant: { type: String, default: "solid" }, // solid | ghost | outline | danger
  size: { type: String, default: "md" }, // sm | md | lg
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  block: { type: Boolean, default: false },
  as: { type: String, default: "button" }, // button | a | router-link
  to: { type: [String, Object], default: undefined },
});
defineEmits(["click"]);
const tag = computed(() => props.as);
</script>

<template>
  <component
    :is="tag"
    :to="as === 'router-link' ? to : undefined"
    :href="as === 'a' ? to : undefined"
    :type="as === 'button' ? 'button' : undefined"
    class="btn"
    :class="[`v-${variant}`, `s-${size}`, { block, loading }]"
    :disabled="as === 'button' ? (disabled || loading) : undefined"
    :aria-disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="spinner" aria-hidden="true" />
    <slot name="icon-left" />
    <slot />
    <slot name="icon-right" />
  </component>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border-radius: 999px;
  cursor: pointer;
  text-decoration: none;
  border: 1px solid transparent;
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
}
.btn.block { width: 100%; }
.s-sm { font-size: 1rem; padding: 6px 12px; }
.s-md { font-size: 1.1rem; padding: 9px 18px; }
.s-lg { font-size: 1.3rem; padding: 12px 24px; }

.v-solid { background: rgb(var(--color-ink)); color: rgb(var(--color-paper)); border-color: rgb(var(--color-ink)); }
.v-solid:hover { background: rgb(var(--color-ink) / 0.85); }
.v-outline { background: transparent; color: rgb(var(--color-ink)); border-color: rgb(var(--color-ink) / 0.85); }
.v-outline:hover { background: rgb(var(--color-ink)); color: rgb(var(--color-paper)); }
.v-ghost { background: transparent; color: rgb(var(--color-ink)); }
.v-ghost:hover { background: rgb(var(--color-ink) / 0.06); }
.v-danger { background: transparent; color: rgb(var(--color-accent)); border-color: rgb(var(--color-accent)); }
.v-danger:hover { background: rgb(var(--color-accent) / 0.08); }

.btn:disabled, .btn[aria-disabled="true"] { opacity: 0.45; cursor: not-allowed; pointer-events: none; }

.spinner {
  width: 13px; height: 13px; border-radius: 999px;
  border: 2px solid currentColor; border-right-color: transparent;
  animation: btn-spin 0.6s linear infinite;
}
@keyframes btn-spin { to { transform: rotate(360deg); } }
</style>
