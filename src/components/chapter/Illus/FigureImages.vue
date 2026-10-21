<script setup>
/*
 * The artwork inside the figure shell (OPENBRAIN-41; gallery OPENBRAIN-97,
 * rebuilt as a rotating gallery in OPENBRAIN-144).
 *
 * One image renders on its own, as large as the shell allows. A set renders
 * as a rotating gallery, Stuart's "updating main image": one full-size image
 * at a time in a stage box, a row of dots under it (the current one in the
 * chapter colour), previous/next arrows at the sides of the box, and the
 * current image's own legend below. It advances every 10 s on its own until
 * the reader takes over: hovering or focusing it pauses the clock, any
 * manual step stops it for good, and it never runs under reduced motion,
 * while the gallery is off-screen or while the tab is hidden.
 *
 * The arrows are centred on the stage box, not on the image, so they stay
 * put while plates of different heights go by (Stuart, 1 Oct). The box has
 * a fixed height in the pane and the fullscreen dialog (`fit`), and a fixed
 * aspect ratio inline in the text column (flow), for the same reason.
 */
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from "vue";
import {
  stepIndex,
  youtubeLoopUrl,
  youtubePlayerUrl,
} from "@/helper/figureCycle";
import { reducedMotionPreferred } from "@/helper/readerJump";

const props = defineProps({
  /* Normalised by figureImages(): [{ src, caption, alt }]. */
  images: { type: Array, required: true },
  /* Figure-level caption, shown when an image has none of its own. */
  caption: { type: String, default: "" },
  /* "FIG 06" and the figure title, for accessible names. */
  label: { type: String, default: "" },
  title: { type: String, default: "" },
  /* Fullscreen overlay: roomier caption and arrows. */
  large: { type: Boolean, default: false },
  /* The container has a fixed height: the stage takes what the dots and
     legend leave. Off inline, where the stage is an aspect-ratio box. */
  fit: { type: Boolean, default: true },
  /* The shell shows the legend above the artwork (with the title), so the
     figure-level caption here is left out (OPENBRAIN-138). A gallery
     image's own caption still shows under the dots. */
  legendAbove: { type: Boolean, default: false },
});

/* The shown image, two-way so the shell can open its fullscreen dialog on
   the same plate the pane is showing. */
const index = defineModel("index", { type: Number, default: 0 });

/* Stuart's "every 10s". */
const AUTO_ADVANCE_MS = 10_000;

const isSet = computed(() => props.images.length > 1);
// A video item: a player the reader starts (play: "player"), or a silent
// loop in place of its still, unless the reader asked for reduced motion:
// then the still stays, with a link to the video.
const loopSrc = (img) => {
  if (!img?.youtube) return "";
  if (img.play === "player") return youtubePlayerUrl(img.youtube, img.start);
  return reducedMotionPreferred() ? "" : youtubeLoopUrl(img.youtube);
};
const watchHref = (img) =>
  img?.youtube ? `https://www.youtube.com/watch?v=${img.youtube}` : "";
const first = computed(() => props.images[0] || {});
const figureName = computed(
  () => [props.label, props.title].filter(Boolean).join(": ") || "Figure"
);

function captionFor(img) {
  return img?.caption || props.caption;
}
const shownCaption = computed(() =>
  props.legendAbove ? "" : captionFor(first.value)
);
/* The image describes the artwork itself. */
function altFor(img) {
  return img?.alt || captionFor(img) || figureName.value;
}

/* ── Gallery ─────────────────────────────────────────────────────────── */
const uid = useId();
const liveId = `figimg-live-${uid}`;
const root = ref(null);

const count = computed(() => props.images.length);
const safeIndex = computed(() => {
  const i = index.value;
  return Number.isInteger(i) && i >= 0 && i < count.value ? i : 0;
});
const current = computed(() => props.images[safeIndex.value] || first.value);
/* The current image's own legend; the figure's only when the shell does not
   already show it above the artwork. */
const currentCaption = computed(
  () => current.value?.caption || (props.legendAbove ? "" : props.caption)
);

/* "Image 3 of 10: Albertus Magnus, 1490." */
function dotLabel(img, i) {
  const base = `Image ${i + 1} of ${count.value}`;
  const text = img?.caption || img?.alt || "";
  return text ? `${base}: ${text}` : base;
}

function go(direction) {
  index.value = stepIndex(safeIndex.value, count.value, direction);
}
function show(i) {
  index.value = i;
}
/* The reader took over: no more automatic steps. */
function goManual(direction) {
  stopAutoplay();
  go(direction);
}
function showManual(i) {
  stopAutoplay();
  show(i);
}

