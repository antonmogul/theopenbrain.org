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
 *     card without changing the skull’s displayed dimensions. Below 760px
 *     the card is a bottom sheet over the skull with half and full detents
 *     (OPENBRAIN-160; useSheetDetents), the region still lit above it.
 *   • The skull is sized by the height it has (60vh on its own route; the
 *     chapter's full-screen band hands it its flex height through
 *     --widget-body-min-h: 0), so it fills the stage at any screen
 *     (Stuart, 24 Sep: "the skull feels small for no reason").
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
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  nextTick,
  watch,
} from "vue";
import gsap from "gsap";
import {
  PHRENOLOGY_CITATION,
  PHRENOLOGY_FACULTIES,
  organTitle,
  usePhrenology,
} from "@/mocks/phrenology";
import labelAnchors from "@/data/history/phrenologyLabelAnchors.json";
import { reducedMotionK } from "@/helper/motion";
import { presentFaculty } from "@/helper/phrenologyContent";
import {
  SHEET_DETENTS,
  SHEET_MEDIA_QUERY,
  fitHalfDetent,
} from "@/helper/sheetDetents";
import { useSheetDetents } from "@/composables/useSheetDetents";
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

// Below SHEET_BREAKPOINT the detail card is a bottom sheet over the skull
// (OPENBRAIN-160): the skull keeps the whole body for tapping and the text
// gets a real reading surface. Its half detent sits under the selected
// region's number, so reading an organ never covers the region just tapped.

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
const bodyEl = ref(null); // the stage + card area; the sheet's container
const panelEl = ref(null);
const scrollEl = ref(null); // the card's text (the sheet scrolls it)

/* ── The phone sheet ──────────────────────────────────────────────────────
 * `narrow` follows the CSS breakpoint; the card is then an absolutely
 * positioned sheet sized by --sheet-f, a fraction of the body's height,
 * resting at a half or full detent (helper/sheetDetents).
 */
const narrowMq =
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(SHEET_MEDIA_QUERY)
    : null;
const narrow = ref(Boolean(narrowMq?.matches));
const onNarrowChange = (e) => {
  narrow.value = e.matches;
};
narrowMq?.addEventListener?.("change", onNarrowChange);
onBeforeUnmount(() =>
  narrowMq?.removeEventListener?.("change", onNarrowChange)
);

const halfDetent = ref(SHEET_DETENTS.half);
const {
  fraction: sheetFraction,
  detent: sheetDetent,
  dragging: sheetDragging,
  open: openSheet,
  close: closeSheet,
  snapTo: snapSheetTo,
  onPointerDown: onGripDown,
  onPointerMove: onGripMove,
  onPointerUp: onGripUp,
  onPointerCancel: onGripCancel,
  onKeydown: onGripKeydown,
} = useSheetDetents({
  containerHeight: () => bodyEl.value?.clientHeight || 0,
  detents: () => ({ half: halfDetent.value, full: SHEET_DETENTS.full }),
  onDismiss: () => closePanel(),
});

/** The half detent that keeps the selected region's number(s) uncovered. */
function measureHalfDetent() {
  const body = bodyEl.value;
  if (!body) return SHEET_DETENTS.half;
  const bodyRect = body.getBoundingClientRect();
  let labelBottom = null;
  for (const c of body.querySelectorAll(".region--on .region-label circle")) {
    const bottom = c.getBoundingClientRect().bottom - bodyRect.top;
    labelBottom = labelBottom == null ? bottom : Math.max(labelBottom, bottom);
  }
  return fitHalfDetent({ containerHeight: bodyRect.height, labelBottom });
}

/** Raise (or refit) the sheet for the region just selected and enter it. */
function presentSheet(animate) {
  halfDetent.value = measureHalfDetent();
  // A forced layout records the closed height, so the rise transitions.
  void panelEl.value.offsetHeight;
  if (sheetDetent.value === "closed") openSheet("half", { animate });
  else if (sheetDetent.value === "half") snapSheetTo("half");
  panelEl.value.focus({ preventScroll: true });
}

// Crossing the breakpoint with a region open: the sheet appears or the
// card goes back beside the skull, with no rise.
watch(narrow, async (isNarrow) => {
  if (!activeRegion.value) return;
  if (!isNarrow) {
    closeSheet();
    return;
  }
  await nextTick();
  if (!disposed && panelEl.value) presentSheet(false);
});

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
  // Native disabled controls lose focus. Remember only our initiating control;
  // restore it after Vue reenables it, unless the reader has moved elsewhere.
  const initiator = document.activeElement;
  const restoreControl = initiator?.matches(".phreno .tab, .phreno select");
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
  await inTl.then();
  await nextTick();
  if (
    !disposed &&
    restoreControl &&
    initiator.isConnected &&
    document.activeElement === document.body
  ) {
    initiator.focus({ preventScroll: true });
  }
}

/** Keep a valid current view; otherwise use the first loaded map that actually
 * contains the organ. Weight (22) remains text-only in the current view. */
