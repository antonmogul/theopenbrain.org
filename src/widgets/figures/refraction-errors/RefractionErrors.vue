<script setup>
/*
 * Refraction errors (OPENBRAIN-80), the first figure widget: the Retina's
 * normal eye, myopia, hyperopia and astigmatism, each with its correction,
 * matched to theopenbrain.org (v0.2.3).
 *
 * Self-contained: its colours are its own variables (the accent comes from
 * the host's --widget-accent, i.e. the chapter ramp), its text comes in as
 * `content` (see schema.js), and it never reaches outside its own root.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { loadLottie } from "@/composables/useLottie";
import { prepareLottie } from "../content.js";
import schema from "./schema.js";

const props = defineProps({
  /** figureContent(schema, record): title, infoText, states, toggle, image, video. */
  content: { type: Object, required: true },
  /** The figure's Lottie file. */
  lottieUrl: {
    type: String,
    default: "/publicAssets/animations/animationImpairedVision.json",
  },
  /** Start with the introduction open, as the original does. */
  infoOpenAtStart: { type: Boolean, default: true },
});

const stage = ref(null);
const infoOpen = ref(props.infoOpenAtStart && !!props.content.infoText);
const state = ref(0); // 0 = the normal eye
const corrected = ref(false);
let anim = null;
let totalFrames = 0;

const imageFile = schema.fields.find((f) => f.key === "image").asset;

async function mountLottie() {
  if (!stage.value) return;
  anim?.destroy();
  anim = null;
  try {
    const res = await fetch(props.lottieUrl);
    if (!res.ok) throw new Error(`${res.status} ${props.lottieUrl}`);
    const data = prepareLottie(
      await res.json(),
      props.lottieUrl,
      props.content.image ? { [imageFile]: props.content.image } : {}
    );
    const lottie = await loadLottie();
    if (!stage.value) return;
    anim = lottie.loadAnimation({
      container: stage.value,
      renderer: "svg",
      loop: false,
      autoplay: false,
      animationData: data,
    });
    anim.setSubframe(true);
    totalFrames = anim.totalFrames;
    showState(state.value);
  } catch (err) {
    console.error("[refraction-errors] the animation didn't load", err);
  }
}

// The Lottie's timeline (v0.2.3): the normal eye at frame 0, then one
// 72-frame segment per condition starting at frame 59, with its correction
// 12 frames in. The numbers are the original's, kept as they are.
const SEGMENT_START = 36 + 23;
const frameOf = (i, fix) => SEGMENT_START + 72 * (i - 1) + (fix ? 12 : 0);

function showState(i) {
  if (!anim) return;
  if (i === 0) anim.goToAndStop(0, true);
  else anim.goToAndStop(frameOf(i, corrected.value), true);
}

/** Play the current condition into (or out of) its correction. */
function playCorrection() {
  if (!anim) return;
  const from = SEGMENT_START + 74 * (state.value - 1) - 5;
  const to = SEGMENT_START + 74 * (state.value - 1) + 15;
  anim.playSegments(corrected.value ? [to, from] : [from, to], true);
  corrected.value = !corrected.value;
}

function selectState(i, wantCorrected) {
  if (i === state.value) {
    if (wantCorrected !== corrected.value) playCorrection();
    return;
  }
  if (i !== 0 && wantCorrected !== corrected.value) playCorrection();
  if (!totalFrames && anim) totalFrames = anim.totalFrames;
  anim?.playSegments([1, totalFrames], true);
  if (i === 0) corrected.value = false;
  state.value = i;
  showState(i);
}

const isOn = (i, fix) =>
  state.value === i && (i === 0 || corrected.value === fix);
const isRow = (i) => state.value === i;

const video = computed(() => props.content.video || {});
const videoImage = computed(() =>
  !video.value.slug || video.value.slug === "placeholder"
    ? "/publicAssets/images/placeholders/monaLisa.webp"
    : `/publicAssets/images/breakVideos/${video.value.slug}.png`
);

