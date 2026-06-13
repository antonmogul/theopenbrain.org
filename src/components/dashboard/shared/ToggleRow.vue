<script setup>
// Label + hint + Switch row, matching the prototype ToggleRow (profile.jsx).
// v-model:checked. Used by Email preferences, Data & privacy, and diagram toggles.
import Switch from "./Switch.vue";
import PreviewTag from "./PreviewTag.vue";

defineProps({
  label: { type: String, required: true },
  hint: { type: String, default: "" },
  checked: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  preview: { type: Boolean, default: false },
});
defineEmits(["update:checked"]);
</script>

<template>
  <div class="toggle-row">
    <div class="toggle-text">
      <div class="toggle-label">
        {{ label }} <PreviewTag v-if="preview" />
      </div>
      <div v-if="hint" class="toggle-hint">{{ hint }}</div>
    </div>
    <Switch
      :checked="checked"
      :disabled="disabled"
      @update:checked="$emit('update:checked', $event)"
    />
  </div>
</template>

<style scoped>
.toggle-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  padding: 12px 0;
  align-items: center;
  border-bottom: 1px solid rgb(var(--color-line));
}

.toggle-label {
  font-family: var(--font-body);
  font-size: 1.5rem;
  color: rgb(var(--color-ink));
}

.toggle-hint {
  font-family: var(--font-body);
  font-size: 1.3rem;
  color: rgb(var(--color-mute));
  margin-top: 4px;
  line-height: 1.45;
}
</style>
