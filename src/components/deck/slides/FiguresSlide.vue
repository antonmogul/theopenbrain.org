<script setup>
// Template T8: three key figures. Use only real, sourced numbers; the middle
// one is in the accent colour.
import DeckSlide from "../DeckSlide.vue";

defineProps({
  eyebrow: { type: String, default: "" },
  title: { type: String, required: true },
  // [{ value, label }]
  figures: { type: Array, required: true },
  source: { type: String, default: "" },
});
</script>

<template>
  <DeckSlide class="deck-pad figures">
    <span class="deck-eyebrow figures__eyebrow">{{ eyebrow }}</span>
    <h2 class="deck-title figures__title">{{ title }}</h2>
    <div class="figures__grid">
      <div v-for="(f, i) in figures" :key="i" class="deck-ruled">
        <span class="figures__value" :class="{ 'is-accent': i === 1 }">{{
          f.value
        }}</span>
        <span class="figures__label">{{ f.label }}</span>
      </div>
    </div>
    <span class="figures__source">{{ source }}</span>
  </DeckSlide>
</template>

<style scoped>
.figures__eyebrow {
  margin-bottom: 20px;
}
.figures__title {
  margin-bottom: 64px;
}
.figures__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 64px;
  margin: auto 0;
}
.figures__value {
  font-size: 160px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.03em;
}
.figures__value.is-accent {
  color: rgb(var(--color-accent));
}
.figures__label {
  font-size: 32px;
  line-height: 1.4;
  color: rgb(var(--deck-body));
}
.figures__source {
  font-family: "IBM Plex Mono", ui-monospace, monospace;
  font-size: 24px;
  color: rgb(var(--color-mute));
}
</style>
