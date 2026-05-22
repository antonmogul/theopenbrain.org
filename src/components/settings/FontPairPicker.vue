<script setup>
import { usePreferences } from "@/composables/usePreferences";

const { fontPair } = usePreferences();

const options = [
  {
    value: "ibm-plex-legacy",
    label: "IBM Plex (current)",
    sample: "Aa",
    sampleFont: '"IBM Plex Sans", system-ui, sans-serif',
  },
  {
    value: "newsreader",
    label: "Newsreader + Inter Tight",
    sample: "Aa",
    sampleFont: '"Newsreader", "Source Serif Pro", Georgia, serif',
  },
  {
    value: "literata",
    label: "Literata + Inter",
    sample: "Aa",
    sampleFont: '"Literata", Georgia, serif',
  },
  {
    value: "georgia",
    label: "Georgia + System",
    sample: "Aa",
    sampleFont: 'Georgia, "Times New Roman", serif',
  },
  {
    value: "sans",
    label: "Inter Tight (sans only)",
    sample: "Aa",
    sampleFont: '"Inter Tight", "Inter", system-ui, sans-serif',
  },
];
</script>

<template>
  <div class="picker" role="radiogroup" aria-label="Font pair">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      role="radio"
      :aria-checked="fontPair === opt.value"
      class="card"
      :class="{ selected: fontPair === opt.value }"
      @click="fontPair = opt.value"
    >
      <div class="sample" :style="{ fontFamily: opt.sampleFont }">
        {{ opt.sample }}
      </div>
      <div class="label">{{ opt.label }}</div>
    </button>
  </div>
</template>

<style scoped>
.picker {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1rem;
}

@media (max-width: 767px) {
  .picker {
    grid-template-columns: repeat(2, 1fr);
  }
}

.card {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 1.2rem 1rem;
  background: rgb(var(--color-paper));
  border: 1px solid rgb(var(--color-line));
  border-radius: 0.8rem;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s;
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

.sample {
  font-size: 2.8rem;
  line-height: 1;
  color: rgb(var(--color-ink));
}

.label {
  font-size: 1.1rem;
  color: rgb(var(--color-mute));
}
</style>
