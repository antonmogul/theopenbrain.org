<script setup>
// Template T2: a text-heavy slide. A lead paragraph and body paragraphs on
// the left, an optional sidebar note on the right.
import DeckSlide from "../DeckSlide.vue";

defineProps({
  eyebrow: { type: String, default: "" },
  title: { type: String, required: true },
  lead: { type: String, default: "" },
  paragraphs: { type: Array, default: () => [] },
  // { label, text }
  note: { type: Object, default: null },
});
</script>

<template>
  <DeckSlide class="deck-pad text">
    <span class="deck-eyebrow text__eyebrow">{{ eyebrow }}</span>
    <h2 class="deck-title text__title">{{ title }}</h2>
    <div class="text__grid">
      <div class="text__main">
        <p v-if="lead" class="text__lead">{{ lead }}</p>
        <p v-for="(p, i) in paragraphs" :key="i" class="text__body">{{ p }}</p>
      </div>
      <aside v-if="note" class="text__note">
        <span class="text__note-label">{{ note.label }}</span>
        <p class="text__note-text">{{ note.text }}</p>
      </aside>
    </div>
  </DeckSlide>
</template>

<style scoped>
.text__eyebrow {
  margin-bottom: 20px;
}
.text__title {
  margin-bottom: 64px;
}
.text__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 480px;
  gap: 100px;
  flex: 1;
}
.text__main {
  display: flex;
  flex-direction: column;
  gap: 32px;
  max-width: 1100px;
}
.text__lead {
  font-size: 40px;
  line-height: 1.4;
  font-weight: 500;
  text-wrap: pretty;
}
.text__body {
  font-size: 32px;
  line-height: 1.5;
  color: rgb(var(--deck-body));
  text-wrap: pretty;
}
.text__note {
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-top: 32px;
  border-top: 2px solid rgb(var(--color-accent));
}
.text__note-label {
  font-family: "IBM Plex Mono", ui-monospace, monospace;
  font-size: 24px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgb(var(--color-accent));
}
.text__note-text {
  font-size: 28px;
  line-height: 1.5;
  color: rgb(var(--deck-body));
  text-wrap: pretty;
}
</style>
