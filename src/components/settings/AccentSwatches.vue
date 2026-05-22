<script setup>
import { usePreferences } from "@/composables/usePreferences";

const { accent } = usePreferences();

const swatches = [
  { value: "magenta", label: "Magenta", color: "rgb(233, 30, 140)" },
  { value: "teal", label: "Teal", color: "rgb(61, 217, 181)" },
  { value: "amber", label: "Amber", color: "rgb(244, 166, 33)" },
  { value: "mono", label: "Mono", color: "rgb(10, 10, 10)" },
];
</script>

<template>
  <div class="swatches" role="radiogroup" aria-label="Accent color">
    <button
      v-for="s in swatches"
      :key="s.value"
      type="button"
      role="radio"
      :aria-checked="accent === s.value"
      class="swatch"
      :class="{ selected: accent === s.value }"
      :style="{ '--swatch': s.color }"
      :aria-label="s.label"
      :title="s.label"
      @click="accent = s.value"
    >
      <span class="dot" />
      <span class="label">{{ s.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.swatches {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.swatch {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  padding: 1rem 0.6rem;
  background: rgb(var(--color-paper));
  border: 1px solid rgb(var(--color-line));
  border-radius: 0.8rem;
  cursor: pointer;
  transition: border-color 0.15s;
}

.swatch:hover {
  border-color: var(--swatch);
}

.swatch.selected {
  border-color: var(--swatch);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--swatch) 30%, transparent);
}

.swatch:focus-visible {
  outline: 2px solid var(--swatch);
  outline-offset: 2px;
}

.dot {
  width: 2.4rem;
  height: 2.4rem;
  background: var(--swatch);
  border-radius: 50%;
}

.label {
  font-size: 1.2rem;
  color: rgb(var(--color-ink));
}
</style>
