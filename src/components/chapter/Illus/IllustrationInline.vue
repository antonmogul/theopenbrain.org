<script setup>
// Mobile inline wrapper for Chapter-1 illustrations.
//
// On desktop, "trigger" figures (the ones marked by a `.animationTrigger` span)
// live in a fixed sticky pane that is hidden below the `xl` breakpoint, so they
// disappear entirely on mobile. This wrapper renders them inline, in flow, at
// full container width, choosing a render mode per figure via `mobileMode()`.
//
// It is meant to be rendered only on mobile (the caller guards with
// useMediaQuery). It covers the pane-only figures: `interactive` (clickable /
// auto-playing) and `static` (image / embedded video). Figures that can't
// reflow inline (`fullscreen`) get a poster + tap-to-view overlay. Scroll-driven
// `fullscreen: true` figures already render inline elsewhere (via
// FullScreenIllustration on `animationFull` paragraphs), so this wrapper renders
// nothing for `scroll`/`skip`.

import { computed, ref } from "vue";
import animationJSON from "@/assets/json_backend/animations.json";
import { mobileMode } from "@/helper/illustrationMobile";

import IllustrationComp from "@/components/chapter/Illus/IllustrationComp.vue";
import FullScreenIllustration from "@/components/chapter/Illus/FullScreenIllustration.vue";
import SourceElement from "@/components/UI/SourceElement.vue";

const props = defineProps({
  // The figure's id, e.g. "animationEyeStructur" (the `para.animation.id`).
  animationId: { type: String, required: true },
});

// Resolve the full animation record (with its flags) from the Chapter-1 source
// of truth. Chapter 1 is the hardcoded legacy chapter, so JSON is authoritative.
const animation = computed(() =>
  animationJSON.animations.find((a) => a.id === props.animationId)
);

const mode = computed(() => mobileMode(animation.value));

// Unique mount id so multiple inline figures don't collide on the global id
// the desktop pane also uses. Threaded into IllustrationComp via `scopeId`.
const scopeId = computed(() => `${props.animationId}--inline`);

// Fullscreen overlay state (for `fullscreen` mode and the expand button).
const expanded = ref(false);

// FullScreenIllustration reads `paragraph.animationId`.
const fsParagraph = computed(() => ({ animationId: props.animationId }));

const title = computed(() => animation.value?.title || "");
const posterSrc = computed(
  () => `/publicAssets/images/illuImages/${props.animationId}.png`
);
const youtubeSrc = computed(() =>
  animation.value?.youtubeID
    ? `https://www.youtube.com/embed/${animation.value.youtubeID}`
    : null
);
</script>

<template>
  <figure
    v-if="animation && (mode === 'interactive' || mode === 'static' || mode === 'fullscreen')"
    class="illu-inline my-12 font-mono text-small"
  >
    <figcaption
      v-if="title"
      class="mb-2 flex items-center justify-between gap-2"
    >
      <span>{{ title }}</span>
      <button
        v-if="mode === 'interactive'"
        type="button"
        class="illu-expand"
        aria-label="View illustration fullscreen"
        @click="expanded = true"
      >
        ⛶
      </button>
    </figcaption>

    <!-- Interactive: render the live figure inline, scoped so it doesn't
         collide with the (hidden) desktop pane's global ids. -->
    <div v-if="mode === 'interactive'" class="illu-inline__stage">
      <IllustrationComp :animation="animation" :scope-id="scopeId" />
    </div>

    <!-- Static: plain image or embedded video, full width. -->
    <template v-else-if="mode === 'static'">
      <iframe
        v-if="youtubeSrc"
        class="w-full aspect-video"
        :src="youtubeSrc"
        title="YouTube video player"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
      <img
        v-else
        class="w-full h-auto"
        :src="posterSrc"
        :alt="title"
        loading="lazy"
      />
      <SourceElement v-if="animation.source" :source="animation.source" />
    </template>

    <!-- Fullscreen fallback: figure can't reflow inline; show a poster the
         user taps to open the real component in a fullscreen overlay. -->
    <button
      v-else-if="mode === 'fullscreen'"
      type="button"
      class="illu-inline__poster"
      @click="expanded = true"
    >
      <img
        class="w-full h-auto"
        :src="posterSrc"
        :alt="title"
        loading="lazy"
        @error="(e) => (e.target.style.display = 'none')"
      />
      <span class="illu-inline__poster-cta">Tap to view illustration ⛶</span>
    </button>

    <!-- Shared fullscreen overlay (used by the poster and the expand button).
         Reuses the existing FullScreenIllustration, which renders any figure by
         its animationId at full scroll height. -->
    <Teleport to="body">
      <div
        v-if="expanded"
        class="illu-inline__overlay"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          class="illu-inline__close"
          aria-label="Close"
          @click="expanded = false"
        >
          ✕
        </button>
        <div class="illu-inline__overlay-scroll">
          <FullScreenIllustration :paragraph="fsParagraph" />
        </div>
      </div>
    </Teleport>
  </figure>
</template>

<style scoped>
.illu-inline {
  width: 100%;
}

.illu-inline__stage {
  position: relative;
  width: 100%;
  min-height: 320px;
}

.illu-expand,
.illu-inline__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  cursor: pointer;
  background: transparent;
  border: 1px solid rgb(var(--color-line, 0 0 0) / 1);
  border-radius: 6px;
}

.illu-inline__poster {
  display: block;
  width: 100%;
  position: relative;
  cursor: pointer;
  border: 1px solid rgb(var(--color-line, 0 0 0) / 1);
  border-radius: 6px;
  overflow: hidden;
  background: transparent;
}

.illu-inline__poster-cta {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  padding: 0.5rem;
  background: rgb(var(--color-bg, 247 245 240) / 0.85);
  text-align: center;
}

.illu-inline__overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgb(var(--color-bg, 247 245 240) / 1);
  overflow: hidden;
}

.illu-inline__overlay-scroll {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.illu-inline__close {
  position: fixed;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 101;
  background: rgb(var(--color-bg, 247 245 240) / 0.9);
}
</style>
