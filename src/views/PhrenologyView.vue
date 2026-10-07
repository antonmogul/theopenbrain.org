<script setup>
/*
 * PhrenologyView — "Widget 1: Phrenology" prototype (History chapter).
 *
 * An engraved skull the reader can turn and interrogate:
 *   • Tab bar (ANTERIOR / LATERAL / POSTERIOR) "rotates" the skull. There is no
 *     real 3D model — each view is its own engraving, and GSAP sells the turn:
 *     the outgoing view yaws away in perspective while the incoming one yaws in
 *     from the opposite side (direction-aware, based on tab order).
 *   • The phrenology region map (the Figma maps, helper/phrenologyMaps,
 *     drawn from their own outlines) wipes on over the skull, and its
 *     regions are the targets: a region lights up in the chapter colour under the pointer
 *     (both halves of a paired one) and a click opens it (OPENBRAIN-98; they
 *     used to be numbered dots).
 *   • Opening a region lights it and slides in a paper detail
 *     card without changing the skull’s displayed dimensions.
 *
 * Art: the real Figma engravings live in
 *   public/publicAssets/images/phrenology/skull-{anterior|lateral|posterior}.png
 * and the maps in regions-{front|side|back}.svg (the lines-*.png layers are
 * no longer drawn: the side one is a different drawing from its map).
 * (the hand-drawn placeholder SVGs that predated them were removed in
 * OPENBRAIN-7).
 *
 * Data seam: @/mocks/phrenology — swap for Supabase later.
 * Unlisted route (like /case-cabinet): open /phrenology directly.
 */
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import gsap from "gsap";
import {
  PHRENOLOGY_CITATION,
  PHRENOLOGY_FACULTIES,
  usePhrenology,
} from "@/mocks/phrenology";
import labelAnchors from "@/data/history/phrenologyLabelAnchors.json";
import { reducedMotionK } from "@/helper/motion";
import {
  MAP_H,
  MAP_SRC,
  MAP_W,
  MAP_FIT,
  VIEW_MAP,
  fitTransform,
  mapOutlines,
  regionShapes,
} from "@/helper/phrenologyMaps";

// Narrow viewports get the detail card as a bottom sheet (media query below),
// so the slide animation runs on the y axis and the stage doesn't cede ground.

/* ── Motion recipe ──────────────────────────────────────────────────────────
 * All feel-tuning lives here. Durations in seconds, angles in degrees.
 * `K` collapses every duration to ~0 when the user asked for reduced motion
 * (shared convention — see src/helper/motion.js).
 */
const K = reducedMotionK();

const MOTION = {
  yawDeg: 55, // how far the skull turns while swapping views
  out: 0.32, // outgoing view (fast — the reader asked for the change)
  in: 0.55, // incoming view settles a bit slower
  draw: 0.7, // overlay line drawing
  drawStagger: 0.08,
  panel: 0.55, // detail card slide
  easeOut: "power2.in",
  easeIn: "power3.out",
};

const { fetchViews } = usePhrenology();

const views = ref([]);
const activeIdx = ref(0);
const activeRegion = ref(null); // { n, name, blurb } in the detail card
const hoverN = ref(null); // faculty number under the pointer / focus
const mapsByView = ref({}); // view id → { regions, outlines, transform }
let facultyInfo = new Map(); // n → { name, blurb }
const animating = ref(false);
let panelTween = null;
let viewTween = null;
let disposed = false;
let previousRegionElement = null;
onBeforeUnmount(() => {
  disposed = true;
  panelTween?.kill();
  viewTween?.kill();
  gsap.killTweensOf(
    [skullEl.value, regionsEl.value, panelEl.value].filter(Boolean)
  );
});

const stageEl = ref(null); // perspective wrapper
const skullEl = ref(null); // the yawing card
const regionsEl = ref(null); // the clickable region layer (SVG)
const regionEls = ref([]);
const panelEl = ref(null);

const activeView = computed(() => views.value[activeIdx.value] ?? null);
const engravingSrc = computed(() =>
  activeView.value
    ? `/publicAssets/images/phrenology/skull-${activeView.value.id}.png`
    : ""
);