onMounted(mountLottie);
watch(() => [props.lottieUrl, props.content.image], mountLottie);
onBeforeUnmount(() => anim?.destroy());
</script>

<template>
  <div class="rx" :class="{ 'rx--info': infoOpen }">
    <h4 class="rx-title">{{ content.title }}</h4>

    <button
      v-if="content.infoText"
      type="button"
      class="rx-round rx-info-toggle"
      :class="{ 'is-open': infoOpen }"
      :aria-expanded="infoOpen"
      :aria-label="
        infoOpen ? 'Close the introduction' : 'Open the introduction'
      "
      @click="infoOpen = !infoOpen"
    >
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 8v16M8 16h16" />
      </svg>
    </button>

    <div
      class="rx-states"
      role="group"
      :aria-label="content.title"
      :inert="infoOpen || undefined"
    >
      <div
        v-for="(label, i) in content.states"
        :key="i"
        class="rx-row"
        :class="{ 'rx-row--single': i === 0 }"
      >
        <button
          type="button"
          class="rx-cell rx-cell--state"
          :class="{ 'is-on': isOn(i, false), 'is-row': isRow(i) }"
          :aria-pressed="isOn(i, false)"
          @click="selectState(i, false)"
        >
          {{ label }}
        </button>
        <button
          v-if="i !== 0"
          type="button"
          class="rx-cell rx-cell--fix"
          :class="{ 'is-on': isOn(i, true), 'is-row': isRow(i) }"
          :aria-pressed="isOn(i, true)"
          :aria-label="`${label}, ${content.toggle.toLowerCase()}`"
          @click="selectState(i, true)"
        >
          {{ content.toggle }}
        </button>
      </div>
    </div>

    <div ref="stage" class="rx-stage" aria-hidden="true" />

    <div v-if="infoOpen" class="rx-info">
      <p class="rx-info-text" v-html="content.infoText" />
      <RouterLink
        v-if="video.title"
        :to="`/chapter/break/${video.slug || 'placeholder'}`"
        class="rx-video"
      >
        <span class="rx-video-thumb">
          <img :src="videoImage" alt="" loading="lazy" />
        </span>
        <span class="rx-round rx-video-play" aria-hidden="true">
          <svg viewBox="0 0 32 32"><path d="M12 9l12 7-12 7z" /></svg>
        </span>
        <span class="rx-video-text">
          <b>{{ video.title }}</b>
          <span>{{ video.text }}</span>
        </span>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
/* Surfaces are this figure's own (v0.2.3): a grey-green ground while the
   reader works the figure, a dark one while the introduction is open. The
   accent is the host's (the chapter ramp). */
.rx {
  --widget-bg: #8f9e9d;
  --widget-panel: #ffffff;
  --widget-ink: #000000;
  --widget-ink-soft: #333333;
  --widget-line: #000000;
  /* The host's accent (the chapter ramp); the ramp itself when mounted alone. */
  --rx-accent: var(--widget-accent, rgb(var(--color-chapter)));
  --rx-accent-deep: var(--widget-accent-deep, rgb(var(--color-chapter-deep)));
  --rx-sans: "IBM Plex Sans", system-ui, sans-serif;
  --rx-mono: "IBM Plex Mono", ui-monospace, monospace;
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  padding: 1.375rem 3.75rem;
  background: var(--widget-bg);
  color: var(--widget-ink);
  font-family: var(--rx-mono);
  transition:
    background-color 0.3s,
    color 0.3s;
}
.rx--info {
  --widget-bg: #333333;
  --widget-ink: #ffffff;
}

.rx .rx-title {
  position: relative;
  z-index: 3;
  margin: 0;
  font-family: var(--rx-sans);
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.55;
  user-select: none;
}

