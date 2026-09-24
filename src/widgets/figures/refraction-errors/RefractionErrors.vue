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
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import FigureIntro from "../shared/FigureIntro.vue";
import { useFigureLottie } from "../shared/useFigureLottie.js";
import ownSchema from "./schema.js";

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
  /** Passed by the host to every figure widget; this one reads its own. */
  schema: { type: Object, default: null },
});

const stage = ref(null);
const infoOpen = ref(props.infoOpenAtStart && !!props.content.infoText);
const state = ref(0); // 0 = the normal eye
const corrected = ref(false);
const lottie = useFigureLottie(stage, ownSchema.id);
let totalFrames = 0;

const imageFile = ownSchema.fields.find((f) => f.key === "image").asset;

async function mountLottie() {
  const a = await lottie.mount(props.lottieUrl, {
    replace: props.content.image ? { [imageFile]: props.content.image } : {},
  });
  if (!a) return;
  totalFrames = a.totalFrames;
  showState(state.value);
}

// The Lottie's timeline (v0.2.3): the normal eye at frame 0, then one
// 72-frame segment per condition starting at frame 59, with its correction
// 12 frames in. The numbers are the original's, kept as they are.
const SEGMENT_START = 36 + 23;
const frameOf = (i, fix) => SEGMENT_START + 72 * (i - 1) + (fix ? 12 : 0);

function showState(i) {
  const anim = lottie.anim;
  if (!anim) return;
  if (i === 0) anim.goToAndStop(0, true);
  else anim.goToAndStop(frameOf(i, corrected.value), true);
}

/** Play the current condition into (or out of) its correction. */
function playCorrection() {
  const anim = lottie.anim;
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
  const anim = lottie.anim;
  if (!totalFrames && anim) totalFrames = anim.totalFrames;
  anim?.playSegments([1, totalFrames], true);
  if (i === 0) corrected.value = false;
  state.value = i;
  showState(i);
}

const isOn = (i, fix) =>
  state.value === i && (i === 0 || corrected.value === fix);
const isRow = (i) => state.value === i;

onMounted(mountLottie);
watch([() => props.lottieUrl, () => props.content.image], mountLottie);
onBeforeUnmount(() => lottie.destroy());
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
    <p v-if="lottie.failed.value" class="rx-failed" role="alert">
      The animation didn't load. Reload the page to try again.
    </p>

    <FigureIntro
      v-if="infoOpen"
      :text="content.infoText"
      :video="content.video"
    />
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
.rx-cell:focus-visible {
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

.rx-failed {
  position: absolute;
  z-index: 2;
  right: 3.75rem;
  bottom: 2rem;
  max-width: 22rem;
  margin: 0;
  padding: 0.5rem 0.75rem;
  background: #fff;
  color: #000;
  font: 0.875rem/1.4 var(--rx-sans);
}

/* Narrow screens: the conditions above the drawing, full width. */
@container figure (max-width: 760px) {
  .rx {
    display: flex;
    flex-direction: column;
    padding: 1rem;
  }
  .rx-info-toggle {
    margin-top: 0.75rem;
  }
  .rx-states {
    width: min(100%, 22rem);
  }
  .rx-stage {
    position: relative;
    inset: auto;
    flex: 1 1 auto;
    width: 100%;
    min-height: 0;
  }
  .rx-failed {
    right: 1rem;
    left: 1rem;
  }
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
