<script setup>
/*
 * Step-through figures (OPENBRAIN-81): the pupillary light reflex,
 * phototransduction and the visual cycle, matched to theopenbrain.org
 * (v0.2.3). A Lottie plays one step at a time on a loop; the banner names
 * the step, the list jumps to any step, and the legend lights up a part of
 * the drawing.
 *
 * One component, one schema per figure: the schema holds the timeline
 * (`frames`) and the legend's artwork (`legendArt`); `content` holds the
 * words. Colours are this widget's own, except the accent (the host's
 * --widget-accent, the chapter ramp), which marks the lit legend item.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { loadLottie } from "@/composables/useLottie";
import { prepareLottie } from "../content.js";
import FigureIntro from "../shared/FigureIntro.vue";

const props = defineProps({
  /** figureContent(schema, record): title, infoText?, states, legend. */
  content: { type: Object, required: true },
  /** The figure's schema: frames, legendArt. */
  schema: { type: Object, required: true },
  lottieUrl: { type: String, required: true },
  /** Start with the introduction open, as the original does. */
  infoOpenAtStart: { type: Boolean, default: true },
});

const root = ref(null);
const stage = ref(null);
const infoOpen = ref(props.infoOpenAtStart && !!props.content.infoText);
const step = ref(0);
const lit = ref(-1); // the legend item lit up, -1 for none
let anim = null;
let startTimer = null;
let observer = null;
let visible = true;

const frames = computed(() => props.schema.frames);
const stepCount = computed(() => frames.value.length - 1);
const reducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Play step i (wrapping) on a loop, from its start frame to the next. */
function playStep(i) {
  const n = stepCount.value;
  const s = ((i % n) + n) % n;
  step.value = s;
  if (!anim) return;
  const [from, to] = [frames.value[s], frames.value[s + 1]];
  if (reducedMotion) anim.goToAndStop(from, true);
  else {
    anim.playSegments([from, to], true);
    if (!visible) anim.pause();
  }
}
const nextStep = () => playStep(step.value + 1);

function toggleLegend(i) {
  lit.value = lit.value === i ? -1 : i;
  applyLit();
}
function applyLit() {
  const el = stage.value;
  if (!el) return;
  for (const n of el.querySelectorAll(".highlightIllu"))
    n.classList.remove("highlightIllu");
  const art = props.schema.legendArt[lit.value];
  if (!art) return;
  for (const n of el.getElementsByClassName(art.highlight))
    n.classList.add("highlightIllu");
}

async function mountLottie() {
  if (!stage.value) return;
  anim?.destroy();
  anim = null;
  clearTimeout(startTimer);
  try {
    const res = await fetch(props.lottieUrl);
    if (!res.ok) throw new Error(`${res.status} ${props.lottieUrl}`);
    const data = prepareLottie(await res.json(), props.lottieUrl);
    const lottie = await loadLottie();
    if (!stage.value) return;
    anim = lottie.loadAnimation({
      container: stage.value,
      renderer: "svg",
      loop: true,
      autoplay: false,
      animationData: data,
    });
    anim.setSubframe(true);
    anim.addEventListener("DOMLoaded", applyLit);
    anim.goToAndStop(frames.value[step.value], true);
    // The original starts its first step a second in, at 0.6× speed.
    startTimer = setTimeout(() => {
      anim?.setSpeed(0.6);
      playStep(step.value);
    }, 1000);
  } catch (err) {
    console.error(`[${props.schema.id}] the animation didn't load`, err);
  }
}

onMounted(() => {
  mountLottie();
  // Only animate while on screen.
  if (typeof IntersectionObserver !== "undefined" && root.value) {
    observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!anim || reducedMotion) return;
      if (visible) anim.play();
      else anim.pause();
    });
    observer.observe(root.value);
  }
});
watch(() => props.lottieUrl, mountLottie);
onBeforeUnmount(() => {
  clearTimeout(startTimer);
  observer?.disconnect();
  anim?.destroy();
});
</script>

