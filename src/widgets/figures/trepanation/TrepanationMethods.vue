<script setup>
/*
 * Methods of trepanation (OPENBRAIN-87): History Figure 2. Point at one of
 * the skull's four numbered openings (or its number) and the hand that made
 * it comes in with its tool; the caption names the method.
 *
 * Pointing shows a method while the pointer stays; a click or tap pins it
 * (touch has no hover), and a second click or Escape lets it go. Keyboard
 * focus on a number shows its method too.
 *
 * Self-contained: its surfaces are its own, the accent is the host's
 * --widget-accent (the chapter ramp), its words come in as `content`.
 */
import { computed, ref } from "vue";
import { prefersReducedMotion } from "../shared/motion.js";

const props = defineProps({
  /** figureContent(schema, record): title, methods, prompt, caption. */
  content: { type: Object, required: true },
  /** This figure's schema; `art` places the skull and the hands. */
  schema: { type: Object, required: true },
  /** Passed by the host to every figure widget; this one has no Lottie. */
  lottieUrl: { type: String, default: "" },
});

const art = computed(() => props.schema.art);
const hovered = ref(null);
const pinned = ref(null);
const active = computed(() => hovered.value ?? pinned.value);
const failed = ref(false);
const still = prefersReducedMotion();

/** A share of the frame, as a CSS percentage. */
const pctX = (v) => `${(v / art.value.width) * 100}%`;
const pctY = (v) => `${(v / art.value.height) * 100}%`;

function handStyle(m) {
  return {
    left: pctX(m.hand.x),
    top: pctY(m.hand.y),
    width: pctX(m.hand.w),
    "--from-x": `${m.from.x}%`,
    "--from-y": `${m.from.y}%`,
  };
}
function holeStyle(m) {
  return {
    left: pctX(m.hole.x - m.hole.r),
    top: pctY(m.hole.y - m.hole.r),
    width: pctX(2 * m.hole.r),
    height: pctY(2 * m.hole.r),
  };
}
const calloutStyle = (m) => ({
  left: pctX(m.callout.x),
  top: pctY(m.callout.y),
});

// Hover belongs to a mouse or pen; a finger's pointerenter comes with its
// click, which pins instead.
function enter(i, e) {
  if (e.pointerType !== "touch") hovered.value = i;
}
function leave(i) {
  if (hovered.value === i) hovered.value = null;
}
function toggle(i) {
  pinned.value = pinned.value === i ? null : i;
}
function release() {
  pinned.value = null;
  hovered.value = null;
}

const label = (i) => `${i + 1}. ${props.content.methods[i]}`;

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
    <h4 class="tr-title">{{ content.title }}</h4>

    <div class="tr-fit">
      <div class="tr-stage">
        <img
          class="tr-skull"
          :src="art.skull.src"
          :style="{
            left: pctX(art.skull.x),
            top: pctY(art.skull.y),
            width: pctX(art.skull.w),
          }"
          alt="A trepanned skull in profile with four healed openings, numbered 1 to 4."
          @error="onImgError"
        />

        <img
          v-for="(m, i) in art.methods"
          :key="`hand-${i}`"
          class="tr-hand"
          :class="{ 'is-in': active === i }"
          :src="m.hand.src"
          :style="handStyle(m)"
          alt=""
          aria-hidden="true"
          @error="onImgError"
        />

        <!-- Each opening is a pointer target too; the numbers carry the
             keyboard and the names. -->
        <div
          v-for="(m, i) in art.methods"
          :key="`hole-${i}`"
          class="tr-hole"
          :style="holeStyle(m)"
          aria-hidden="true"
          @pointerenter="enter(i, $event)"
          @pointerleave="leave(i)"
          @click="toggle(i)"
        />

        <button
          v-for="(m, i) in art.methods"
          :key="`callout-${i}`"
          type="button"
          class="tr-callout"
          :class="{ 'is-on': active === i }"
          :style="calloutStyle(m)"
          :aria-pressed="pinned === i"
          :aria-label="label(i)"
          @pointerenter="enter(i, $event)"
          @pointerleave="leave(i)"
          @focus="hovered = i"
          @blur="leave(i)"
          @click="toggle(i)"
        >
          {{ i + 1 }}
        </button>
      </div>
    </div>

    <div class="tr-caption">
      <p class="tr-method" aria-live="polite">
        <template v-if="active !== null">
          <span class="tr-num">{{ active + 1 }}</span>
          {{ content.methods[active] }}
        </template>
        <span v-else class="tr-prompt">{{ content.prompt }}</span>
      </p>
      <p class="tr-legend">{{ content.caption }}</p>
    </div>

    <p v-if="failed" class="tr-failed" role="alert">
      Part of this figure didn't load. Reload the page to try again.
    </p>
  </div>
