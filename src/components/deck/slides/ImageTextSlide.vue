<script setup>
// Template T7: a headline and paragraph beside a full-height image.
import DeckSlide from "../DeckSlide.vue";
import DeckImage from "../DeckImage.vue";

defineProps({
  eyebrow: { type: String, default: "" },
  title: { type: String, required: true },
  text: { type: String, default: "" },
  credit: { type: String, default: "" },
  image: { type: Object, default: () => ({ src: "", alt: "" }) },
});
</script>

<template>
  <DeckSlide class="image-text">
    <div class="image-text__copy">
      <span class="deck-eyebrow">{{ eyebrow }}</span>
      <div class="image-text__middle">
        <h2 class="deck-title">{{ title }}</h2>
        <p class="image-text__text">{{ text }}</p>
      </div>
      <span class="image-text__credit">{{ credit }}</span>
    </div>
    <div class="image-text__image">
      <DeckImage
        :src="image.src"
        :alt="image.alt"
        :placeholder="image.placeholder || 'Full-height image'"
      />
    </div>
  </DeckSlide>
</template>

<style scoped>
.image-text {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 860px;
}
.image-text__copy {
  padding: 100px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.image-text__middle {
  display: flex;
  flex-direction: column;
  gap: 36px;
}
.image-text__text {
  font-size: 32px;
  line-height: 1.5;
  color: rgb(var(--deck-body));
  text-wrap: pretty;
}
.image-text__credit {
  font-family: "IBM Plex Mono", ui-monospace, monospace;
  font-size: 24px;
  color: rgb(var(--color-mute));
}
.image-text__image {
  position: relative;
}
</style>
