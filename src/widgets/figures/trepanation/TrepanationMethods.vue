<script setup>
/*
 * Methods of trepanation (OPENBRAIN-87): History Figure 2. Point at one of
 * the skull's four numbered openings (or its number) and the arm that made
 * it reaches in with its tool and works; the method's name is set large
 * under the skull.
 *
 * Laid out as the designers' November sketch (OPENBRAIN-173): the skull low
 * on the pane's dark ground, long arms that come in from past the top edge,
 * numbered discs with leader lines, and the pane's toolbar row underneath
 * (amber label, title, legend). The widget clips at its own edge, so an arm
 * always ends at the edge of the pane, never in mid-air.
 *
 * Pointing shows a method while the pointer stays; a click or tap pins it
 * (touch has no hover), and a second one, a click beside the openings or
 * Escape lets it go. Keyboard focus on a number shows its method too. In a
 * narrow box (a phone) the numbers on the skull are too small to press, so
 * they become plain marks and a row of full-size number buttons sits under
 * the skull.
 *
 * Self-contained: its surfaces are its own, the accent is the host's
 * --widget-accent (the chapter ramp), its words come in as `content`.
 */
import { computed, ref } from "vue";
import { prefersReducedMotion } from "../shared/motion.js";
import { openingAt } from "./openings.js";

const props = defineProps({
  /** figureContent(schema, record): label, title, names, prompt, caption. */
  content: { type: Object, required: true },
  /** This figure's schema; `art` places the skull, the arms and the numbers. */
  schema: { type: Object, required: true },
  /** Passed by the host to every figure widget; this one has no Lottie. */
  lottieUrl: { type: String, default: "" },
});

const art = computed(() => props.schema.art);
const stage = ref(null);
const pointed = ref(null); // under a mouse or pen
const focused = ref(null); // a number has keyboard focus
const pinned = ref(null); // clicked or tapped
const active = computed(() => focused.value ?? pointed.value ?? pinned.value);
const failed = ref(false);
const still = prefersReducedMotion();

/** A share of the stage, as a CSS percentage. */
const pctX = (v) => `${(v / art.value.width) * 100}%`;
const pctY = (v) => `${(v / art.value.height) * 100}%`;
const box = ({ x, y, w, h }) => ({
  left: pctX(x),
  top: pctY(y),
  width: pctX(w),
  height: pctY(h),
});

const stageVars = computed(() => ({
  "--tr-w": art.value.width,
  "--tr-h": art.value.height,
  "--tr-min-h": art.value.height - art.value.spare,
}));

/* The arm turns about the opening it works on, a point of its own box. */
function handStyle(m) {
  return {
    ...box(m.hand),
    "--from-x": `${m.from.x}%`,
    "--from-y": `${m.from.y}%`,
    "--tip-x": `${((m.at.x - m.hand.x) / m.hand.w) * 100}%`,
    "--tip-y": `${((m.at.y - m.hand.y) / m.hand.h) * 100}%`,
    "--work-x": m.work.x,
    "--work-y": m.work.y,
    "--work-turn": `${m.work.turn}deg`,
  };
}
const at = (p) => ({ left: pctX(p.x), top: pctY(p.y) });

/** The opening under a pointer event, or null. */
function opening(e) {
  const own = e.target?.closest?.("[data-opening]");
  if (own) return Number(own.dataset.opening);
  const r = stage.value?.getBoundingClientRect();
  if (!r?.width || !r.height) return null;
  return openingAt(
    ((e.clientX - r.left) / r.width) * art.value.width,
    ((e.clientY - r.top) / r.height) * art.value.height,
    art.value.methods
  );
}

// Hover belongs to a mouse or pen; a finger's move comes with its tap,
// which pins instead.
function onMove(e) {
  if (e.pointerType !== "touch") pointed.value = opening(e);
}
function onLeave() {
  pointed.value = null;
}
function toggle(i) {
  pinned.value = pinned.value === i ? null : i;
}
/* On the stage: an opening pins or lets go; anywhere else lets go. */
function onStageClick(e) {
  const i = opening(e);
  if (i === null) pinned.value = null;
  else toggle(i);
}
function release() {
  pinned.value = null;
  pointed.value = null;
  focused.value = null;
}