.rx-round {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 1px solid #000;
  border-radius: 50%;
  background: #fff;
  color: #000;
  cursor: pointer;
}
.rx-round svg {
  width: 1.25rem;
  height: 1.25rem;
  fill: currentColor;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}
.rx-info-toggle {
  position: relative;
  z-index: 3;
  margin-top: 3.25rem;
}
.rx-info-toggle svg {
  transition: transform 0.3s;
}
.rx-info-toggle.is-open svg {
  transform: rotate(45deg);
}
.rx-info-toggle:focus-visible,
.rx-cell:focus-visible,
.rx-video:focus-visible {
  outline: 2px solid var(--rx-accent);
  outline-offset: 2px;
}

.rx-states {
  position: relative;
  z-index: 2;
  display: grid;
  gap: 0.625rem;
  width: 13.875rem;
  margin-top: 1.125rem;
  transition:
    opacity 0.3s,
    filter 0.3s;
}
.rx-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
}
.rx-row--single {
  grid-template-columns: 1fr;
}
.rx-cell {
  min-height: 3rem;
  padding: 0.5rem;
  border: 1px solid var(--widget-line);
  background: transparent;
  color: var(--widget-ink-soft);
  font: 0.8125rem/1.3 var(--rx-mono);
  text-align: center;
  cursor: pointer;
  transition:
    background-color 0.1s,
    border-color 0.1s,
    color 0.1s;
}
.rx-cell--fix {
  border-left: 0;
  background: var(--widget-panel);
}
.rx-cell:hover {
  border-color: var(--rx-accent);
  color: var(--rx-accent-deep);
}
.rx-cell.is-row {
  border-color: var(--rx-accent);
  color: var(--widget-ink);
}
.rx-cell--fix.is-row {
  background: transparent;
}
.rx-cell--state.is-row {
  border-right-color: var(--widget-line);
}
.rx-cell.is-on {
  background: var(--rx-accent);
  border-color: var(--rx-accent);
  color: #000;
  pointer-events: none;
}

.rx-stage {
  position: absolute;
  inset: 0 0 0 auto;
  width: 66.667%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  transition:
    opacity 0.3s,
    filter 0.3s;
}

.rx--info .rx-states,
.rx--info .rx-stage {
  opacity: 0.1;
  filter: blur(4px);
}

/* The introduction: text on the left half, the video on the right, split
   by a white rule, as on theopenbrain.org. */
.rx-info {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: grid;
  grid-template-columns: 50% 50%;
  padding-top: 9.375rem;
  pointer-events: none;
}
.rx-info::after {
  content: "";
  position: absolute;
  inset: 0 auto 0 50%;
  border-left: 1px solid #fff;
}
.rx-info-text {
  margin: 0;
  padding: 0 3.75rem;
  max-width: 45rem;
  max-height: calc(100% - 3rem);
  overflow-y: auto;
  font: 1.125rem/1.67 var(--rx-sans);
  hyphens: auto;
  pointer-events: auto;
}
.rx-video {
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
/* Duotone as the original: the grey photo screened over the accent. */
.rx-video-thumb {
  position: relative;
  display: block;
  height: 12.5rem;
  background: #000;
  isolation: isolate;
}
.rx-video-thumb::before {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--rx-accent);
  opacity: 0.7;
}
.rx-video-thumb img {
  position: relative;
  display: block;
  height: 100%;
  width: auto;
  filter: grayscale(1);
  mix-blend-mode: screen;
}
.rx-video-play {
  position: absolute;
  left: -1.25rem;
  top: -1.25rem;
  width: 2.5rem;
  height: 2.5rem;
  z-index: 1;
}
.rx-video-text {
  display: grid;
  gap: 0.125rem;
  padding-top: 0.25rem;
  font: 0.8125rem/1.3 var(--rx-sans);
  opacity: 0.7;
}
.rx-video:hover .rx-video-text {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .rx,
  .rx-states,
  .rx-stage,
  .rx-info-toggle svg {
    transition: none;
  }
}
</style>