</template>

<style scoped>
/* The frame's own ground (Figma's #333), light type, the chapter's accent. */
.tr {
  --tr-bg: #333333;
  --tr-ink: #ffffff;
  --tr-ink-soft: rgb(255 255 255 / 0.72);
  --tr-accent: var(--widget-accent, rgb(var(--color-chapter)));
  --tr-sans: "IBM Plex Sans", system-ui, sans-serif;
  --tr-mono: "IBM Plex Mono", ui-monospace, monospace;
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  padding: 1.375rem 3.75rem 2rem;
  background: var(--tr-bg);
  color: var(--tr-ink);
  font-family: var(--tr-sans);
}
.tr .tr-title {
  margin: 0;
  font-family: var(--tr-sans);
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.55;
  user-select: none;
}

/* The stage keeps the frame's proportions inside whatever space is left. */
.tr-fit {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  place-items: center;
  container-type: size;
  margin: 1rem 0;
}
.tr-stage {
  position: relative;
  width: min(100cqw, 100cqh * 745 / 657);
  aspect-ratio: 745 / 657;
  overflow: hidden;
}
.tr-skull,
.tr-hand {
  position: absolute;
  display: block;
  height: auto;
  max-width: none;
  user-select: none;
  -webkit-user-drag: none;
}
.tr-skull {
  z-index: 0;
}
.tr-hand {
  z-index: 1;
  opacity: 0;
  transform: translate(var(--from-x), var(--from-y));
  pointer-events: none;
  transition:
    opacity 0.35s ease-out,
    transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.tr-hand.is-in {
  opacity: 1;
  transform: none;
}
.tr--still .tr-hand {
  transform: none;
  transition: opacity 0.2s;
}

.tr-hole {
  position: absolute;
  z-index: 2;
  border-radius: 50%;
  cursor: pointer;
}
.tr-callout {
  position: absolute;
  z-index: 3;
  display: grid;
  place-items: center;
  width: clamp(1.5rem, 4.2cqw, 2rem);
  aspect-ratio: 1;
  padding: 0;
  translate: -50% -50%;
  border: 1.5px solid var(--tr-accent);
  border-radius: 50%;
  background: #fff;
  color: var(--tr-accent);
  font: 600 0.8125rem/1 var(--tr-sans);
  cursor: pointer;
  transition:
    background-color 0.15s,
    color 0.15s;
}
.tr-callout.is-on {
  background: var(--tr-accent);
  color: #fff;
}
.tr-callout:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

.tr-caption {
  flex: none;
  max-width: 38rem;
}
.tr-caption p {
  margin: 0;
}
.tr-method {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-height: 2rem;
  font-size: 1.0625rem;
  font-weight: 600;
  line-height: 1.4;
}
.tr-num {
  display: grid;
  place-items: center;
  flex: none;
  width: 1.625rem;
  height: 1.625rem;
  border-radius: 50%;
  background: var(--tr-accent);
  color: #fff;
  font-size: 0.8125rem;
}
.tr-prompt {
  color: var(--tr-ink-soft);
  font-weight: 400;
}
.tr-legend {
  padding-top: 0.5rem;
  color: var(--tr-ink-soft);
  font: italic 0.8125rem/1.5 var(--tr-sans);
}

.tr-failed {
  position: absolute;
  z-index: 4;
  right: 2rem;
  bottom: 2rem;
  max-width: 22rem;
  margin: 0;
  padding: 0.5rem 0.75rem;
  background: #fff;
  color: #000;
  font: 0.875rem/1.4 var(--tr-sans);
}

@container figure (max-width: 760px) {
  .tr {
    padding: 1rem;
  }
  .tr-fit {
    margin: 0.5rem 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tr-hand {
    transform: none;
    transition: opacity 0.2s;
  }
}
</style>