// Focus shows a method for the keyboard only. A press focuses the button
// too (in most browsers), and would hold the method up after the second
// tap had let it go. `pressing` is true from a press to its release; the
// focus a press causes arrives in between (after the blur of whichever
// number had it before, so a blur must not clear the flag).
let pressing = false;
function onPress() {
  pressing = true;
}
function onPressEnd() {
  pressing = false;
}
function onFocus(i) {
  if (!pressing) focused.value = i;
}
function onBlur(i) {
  if (focused.value === i) focused.value = null;
}

const fullName = (i) => `${i + 1}. ${props.content.methods[i]}`;

/** Say which file failed: production answers a missing one with the app. */
function onImgError(e) {
  failed.value = true;
  console.error(
    `[figure widget] ${props.schema.animationKey}: an image didn't load`,
    e.target?.currentSrc || e.target?.src
  );
}
</script>

<template>
  <div class="tr" :class="{ 'tr--still': still }" @keydown.esc="release">
    <div class="tr-fit">
      <div
        ref="stage"
        class="tr-stage"
        :style="stageVars"
        :data-over="pointed !== null ? '' : undefined"
        @pointermove="onMove"
        @pointerleave="onLeave"
        @click="onStageClick"
      >
        <img
          class="tr-skull"
          :src="art.skull.src"
          :style="box(art.skull)"
          alt="A trepanned skull in profile with four healed openings, numbered 1 to 4."
          draggable="false"
          @error="onImgError"
        />

        <!-- Each number's leader line, from its disc to its opening. -->
        <svg
          class="tr-lines"
          :viewBox="`0 0 ${art.width} ${art.height}`"
          aria-hidden="true"
        >
          <line
            v-for="(m, i) in art.methods"
            :key="i"
            :x1="m.disc.x"
            :y1="m.disc.y"
            :x2="m.at.x"
            :y2="m.at.y"
            vector-effect="non-scaling-stroke"
          />
        </svg>

        <img
          v-for="(m, i) in art.methods"
          :key="`hand-${i}`"
          class="tr-hand"
          :class="{ 'is-in': active === i }"
          :src="m.hand.src"
          :style="handStyle(m)"
          :data-edge="m.hand.x + m.hand.w > art.width ? 'right' : undefined"
          alt=""
          aria-hidden="true"
          draggable="false"
          @error="onImgError"
        />

        <!-- The numbers carry the keyboard and the names. In a narrow box
             they give way to the marks below and the row under the skull. -->
        <button
          v-for="(m, i) in art.methods"
          :key="`disc-${i}`"
          type="button"
          class="tr-disc tr-num ob-round"
          :class="{ 'is-on': active === i }"
          :style="at(m.disc)"
          :data-opening="i"
          :aria-pressed="pinned === i"
          :aria-label="fullName(i)"
          @pointerdown="onPress"
          @pointerup="onPressEnd"
          @pointercancel="onPressEnd"
          @pointerleave="onPressEnd"
          @focus="onFocus(i)"
          @blur="onBlur(i)"
        >
          {{ i + 1 }}
        </button>
        <span
          v-for="(m, i) in art.methods"
          :key="`mark-${i}`"
          class="tr-mark tr-num"
          :class="{ 'is-on': active === i }"
          :style="at(m.disc)"
          aria-hidden="true"
        >
          {{ i + 1 }}
        </span>

        <p class="tr-method" aria-live="polite">
          <span v-if="active !== null" :key="active" class="tr-name">
            {{ content.labels[active] }}
          </span>
          <span v-else key="prompt" class="tr-prompt">{{
            content.prompt
          }}</span>
        </p>
      </div>
    </div>

    <div class="tr-row" role="group" aria-label="Methods">
      <button
        v-for="(m, i) in art.methods"
        :key="i"
        type="button"
        class="tr-pick tr-num ob-round"
        :class="{ 'is-on': active === i }"
        :aria-pressed="pinned === i"
        :aria-label="fullName(i)"
        @pointerdown="onPress"
        @pointerup="onPressEnd"
        @pointercancel="onPressEnd"
        @pointerleave="onPressEnd"
        @focus="onFocus(i)"
        @blur="onBlur(i)"
        @click="toggle(i)"
      >
        {{ i + 1 }}
      </button>
    </div>

    <div class="tr-bar">
      <span class="tr-fig">{{ content.figureLabel }}</span>
      <h4 class="tr-title">{{ content.title }}</h4>
      <p class="tr-legend">{{ content.caption }}</p>
    </div>

    <p v-if="failed" class="tr-failed" role="alert">
      Part of this figure didn't load. Reload the page to try again.
    </p>
  </div>