<template>
  <div ref="root" class="st" :class="{ 'st--info': infoOpen }">
    <div class="st-stage">
      <h4 class="st-title">{{ content.title }}</h4>
      <button
        v-if="content.infoText"
        type="button"
        class="st-round st-info-toggle"
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

      <div class="st-banner" :inert="infoOpen || undefined">
        <p class="st-banner-text" aria-live="polite">
          <span class="st-banner-n">{{ step + 1 }}.</span>
          <span v-html="content.states[step]" />
        </p>
        <button
          type="button"
          class="st-round st-next"
          aria-label="Next step"
          @click="nextStep"
        >
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <path d="M8 16h15M17 10l6 6-6 6" />
          </svg>
        </button>
      </div>

      <div ref="stage" class="st-lottie" aria-hidden="true" />
    </div>

    <ol class="st-steps" :inert="infoOpen || undefined">
      <li v-for="(label, i) in content.states" :key="i">
        <button
          type="button"
          class="st-step"
          :aria-current="step === i ? 'step' : undefined"
          @click="playStep(i)"
        >
          <span class="st-step-n">{{ i + 1 }}</span>
          <span v-html="label" />
        </button>
      </li>
    </ol>

    <ul class="st-legend" :inert="infoOpen || undefined">
      <li v-for="(label, i) in content.legend" :key="i">
        <button
          type="button"
          class="st-key"
          :class="{ 'is-lit': lit === i }"
          :aria-pressed="lit === i"
          @click="toggleLegend(i)"
        >
          <img :src="schema.legendArt[i]?.icon" alt="" loading="lazy" />
          <span v-html="label" />
        </button>
      </li>
    </ul>

    <FigureIntro v-if="infoOpen" :text="content.infoText" />
  </div>
</template>

<style scoped>
/* Surfaces are this figure family's own (v0.2.3's full* colours); the
   accent is the host's, the chapter ramp. */
.st {
  --st-stage: #333333;
  --st-steps: #424242;
  --st-legend: #5a5b5b;
  --st-banner: #cc01be;
  --st-accent: var(--widget-accent, rgb(var(--color-chapter)));
  --st-sans: "IBM Plex Sans", system-ui, sans-serif;
  --st-mono: "IBM Plex Mono", ui-monospace, monospace;
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--st-stage);
  color: #fff;
  font-family: var(--st-mono);
}

/* Column widths as the original: the stage takes half (more on wide
   screens), the steps 5/8 of the rest up to 556px, the legend what's left. */
.st-stage {
  position: relative;
  flex: 0 0 max(50%, calc(100% - 890px));
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-left: 3.75rem;
  background: var(--st-stage);
  border-right: 1px solid #fff;
}
.st-steps {
  flex: 0 0 min(31.25%, 556px);
  margin: 0;
  padding: 6.25rem 0 2rem;
  list-style: none;
  overflow-y: auto;
  background: var(--st-steps);
  border-left: 1px solid #000;
}
.st-legend {
  flex: 1 1 0;
  min-width: 0;
  margin: 0;
  padding: 6.375rem 3.125rem 2rem 1.25rem;
  list-style: none;
  overflow-y: auto;
  background: var(--st-legend);
  border-left: 1px solid #000;
}

.st .st-title {
  position: absolute;
  z-index: 3;
  top: 1.375rem;
  left: 3.75rem;
  right: 1rem;
  margin: 0;
  font-family: var(--st-sans);
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.55;
  user-select: none;
}