const activeMap = computed(() =>
  activeView.value ? mapsByView.value[activeView.value.id] || null : null
);
function nameOf(n) {
  return facultyInfo.get(n)?.name || `Faculty ${n}`;
}

function setRegionRef(el, i) {
  if (el) regionEls.value[i] = el;
}

/* ── Keyboard navigation between regions ──────────────────────────────────
 * Arrow keys cycle focus through the regions (role="button", in the map's
 * order); Enter/Space opens one; Escape closes the detail card.
 */
function onStageKeydown(e) {
  const forward = e.key === "ArrowRight" || e.key === "ArrowDown";
  const back = e.key === "ArrowLeft" || e.key === "ArrowUp";
  if (!forward && !back) return;
  e.preventDefault();
  const dots = regionEls.value.filter(Boolean);
  if (!dots.length) return;
  const i = dots.indexOf(document.activeElement);
  const next = dots[(i + (forward ? 1 : -1) + dots.length) % dots.length];
  next.focus();
}

/* Reveal the region map into a given timeline: a crown-to-jaw clip wipe. */
function addRevealTo(tl, position = ">") {
  tl.fromTo(
    regionsEl.value,
    { clipPath: "inset(0 0 100% 0)", opacity: 0.6 },
    {
      clipPath: "inset(0 0 0% 0)",
      opacity: 1,
      duration: MOTION.draw * K,
      ease: "power1.inOut",
    },
    position
  );
  return tl;
}

onMounted(async () => {
  views.value = await fetchViews();
  if (disposed) return;
  facultyInfo = new Map(PHRENOLOGY_FACULTIES.map((f) => [f.n, f]));
  // Every view's map, from the same SVGs as the 3D skull.
  const loaded = {};
  await Promise.all(
    views.value.map(async (v) => {
      const key = VIEW_MAP[v.id];
      try {
        const text = await (await fetch(MAP_SRC[key])).text();
        loaded[v.id] = {
          regions: regionShapes(text).map((r) => ({
            ...r,
            label: labelAnchors[key].anchors[r.key],
          })),
          outlines: mapOutlines(text),
          transform: fitTransform(MAP_FIT[key]),
        };
      } catch (e) {
        console.warn(`[phrenology] no region map for ${v.id}`, e);
      }
    })
  );
  if (disposed) return;
  mapsByView.value = loaded;
  await nextTick();
  if (disposed) return;
  // Entrance: skull surfaces, the map draws, the regions go live.
  const tl = (viewTween = gsap.timeline());
  tl.from(skullEl.value, {
    opacity: 0,
    scale: 0.94,
    duration: 0.6 * K,
    ease: MOTION.easeIn,
  });
  addRevealTo(tl, "-=0.2");
});

/* ── View switching (the "rotation") ─────────────────────────────────────── */
async function switchView(idx) {
  if (idx === activeIdx.value || animating.value) return;
  animating.value = true;
  closePanel(true);

  // +1 = turning "rightward" through anterior→lateral→posterior.
  const dir = idx > activeIdx.value ? 1 : -1;

  // NOTE: `animating` stays locked across BOTH timelines — it is only released
  // by the incoming timeline's onComplete, so clicks can't land mid-swap.
  viewTween?.kill();
  const tl = (viewTween = gsap.timeline());

  // Outgoing: the map fades fast, skull yaws away.
  tl.to(regionsEl.value, { opacity: 0, duration: 0.18 * K }, 0);
  tl.to(
    skullEl.value,
    {
      rotationY: dir * MOTION.yawDeg,
      xPercent: dir * 6,
      opacity: 0,
      scale: 0.92,
      duration: MOTION.out * K,
      ease: MOTION.easeOut,
    },
    0
  );

  await tl.then();
  if (disposed) return;

  // Swap content while invisible, then yaw in from the other side.
  regionEls.value = [];
  hoverN.value = null;
  activeIdx.value = idx;
  await nextTick();

  if (disposed) return;
  const inTl = (viewTween = gsap.timeline({
    onComplete: () => (animating.value = false),
  }));
  inTl.fromTo(
    skullEl.value,
    {
      rotationY: -dir * MOTION.yawDeg,
      xPercent: -dir * 6,
      opacity: 0,
      scale: 0.92,
    },
    {
      rotationY: 0,
      xPercent: 0,
      opacity: 1,
      scale: 1,
      duration: MOTION.in * K,
      ease: MOTION.easeIn,
    }
  );
  addRevealTo(inTl, "-=0.25");
}

