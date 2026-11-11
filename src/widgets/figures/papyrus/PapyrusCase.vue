<script setup>
/*
 * Case 20 of the Edwin Smith papyrus (OPENBRAIN-87): History's second
 * widget, after the designers' November layout (OPENBRAIN-176, Figma
 * Yv7WvZSoabK2t5fNtsChvf 2879:48090). A tab per part of the case (title,
 * examination, diagnosis, treatment) in a pill switch; each part is a card
 * with its hieroglyphs on the front and Breasted's translation on the back,
 * which the reader turns over.
 *
 * - The tabs follow the WAI-ARIA tabs pattern: arrow keys, Home and End move
 *   between them, and the panel is labelled by its tab. One pill slides
 *   under the chosen label, as in the phrenology switch.
 * - The card turns in 3D, from its button or a click on it; a new tab
 *   turns it back to the hieroglyphs. The translation stays in the
 *   accessibility tree on either side (the signs are a picture), and each
 *   turn is announced.
 * - The signs draw in, line by line and left to right, when the figure
 *   comes into view and again on a new tab (./drawIn.js). After the first
 *   draw the card gives one small turn of its own, to show that it turns.
 * - Its expand button puts the widget itself on the whole screen (the
 *   Fullscreen API), where the browser has it.
 * Under reduced motion the card swaps sides at once and nothing draws.
 *
 * Self-contained: its surfaces are its own, the accent is the host's
 * --widget-accent (the chapter ramp), its words come in as `content`.
 */
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  useId,
  watch,
} from "vue";
import { prefersReducedMotion } from "../shared/motion.js";
import { drawDelays } from "./drawIn.js";
/* eslint-disable import/no-unresolved -- Vite ?raw suffix is valid but not resolvable by ESLint */
import titleArt from "./art/title.svg?raw";
import examinationArt from "./art/examination.svg?raw";
import diagnosisArt from "./art/diagnosis.svg?raw";
import treatmentArt from "./art/treatment.svg?raw";
/* eslint-enable import/no-unresolved */

const props = defineProps({
  /** figureContent(schema, record): title, tabs, lines, translations, … */
  content: { type: Object, required: true },
  /** This figure's schema. */
  schema: { type: Object, required: true },
  /** Passed by the host to every figure widget; this one has no Lottie. */
  lottieUrl: { type: String, default: "" },
});

const ART = {
  title: titleArt,
  examination: examinationArt,
  diagnosis: diagnosisArt,
  treatment: treatmentArt,
};
/** An SVG's viewBox size: the part's size in the art's own units. */
function viewBox(svg) {
  const m = /viewBox="[\d.]+ [\d.]+ ([\d.]+) ([\d.]+)"/.exec(svg);
  return m ? { w: Number(m[1]), h: Number(m[2]) } : { w: 400, h: 200 };
}

const uid = useId();
const root = ref(null);
const current = ref(0);
const tabsEl = ref(null);
const tabEls = ref([]);
const part = computed(() => props.schema.parts[current.value]);
const art = computed(() => ART[part.value]);
const artSize = computed(() => viewBox(art.value));

/* ── motion ── */
const still = ref(prefersReducedMotion());

/* ── the tab switch ── */
// Where the pill sits: the chosen tab's own box, measured (the labels have
// different widths). Until it is measured the tab paints itself.
const thumb = reactive({ x: 0, w: 0 });
const thumbReady = ref(false);
function placeThumb() {
  const el = tabEls.value[current.value];
  if (!el) return;
  thumb.x = el.offsetLeft;
  thumb.w = el.offsetWidth;
}

/* ── the card ── */
const flipped = ref(false);
// Counts turns, so each one replays the card's small step back.
const turns = ref(0);
const status = ref("");
// The card's one hint that it turns, after the signs first draw.
const nudge = ref(false);
let nudged = false;
function turn(to) {
  if (flipped.value === to) return;
  still.value = prefersReducedMotion();
  nudge.value = false;
  nudged = true;
  flipped.value = to;
  turns.value += 1;
  status.value = to ? "Translation showing." : "Hieroglyphs showing.";
}
function onCardClick() {
  // A click that ends a text selection is not a turn.
  if (window.getSelection?.()?.toString()) return;
  turn(!flipped.value);
}