function onKeydown(e) {
  if (e.key === "ArrowRight") {
    e.preventDefault();
    goManual(1);
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    goManual(-1);
  }
}

/* Swipe left/right on the stage (touch or pen; a mouse drag is not a swipe). */
let swipe = null;
function onPointerDown(e) {
  if (e.pointerType === "mouse") return;
  swipe = { x: e.clientX, y: e.clientY };
}
function onPointerUp(e) {
  if (!swipe) return;
  const dx = e.clientX - swipe.x;
  const dy = e.clientY - swipe.y;
  swipe = null;
  if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    goManual(dx < 0 ? 1 : -1);
  }
}
function onPointerCancel() {
  swipe = null;
}

/* Warm the neighbours so stepping never lands on a blank frame. */
function preloadNeighbours() {
  if (!isSet.value || typeof Image === "undefined") return;
  for (const d of [1, -1]) {
    const img = props.images[stepIndex(safeIndex.value, count.value, d)];
    if (img?.src) new Image().src = img.src;
  }
}

/* ── Auto-advance ────────────────────────────────────────────────────── */
/* `autoplay` is the reader's standing: on until a manual step, and never
   under reduced motion. The rest are pauses: the clock resumes when they
   lift. */
const autoplay = ref(!reducedMotionPreferred());
const hovered = ref(false);
const focused = ref(false);
const inView = ref(true);
const pageVisible = ref(
  typeof document === "undefined" || document.visibilityState !== "hidden"
);
let timer = null;
let intersection = null;

const running = computed(
  () =>
    isSet.value &&
    autoplay.value &&
    !hovered.value &&
    !focused.value &&
    inView.value &&
    pageVisible.value
);

function clearTimer() {
  if (timer) clearTimeout(timer);
  timer = null;
}
function schedule() {
  clearTimer();
  if (!running.value) return;
  timer = setTimeout(tick, AUTO_ADVANCE_MS);
}
function tick() {
  timer = null;
  if (!running.value) return;
  // The reader may have switched reduced motion on since the gallery
  // mounted: the setting wins at every step.
  if (reducedMotionPreferred()) {
    autoplay.value = false;
    return;
  }
  go(1);
  // A video the reader plays (the Milner interview in the H.M. gallery) is
  // where the clock stops: it would be rude to cut away from it. A silent
  // loop keeps rotating like a still.
  if (current.value?.play === "player") {
    autoplay.value = false;
    return;
  }
  schedule();
}
function stopAutoplay() {
  autoplay.value = false;
  clearTimer();
}
function onVisibility() {
  pageVisible.value = document.visibilityState !== "hidden";
}
function onFocusIn() {
  focused.value = true;
}
function onFocusOut(e) {
  if (!root.value?.contains(e.relatedTarget)) focused.value = false;
}

watch(running, schedule);
watch(index, () => {
  preloadNeighbours();
});
/* A different figure reusing this instance starts from the top, with the
   clock running again. */
watch(
  () => props.images,
  () => {
    index.value = 0;
    autoplay.value = !reducedMotionPreferred();
    schedule();
  }
);

onMounted(() => {
  if (!isSet.value) return;
  document.addEventListener("visibilitychange", onVisibility);
  if (typeof IntersectionObserver !== "undefined" && root.value) {
    intersection = new IntersectionObserver(
      ([entry]) => {
        inView.value = !!entry?.isIntersecting;
      },
      { threshold: 0.4 }
    );
    intersection.observe(root.value);
  }
  preloadNeighbours();
  schedule();
});
onBeforeUnmount(() => {
  clearTimer();
  intersection?.disconnect();
  document.removeEventListener("visibilitychange", onVisibility);
});
</script>

