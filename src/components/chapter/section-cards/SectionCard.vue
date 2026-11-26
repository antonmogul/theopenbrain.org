<script setup>
/* Artwork-only card for sections whose first figure is a different image.
 * Matching stills render in the figure pane itself, with a scrubbed wash.
 */
defineProps({
  /* { src, alt } from helper/sectionArt.js. */
  art: { type: Object, required: true },
  /* 0 → 1 across the card's stay. */
  progress: { type: Number, default: 0 },
  still: { type: Boolean, default: false },
});
</script>

<template>
  <div
    class="sec-card"
    :class="{ 'sec-card--still': still }"
    :style="{
      '--sec-p': still ? 1 : progress,
    }"
    aria-hidden="true"
    data-section-card
  >
    <img
      class="sec-card__art"
      :src="art.src"
      alt=""
      decoding="async"
      draggable="false"
    />
    <span v-if="art.placeholder === true" class="sec-card__placeholder"
      >Placeholder image</span
    >
  </div>
</template>

<style scoped>
.sec-card {
  --sec-ease: cubic-bezier(0.22, 0.61, 0.36, 1);
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: rgb(var(--color-figure-ground));
  color: #fff;
  font-family: var(--font-ui);
  /* The pane this sits in may be queried for its width. */
  container-type: size;
}
.sec-card__art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  user-select: none;
  /* Settles as the reader comes through: 1.08 → 1. */
  transform: scale(calc(1.08 - 0.08 * var(--sec-p, 1)));
  transform-origin: 50% 40%;
  will-change: transform;
}
.sec-card__placeholder {
  position: absolute;
  top: 1rem;
  left: 1rem;
  padding: 0.375rem 0.625rem;
  background: rgb(var(--color-dark-surface));
  color: #fff;
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  line-height: 1.4;
  letter-spacing: 0.02em;
}
.sec-card--still .sec-card__art {
  transform: none;
  will-change: auto;
}
@media (prefers-reduced-motion: reduce) {
  :root:not([data-reduce-motion="0"]) .sec-card__art {
    transform: none;
    will-change: auto;
  }
}
</style>