/* ── the draw-in ── */
const glyphEl = ref(null);
// "wait": not seen yet, the signs are hidden. "run": drawing. "done": drawn.
const draw = ref("done");
let seen = false;
let drawTimer = 0;
let drawWait = 0;
function startDraw(wait = 0) {
  clearTimeout(drawTimer);
  const el = glyphEl.value;
  if (!el || prefersReducedMotion()) {
    draw.value = "done";
    return;
  }
  // One child of the art's root group is one sign, or one stroke of it.
  const units = [...(el.querySelector("svg > g")?.children || [])];
  let boxes = null;
  try {
    boxes = units.map((u) => u.getBBox());
  } catch {
    // No layout (a test DOM): show the signs as they are.
  }
  if (!boxes?.length) {
    draw.value = "done";
    return;
  }
  const { delays, total } = drawDelays(boxes);
  units.forEach((u, i) => u.style.setProperty("--d", `${delays[i] + wait}s`));
  draw.value = "run";
  drawTimer = setTimeout(
    () => {
      draw.value = "done";
      if (!nudged) nudge.value = true;
      nudged = true;
    },
    (total + wait) * 1000 + 80
  );
}

/* A line is half a unit wide in the art. Where a part is drawn small (the
   long examination in a short pane) the lines would thin out, so they are
   kept from going under 0.85px on screen. */
function fitStroke() {
  const el = glyphEl.value;
  const k = el ? el.clientWidth / artSize.value.w : 0;
  if (k > 0)
    el.style.setProperty(
      "--pc-sw",
      String(Math.max(0.5, Number((0.85 / k).toFixed(3))))
    );
}

function select(i) {
  if (i === current.value) return;
  // The card turns back to the signs; they draw as its front comes round.
  drawWait = flipped.value && !prefersReducedMotion() ? 0.3 : 0;
  turn(false);
  current.value = i;
}
async function onKey(e) {
  const n = props.schema.parts.length;
  const next = {
    ArrowRight: (current.value + 1) % n,
    ArrowLeft: (current.value - 1 + n) % n,
    Home: 0,
    End: n - 1,
  }[e.key];
  if (next === undefined) return;
  e.preventDefault();
  select(next);
  await nextTick();
  tabEls.value[next]?.focus();
}

/* ── the whole screen ── */
const canExpand = ref(false);
const expanded = ref(false);
function onFullscreenChange() {
  expanded.value = document.fullscreenElement === root.value;
}
async function toggleExpand() {
  try {
    if (expanded.value) await document.exitFullscreen();
    else await root.value.requestFullscreen();
  } catch {
    // Refused (an embedding page's policy): the figure stays where it is.
  }
}

let sizes = null;
let sight = null;
// Each part's art is its own element: follow the one that is showing.
let watched = null;
function watchGlyphs() {
  fitStroke();
  if (!sizes || watched === glyphEl.value) return;
  if (watched) sizes.unobserve(watched);
  watched = glyphEl.value;
  if (watched) sizes.observe(watched);
}
watch(
  part,
  () => {
    placeThumb();
    watchGlyphs();
    if (seen) startDraw(drawWait);
    drawWait = 0;
  },
  { flush: "post" }
);

onMounted(() => {
  still.value = prefersReducedMotion();
  placeThumb();
  requestAnimationFrame(() => {
    thumbReady.value = true;
  });
  if (typeof ResizeObserver !== "undefined") {
    sizes = new ResizeObserver(() => {
      placeThumb();
      fitStroke();
    });
    if (tabsEl.value) sizes.observe(tabsEl.value);
  }
  watchGlyphs();

  canExpand.value =
    !!document.fullscreenEnabled && !!root.value?.requestFullscreen;
  document.addEventListener("fullscreenchange", onFullscreenChange);

  if (!still.value && typeof IntersectionObserver !== "undefined") {
    draw.value = "wait";
    sight = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        seen = true;
        sight.disconnect();
        startDraw();
      },
      { threshold: 0.15 }
    );
    sight.observe(root.value);
  } else seen = true;
});
onBeforeUnmount(() => {
  clearTimeout(drawTimer);
  sizes?.disconnect();
  sight?.disconnect();
  document.removeEventListener("fullscreenchange", onFullscreenChange);
});
</script>

