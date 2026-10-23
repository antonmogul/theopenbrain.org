<script setup>
/*
 * VideoEmbed — a YouTube video placed in the prose by a `{ type: "video" }`
 * block (OPENBRAIN-70 D2). Nothing loads from YouTube until the reader
 * presses play: the card is local, then a youtube-nocookie player replaces
 * it (allowed by the CSP in index.html).
 */
import { computed, ref, watch } from "vue";
import { youTubeEmbedUrl } from "@/editor/video.mjs";

const props = defineProps({
  /** { youtubeId?, src?, poster?, title?, caption?, start? } */
  video: { type: Object, required: true },
  showCaption: { type: Boolean, default: true },
});

const playing = ref(false);
watch(
  () => [props.video.youtubeId, props.video.src, props.video.start],
  () => {
    playing.value = false;
  }
);
const src = computed(() =>
  youTubeEmbedUrl(props.video.youtubeId, props.video.start || 0)
);
const title = computed(() => props.video.title || "Video");
const caption = computed(() => props.video.caption || props.video.title || "");
</script>

<template>
  <figure class="ve noHighlight">
    <div class="ve-frame">
      <video
        v-if="video.src"
        :key="video.src"
        controls
        playsinline
        preload="none"
        :poster="video.poster"
        :aria-label="title"
      >
        <source :src="video.src" type="video/mp4" />
        Your browser does not support this video.
      </video>
      <iframe
        v-else-if="playing"
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
        <img
          v-if="video.poster"
          class="ve-poster-image"
          :src="video.poster"
          alt=""
        />
        <span class="ve-play" aria-hidden="true">▶</span>
        <span class="ve-title">{{ title }}</span>
        <span class="ve-note">YouTube · plays here</span>
      </button>
    </div>
    <figcaption v-if="showCaption && caption" class="ve-caption">
      {{ caption }}
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
.ve-frame iframe,
.ve-frame video {
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
.ve-poster-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0.4;
}
.ve-poster > span {
  position: relative;
}
.ve-play {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 0;
  background: rgb(var(--color-accent));
  font-size: var(--ui-size-20);
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
  font-size: var(--ui-size-16);
  line-height: 1.35;
}
.ve-note {
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.7;
}
.ve-caption {
  padding: 6px 0 0;
  font-family: var(--font-mono);
  font-size: var(--ui-size-12);
  color: rgb(var(--color-mute));
}
@media (prefers-reduced-motion: reduce) {
  .ve-play {
    transition: none;
  }
  .ve-poster:hover .ve-play,
  .ve-poster:focus-visible .ve-play {
    transform: none;
  }
}
:global([data-reduce-motion="1"]) .ve-play {
  transition: none;
  transform: none;
}
</style>
