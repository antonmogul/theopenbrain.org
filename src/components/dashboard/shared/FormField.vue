<script setup>
// Labeled field wrapper: mono uppercase label + control slot + hint/error.
// Slotted inputs get the .input chrome via :deep so callers pass bare elements.
defineProps({
  label: { type: String, default: "" },
  hint: { type: String, default: "" },
  error: { type: String, default: "" },
  required: { type: Boolean, default: false },
});
</script>

<template>
  <label class="field">
    <span v-if="label" class="field-label">
      {{ label }}<span v-if="required" class="req" aria-hidden="true"> *</span>
    </span>
    <slot />
    <span v-if="error" class="field-error">{{ error }}</span>
    <span v-else-if="hint" class="field-hint">{{ hint }}</span>
  </label>
</template>

<style scoped>
.field { display: flex; flex-direction: column; gap: 6px; }
.field-label {
  font-family: var(--font-mono); font-size: 1rem; text-transform: uppercase;
  letter-spacing: 0.1em; color: rgb(var(--color-mute));
}
.req { color: rgb(var(--color-accent)); }
.field-hint { font-family: var(--font-body); font-size: 1.3rem; color: rgb(var(--color-mute)); margin-top: 4px; line-height: 1.45; }
.field-error { font-family: var(--font-mono); font-size: 1.1rem; color: rgb(var(--color-accent)); margin-top: 4px; }

/* Style slotted native controls consistently (boxed token input). */
.field :deep(input),
.field :deep(select),
.field :deep(textarea) {
  width: 100%; border: 1px solid rgb(var(--color-line)); border-radius: 4px;
  background: transparent; padding: 10px 12px;
  font-family: var(--font-body); font-size: 1.4rem; color: rgb(var(--color-ink)); outline: none;
  transition: border-color 0.12s ease;
}
.field :deep(input:focus),
.field :deep(select:focus),
.field :deep(textarea:focus) { border-color: rgb(var(--color-ink)); }
.field :deep(textarea) { line-height: 1.5; resize: vertical; }
</style>