.st-round {
  display: grid;
  place-items: center;
  flex: none;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 1px solid #000;
  border-radius: 50%;
  background: #fff;
  color: #000;
  cursor: pointer;
}
.st-round svg {
  width: 1.25rem;
  height: 1.25rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.st-info-toggle {
  position: absolute;
  z-index: 3;
  top: 6.5rem;
  left: 3.75rem;
}
.st-info-toggle svg {
  transition: transform 0.3s;
}
.st-info-toggle.is-open svg {
  transform: rotate(45deg);
}
.st-round:focus-visible,
.st-step:focus-visible,
.st-key:focus-visible {
  outline: 2px solid var(--st-accent);
  outline-offset: 2px;
}

.st-banner {
  position: absolute;
  z-index: 2;
  top: 10rem;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9375rem 0.875rem 0.9375rem 3.75rem;
  background: var(--st-banner);
}
.st-banner-text {
  display: flex;
  gap: 0.5rem;
  margin: 0;
  max-width: 34rem;
  font: 1.25rem/1.5 var(--st-sans);
}
.st-banner-n {
  flex: none;
}
.st-next {
  width: 2.5rem;
  height: 2.5rem;
}
.st-next svg {
  width: 1.5rem;
  height: 1.5rem;
}

.st-lottie {
  width: 100%;
  height: calc(100% - 13.75rem);
}

.st-step {
  display: grid;
  gap: 0.125rem;
  width: 100%;
  padding: 0.25rem 5.25rem 1.5rem 1.375rem;
  border: 0;
  background: none;
  color: inherit;
  font: 0.9375rem/1.45 var(--st-mono);
  text-align: left;
  cursor: pointer;
}
.st-step:hover {
  color: var(--st-banner);
}

.st-key {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0 0 1.5rem;
  border: 0;
  background: none;
  color: inherit;
  font: 700 0.8125rem/1.25 var(--st-mono);
  text-align: left;
  cursor: pointer;
}
.st-key img {
  flex: none;
  width: 1.5rem;
  height: 1.5rem;
  object-fit: contain;
  filter: invert(1);
}
.st-key:hover,
.st-key.is-lit {
  color: var(--st-accent);
}
.st-key.is-lit span {
  text-decoration: underline;
}
.st :deep(sup) {
  padding: 0 1px;
  font-size: 0.6em;
  line-height: 0;
  vertical-align: super;
}

/* The lit legend item's layers in the drawing (v0.2.3's highlight rules,
   scoped here and in the chapter's accent). */
.st-lottie :deep(.highlighterIlluFill.highlightIllu > *),
.st-lottie :deep(.highlightIllu > .highlighterIlluFill > *),
.st-lottie :deep(.highlightIllu > .highlighterIlluFill),
.st-lottie :deep(.highlighterIlluFill.highlightIllu > * > *),
.st-lottie :deep(.highlightIllu > *),
.st-lottie :deep(.highlightIllu > * > *.highlighterIlluFill) {
  fill: var(--st-accent);
  fill-opacity: 1;
}
.st-lottie :deep(.highlighterIlluBorder.highlightIllu > *),
.st-lottie :deep(.highlightIllu > .highlighterIlluBorder > *),
.st-lottie :deep(.highlightIllu > .highlighterIlluBorder),
.st-lottie :deep(.highlighterIlluBorder.highlightIllu > * > *),
.st-lottie :deep(.highlighterIlluStroke.highlightIllu > *),
.st-lottie :deep(.highlightIllu > .highlighterIlluStroke > *),
.st-lottie :deep(.highlightIllu > .highlighterIlluStroke),
.st-lottie :deep(.highlighterIlluStroke.highlightIllu > * > *) {
  stroke: var(--st-accent);
  stroke-width: 3;
  stroke-opacity: 1;
}
.st-lottie :deep(.highlighterDisplay > *) {
  opacity: 0;
  transition: opacity 0.5s;
}
.st-lottie :deep(.highlighterDisplay.highlightIllu > *) {
  opacity: 1;
}

.st-stage > :not(.st-title):not(.st-info-toggle),
.st-steps,
.st-legend {
  transition:
    opacity 0.3s,
    filter 0.3s;
}
.st--info .st-stage > :not(.st-title):not(.st-info-toggle),
.st--info .st-steps,
.st--info .st-legend {
  opacity: 0.1;
  filter: blur(4px);
}
.st--info .st-steps,
.st--info .st-legend {
  background: var(--st-stage);
}

@media (prefers-reduced-motion: reduce) {
  .st-stage > *,
  .st-steps,
  .st-legend,
  .st-info-toggle svg,
  .st-lottie :deep(.highlighterDisplay > *) {
    transition: none;
  }
}
</style>