/* Detail panels never transform or resize the skull stage. */
async function selectRegion(shape) {
  if (animating.value || !facultyInfo.has(shape.n)) return;
  panelTween?.kill();
  if (!activeRegion.value) previousRegionElement = document.activeElement;
  activeRegion.value = facultyInfo.get(shape.n);
  await nextTick();
  if (disposed || !panelEl.value) return;
  panelEl.value.scrollTop = 0;
  panelTween = gsap.fromTo(
    panelEl.value,
    { opacity: 0.7 },
    { opacity: 1, duration: 0.18 * K }
  );
}
function closePanel(instant = false) {
  if (!activeRegion.value) return;
  panelTween?.kill();
  activeRegion.value = null;
  if (!instant && previousRegionElement?.isConnected)
    previousRegionElement.focus();
  previousRegionElement = null;
}
function onKeydown(e) {
  if (e.key === "Escape" && activeRegion.value) {
    e.preventDefault();
    e.stopPropagation();
    closePanel();
  }
}
</script>

<template>
  <div class="widget-root phreno" @keydown="onKeydown">
    <header class="phreno__chrome">
      <span class="phreno__eyebrow">Phrenology</span>
      <nav class="tabs" aria-label="Skull view">
        <button
          v-for="(v, i) in views"
          :key="v.id"
          class="tab"
          :class="{ 'tab--on': i === activeIdx }"
          @click="switchView(i)"
        >
          {{ v.label }}
        </button>
      </nav>
      <label class="faculty-picker"
        >Browse a faculty
        <select
          :value="activeRegion?.n || ''"
          @change="selectRegion({ n: Number($event.target.value) })"
        >
          <option value="" disabled>Select a number and faculty</option>
          <option
            v-for="faculty in PHRENOLOGY_FACULTIES"
            :key="faculty.n"
            :value="faculty.n"
          >
            {{ faculty.n }} · {{ faculty.name }}
          </option>
        </select>
      </label>
      <p class="historical-note">
        Historical phrenology claims, reproduced from the 1815 source. These are
        not accepted neuroscience.
      </p>
    </header>

    <div class="phreno__body">
      <!-- The reserved skull stage keeps identical dimensions while details open. -->
      <div ref="stageEl" class="stage" @keydown="onStageKeydown">
        <div v-if="activeView" ref="skullEl" class="skull" :key="activeView.id">
          <!-- Figma engraving -->
          <img :src="engravingSrc" alt="" class="skull__img" />

          <!-- the faculty map: its outlines, and its regions as targets -->
          <svg
            v-if="activeMap"
            ref="regionsEl"
            class="skull__regions"
            :style="{
              maskImage: `url(${engravingSrc})`,
              WebkitMaskImage: `url(${engravingSrc})`,
            }"
            :viewBox="`0 0 ${MAP_W} ${MAP_H}`"
            preserveAspectRatio="none"
            role="group"
            :aria-label="`Faculties, ${activeView.label.toLowerCase()} view`"
          >
            <g :transform="activeMap.transform">
              <g class="map-lines" aria-hidden="true">
                <path v-for="(d, j) in activeMap.outlines" :key="j" :d="d" />
              </g>
              <g
                v-for="(r, i) in activeMap.regions"
                :key="r.key"
                :ref="(el) => setRegionRef(el, i)"
                class="region"
                :class="{
                  'region--hover': hoverN === r.n,
                  'region--on': activeRegion?.n === r.n,
                }"
                role="button"
                tabindex="0"
                :aria-label="`${r.n}. ${nameOf(r.n)}`"
                :aria-pressed="activeRegion?.n === r.n"
                @pointerenter="hoverN = r.n"
                @pointerleave="hoverN = null"
                @focus="hoverN = r.n"
                @blur="hoverN = null"
                @click="selectRegion(r)"
                @keydown.enter.prevent="selectRegion(r)"
                @keydown.space.prevent="selectRegion(r)"
              >
                <path v-for="(d, j) in r.d" :key="j" :d="d" />
                <g v-if="r.label" class="region-label" aria-hidden="true">
                  <circle :cx="r.label.x" :cy="r.label.y" r="15" />
                  <text
                    :x="r.label.x"
                    :y="r.label.y"
                    dy=".35em"
                    text-anchor="middle"
                  >
                    {{ r.n }}
                  </text>
                </g>
              </g>
            </g>
          </svg>
        </div>
      </div>

      <aside
        v-if="activeRegion"
        ref="panelEl"
        class="card"
        :aria-label="`${activeRegion.n}. ${activeRegion.name}`"
      >
        <button
          class="card__close"
          type="button"
          aria-label="Close faculty details"
          @click="closePanel()"
        >
          ✕
        </button>
        <h3 class="card__badge">
          {{ activeRegion.n }} · {{ activeRegion.name }}
        </h3>
        <p
          v-for="note in activeRegion.editorialNotes"
          :key="note"
          class="card__editorial"
        >
          {{ note }}
        </p>
        <p
          v-for="quote in activeRegion.quotes"
          :key="quote.sourceBlock"
          class="card__text"
          :data-source-block="quote.sourceBlock"
        >
          {{ quote.text }}
        </p>
        <figure
          v-for="img in activeRegion.images"
          :key="img.src"
          class="source-image"
        >
          <img
            :src="img.src"
            :width="img.width"
            :height="img.height"
            :alt="img.caption"
            loading="lazy"
          />
          <figcaption>{{ img.caption }}</figcaption>
        </figure>
      </aside>
      <p v-else class="card-instruction">
        Select a numbered skull region to read the original quotation and see
        its associated illustrations. Faculty 22 (Weight) is available in the
        list; the source provides no labelled skull location.
      </p>
    </div>

    <footer class="phreno__foot">{{ PHRENOLOGY_CITATION }}</footer>
  </div>