<template>
  <div ref="root" class="pc" :class="{ 'pc--still': still }">
    <div class="pc-head">
      <div
        ref="tabsEl"
        class="pc-tabs"
        :class="{ 'has-thumb': thumb.w > 0, 'is-ready': thumbReady }"
        :style="{ '--x': `${thumb.x}px`, '--tw': `${thumb.w}px` }"
        role="tablist"
        :aria-label="content.title"
        @keydown="onKey"
      >
        <span class="pc-thumb" aria-hidden="true"></span>
        <button
          v-for="(label, i) in content.tabs"
          :id="`${uid}-tab-${i}`"
          :key="i"
          ref="tabEls"
          type="button"
          role="tab"
          class="pc-tab ob-round"
          :class="{ 'is-on': current === i }"
          :aria-selected="current === i"
          :aria-controls="`${uid}-panel`"
          :tabindex="current === i ? 0 : -1"
          @click="select(i)"
        >
          {{ label }}
        </button>
      </div>
    </div>

    <div
      :id="`${uid}-panel`"
      class="pc-panel"
      role="tabpanel"
      :aria-labelledby="`${uid}-tab-${current}`"
      tabindex="0"
    >
      <div class="pc-scene">
        <!-- The card is turned from the button below; a click on it is the
             pointer's shortcut for the same thing. -->
        <div
          class="pc-card"
          :class="[
            { 'is-flipped': flipped, 'pc-nudge': nudge },
            turns ? (turns % 2 ? 'pc-turn-a' : 'pc-turn-b') : null,
          ]"
          @click="onCardClick"
          @animationend.self="nudge = false"
        >
          <div class="pc-face pc-face--front">
            <p v-if="content.lines[current]" class="pc-line">
              {{ content.lines[current] }}
            </p>
            <div class="pc-fit" :tabindex="flipped ? -1 : undefined">
              <!-- The figure's own SVG files (./art), not content from the page. -->
              <!-- eslint-disable vue/no-v-html -->
              <div
                :key="part"
                ref="glyphEl"
                class="pc-glyphs"
                aria-hidden="true"
                :class="{
                  'is-waiting': draw === 'wait',
                  'is-drawing': draw === 'run',
                }"
                :style="{ '--w': artSize.w, '--h': artSize.h }"
                v-html="art"
              />
              <!-- eslint-enable vue/no-v-html -->
            </div>
          </div>
          <div class="pc-face pc-face--back">
            <p class="pc-label">{{ content.translationLabel }}</p>
            <div class="pc-text" :tabindex="flipped ? undefined : -1">
              <p class="pc-translation">{{ content.translations[current] }}</p>
            </div>
          </div>
          <span class="pc-edge pc-edge--left" aria-hidden="true"></span>
          <span class="pc-edge pc-edge--right" aria-hidden="true"></span>
        </div>
      </div>

      <div class="pc-actions">
        <button
          type="button"
          class="pc-flip ob-round"
          :class="{ 'is-turned': flipped }"
          @click="turn(!flipped)"
        >
          <svg
            class="pc-flip-icon"
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path
              d="M1.5 6.5a5.5 5.5 0 0 1 10-2.6M12.5 7.5a5.5 5.5 0 0 1-10 2.6"
            />
            <path d="M11.8 1v3.2H8.6M2.2 13V9.8h3.2" />
          </svg>
          {{ flipped ? content.flip[1] : content.flip[0] }}
        </button>
        <p class="pc-sr" role="status">{{ status }}</p>
      </div>
    </div>

    <div class="pc-bar" :class="{ 'pc-bar--expand': canExpand }">
      <button
        v-if="canExpand"
        type="button"
        class="pc-expand"
        :title="expanded ? 'Leave full screen' : 'Expand to full screen'"
        :aria-label="expanded ? 'Leave full screen' : 'Expand to full screen'"
        @click="toggleExpand"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path
            :d="
              expanded
                ? 'M5 1v4H1M9 1v4h4M5 13V9H1M9 13V9h4'
                : 'M1 5V1h4M13 5V1H9M1 9v4h4M13 9v4H9'
            "
          />
        </svg>
      </button>
      <span class="pc-fig">{{ content.figureLabel }}</span>
      <h4 class="pc-title">{{ content.title }}</h4>
      <p class="pc-legend">{{ content.caption }}</p>
    </div>
  </div>
