<script setup>
/*
 * The artwork inside the figure shell (OPENBRAIN-41): one image, or a set the
 * reader can step through and that cycles on its own until they take over.
 *
 * Auto-advance is deliberately timid: it pauses while the pointer or focus is
 * on the figure, stops for good once the reader uses the controls, and never
 * runs under reduce-motion. The pace itself is `slideDurationMs`.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { slideDurationMs, stepIndex } from "@/helper/figureCycle";

const props = defineProps({
  /* Normalised by figureImages(): [{ src, caption, alt }]. */
  images: { type: Array, required: true },
  /* Figure-level caption, shown when an image has none of its own. */
  caption: { type: String, default: "" },
  /* "FIG 06" and the figure title, for accessible names. */
  label: { type: String, default: "" },
  title: { type: String, default: "" },
  /* Fullscreen overlay: roomier caption. */
  large: { type: Boolean, default: false },
});

const index = ref(0);
const hovering = ref(false);
const focusWithin = ref(false);
const userTookOver = ref(false);
const userPaused = ref(false);

const isSet = computed(() => props.images.length > 1);
const current = computed(() => props.images[index.value] || props.images[0]);
const shownCaption = computed(() => current.value?.caption || props.caption);
const altText = computed(
  () =>
    current.value?.alt ||
    shownCaption.value ||
    [props.label, props.title].filter(Boolean).join(": ") ||
    "Figure"
);

function prefersReducedMotion() {
  if (typeof document === "undefined") return true;
  if (document.documentElement.getAttribute("data-reduce-motion") === "1")
    return true;
  return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

const autoplaying = computed(
  () => isSet.value && !userTookOver.value && !userPaused.value
);

let timer = null;
function clearTimer() {
  if (timer) clearTimeout(timer);
  timer = null;
}
function schedule() {
  clearTimer();
  if (!autoplaying.value || hovering.value || focusWithin.value) return;
  if (prefersReducedMotion()) return;
  const wait = slideDurationMs(current.value, props.caption);
  if (!Number.isFinite(wait) || wait <= 0) return;
  timer = setTimeout(() => {
    index.value = stepIndex(index.value, props.images.length, 1);
  }, wait);
}

/* Warm the next image so the cross-fade never lands on a blank frame. */
function preloadNext() {
  if (!isSet.value || typeof Image === "undefined") return;
  const next = props.images[stepIndex(index.value, props.images.length, 1)];
  if (next?.src) new Image().src = next.src;
}

function go(direction) {
  userTookOver.value = true;
  index.value = stepIndex(index.value, props.images.length, direction);
}
function togglePlay() {
  if (userTookOver.value) {
    // Hand control back: resume the automatic cycle from here.
    userTookOver.value = false;
    userPaused.value = false;
  } else {
    userPaused.value = !userPaused.value;
  }
}
function onKeydown(e) {
  if (!isSet.value) return;
  if (e.key === "ArrowRight") {
    e.preventDefault();
    go(1);
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    go(-1);
  }
}

watch(
  [index, autoplaying, hovering, focusWithin],
  () => {
    schedule();
    preloadNext();
  },
  { flush: "post" }
);
/* A different figure reusing this instance starts from its first image. */
watch(
  () => props.images,
  () => {
    index.value = 0;
    userTookOver.value = false;
    userPaused.value = false;
    schedule();
  }
);

onMounted(() => {
  schedule();
  preloadNext();
});
onBeforeUnmount(clearTimer);
</script>

<template>
  <div
    class="figimg"
    :class="{ 'figimg--large': large }"
    :role="isSet ? 'group' : undefined"
    :aria-roledescription="isSet ? 'carousel' : undefined"
    :aria-label="
      isSet ? [label, title].filter(Boolean).join(': ') || 'Figure' : undefined
    "
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
    @focusin="focusWithin = true"
    @focusout="focusWithin = false"
    @keydown="onKeydown"
  >
    <div class="figimg-stage">
      <transition name="figfade" mode="out-in">
        <img
          :key="current.src"
          class="figimg-img"
          :src="current.src"
          :alt="altText"
          decoding="async"
          draggable="false"
        />
      </transition>
    </div>

    <p
      v-if="shownCaption"
      class="figimg-caption"
      :aria-live="userTookOver ? 'polite' : 'off'"
    >
      {{ shownCaption }}
    </p>

    <div v-if="isSet" class="figimg-controls">
      <button
        type="button"
        class="figimg-btn"
        aria-label="Previous image"
        @click="go(-1)"
      >
        <span aria-hidden="true">←</span>
      </button>
      <span class="figimg-count" aria-live="off">
        {{ index + 1 }} / {{ images.length }}
      </span>
      <button
        type="button"
        class="figimg-btn"
        aria-label="Next image"
        @click="go(1)"
      >
        <span aria-hidden="true">→</span>
      </button>
      <button
        type="button"
        class="figimg-btn figimg-btn--play"
        :aria-label="autoplaying ? 'Pause the cycle' : 'Play the cycle'"
        :aria-pressed="autoplaying"
        @click="togglePlay"
      >
        <span aria-hidden="true">{{ autoplaying ? "❙❙" : "▶" }}</span>
      </button>
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
/* The image takes whatever height the caption and controls leave. It fills
   the stage absolutely so it can never size the layout (a 1500px-tall plate
   used to stretch the whole shell wherever an ancestor's height was not
   definite), and scale-down means large plates fit while small woodcuts stay
   at their natural size instead of being blown up. The floor keeps the stage
   from collapsing in a container with no fixed height. */
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
.figimg-caption {
  flex: none;
  margin: 0 auto;
  max-width: 62ch;
  font-family: var(--font-body);
  font-size: 0.8125rem;
  line-height: 1.45;
  color: rgb(var(--color-mute));
  text-align: left;
}
.figimg--large .figimg-caption {
  font-size: 0.9375rem;
  max-width: 78ch;
}
.figimg-controls {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-family: var(--font-mono);
}
.figimg-count {
  min-width: 4.5ch;
  text-align: center;
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--color-mute));
}
.figimg-btn {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: 1px solid rgb(var(--color-line));
  border-radius: 6px;
  background: transparent;
  color: rgb(var(--color-ink));
  font-size: 0.75rem;
  line-height: 1;
  cursor: pointer;
  transition:
    border-color 0.12s ease,
    background 0.12s ease;
}
.figimg-btn:hover {
  border-color: rgb(var(--color-ink));
  background: rgb(var(--color-ink) / 0.04);
}
.figimg-btn:focus-visible {
  outline: 2px solid rgb(var(--color-chapter, var(--color-accent)));
  outline-offset: 2px;
}
.figimg-btn--play {
  margin-left: 0.5rem;
  font-size: 0.5625rem;
}

.figfade-enter-active,
.figfade-leave-active {
  transition: opacity 0.25s ease;
}
.figfade-enter-from,
.figfade-leave-to {
  opacity: 0;
}
</style>