</template>

<style scoped>
/* The widget is a dark plate regardless of app theme, like the Figma frames. */
.phreno {
  --plate: #232227;
  --bone: #eceae4;
  /* The chapter's colour (the Figma map's violet outside a chapter). */
  --accent-rgb: var(--color-chapter, 139 92 246);
  --violet: rgb(var(--accent-rgb));
  --violet-soft: rgb(var(--color-chapter-soft, 167 139 250));
  position: relative;
  /* A full screen on its own route; a host can set less (WidgetBreakout). */
  min-height: var(--widget-min-h, 100vh);
  display: flex;
  flex-direction: column;
  background: var(--plate);
  color: var(--bone);
  overflow: hidden;
  font-family: var(--font-ui, inherit);
}

/* ── chrome ── */
.phreno__chrome {
  padding: 1.25rem 2rem 0;
}
.phreno__eyebrow {
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.55;
}
.tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
  margin-top: 0.75rem;
  border: 1px solid rgb(255 255 255 / 0.14);
}
.tab {
  padding: 0.45rem 0;
  font-size: 0.7rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  background: transparent;
  border: none;
  color: var(--bone);
  opacity: 0.6;
  cursor: pointer;
  transition:
    opacity 0.15s,
    background-color 0.2s,
    color 0.2s;
}
.tab:hover {
  opacity: 1;
}
.tab--on {
  background: var(--violet);
  color: #fff;
  opacity: 1;
}

/* ── stage ── */
.phreno__body {
  position: relative;
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 0.9fr);
  align-items: center;
  gap: 1.5rem;
  padding: 1rem 2rem;
  min-height: 65vh;
}
.stage {
  perspective: 1200px;
  width: min(100%, 560px, 60vh);
  margin: auto;
}
.skull {
  position: relative;
  transform-style: preserve-3d;
  /* Figma engraving assets are 450x435 */
  aspect-ratio: 450 / 435;
}
.skull__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* ── regions ── */
.skull__regions {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  mask-size: 100% 100%;
  mask-repeat: no-repeat;
  -webkit-mask-size: 100% 100%;
  -webkit-mask-repeat: no-repeat;
}
/* The map's dotted outlines, in the chapter colour, at a constant weight
   whatever the widget's size. */