</template>

<style scoped>
/* The figure pane's own dark ground (the History redesign); the card's
   front is the Figma's plate, its back the chapter's colour mixed into the
   dark. Small type in the chapter's colour takes the ramp's soft tone: the
   main step is 3.6:1 on this ground, the soft one 7.6:1. */
.pc {
  --pc-bg: rgb(var(--color-dark-surface, 28 28 28));
  --pc-plate: #272727;
  --pc-track: #3f3f3f;
  --pc-ink: #ffffff;
  --pc-ink-tab: #fbf8ff;
  --pc-accent: var(--widget-accent, rgb(var(--color-chapter)));
  --pc-accent-soft: var(--widget-accent-soft, rgb(var(--color-chapter-soft)));
  --pc-back: #382a4f;
  --pc-sans: var(--font-ui, "IBM Plex Sans", system-ui, sans-serif);
  --pc-mono: var(--font-mono, "IBM Plex Mono", ui-monospace, monospace);
  --pc-ease: cubic-bezier(0.3, 0.85, 0.25, 1);
  /* Half the card's thickness. */
  --pc-half: 3px;
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--pc-bg);
  color: var(--pc-ink);
  font-family: var(--pc-mono);
}
@supports (color: color-mix(in srgb, red, blue)) {
  .pc {
    --pc-back: color-mix(in srgb, var(--pc-accent) 22%, #202020);
  }
}
.pc p {
  margin: 0;
}

/* ── the switch (Figma 2879:49071): a pill track, the labels at their own
   widths, one pill that slides under the chosen one ── */
.pc-head {
  flex: none;
  display: flex;
  justify-content: center;
  padding: clamp(1rem, 5cqh, 2.625rem) 1rem 0;
}
.pc-tabs {
  position: relative;
  display: flex;
  gap: 4px;
  max-width: 100%;
  padding: 4px;
  border-radius: 1000px;
  background: var(--pc-track);
}
.pc-thumb {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 0;
  width: var(--tw, 0);
  border-radius: 100px;
  background: var(--pc-accent);
  transform: translateX(var(--x, 0));
  pointer-events: none;
}
.pc-tabs.is-ready .pc-thumb {
  transition:
    transform 0.42s var(--pc-ease),
    width 0.42s var(--pc-ease);
  will-change: transform;
}
/* `.pc-tabs .pc-tab`: a chapter band squares the buttons inside it. */
.pc-tabs .pc-tab {
  position: relative;
  min-width: 0;
  padding: 9px min(16px, 2.4cqw);
  border: 0;
  border-radius: 100px;
  background: transparent;
  color: var(--pc-ink-tab);
  font-family: var(--pc-sans);
  font-size: min(1.125rem, 3.1cqw);
  font-weight: 400;
  line-height: 1;
  letter-spacing: -0.0125em;
  text-align: center;
  text-transform: uppercase;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.15s;
}
.pc-tabs .pc-tab:hover:not(.is-on) {
  background: rgb(255 255 255 / 0.08);
}
.pc-tabs:not(.has-thumb) .pc-tab.is-on {
  background: var(--pc-accent);
}
.pc-tabs .pc-tab:focus-visible,
.pc-flip:focus-visible,
.pc-expand:focus-visible {
  outline: 2px solid var(--pc-ink-tab);
  outline-offset: 2px;
}
.pc-panel:focus-visible {
  outline: 2px solid var(--pc-ink-tab);
  outline-offset: -4px;
}

/* ── the card ── */
.pc-panel {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: clamp(0.75rem, 3cqh, 1.875rem) 1.5rem 0;
}
.pc-scene {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  justify-items: center;
  perspective: 2200px;
}
.pc-card {
  position: relative;
  display: grid;
  grid-template: minmax(0, 1fr) / minmax(0, 1fr);
  width: min(100%, 47.5rem);
  min-height: 0;
  transform-style: preserve-3d;
  transition: rotate 0.7s cubic-bezier(0.45, 0.05, 0.2, 1);
  cursor: pointer;
}
.pc-card.is-flipped {
  rotate: y 180deg;
}
/* One small turn and back, once, after the signs first draw. */
.pc-nudge {
  animation: pc-nudge 0.9s cubic-bezier(0.45, 0.05, 0.2, 1);
}
@keyframes pc-nudge {
  35% {
    rotate: y -11deg;
  }
  70% {
    rotate: y 3deg;
  }
}
/* The card steps back a little as it turns, so its near edge stays inside
   the pane. Two names for one movement: each turn restarts it. */
.pc-turn-a {
  animation: pc-step-a 0.7s cubic-bezier(0.45, 0.05, 0.2, 1);
}
.pc-turn-b {
  animation: pc-step-b 0.7s cubic-bezier(0.45, 0.05, 0.2, 1);
}
@keyframes pc-step-a {
  50% {
    scale: 0.9;
  }
}
@keyframes pc-step-b {
  50% {
    scale: 0.9;
  }
}
.pc-face {
  grid-area: 1 / 1;
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  padding: 1rem 1.25rem 1.25rem;
  border: 1px solid rgb(255 255 255 / 0.1);
  transition: border-color 0.15s;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}
@media (hover: hover) {
  .pc-card:hover .pc-face {
    border-color: rgb(255 255 255 / 0.32);
  }
}
.pc-face--front {
  background: var(--pc-plate);
  transform: translateZ(var(--pc-half));
}
.pc-face--back {
  background: var(--pc-back);
  transform: rotateY(180deg) translateZ(var(--pc-half));
}
/* The card's two long edges: what shows of it when it is side on. */
.pc-edge {
  position: absolute;
  top: 0;
  bottom: 0;
  width: calc(var(--pc-half) * 2);
  background: linear-gradient(#6a6a6a, #4a4a4a);
}
.pc-edge--left {
  left: 0;
  transform: translateX(-50%) rotateY(90deg);
}
.pc-edge--right {
  right: 0;
  transform: translateX(50%) rotateY(90deg);
}

.pc-line,
.pc-label {
  flex: none;
  color: var(--pc-accent-soft);
  font-size: 0.65625rem;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

/* The signs: as large as the card's face allows (up to 2.75 × the art, the
   Figma's title), and never under 0.7 ×; a part too long for that scrolls
   inside the face. */
.pc-fit {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  margin-top: 0.5rem;
  overflow: hidden auto;
  container-type: size;
}
.pc-glyphs {
  flex: none;
  width: clamp(
    min(100cqw, calc(var(--w) * 0.7px)),
    calc(100cqh * var(--w) / var(--h)),
    min(100cqw, calc(var(--w) * 2.75px))
  );
  aspect-ratio: var(--w) / var(--h);
  margin: auto;
}
.pc-glyphs :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}
.pc-glyphs :deep(svg > g) {
  stroke-width: var(--pc-sw, 0.5);
}
.pc-glyphs.is-waiting {
  visibility: hidden;
}
/* The draw-in. Every line's length counts as 1 (pathLength in the art), so
   one dash draws it whatever its size; --d is its sign's turn (drawIn.js).
   Shapes that are filled, not stroked, come up with their sign. */
.pc-glyphs.is-drawing :deep(path[pathLength]) {
  stroke-dasharray: 1;
  animation: pc-draw 0.42s cubic-bezier(0.4, 0, 0.2, 1) both;
  animation-delay: var(--d, 0s);
}
.pc-glyphs.is-drawing :deep(path[stroke="none"]) {
  animation: pc-ink 0.3s ease both;
  animation-delay: calc(var(--d, 0s) + 0.16s);
}
@keyframes pc-draw {
  from {
    stroke-dashoffset: 1;
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  to {
    stroke-dashoffset: 0;
    opacity: 1;
  }
}
@keyframes pc-ink {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.pc-text {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  margin-top: 0.5rem;
  overflow: hidden auto;
}
.pc .pc-translation {
  max-width: 62ch;
  margin: auto 0;
  color: var(--pc-ink);
  font-size: clamp(0.875rem, 1.95cqw, 1.0625rem);
  line-height: 1.45;
  letter-spacing: 0.007em;
  cursor: text;
}

/* ── turning it ── */
.pc-actions {
  flex: none;
  display: flex;
  justify-content: center;
  padding-top: 0.75rem;
}
.pc-flip {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2rem;
  padding: 0 0.875rem;
  border: 1px solid rgb(255 255 255 / 0.4);
  border-radius: 100px;
  background: transparent;
  color: var(--pc-ink-tab);
  font: 600 0.71875rem/1 var(--pc-mono);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    background-color 0.15s,
    border-color 0.15s;
}
/* A 44px target around the 32px pill. */
.pc-flip::before {
  content: "";
  position: absolute;
  inset: -6px 0;
}
.pc-flip:hover {
  border-color: var(--pc-ink-tab);
  background: rgb(255 255 255 / 0.08);
}
.pc-flip-icon {
  flex: none;
  transition: rotate 0.7s var(--pc-ease);
}
.pc-flip.is-turned .pc-flip-icon {
  rotate: 180deg;
}
.pc-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

/* ── the toolbar row (Figma 2879:49064), as the pane's own: the expand
   icon, the label, then the title with its legend under it ── */
.pc-bar {
  flex: none;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.5rem;
  align-items: start;
  padding: 1.875rem 0.875rem;
  line-height: 1.3;
}
.pc-bar--expand {
  grid-template-columns: auto auto minmax(0, 1fr);
}
/* The bare 14px icon flush with the padding; its 28px target reaches 7px
   around it. */
.pc-expand {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  margin: -7px;
  border: 0;
  background: transparent;
  color: var(--pc-accent-soft);
  cursor: pointer;
}
.pc-expand:hover {
  background: rgb(255 255 255 / 0.08);
  color: var(--pc-ink);
}
.pc-fig {
  min-width: 3.125rem;
  color: var(--pc-accent-soft);
  font-size: 0.65625rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.pc .pc-title {
  margin: 0;
  font-family: var(--pc-mono);
  font-size: 0.71875rem;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.pc-legend {
  grid-column: -2 / -1;
  max-width: 34.5rem;
  font-size: 0.71875rem;
  line-height: 1.3;
  letter-spacing: 0.06em;
}

/* ── on the whole screen ── */
.pc:fullscreen {
  container: figure / size;
}
.pc:fullscreen .pc-card {
  width: min(100%, 70rem);
}
.pc::backdrop {
  background: #000;
}

/* ── inline, below the two-column reader: the figure is as tall as its
   content, so the card is as tall as the taller of its two sides ── */
.figure-widget--fit .pc:not(:fullscreen) {
  height: auto;
}
.figure-widget--fit .pc:not(:fullscreen) .pc-fit {
  flex: none;
  overflow: visible;
  container-type: normal;
}
.figure-widget--fit .pc:not(:fullscreen) .pc-glyphs {
  width: min(100%, calc(var(--w) * 1.6px), calc(62svh * var(--w) / var(--h)));
  margin: 0.75rem auto;
}
.figure-widget--fit .pc:not(:fullscreen) .pc-text {
  overflow: visible;
}

@container figure (max-width: 560px) {
  .pc-panel {
    padding: 1rem 1rem 0;
  }
  .pc-face {
    padding: 0.875rem 0.875rem 1rem;
  }
  .pc-bar {
    padding: 1.25rem 0.875rem;
  }
  .pc-legend {
    grid-column: 1 / -1;
  }
}

/* ── reduced motion: the card swaps sides at once, nothing draws ── */
.pc--still .pc-card,
.pc--still .pc-thumb,
.pc--still .pc-flip-icon {
  transition: none;
  animation: none;
}
@media (prefers-reduced-motion: reduce) {
  .pc-card,
  .pc-tabs.is-ready .pc-thumb,
  .pc-flip-icon {
    transition: none;
    animation: none;
  }
  .pc-glyphs.is-drawing :deep(path) {
    animation: none;
    stroke-dasharray: none;
  }
}
</style>
