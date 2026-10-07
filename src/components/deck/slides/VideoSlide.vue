<script setup>
// A title row over a full-width video: the feature walkthrough. Until a
// recording is in public/ (see docs/funding-deck.md) the frame shows a
// placeholder saying where it goes.
import { computed, ref, watch } from "vue";
import { cspLoads } from "@/data/decks/validate.js";
import DeckSlide from "../DeckSlide.vue";

const props = defineProps({
  eyebrow: { type: String, default: "" },
  title: { type: String, required: true },
  // Right-aligned mono line beside the title.
  aside: { type: String, default: "" },
  src: { type: String, default: "" },
  poster: { type: String, default: "" },
  placeholder: { type: String, default: "Feature walkthrough video" },
});

// A src that does not load (a typo, a file not deployed yet) falls back to
// the placeholder rather than an empty black player. An address the site's
// CSP refuses (a YouTube page, another host) is never requested, nor is a
// refused poster, which would not even fail the video: either would only
// log an error.
const failed = ref(false);
watch(
  () => props.src,
  () => (failed.value = false)
);
const origin = globalThis.location?.origin;
const srcLoads = computed(
  () => !!props.src && cspLoads(props.src, "media", origin)
);
const posterSrc = computed(() =>
  props.poster && cspLoads(props.poster, "img", origin)
    ? props.poster
    : undefined
);
</script>

<template>
  <DeckSlide class="video">
    <div class="video__head">
      <div class="video__titles">
        <span class="deck-eyebrow">{{ eyebrow }}</span>
        <h2 class="deck-title">{{ title }}</h2>
      </div>
      <span v-if="aside" class="video__aside">{{ aside }}</span>
    </div>
    <div class="video__frame">
      <video
        v-if="srcLoads && !failed"
        :src="src"
        :poster="posterSrc"
        controls
        playsinline
        preload="metadata"
        @error="failed = true"
      />
      <div v-else class="video__empty">
        <svg
          viewBox="0 0 24 24"
          width="96"
          height="96"
          fill="none"
          stroke="currentColor"
          stroke-width="1.2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <polygon points="10 8 16 12 10 16 10 8" />
        </svg>
        <span>{{ placeholder }}</span>
      </div>
    </div>
  </DeckSlide>
</template>

<style scoped>
.video {
  padding: 80px 100px 70px;
  display: flex;
  flex-direction: column;
}
.video__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 40px;
}
.video__titles {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.video__aside {
  font-family: "IBM Plex Mono", ui-monospace, monospace;
  font-size: 24px;
  letter-spacing: 0.06em;
  color: rgb(var(--color-mute));
}
.video__frame {
  position: relative;
  flex: 1;
  overflow: hidden;
  background: rgb(var(--color-dark-surface));
  border: 1px solid rgb(var(--color-ink));
}
.video__frame video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: rgb(var(--color-dark-surface));
}
.video__empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
  color: rgb(154 152 144);
  font-family: "IBM Plex Mono", ui-monospace, monospace;
  font-size: 28px;
}
</style>
