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
 *     card from the right while the skull cedes ground to the left
 *     (mirrors Figma frame 2 of the storyboard).
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
import { ref, computed, onMounted, nextTick } from "vue";
import gsap from "gsap";
import { PHRENOLOGY_CITATION, usePhrenology } from "@/mocks/phrenology";
import { reducedMotionK } from "@/helper/motion";
import {
  MAP_H,
  MAP_SRC,
  MAP_W,
  MAP_FIT,
  VIEW_MAP,
  facultyInfoByNumber,
  fitTransform,
  mapOutlines,
  regionShapes,
} from "@/helper/phrenologyMaps";

// Narrow viewports get the detail card as a bottom sheet (media query below),
// so the slide animation runs on the y axis and the stage doesn't cede ground.
const isNarrow = () => window.matchMedia("(max-width: 760px)").matches;

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
  if (e.key === "Escape") {
    closePanel();
    return;
  }
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
  facultyInfo = facultyInfoByNumber(views.value);
  // Every view's map, from the same SVGs as the 3D skull.
  const loaded = {};
  await Promise.all(
    views.value.map(async (v) => {
      const key = VIEW_MAP[v.id];
      try {
        const text = await (await fetch(MAP_SRC[key])).text();
        loaded[v.id] = {
          regions: regionShapes(text),
          outlines: mapOutlines(text),
          transform: fitTransform(MAP_FIT[key]),
        };
      } catch (e) {
        console.warn(`[phrenology] no region map for ${v.id}`, e);
      }
    })
  );
  mapsByView.value = loaded;
  await nextTick();
  // Entrance: skull surfaces, the map draws, the regions go live.
  const tl = gsap.timeline();
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
  const tl = gsap.timeline();

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

  // Swap content while invisible, then yaw in from the other side.
  regionEls.value = [];
  hoverN.value = null;
  activeIdx.value = idx;
  await nextTick();

  const inTl = gsap.timeline({ onComplete: () => (animating.value = false) });
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

/* ── Region → detail card ────────────────────────────────────────────────── */
async function selectRegion(shape) {
  if (animating.value) return;
  const opening = !activeRegion.value;
  const info = facultyInfo.get(shape.n);
  activeRegion.value = {
    n: shape.n,
    name: nameOf(shape.n),
    blurb: info?.blurb || null,
  };
  await nextTick();

  const tl = gsap.timeline();
  if (opening) {
    if (!isNarrow()) {
      // Skull cedes ground; paper card slides in from the right.
      tl.to(
        stageEl.value,
        {
          xPercent: -16,
          scale: 0.92,
          duration: MOTION.panel * K,
          ease: MOTION.easeIn,
        },
        0
      );
    }
    // On narrow viewports the card is a bottom sheet, so it slides up instead.
    tl.fromTo(
      panelEl.value,
      isNarrow()
        ? { yPercent: 110, opacity: 0.4 }
        : { xPercent: 108, opacity: 0.4 },
      {
        ...(isNarrow() ? { yPercent: 0 } : { xPercent: 0 }),
        opacity: 1,
        duration: MOTION.panel * K,
        ease: MOTION.easeIn,
      },
      0.05
    );
  } else {
    // Card already out — just flip its content over with a small dip.
    tl.fromTo(
      panelEl.value,
      { opacity: 0.4, y: 10 },
      { opacity: 1, y: 0, duration: 0.3 * K, ease: MOTION.easeIn },
      0
    );
  }
}

function closePanel(instant = false) {
  if (!activeRegion.value) return;
  if (instant) {
    activeRegion.value = null;
    gsap.set(stageEl.value, { xPercent: 0, scale: 1 });
    return;
  }
  const tl = gsap.timeline({ onComplete: () => (activeRegion.value = null) });
  tl.to(panelEl.value, {
    ...(isNarrow() ? { yPercent: 110 } : { xPercent: 108 }),
    opacity: 0.4,
    duration: 0.4 * K,
    ease: MOTION.easeOut,
  });
  tl.to(
    stageEl.value,
    { xPercent: 0, scale: 1, duration: 0.45 * K, ease: MOTION.easeIn },
    "<0.05"
  );
}
</script>

<template>
  <div class="widget-root phreno">
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
    </header>

    <div class="phreno__body">
      <!-- perspective stage; shifts left when the detail card is out -->
      <div ref="stageEl" class="stage" @keydown="onStageKeydown">
        <div v-if="activeView" ref="skullEl" class="skull" :key="activeView.id">
          <!-- Figma engraving -->
          <img :src="engravingSrc" alt="" class="skull__img" />

          <!-- the faculty map: its outlines, and its regions as targets -->
          <svg
            v-if="activeMap"
            ref="regionsEl"
            class="skull__regions"
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
                :aria-label="nameOf(r.n)"
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
              </g>
            </g>
          </svg>
        </div>
      </div>

      <!-- paper detail card (Figma frame 2) -->
      <aside v-if="activeRegion" ref="panelEl" class="card">
        <button class="card__close" aria-label="Close" @click="closePanel()">
          ✕
        </button>
        <span class="card__badge">{{ activeRegion.name }}</span>
        <p v-if="activeRegion.blurb" class="card__text">
          {{ activeRegion.blurb }}
        </p>
        <p v-else class="card__text card__text--mute">
          A description of this faculty is still to come from the authors.
        </p>
        <p v-if="activeRegion.blurb" class="card__text card__text--mute">
          — from the phrenological chart after Spurzheim; faculties were claimed
          to be legible in the relief of the living skull.
        </p>
      </aside>
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
  place-items: center;
}
.stage {
  perspective: 1200px;
  width: min(460px, 60vh);
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
  overflow: visible;
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
  position: absolute;
  top: 6%;
  right: 2.5rem;
  bottom: 6%;
  width: min(480px, 46%);
  padding: 2.25rem 2.5rem;
  border-radius: 6px;
  background: #f2f0ec;
  color: #2b2a2e;
  box-shadow: -18px 0 48px rgb(0 0 0 / 0.4);
  overflow-y: auto;
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
  border-radius: 999px;
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
  .stage {
    width: min(340px, 82vw);
  }
  .card {
    top: auto;
    right: 0;
    bottom: 0;
    left: 0;
    width: auto;
    /* Within the widget, which is shorter than the screen inline. */
    max-height: min(55vh, 100%);
    border-radius: 12px 12px 0 0;
    box-shadow: 0 -12px 40px rgb(0 0 0 / 0.45);
    padding: 1.5rem 1.5rem 2rem;
  }
}
</style>