async function selectFromPicker(n) {
  if (animating.value) return;
  hoverN.value = null;
  if (!activeMap.value?.regions.some((r) => r.n === n)) {
    const idx = views.value.findIndex((v) =>
      mapsByView.value[v.id]?.regions.some((r) => r.n === n)
    );
    if (idx !== -1) await switchView(idx);
  }
  if (!disposed) await selectRegion({ n });
}

/* Detail panels never transform or resize the skull stage. */
async function selectRegion(shape) {
  if (animating.value || !facultyInfo.has(shape.n)) return;
  panelTween?.kill();
  // Closing returns focus to the control that opened the card, or to the
  // last region picked while it was open (the sheet takes focus between).
  const focused = document.activeElement;
  if (!activeRegion.value || focused?.classList?.contains("region"))
    previousRegionElement = focused;
  activeRegion.value = presentFaculty(facultyInfo.get(shape.n));
  await nextTick();
  if (disposed || !panelEl.value) return;
  panelEl.value.scrollTop = 0;
  if (scrollEl.value) scrollEl.value.scrollTop = 0;
  if (narrow.value) presentSheet(true);
  panelTween = gsap.fromTo(
    panelEl.value,
    { opacity: 0.7 },
    { opacity: 1, duration: 0.18 * K }
  );
}
function closePanel(instant = false) {
  if (!activeRegion.value) return;
  panelTween?.kill();
  closeSheet();
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
      <nav class="tabs" aria-label="Skull view">
        <button
          v-for="(v, i) in views"
          :key="v.id"
          class="tab"
          :class="{ 'tab--on': i === activeIdx }"
          :disabled="animating"
          @click="switchView(i)"
        >
          {{ v.label }}
        </button>
      </nav>
      <label class="faculty-picker"
        >Browse an organ
        <select
          :value="activeRegion?.n || ''"
          :disabled="animating || !activeMap"
          @change="selectFromPicker(Number($event.target.value))"
        >
          <option value="" disabled>Select a numbered organ</option>
          <option
            v-for="faculty in PHRENOLOGY_FACULTIES"
            :key="faculty.n"
            :value="faculty.n"
          >
            {{ faculty.n }} · {{ organTitle(faculty) }}
          </option>
        </select>
      </label>
    </header>

    <div ref="bodyEl" class="phreno__body">
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

      <!-- Beside the skull from 760px; a bottom sheet over it below, sized by
           --sheet-f (a fraction of the body) and resting at a detent. -->
      <aside
        v-if="activeRegion"
        ref="panelEl"
        class="card"
        :class="{ 'card--sheet': narrow, 'is-dragging': sheetDragging }"
        :role="narrow ? 'dialog' : undefined"
        :tabindex="narrow ? -1 : undefined"
        :data-detent="narrow ? sheetDetent : undefined"
        :style="narrow ? { '--sheet-f': sheetFraction } : undefined"
        :aria-label="`${activeRegion.n}. ${organTitle(activeRegion)}`"
      >
        <div
          v-if="narrow"
          class="sheet__grip"
          role="slider"
          tabindex="0"
          aria-label="Resize the source text"
          aria-orientation="vertical"
          aria-valuemin="0"
          aria-valuemax="2"
          :aria-valuenow="sheetDetent === 'full' ? 2 : 1"
          :aria-valuetext="sheetDetent === 'full' ? 'Full' : 'Half'"
          @pointerdown="onGripDown"
          @pointermove="onGripMove"
          @pointerup="onGripUp"
          @pointercancel="onGripCancel"
          @keydown="onGripKeydown"
        >
          <span class="sheet__handle" aria-hidden="true"></span>
        </div>
        <button
          class="card__close"
          type="button"
          aria-label="Close faculty details"
          @click="closePanel()"
        >
          ✕
        </button>
        <div ref="scrollEl" class="card__body">
          <h3 class="card__badge">
            {{ activeRegion.n }} · {{ organTitle(activeRegion) }}
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
            :data-source-blocks="quote.sourceBlocks.join(' ')"
          >
            {{ quote.text }}
          </p>
        </div>
      </aside>
      <!-- Under the sheet it stays in the grid, so the stage never moves. -->
      <p
        v-if="!activeRegion || narrow"
        class="card-instruction"
        :class="{ 'card-instruction--covered': activeRegion }"
        :aria-hidden="activeRegion ? 'true' : undefined"
      >
        Select a region of the skull to read what Gall and Spurzheim’s 1815
        source says about its organ. Organ 22, Weight, is in the list only: the
        source gives it no place on the skull.
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
  /* The skull's height, and the detail card's cap beside it. 56vh, or on a
     short screen what is left of one once the chrome, the chapter band's
     header and footer and the citation (about 25rem together) have theirs,
     so the band stays one screen. */
  --skull-h: max(12rem, min(56vh, calc(100vh - 25rem)));
  position: relative;
  /* A full screen on its own route; a host can set less (WidgetBreakout). */
  min-height: var(--widget-min-h, 100vh);
  display: flex;
  flex-direction: column;
  background: var(--plate);
  color: var(--bone);
  /* Very short embedded hosts must scroll rather than clip controls/artwork. */
  overflow: auto;
  font-family: var(--font-ui, inherit);
}

