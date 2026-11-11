<script setup>
/*
 * A section's card (OPENBRAIN-174): the section's picture filling the figure
 * pane, its number set large and its title under it. What the pane shows
 * while the reader crosses into the section (SectionCards.vue places it and
 * says how far along the crossing is).
 *
 * The picture carries the chapter's colour itself (helper/sectionArt.js); a
 * shade under the words keeps them readable on any of them. As the reader
 * scrolls the picture settles from slightly large to its size (`progress`
 * 0 → 1), the only movement tied to the scroll. Under reduced motion
 * (`still`) nothing moves or fades.
 *
 * The card repeats the heading beside it, so it is not announced.
 */
defineProps({
  /* { src, alt } from helper/sectionArt.js. */
  art: { type: Object, required: true },
  /* The section's number as the reader prints it ("3"). */
  label: { type: String, default: "" },
  title: { type: String, default: "" },
  /* 0 → 1 across the card's stay. */
  progress: { type: Number, default: 0 },
  /* 1 → 0 as the section's own heading comes up beside the card
     (helper/sectionCard.js titleShare): the title hands over to it. */
  titleShare: { type: Number, default: 1 },
  still: { type: Boolean, default: false },
});
</script>

<template>
  <div
    class="sec-card"
    :class="{ 'sec-card--still': still }"
    :style="{
      '--sec-p': still ? 1 : progress,
      // Under reduced motion the title is there or it is not.
      '--sec-title': still ? (titleShare > 0.5 ? 1 : 0) : titleShare,
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
    <div class="sec-card__shade" />
    <div class="sec-card__words">
      <!-- The title over the number: the title goes when the heading
           arrives, and the number is left standing on the card's foot. -->
      <span class="sec-card__title"
        ><span class="sec-card__title-text">{{ title }}</span></span
      >
      <span v-if="label" class="sec-card__num">{{ label }}</span>
    </div>
  </div>
</template>

<style scoped>
.sec-card {
  --sec-ease: cubic-bezier(0.22, 0.61, 0.36, 1);
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: rgb(var(--color-dark-surface));
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
/* Dark from the foot up, under the words. */
.sec-card__shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgb(var(--color-dark-surface) / 0.94) 0%,
    rgb(var(--color-dark-surface) / 0.72) 22%,
    rgb(var(--color-dark-surface) / 0) 58%
  );
}
.sec-card__words {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  padding: 0 clamp(1.5rem, 5cqw, 2.75rem) clamp(1.75rem, 6cqh, 3rem);
}
.sec-card__num {
  font-size: clamp(6rem, 26cqw, 13rem);
  font-weight: 300;
  line-height: 0.86;
  letter-spacing: -0.03em;
  font-variant-numeric: lining-nums;
  /* Optical: the numeral's side bearing, so it lines up with the title. */
  margin-left: -0.05em;
  animation: sec-card-rise 620ms var(--sec-ease) 180ms both;
}
.sec-card__title {
  margin-bottom: clamp(0.5rem, 1.8cqh, 1rem);
  max-width: 22ch;
  font-size: clamp(1.375rem, 4.4cqw, 2.25rem);
  font-weight: 500;
  line-height: 1.18;
  letter-spacing: 0.1px;
  text-wrap: balance;
  animation: sec-card-rise 620ms var(--sec-ease) 80ms both;
}
/* The hand-over to the heading is on an inner span, so it and the entrance
   above never set the same property. */
.sec-card__title-text {
  display: block;
  opacity: var(--sec-title, 1);
}
@keyframes sec-card-rise {
  from {
    opacity: 0;
    transform: translateY(1.25rem);
  }
}

.sec-card--still .sec-card__art {
  transform: none;
  will-change: auto;
}
.sec-card--still .sec-card__num,
.sec-card--still .sec-card__title {
  animation: none;
}
@media (prefers-reduced-motion: reduce) {
  .sec-card__art {
    transform: none;
    will-change: auto;
  }
  .sec-card__num,
  .sec-card__title {
    animation: none;
  }
}
</style>
