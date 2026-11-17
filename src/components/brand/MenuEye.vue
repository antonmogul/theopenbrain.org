<script setup>
/*
 * The menu button's eye (OPENBRAIN-197). Stuart, 11 Nov: "The 3 horizontal
 * lines, maybe replace with the open eye (from old retina chapter), and
 * then the 'close eye' once it's open to close it?"
 *
 * Both drawings are the 2023 Retina chapter's own (icons/custom/OpenEye and
 * ClosedEye, the figure buttons of the original book), stacked in one box
 * so one can become the other: the open eye flattens and fades as the lid
 * comes in, a blink of 180 ms. Under reduced motion it changes at once.
 *
 * Decorative: the button around it carries the name and aria-expanded.
 */
defineProps({
  closed: { type: Boolean, default: false },
});
</script>

<template>
  <svg
    class="menu-eye"
    :class="{ 'menu-eye--closed': closed }"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 30.43 30.43"
    aria-hidden="true"
    focusable="false"
    data-testid="menu-eye"
    :data-eye="closed ? 'closed' : 'open'"
  >
    <path
      class="menu-eye__open"
      d="m15.21,0C6.81,0,0,6.81,0,15.21s6.81,15.21,15.21,15.21,15.21-6.81,15.21-15.21S23.62,0,15.21,0Zm0,20.47c-2.9,0-5.25-2.35-5.25-5.25s2.35-5.25,5.25-5.25,5.25,2.35,5.25,5.25-2.35,5.25-5.25,5.25Z"
    />
    <path
      class="menu-eye__closed"
      d="m26.86,19.85c1.75-2.4,2.8-5.34,2.8-8.53h-1.62c0,7.1-5.78,12.88-12.88,12.88S2.29,18.42,2.29,11.32H.67c0,3.22,1.07,6.18,2.84,8.59L0,23.42l1.14,1.14,3.4-3.4c2.48,2.67,5.94,4.4,9.81,4.62v4.82h1.62v-4.82c3.89-.22,7.37-1.97,9.85-4.67l3.45,3.45,1.14-1.14-3.57-3.57Z"
    />
  </svg>
</template>

<style scoped>
.menu-eye {
  display: block;
  width: 22px;
  height: 22px;
  fill: currentColor;
  overflow: visible;
}
.menu-eye__open,
.menu-eye__closed {
  transform-box: view-box;
  transform-origin: 50% 50%;
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.menu-eye__closed {
  opacity: 0;
  transform: translateY(-4px);
}
.menu-eye--closed .menu-eye__open {
  opacity: 0;
  transform: scaleY(0.12);
}
.menu-eye--closed .menu-eye__closed {
  opacity: 1;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  :root:not([data-reduce-motion="0"]) .menu-eye__open,
  :root:not([data-reduce-motion="0"]) .menu-eye__closed {
    transition: none;
  }
}
</style>
