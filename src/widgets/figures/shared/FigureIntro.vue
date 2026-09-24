<script setup>
/*
 * A figure widget's introduction (OPENBRAIN-80, -81), as on theopenbrain.org:
 * the text on the left half, an optional video on the right, split by a
 * white rule. It covers its widget; the widget dims itself underneath.
 */
import { computed } from "vue";
import { RouterLink } from "vue-router";

const props = defineProps({
  /** The introduction (HTML: superscripts, footnote marks). */
  text: { type: String, default: "" },
  /** { title, text, slug } of a break video, or null. */
  video: { type: Object, default: null },
});

const videoImage = computed(() =>
  !props.video?.slug || props.video.slug === "placeholder"
    ? "/publicAssets/images/placeholders/monaLisa.webp"
    : `/publicAssets/images/breakVideos/${props.video.slug}.png`
);
</script>

<template>
  <div class="fi">
    <p class="fi-text" v-html="text" />
    <RouterLink
      v-if="video?.title"
      :to="`/chapter/break/${video.slug || 'placeholder'}`"
      class="fi-video"
    >
      <span class="fi-thumb">
        <img :src="videoImage" alt="" loading="lazy" />
      </span>
      <span class="fi-play" aria-hidden="true">
        <svg viewBox="0 0 32 32"><path d="M12 9l12 7-12 7z" /></svg>
      </span>
      <span class="fi-caption">
        <b>{{ video.title }}</b>
        <span>{{ video.text }}</span>
      </span>
    </RouterLink>
  </div>
</template>

<style scoped>
.fi {
  --fi-accent: var(--widget-accent, rgb(var(--color-chapter)));
  --fi-sans: "IBM Plex Sans", system-ui, sans-serif;
  position: absolute;
  inset: 0;
  z-index: 2;
  display: grid;
  grid-template-columns: 50% 50%;
  padding-top: 9.375rem;
  color: #fff;
  pointer-events: none;
}
.fi::after {
  content: "";
  position: absolute;
  inset: 0 auto 0 50%;
  border-left: 1px solid #fff;
}
.fi-text {
  margin: 0;
  padding: 0 3.75rem;
  max-width: 45rem;
  max-height: calc(100% - 3rem);
  overflow-y: auto;
  font: 1.125rem/1.67 var(--fi-sans);
  hyphens: auto;
  pointer-events: auto;
}
/* Footnote marks: the reader's own sup rule sets them at the line's top;
   here they sit as superscripts, and light up in the accent. */
.fi-text :deep(sup) {
  padding: 0 1px;
  font-size: 0.6em;
  line-height: 0;
  vertical-align: super;
}
.fi-text :deep(sup:hover) {
  background: var(--fi-accent);
  color: #000;
}
.fi-video {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  align-self: start;
  margin-top: -2rem;
  color: #fff;
  text-decoration: none;
  pointer-events: auto;
}
.fi-video:focus-visible {
  outline: 2px solid var(--fi-accent);
  outline-offset: 2px;
}
/* Duotone as the original: the grey photo screened over the accent. */
.fi-thumb {
  position: relative;
  display: block;
  height: 12.5rem;
  background: #000;
  isolation: isolate;
}
.fi-thumb::before {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--fi-accent);
  opacity: 0.7;
}
.fi-thumb img {
  position: relative;
  display: block;
  height: 100%;
  width: auto;
  filter: grayscale(1);
  mix-blend-mode: screen;
}
.fi-play {
  position: absolute;
  left: -1.25rem;
  top: -1.25rem;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid #000;
  border-radius: 50%;
  background: #fff;
  color: #000;
}
.fi-play svg {
  width: 1.25rem;
  height: 1.25rem;
  fill: currentColor;
}
.fi-caption {
  display: grid;
  gap: 0.125rem;
  padding-top: 0.25rem;
  font: 0.8125rem/1.3 var(--fi-sans);
  opacity: 0.7;
}
.fi-video:hover .fi-caption {
  opacity: 1;
}
</style>
