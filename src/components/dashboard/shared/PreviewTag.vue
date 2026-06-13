<script setup>
// The "· preview" / "· coming soon" inline marker for not-yet-wired UI.
// Single source so every mocked surface looks identical (SettingsView .soon).
defineProps({
  variant: { type: String, default: "preview" }, // preview | soon | beta
  bare: { type: Boolean, default: false }, // omit the leading "· "
});
const TEXT = { preview: "preview", soon: "coming soon", beta: "beta" };
</script>

<template>
  <span class="preview-tag">{{ bare ? "" : "· "
  }}<slot>{{ TEXT[variant] || variant }}</slot></span>
</template>

<style scoped>
.preview-tag {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  color: rgb(var(--color-mute) / 0.7);
  letter-spacing: 0.04em;
}
</style>
