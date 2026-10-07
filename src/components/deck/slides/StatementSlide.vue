<script setup>
// Template T6: one statement or quotation that carries the slide.
import DeckSlide from "../DeckSlide.vue";

defineProps({
  eyebrow: { type: String, default: "" },
  quote: { type: String, required: true },
  name: { type: String, default: "" },
  role: { type: String, default: "" },
});
</script>

<template>
  <DeckSlide class="statement">
    <span class="deck-eyebrow">{{ eyebrow }}</span>
    <blockquote class="statement__quote">“{{ quote }}”</blockquote>
    <div class="statement__by">
      <span class="statement__name">{{ name }}</span>
      <span class="statement__role">{{ role }}</span>
    </div>
  </DeckSlide>
</template>

<style scoped>
.statement {
  padding: 100px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.statement__quote {
  margin: 0;
  max-width: 1600px;
  font-size: 96px;
  font-weight: 500;
  line-height: 1.1;
  letter-spacing: -0.015em;
  text-wrap: pretty;
}
.statement__by {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.statement__name {
  font-size: 34px;
  font-weight: 500;
}
.statement__role {
  font-family: "IBM Plex Mono", ui-monospace, monospace;
  font-size: 24px;
  color: rgb(var(--color-accent));
}
</style>
