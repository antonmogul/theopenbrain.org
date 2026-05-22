<script setup>
import { usePreferences } from "@/composables/usePreferences";

const { theme } = usePreferences();

const options = [
  { value: "system", label: "System", hint: "Match OS" },
  { value: "light", label: "Light", hint: "Paper" },
  { value: "dark", label: "Dark", hint: "Ink" },
];
</script>

<template>
  <div class="theme-cards" role="radiogroup" aria-label="Appearance">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      role="radio"
      :aria-checked="theme === opt.value"
      class="card"
      :class="{ selected: theme === opt.value }"
      @click="theme = opt.value"
    >
      <div class="preview" :data-preview="opt.value">
        <div class="preview-bar" />
        <div class="preview-body">
          <div class="preview-line" />
          <div class="preview-line short" />
        </div>
      </div>
      <div class="meta">
        <div class="label">{{ opt.label }}</div>
        <div class="hint">{{ opt.hint }}</div>
      </div>
    </button>
  </div>
</template>

<style scoped>
.theme-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.2rem;
}

.card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 0;
  background: rgb(var(--color-paper));
  border: 1px solid rgb(var(--color-line));
  border-radius: 0.8rem;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.15s, transform 0.1s;
  text-align: left;
}

.card:hover {
  border-color: rgb(var(--color-accent));
}

.card.selected {
  border-color: rgb(var(--color-accent));
  box-shadow: 0 0 0 2px rgb(var(--color-accent) / 0.25);
}

.card:focus-visible {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: 2px;
}

.preview {
  aspect-ratio: 16 / 9;
  padding: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.preview[data-preview="light"] {
  background: #f7f5f0;
  color: #0a0a0a;
}
.preview[data-preview="dark"] {
  background: #0e1313;
  color: #f3efe6;
}
.preview[data-preview="system"] {
  background: linear-gradient(135deg, #f7f5f0 50%, #0e1313 50%);
}

.preview-bar {
  height: 0.6rem;
  width: 60%;
  background: rgb(var(--color-accent));
  border-radius: 0.3rem;
}

.preview-body {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  flex: 1;
  justify-content: flex-end;
}

.preview-line {
  height: 0.4rem;
  width: 100%;
  background: currentColor;
  opacity: 0.4;
  border-radius: 0.2rem;
}

.preview-line.short {
  width: 70%;
}

.preview[data-preview="system"] .preview-line {
  background: linear-gradient(90deg, #0a0a0a 50%, #f3efe6 50%);
  opacity: 0.6;
}

.meta {
  padding: 0.8rem 1rem;
  border-top: 1px solid rgb(var(--color-line));
}

.label {
  font-size: 1.4rem;
  font-weight: 500;
  color: rgb(var(--color-ink));
}

.hint {
  font-size: 1.1rem;
  color: rgb(var(--color-mute));
  margin-top: 0.2rem;
}
</style>
