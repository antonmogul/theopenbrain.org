<script setup>
// The 1920×1080 canvas every slide layout renders into. Brings in the deck
// stylesheet, so a layout mounted on its own (a story, a test) looks the
// same as it does inside DeckStage.
import "./deck.css";

defineProps({
  // "paper" (warm light background) or "dark" (the chapter opener surface).
  tone: {
    type: String,
    default: "paper",
    validator: (v) => ["paper", "dark"].includes(v),
  },
});
</script>

<template>
  <section class="deck-slide" :class="{ 'deck-slide--dark': tone === 'dark' }">
    <slot />
  </section>
</template>