</template>

<style scoped>
/* The figure pane's own dark ground (the History redesign), light type, the
   chapter's accent, the pane toolbar's amber. */
.tr {
  --tr-bg: rgb(var(--color-dark-surface, 28 28 28));
  --tr-ink: #ffffff;
  --tr-ink-soft: rgb(255 255 255 / 0.66);
  --tr-accent: var(--widget-accent, rgb(var(--color-chapter)));
  --tr-amber: rgb(var(--color-warn, 244 166 33));
  --tr-mono: var(--font-mono, "IBM Plex Mono", ui-monospace, monospace);
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--tr-bg);
  color: var(--tr-ink);
  font-family: var(--tr-mono);
}

/*
 * The stage keeps the frame's proportions and is as wide as the box, or as
 * narrow as lets its lower part (everything but the tops of the arms) fit
 * the height. It hangs from the top edge; when it is taller than the room,
 * its top goes past that edge and only arm is lost.
 */
.tr-fit {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  container-type: size;
}
.tr-stage {
  --w: min(100cqw * var(--tr-bleed, 1), 100cqh * var(--tr-w) / var(--tr-min-h));
  --h: calc(var(--w) * var(--tr-h) / var(--tr-w));
  position: absolute;
  left: 50%;
  top: min(0px, 100cqh - var(--h));
  width: var(--w);
  height: var(--h);
  translate: -50% 0;
  container-type: size;
}
.tr-stage[data-over] {
  cursor: pointer;
}
/* One frame unit, for the stage's children (the stage is their container). */
.tr-stage > * {
  --u: calc(100cqw / var(--tr-w));
}

.tr-skull,
.tr-hand {
  position: absolute;
  display: block;
  max-width: none;
  user-select: none;
  -webkit-user-drag: none;
}
.tr-lines {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}
.tr-lines line {
  stroke: #fff;
  stroke-width: 1;
}

/* An arm comes in from its own side, then works: a small slide and turn
   about the opening, back and forth. */
.tr-hand {
  opacity: 0;
  translate: var(--from-x) var(--from-y);
  transform-origin: var(--tip-x) var(--tip-y);
  pointer-events: none;
  transition:
    opacity 0.3s ease-out,
    translate 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}
/* The fourth arm ends past the frame's right edge. In a box much wider
   than the stage that end would show, so it fades out instead. */
