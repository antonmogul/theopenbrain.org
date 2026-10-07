<script setup>
// Template T15: a break in the deck. A large quote over a full-bleed image,
// with a dark tint that fades from left to right so the text stays legible.
import DeckSlide from "../DeckSlide.vue";
import DeckImage from "../DeckImage.vue";

defineProps({
  eyebrow: { type: String, default: "" },
  quote: { type: String, required: true },
  name: { type: String, default: "" },
  role: { type: String, default: "" },
  credit: { type: String, default: "" },
  image: { type: Object, default: () => ({ src: "", alt: "" }) },
});
</script>

<template>
  <DeckSlide tone="dark" class="quote">
    <div class="quote__image">
      <DeckImage
        :src="image.src"
        :alt="image.alt"
        :placeholder="image.placeholder || 'Full-bleed background image'"
      />
    </div>
    <div class="quote__tint" aria-hidden="true" />
    <div class="quote__content">
      <span class="deck-eyebrow quote__eyebrow">{{ eyebrow }}</span>
      <div class="quote__middle">
        <blockquote class="quote__text">“{{ quote }}”</blockquote>
        <div class="quote__by">
          <span class="quote__rule" aria-hidden="true" />
          <div class="quote__who">
            <span class="quote__name">{{ name }}</span>
            <span class="quote__role">{{ role }}</span>
          </div>
        </div>
      </div>
      <span class="quote__credit">{{ credit }}</span>
    </div>
  </DeckSlide>
</template>

<style scoped>
.quote__image,
.quote__tint,
.quote__content {
  position: absolute;
  inset: 0;
}
.quote__tint {
  background: linear-gradient(
    90deg,
    rgb(18 18 18 / 0.88) 0%,
    rgb(18 18 18 / 0.7) 55%,
    rgb(18 18 18 / 0.35) 100%
  );
}
.quote__content {
  padding: 100px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.quote__eyebrow {
  color: rgb(var(--color-complete));
}
.quote__middle {
  max-width: 1300px;
  display: flex;
  flex-direction: column;
  gap: 56px;
}
.quote__text {
  margin: 0;
  font-size: 96px;
  font-weight: 500;
  line-height: 1.1;
  letter-spacing: -0.015em;
  text-wrap: pretty;
}
.quote__by {
  display: flex;
  align-items: center;
  gap: 24px;
}
.quote__rule {
  width: 64px;
  height: 3px;
  background: rgb(var(--color-accent));
}
.quote__who {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.quote__name {
  font-size: 34px;
  font-weight: 500;
}
.quote__role {
  font-family: "IBM Plex Mono", ui-monospace, monospace;
  font-size: 24px;
}
.quote__credit {
  font-family: "IBM Plex Mono", ui-monospace, monospace;
  font-size: 24px;
  color: rgb(var(--deck-chrome-dot));
}
</style>