<template>
  <!-- One image: as large as the shell allows, with its caption. -->
  <div
    v-if="!isSet"
    class="figimg"
    :class="{ 'figimg--large': large, 'figimg--flow': !fit }"
  >
    <div class="figimg-stage">
      <iframe
        v-if="loopSrc(first)"
        :key="first.youtube"
        class="figimg-video"
        :src="loopSrc(first)"
        :title="altFor(first) || 'Video'"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowfullscreen
        loading="lazy"
      />
      <img
        v-else
        :key="first.src"
        class="figimg-img"
        :src="first.src"
        :alt="altFor(first)"
        decoding="async"
        draggable="false"
      />
    </div>
    <p v-if="shownCaption" class="figimg-caption">
      {{ shownCaption }}
    </p>
  </div>

  <!-- A set: the rotating gallery. -->
  <div
    v-else
    ref="root"
    class="figimg figimg--gallery"
    :class="{
      'figimg--large': large,
      'figimg--fit': fit,
      'figimg--flow': !fit,
    }"
    role="group"
    :aria-label="figureName"
    aria-roledescription="gallery"
    :data-autoplay="running ? 'running' : 'paused'"
    @keydown="onKeydown"
    @pointerenter="hovered = true"
    @pointerleave="hovered = false"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
  >
    <div
      class="figimg-stage figimg-stage--gallery"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
    >
      <!-- Crossfade: the leaving slide fades under the arriving one. -->
      <transition name="figimg-x">
        <div :key="current.src + safeIndex" class="figimg-slide">
          <iframe
            v-if="loopSrc(current)"
            class="figimg-video figimg-gallery-video"
            :src="loopSrc(current)"
            :title="altFor(current) || 'Video'"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowfullscreen
          />
          <img
            v-else
            class="figimg-img figimg-gallery-img"
            :src="current.src"
            :alt="altFor(current)"
            decoding="async"
            draggable="false"
          />
        </div>
      </transition>
      <button
        type="button"
        class="figimg-nav figimg-nav--prev"
        aria-label="Previous image"
        @click="goManual(-1)"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M11 3L5 9l6 6" />
        </svg>
      </button>
      <button
        type="button"
        class="figimg-nav figimg-nav--next"
        aria-label="Next image"
        @click="goManual(1)"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M7 3l6 6-6 6" />
        </svg>
      </button>
    </div>

    <div class="figimg-foot">
      <div class="figimg-dots" role="group" aria-label="Choose an image">
        <button
          v-for="(img, i) in images"
          :key="img.src + i"
          type="button"
          class="figimg-dot"
          :class="{ 'is-current': i === safeIndex }"
          :aria-current="i === safeIndex ? 'true' : undefined"
          :aria-label="dotLabel(img, i)"
          @click="showManual(i)"
        >
          <span class="figimg-dot-mark" aria-hidden="true" />
        </button>
      </div>
      <p
        :id="liveId"
        class="figimg-count"
        aria-live="polite"
        aria-atomic="true"
      >
        <span class="figimg-count-n">{{ safeIndex + 1 }} / {{ count }}</span>
        <span v-if="currentCaption" class="figimg-count-sep" aria-hidden="true"
          >·</span
        >
        <span v-if="currentCaption" class="figimg-caption figimg-legend">
          {{ currentCaption }}
          <a
            v-if="current.youtube"
            class="figimg-watch"
            :href="watchHref(current)"
            target="_blank"
            rel="noopener"
            >Watch the video on YouTube ↗</a
          >
        </span>
      </p>
    </div>
  </div>
</template>