.tr-hand[data-edge="right"] {
  -webkit-mask-image: linear-gradient(to left, transparent, #000 14%);
  mask-image: linear-gradient(to left, transparent, #000 14%);
}
.tr-hand.is-in {
  opacity: 1;
  translate: 0 0;
  animation: tr-work 1.5s ease-in-out 0.55s infinite;
}
@keyframes tr-work {
  0%,
  100% {
    transform: none;
  }
  25% {
    transform: translate(
        calc(var(--u) * var(--work-x)),
        calc(var(--u) * var(--work-y))
      )
      rotate(var(--work-turn));
  }
  75% {
    transform: translate(
        calc(var(--u) * var(--work-x) * -1),
        calc(var(--u) * var(--work-y) * -1)
      )
      rotate(calc(var(--work-turn) * -1));
  }
}
.tr--still .tr-hand {
  translate: 0 0;
  animation: none;
  transition: opacity 0.2s;
}

/* A number: white with the chapter's numeral; filled when its method shows. */
.tr-num {
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: #fff;
  color: var(--tr-accent);
  font-family: var(--tr-mono);
  font-weight: 400;
  line-height: 1;
  transition:
    background-color 0.15s,
    color 0.15s,
    scale 0.2s cubic-bezier(0.3, 1.6, 0.5, 1);
}
.tr-num.is-on {
  background: var(--tr-accent);
  color: #fff;
}
.tr-disc,
.tr-mark {
  position: absolute;
  aspect-ratio: 1;
  translate: -50% -50%;
}
.tr-disc {
  width: max(1.75rem, var(--u) * 34);
  font-size: max(0.875rem, var(--u) * 20);
  cursor: pointer;
}
.tr-disc.is-on {
  scale: 1.08;
}
/* A 44px target whatever the disc's size. */
.tr-disc::before {
  content: "";
  position: absolute;
  inset: 50%;
  width: max(100%, 2.75rem);
  height: max(100%, 2.75rem);
  translate: -50% -50%;
  border-radius: 50%;
}
.tr-mark {
  display: none;
  width: 1.25rem;
  font-size: 0.6875rem;
  pointer-events: none;
}
.tr-num:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 3px;
}

/* The method's name, large, where the sketch sets it; the prompt until then. */
.tr-method {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(var(--u) * 746);
  min-height: calc(var(--u) * 38);
  display: grid;
  place-items: center;
  margin: 0;
  padding: 0 1rem;
  text-align: center;
  pointer-events: none;
}
.tr-name {
  font-size: max(1.125rem, var(--u) * 24.47);
  line-height: 1.2;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  animation: tr-rise 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
.tr-prompt {
  color: var(--tr-ink-soft);
  font-size: 0.75rem;
  line-height: 1.4;
  letter-spacing: 0.04em;
  animation: tr-rise 0.35s ease-out both;
}
@keyframes tr-rise {
  from {
    opacity: 0;
    transform: translateY(0.4em);
  }
}
.tr--still .tr-name,
.tr--still .tr-prompt {
  animation: none;
}

/* The row of numbers a phone gets (see the container query below). */
.tr-row {
  display: none;
  flex: none;
  justify-content: center;
  gap: 0.875rem;
  padding: 0.75rem 1rem 0;
}
.tr-pick {
  width: 2.75rem;
  height: 2.75rem;
  font-size: 1rem;
  cursor: pointer;
}

/* The pane's toolbar row (IllustrationPlaceholder on the dark pane): the
   amber label, then the title with the legend under it. This figure has no
   larger view to open, so the row has no expand button. */
.tr-bar {
  flex: none;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.5rem;
  align-items: start;
  padding: 1.875rem 0.875rem;
  line-height: 1.3;
}
.tr-fig {
  min-width: 3.125rem;
  color: var(--tr-amber);
  font-size: 0.65625rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.tr .tr-title {
  margin: 0;
  font-family: var(--tr-mono);
  font-size: 0.71875rem;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.tr-legend {
  grid-column: 2;
  max-width: 34.5rem;
  margin: 0;
  font-size: 0.71875rem;
  line-height: 1.3;
  letter-spacing: 0.06em;
}

.tr-failed {
  position: absolute;
  z-index: 4;
  right: 1rem;
  bottom: 1rem;
  max-width: 22rem;
  margin: 0;
  padding: 0.5rem 0.75rem;
  background: #fff;
  color: #000;
  font: 0.875rem/1.4 var(--font-ui, system-ui, sans-serif);
}

/* A phone-sized box: marks on the skull, the numbers to press in a row.
   The stage runs a little past the box's sides (its outer 4% each side is
   empty but for the ends of the arms), which gives the skull more room. */
@container figure (max-width: 440px) {
  .tr-stage {
    --tr-bleed: 1.08;
  }
  .tr-disc {
    display: none;
  }
  .tr-mark {
    display: grid;
  }
  .tr-row {
    display: flex;
  }
  .tr-bar {
    padding: 1.25rem 0.875rem;
  }
  .tr-legend {
    grid-column: 1 / -1;
  }
}

@media (prefers-reduced-motion: reduce) {
  :root:not([data-reduce-motion="0"]) .tr-hand {
    translate: 0 0;
    animation: none;
    transition: opacity 0.2s;
  }
  :root:not([data-reduce-motion="0"]) .tr-name,
  :root:not([data-reduce-motion="0"]) .tr-prompt {
    animation: none;
  }
}
</style>
