<script setup>
// Template T1: a dark section divider.
import DeckSlide from "../DeckSlide.vue";

defineProps({
  eyebrow: { type: String, default: "" },
  number: { type: String, default: "" },
  title: { type: String, required: true },
  lead: { type: String, default: "" },
});
</script>

<template>
  <DeckSlide tone="dark" class="section">
    <span class="deck-eyebrow">{{ eyebrow }}</span>
    <div class="section__middle">
      <span v-if="number" class="section__number">{{ number }}</span>
      <h2 class="deck-display">{{ title }}</h2>
      <p v-if="lead" class="deck-lead section__lead">{{ lead }}</p>
    </div>
    <span class="section__foot">the open brain</span>
  </DeckSlide>
</template>

<style scoped>
.section {
  padding: 100px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.section__middle {
  display: flex;
  flex-direction: column;
  gap: 36px;
}
.section__number {
  font-family: "IBM Plex Mono", ui-monospace, monospace;
  font-size: 40px;
  color: rgb(var(--color-complete));
}
.section__lead {
  max-width: 1100px;
}
.section__foot {
  font-family: "IBM Plex Mono", ui-monospace, monospace;
  font-size: 24px;
  letter-spacing: 0.06em;
  color: rgb(var(--color-mute));
}
</style>