<style scoped>
.figimg {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* ── Single image ──────────────────────────────────────────────────────
   The image takes whatever height the caption leaves. It fills the stage
   absolutely so it can never size the layout (a 1500px-tall plate used to
   stretch the whole shell wherever an ancestor's height was not definite),
   and scale-down means large plates fit while small woodcuts stay at their
   natural size instead of being blown up. The floor keeps the stage from
   collapsing in a container with no fixed height. */
.figimg-stage {
  position: relative;
  flex: 1;
  min-height: 16rem;
}
.figimg-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: scale-down;
  user-select: none;
}
/* In the text column (fit off): the image sizes the figure, full width,
   so on a phone it runs edge to edge. */
.figimg--flow .figimg-stage {
  flex: none;
  min-height: 0;
}
.figimg--flow .figimg-img {
  position: static;
  display: block;
  height: auto;
  max-height: 85vh;
  object-fit: contain;
}
.figimg-caption {
  flex: none;
  margin: 0 auto;
  max-width: 62ch;
  font-family: var(--font-body);
  font-size: var(--ui-size-13);
  line-height: 1.45;
  color: rgb(var(--color-mute));
  text-align: left;
}
.figimg--large .figimg-caption {
  font-size: var(--ui-size-15);
  max-width: 78ch;
}
.figimg-video {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  height: auto;
  border: 0;
  background: #000;
}

/* ── Gallery ─────────────────────────────────────────────────────────── */
.figimg--gallery {
  gap: 0.75rem;
  outline: none;
}
/* The stage is a box of its own: fixed height in the pane and the dialog,
   where it takes what the foot leaves; a 4:3 box inline, capped to the
   viewport. The image fits inside it, so the box, and the arrows centred
   on it, never move with the image. */
.figimg-stage--gallery {
  overflow: hidden;
  touch-action: pan-y pinch-zoom;
}
.figimg--flow .figimg-stage--gallery {
  width: 100%;
  aspect-ratio: 4 / 3;
  max-height: 85vh;
}
.figimg-slide {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.figimg--gallery .figimg-gallery-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
/* The player fills the box and letterboxes the clip itself. */
.figimg-gallery-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  aspect-ratio: auto;
}

/* Arrows: centred on the stage box, not on the image (Stuart, 1 Oct). */
.figimg-nav {
  position: absolute;
  top: 50%;
  z-index: 1;
  transform: translateY(-50%);
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid rgb(var(--color-line));
  border-radius: 0;
  background: rgb(var(--color-paper) / 0.85);
  color: rgb(var(--color-ink));
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
}
.figimg-nav--prev {
  left: 0.5rem;
}
.figimg-nav--next {
  right: 0.5rem;
}
.figimg-nav:hover {
  background: rgb(var(--color-paper));
  border-color: rgb(var(--color-chapter, var(--color-accent)));
  color: rgb(var(--color-chapter-deep, var(--color-accent)));
}
.figimg-nav:focus-visible,
.figimg-dot:focus-visible {
  outline: 2px solid rgb(var(--color-chapter, var(--color-accent)));
  outline-offset: 2px;
}
/* The dialog has room for bigger arrows; a phone's dialog does not, so
   there they stay the pane's size and cover less of the plate. */
@media (min-width: 768px) {
  .figimg--large .figimg-nav {
    width: 48px;
    height: 48px;
  }
  .figimg--large .figimg-nav--prev {
    left: 1rem;
  }
  .figimg--large .figimg-nav--next {
    right: 1rem;
  }
}

.figimg-foot {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  /* The shell gives the artwork its whole area, edge to edge. */
  padding: 0 1rem 0.75rem;
}
/* Dots: each a real button with a tappable hit area around an 8px mark. */
.figimg-dots {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0;
}
.figimg-dot {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  color: rgb(var(--color-mute) / 0.45);
}
.figimg-dot-mark {
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: currentColor;
  transition:
    transform 0.15s ease,
    background 0.15s ease;
}
.figimg-dot:hover {
  color: rgb(var(--color-mute));
}
.figimg-dot.is-current {
  color: rgb(var(--color-chapter, var(--color-accent)));
}
.figimg-dot.is-current .figimg-dot-mark {
  transform: scale(1.25);
}
.figimg--large .figimg-dot {
  width: 28px;
  height: 28px;
}
.figimg--large .figimg-dot-mark {
  width: 10px;
  height: 10px;
}
.figimg-count {
  margin: 0;
  width: 100%;
  max-width: 62ch;
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  font-family: var(--font-mono);
  font-size: var(--ui-size-11);
  letter-spacing: 0.08em;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--color-mute));
}
.figimg--large .figimg-count {
  max-width: 78ch;
}
.figimg-count-n {
  flex: none;
}
.figimg-count-sep {
  flex: none;
}
.figimg-legend {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  letter-spacing: normal;
  max-width: none;
}
/* The pane is not tall: a long legend (Figure 6's run to 900 characters)
   scrolls within three lines rather than squeezing the stage. The row
   keeps those three lines whether the image has a legend or not, so the
   stage, and the arrows centred on it, stay put from plate to plate. */
.figimg--fit .figimg-count {
  --legend-lines: calc(var(--ui-size-13) * 1.45 * 3);
  min-height: var(--legend-lines);
}
.figimg--fit .figimg-legend {
  max-height: var(--legend-lines);
  overflow-y: auto;
  overscroll-behavior: contain;
}
.figimg--large.figimg--fit .figimg-count {
  --legend-lines: calc(var(--ui-size-15) * 1.45 * 4);
}
.figimg-watch {
  display: inline-block;
  margin-left: 0.5em;
  color: inherit;
  text-underline-offset: 0.2em;
}

/* Crossfade, ~300 ms; none at all under reduced motion (the
   [data-reduce-motion="1"] opt-in is zeroed globally in brand.css). */
.figimg-x-enter-active,
.figimg-x-leave-active {
  transition: opacity 0.3s ease;
}
.figimg-x-enter-from,
.figimg-x-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .figimg-x-enter-active,
  .figimg-x-leave-active,
  .figimg-dot-mark,
  .figimg-nav {
    transition: none;
  }
}
</style>