/* ── chrome ── */
/* The view tabs and the organ list share one row where there is room, so
   the stage below gets the height. */
.phreno__chrome {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.5rem;
  padding: 1rem 2rem 0;
}
.tabs {
  flex: 1 1 320px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
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
  /* A short host may shrink the body, but not below the artwork plus padding.
     The root scrolls any excess so the citation cannot overlap the card. */
  min-height: max(var(--widget-body-min-h, 65vh), calc(var(--skull-h) + 2rem));
}
.stage {
  perspective: 1200px;
  /* As tall as the screen allows: the engraving's height is 435/450 of its
     width, so this is the skull at --skull-h tall, capped by the column. */
  width: min(100%, calc(var(--skull-h) * 450 / 435));
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
:global([data-reduce-motion="1"]) .region path,
:global([data-reduce-motion="1"]) .tab {
  transition: none;
}
@media (prefers-reduced-motion: reduce) {
  .region path,
  .tab {
    transition: none;
  }
}

/* ── detail card ── */
.card {
  position: relative;
  width: 100%;
  /* No taller than the skull beside it: long source text scrolls rather
     than growing the row and moving the skull. */
  max-height: var(--skull-h);
  box-sizing: border-box;
  padding: 2.25rem 1.5rem;
  border-radius: var(--radius-control);
  background: #f2f0ec;
  color: #2b2a2e;
  overflow-y: auto;
  overscroll-behavior: auto;
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
  font-size: 0.8rem;
}
.faculty-picker select {
  max-width: 100%;
  padding: 0.5rem;
  color: #222;
  background: #f8f6f1;
  border-radius: var(--radius-control);
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
  font: 19px var(--font-ui, sans-serif);
  font-weight: 600;
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
  width: 2rem;
  height: 2rem;
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
  max-width: calc(100% - 2rem);
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
  flex-shrink: 0;
  padding: 0.75rem 2rem 1rem;
  font-size: 0.65rem;
  font-style: italic;
  opacity: 0.4;
}

/* ── narrow viewports: the skull has the body; the text is a sheet over it ──
   (OPENBRAIN-160; SHEET_MEDIA_QUERY in helper/sheetDetents repeats this) */
@media (max-width: 759.98px) {
  .phreno__body {
    grid-template-columns: minmax(0, 1fr);
    /* The skull's row takes what the instruction leaves. */
    grid-template-rows: minmax(150px, 1fr) auto;
    align-items: stretch;
    gap: 0.75rem;
    padding: 1rem;
    min-height: max(var(--widget-body-min-h, 65vh), calc(150px + 7rem));
  }
  .stage {
    /* The whole row, as a size container: the skull inside is as tall as
       the row or as wide as the column, whichever is less, in the middle. */
    width: 100%;
    height: auto;
    margin: 0;
    align-self: stretch;
    container-type: size;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .skull {
    width: min(100%, calc(100cqh * 450 / 435));
  }
  .card-instruction {
    margin: 0;
    padding: 1rem;
    font-size: 0.75rem;
  }
  .card-instruction--covered {
    visibility: hidden;
  }

  /* The sheet: the body's bottom edge up, --sheet-f of its height. */
  .card--sheet {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2;
    height: calc(var(--sheet-f, 0) * 100%);
    min-height: 0;
    max-height: none;
    display: flex;
    flex-direction: column;
    padding: 0;
    border-radius: var(--radius-control) var(--radius-control) 0 0;
    box-shadow: 0 -8px 28px rgb(0 0 0 / 0.4);
    overflow: hidden;
    outline: none;
    transition: height 0.35s cubic-bezier(0.32, 0.72, 0, 1);
    will-change: height;
  }
  .card--sheet.is-dragging {
    transition: none;
  }
  .sheet__grip {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 2.25rem;
    touch-action: none;
    cursor: grab;
    outline: none;
  }
  .card--sheet.is-dragging .sheet__grip {
    cursor: grabbing;
  }
  .sheet__handle {
    width: 2.75rem;
    height: 4px;
    border-radius: 2px;
    background: rgb(43 42 46 / 0.3);
  }
  .sheet__grip:hover .sheet__handle,
  .sheet__grip:focus-visible .sheet__handle {
    background: var(--violet);
  }
  .sheet__grip:focus-visible .sheet__handle {
    outline: 2px solid var(--violet);
    outline-offset: 4px;
  }
  .card--sheet .card__close {
    top: 0.35rem;
    right: 0.6rem;
    z-index: 1;
  }
  .card--sheet .card__body {
    flex: 1;
    min-height: 0;
    padding: 0 1.5rem 2rem;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
}
:global([data-reduce-motion="1"]) .card--sheet {
  transition: none;
}
@media (prefers-reduced-motion: reduce) {
  .card--sheet {
    transition: none;
  }
}
</style>