.map-lines path {
  fill: none;
  stroke: var(--violet);
  stroke-width: 1.25px;
  stroke-dasharray: 1.5 2.5;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
}
.region {
  cursor: pointer;
  outline: none;
}
.region path {
  /* Transparent, not none: a transparent fill still takes the pointer. */
  fill: transparent;
  stroke: none;
  transition: fill 0.15s;
}
.region--hover path {
  fill: rgb(var(--accent-rgb) / 0.28);
}
.region--on path {
  fill: rgb(var(--accent-rgb) / 0.5);
}
.region:focus-visible path {
  stroke: var(--violet);
  stroke-width: 3;
}
[data-reduce-motion="1"] .region path {
  transition: none;
}

/* ── detail card ── */
.card {
  position: relative;
  width: 100%;
  max-height: 65vh;
  box-sizing: border-box;
  padding: 2.25rem 1.5rem;
  border-radius: var(--radius-control);
  background: #f2f0ec;
  color: #2b2a2e;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.card-instruction {
  padding: 2rem;
  font-size: 0.95rem;
  line-height: 1.7;
  opacity: 0.7;
}
.faculty-picker {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;
  font-size: 0.8rem;
}
.faculty-picker select {
  max-width: 100%;
  padding: 0.5rem;
  color: #222;
  background: #f8f6f1;
  border-radius: 0.25rem;
}
.historical-note {
  font-size: 0.75rem;
  line-height: 1.5;
  opacity: 0.7;
}
.region-label {
  pointer-events: none;
}
.region-label circle {
  fill: #fff;
  stroke: var(--violet);
  stroke-width: 1.5;
}
.region-label text {
  fill: #24202a;
  font: 19px sans-serif;
  font-weight: 600;
}
.source-image {
  margin: 1.5rem 0;
}
.source-image img {
  display: block;
  width: 100%;
  height: auto;
}
.source-image figcaption {
  font-size: 0.75rem;
  line-height: 1.5;
  margin-top: 0.5rem;
}
.card__editorial {
  border-left: 3px solid #8464ae;
  padding-left: 0.75rem;
  font-size: 0.8rem;
  line-height: 1.5;
}
.card__close {
  position: absolute;
  top: 0.9rem;
  right: 0.9rem;
  border: none;
  background: transparent;
  font-size: 0.9rem;
  cursor: pointer;
  opacity: 0.5;
}
.card__close:hover {
  opacity: 1;
}
.card__badge {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.9rem;
  border-radius: var(--radius-control);
  background: var(--violet);
  color: #fff;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.card__text {
  margin-top: 1.25rem;
  font-size: 0.9rem;
  line-height: 1.65;
}
.card__text--mute {
  opacity: 0.55;
  font-size: 0.8rem;
}

/* ── footer citation ── */
.phreno__foot {
  padding: 0.75rem 2rem 1rem;
  font-size: 0.65rem;
  font-style: italic;
  opacity: 0.4;
}

/* ── narrow viewports: detail card becomes a bottom sheet ── */
@media (max-width: 760px) {
  .phreno__body {
    grid-template-columns: minmax(0, 1fr);
    padding: 1rem;
    min-height: 65vh;
  }
  .stage {
    width: min(460px, 90vw);
  }
  .card-instruction {
    position: absolute;
    bottom: 0;
    margin: 0;
    padding: 1rem;
    font-size: 0.75rem;
  }
  .card {
    position: absolute;
    z-index: 2;
    top: auto;
    right: 0;
    bottom: 0;
    left: 0;
    width: auto;
    /* Within the widget, which is shorter than the screen inline. */
    max-height: min(55vh, 100%);
    border-radius: var(--radius-control);
    box-shadow: 0 -12px 40px rgb(0 0 0 / 0.45);
    padding: 1.5rem 1.5rem 2rem;
  }
}
</style>
