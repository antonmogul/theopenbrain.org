<script setup>
// An image that fills its box, or a labelled placeholder while there is no
// file yet (team headshots, template screenshots). Replaces the design
// prototype's drag-and-drop <image-slot>: here a slot is filled by putting
// the file in public/ and setting `src` in the deck data. It is absolutely
// positioned over its parent (which must be positioned), so a large image
// cannot stretch the slide's grid.
defineProps({
  src: { type: String, default: "" },
  alt: { type: String, default: "" },
  // Shown in the placeholder, e.g. "Stuart — headshot".
  placeholder: { type: String, default: "Image" },
  // object-position, for headshots that need a different crop.
  position: { type: String, default: "center" },
});
</script>

<template>
  <img
    v-if="src"
    class="deck-image"
    :src="src"
    :alt="alt"
    :style="{ objectPosition: position }"
  />
  <div
    v-else
    class="deck-image deck-image--empty"
    role="img"
    :aria-label="placeholder"
  >
    <svg
      viewBox="0 0 24 24"
      width="48"
      height="48"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
    <span>{{ placeholder }}</span>
  </div>
</template>

<style scoped>
.deck-image {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.deck-image--empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px;
  text-align: center;
  background: rgb(var(--color-line));
  border: 2px dashed rgb(var(--color-mute) / 0.45);
  color: rgb(var(--color-mute));
  font-family: "IBM Plex Mono", ui-monospace, monospace;
  font-size: 22px;
  line-height: 1.3;
}
</style>
