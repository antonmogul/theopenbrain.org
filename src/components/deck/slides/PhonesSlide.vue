<script setup>
// Template T11: up to three phone screens in a row, each with a caption.
import DeckSlide from "../DeckSlide.vue";
import DeviceFrame from "../DeviceFrame.vue";

defineProps({
  eyebrow: { type: String, default: "" },
  title: { type: String, required: true },
  // [{ heading, caption, src?, alt?, placeholder? }]
  screens: { type: Array, required: true },
});
</script>

<template>
  <DeckSlide class="deck-pad phones">
    <span class="deck-eyebrow phones__eyebrow">{{ eyebrow }}</span>
    <h2 class="deck-title phones__title">{{ title }}</h2>
    <div class="phones__row">
      <figure v-for="(s, i) in screens" :key="i" class="phones__item">
        <DeviceFrame
          kind="phone"
          :width="282"
          :height="600"
          :src="s.src"
          :alt="s.alt"
          :placeholder="s.placeholder || `Phone screen ${i + 1}`"
        />
        <figcaption class="phones__caption">
          <span class="phones__heading">{{ s.heading }}</span>
          <span class="phones__text">{{ s.caption }}</span>
        </figcaption>
      </figure>
    </div>
  </DeckSlide>
</template>

<style scoped>
.phones {
  padding-bottom: 70px;
}
.phones__eyebrow {
  margin-bottom: 20px;
}
.phones__title {
  margin-bottom: 48px;
}
.phones__row {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 120px;
}
.phones__item {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
}
.phones__caption {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}
.phones__heading {
  font-size: 32px;
  font-weight: 500;
}
.phones__text {
  font-size: 24px;
  color: rgb(var(--color-mute));
}
</style>
