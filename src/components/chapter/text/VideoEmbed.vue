<script setup>
/*
 * VideoEmbed — a YouTube video placed in the prose by a `{ type: "video" }`
 * block (OPENBRAIN-70 D2). Nothing loads from YouTube until the reader
 * presses play: the card is local, then a youtube-nocookie player replaces
 * it (allowed by the CSP in index.html).
 */
import { computed, ref } from "vue";
import { youTubeEmbedUrl } from "@/editor/video.mjs";

const props = defineProps({
  /** { youtubeId, title?, start? } */
  video: { type: Object, required: true },
});

const playing = ref(false);
const src = computed(() =>
  youTubeEmbedUrl(props.video.youtubeId, props.video.start || 0)
);
const title = computed(() => props.video.title || "Video");
</script>

<template>
  <figure class="ve noHighlight">
    <div class="ve-frame">
      <iframe
        v-if="playing"
        :src="src"
        :title="title"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowfullscreen
        referrerpolicy="strict-origin-when-cross-origin"
      />
      <button
        v-else
        type="button"
        class="ve-poster"
        :aria-label="`Play video: ${title}`"
        @click="playing = true"
      >
        <span class="ve-play" aria-hidden="true">▶</span>
        <span class="ve-title">{{ title }}</span>
        <span class="ve-note">YouTube · plays here</span>
      </button>
    </div>
    <figcaption v-if="video.title" class="ve-caption">
      {{ video.title }}
    </figcaption>
  </figure>
</template>

<style scoped>
.ve {
  margin: 1.5rem 0 2rem;
}
.ve-frame {
  position: relative;
  aspect-ratio: 16 / 9;
  border: 1px solid rgb(var(--color-ink));
  background: rgb(var(--color-dark-surface, 28 28 28));
  overflow: hidden;
}
.ve-frame iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}
.ve-poster {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 10px;
  width: 100%;
  padding: 16px;
  border: 0;
  background: transparent;
  color: #fff;
  cursor: pointer;
  font-family: var(--font-ui);
  text-align: center;
}
.ve-play {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 999px;
  background: rgb(var(--color-accent));
  font-size: 1.5rem;
  padding-left: 4px;
  transition: transform 0.15s ease;
}
.ve-poster:hover .ve-play,
.ve-poster:focus-visible .ve-play {
  transform: scale(1.08);
}
.ve-poster:focus-visible {
  outline: 2px solid #fff;
  outline-offset: -4px;
}
.ve-title {
  max-width: 36ch;
  font-size: 1.0625rem;
  line-height: 1.35;
}
.ve-note {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.7;
}
.ve-caption {
  padding: 6px 0 0;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: rgb(var(--color-mute));
}
</style>
