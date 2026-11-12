<script setup>
/*
 * PhrenologyView — "Widget 1: Phrenology" prototype (History chapter).
 *
 * An engraved skull the reader can turn and interrogate:
 *   • Tab switch (ANTERIOR / LATERAL / POSTERIOR) "rotates" the skull. There
 *     is no real 3D model — each view is its own engraving, and GSAP sells the
 *     turn: the outgoing view yaws away in perspective while the incoming one
 *     yaws in from the opposite side (direction-aware, based on tab order).
 *     The switch is the Widget Library Figma's (Vf62gR0eNAMJbwFje5VKry,
 *     68:271, Nov 2026): a pill track, one pill that slides under the chosen
 *     label the moment it is picked, while the skull turns underneath.
 *   • The source text reads on the plate itself, white on the dark surface
 *     (OPENBRAIN-162, the same Figma): no paper card beside the skull.
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
  useId,
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
// The view the reader has picked. It leads activeIdx by the length of the
// turn, so the switch answers the click at once while the skull still yaws.
const selectedIdx = ref(0);
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

/* ── The tab switch ───────────────────────────────────────────────────────
 * One pill slides under the chosen label. The labels share the track in
 * equal parts (Widget Library Figma 169:252), so the pill is one part wide
 * and its place is the chosen index: CSS alone, `--i` on the track, moved
 * by a transform. It moves on selectedIdx, before the skull turns. (It was
 * measured from each label with a ResizeObserver, and animated its width.)
 */
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
  selectedIdx.value = idx;
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
  } else if (e.key === "Escape" && legendOpen.value) {
    e.preventDefault();
    e.stopPropagation();
    legendOpen.value = false;
  }
}

/* ── The phone legend ─────────────────────────────────────────────────────
 * Below 760px the instruction and the citation fold behind a "Legend"
 * control (OPENBRAIN-190), so the skull has the height. The legend and an
 * organ's sheet lie over the same place: opening one closes the other.
 */
const INSTRUCTION =
  "Select a region of the skull to read what Gall and Spurzheim’s 1815 " +
  "source says about its organ. Organ 22, Weight, is in the list only: the " +
  "source gives it no place on the skull.";
const legendId = `phreno-legend-${useId()}`;
const legendOpen = ref(false);
function toggleLegend() {
  legendOpen.value = !legendOpen.value;
  if (legendOpen.value) closePanel(true);
}
watch(activeRegion, (region) => {
  if (region) legendOpen.value = false;
});
</script>

<template>
  <div class="widget-root phreno" @keydown="onKeydown">
    <header class="phreno__chrome">
      <div class="phreno__views">
        <nav
          v-if="views.length"
          class="tabs"
          :style="{ '--n': views.length, '--i': selectedIdx }"
          aria-label="Skull view"
        >
          <span class="tabs__thumb" aria-hidden="true"></span>
          <button
            v-for="(v, i) in views"
            :key="v.id"
            class="tab ob-round"
            :class="{ 'tab--on': i === selectedIdx }"
            :aria-pressed="i === selectedIdx"
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
      </div>
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
          <h3 class="card__title">
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
      <p v-if="!activeRegion && !narrow" class="card-instruction">
        {{ INSTRUCTION }}
      </p>

      <!-- On a phone the instruction and the citation are the widget's
           legend, folded behind a "Legend" control as the figures' are
           (Stuart, 12 Nov: the skull was 155px tall on his iPhone mini).
           Opened, it lies over the foot of the skull; the control's row
           keeps its place, so the stage never moves. Folded, it stays in
           the document for screen readers. -->
      <div v-if="narrow" class="phreno__legend-row">
        <button
          type="button"
          class="phreno__legend-btn"
          :aria-expanded="legendOpen ? 'true' : 'false'"
          :aria-controls="legendId"
          @click="toggleLegend"
        >
          <span>Legend</span>
          <svg
            class="phreno__legend-caret"
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M2 6.5l3-3 3 3" />
          </svg>
        </button>
      </div>
      <div
        v-if="narrow"
        :id="legendId"
        class="phreno__legend"
        :class="{ 'phreno__legend--folded': !legendOpen }"
      >
        <p class="phreno__legend-text">{{ INSTRUCTION }}</p>
        <p class="phreno__legend-source">{{ PHRENOLOGY_CITATION }}</p>
      </div>
    </div>

    <footer v-if="!narrow" class="phreno__foot">
      {{ PHRENOLOGY_CITATION }}
    </footer>
  </div>
</template>

<style scoped>
/* The widget is a dark plate regardless of app theme, like the Figma frames:
   the chapter's dark surface, so inside the band it is one ground with the
   band's own heading and toolbar (it was #232227, a shade off). */
.phreno {
  --plate: rgb(var(--color-dark-surface, 28 28 28));
  --bone: #eceae4;
  /* The chapter's colour (the Figma map's violet outside a chapter). */
  --accent-rgb: var(--color-chapter, 139 92 246);
  --violet: rgb(var(--accent-rgb));
  --violet-soft: rgb(var(--color-chapter-soft, 167 139 250));
  /* The skull's height, and the source text's cap beside it. 56vh, or on a
     short screen what is left of one once the chrome, the chapter band's
     heading and toolbar and the citation (about 27.5rem together) have
     theirs, so the band stays one screen. */
  --skull-h: max(12rem, min(56vh, calc(100vh - 27.5rem)));
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
/* The view switch with the organ list under it, centred over the skull
   (Figma 169:252, 169:259): the chrome has the body's two columns, and the
   switch sits in the first. The stage below gets the height. */
.phreno__chrome {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 0.9fr);
  gap: 1.5rem;
  padding: 1rem 2rem 0;
}
.phreno__views {
  justify-self: center;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: min(100%, 510px);
}
/* The switch: a pill track, the labels in equal parts of it, and one pill
   that slides under the chosen label. The track is #3F3F3F in the Figma,
   between --color-dark-surface-2 and the hairline, so it is a literal. */
.tabs {
  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--n, 3), minmax(0, 1fr));
  padding: 4px;
  border-radius: 1000px;
  background: #3f3f3f;
}
.tabs__thumb {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  width: calc((100% - 8px) / var(--n, 3));
  border-radius: 100px;
  background: var(--violet);
  transform: translateX(calc(var(--i, 0) * 100%));
  transition: transform 0.42s cubic-bezier(0.3, 0.85, 0.25, 1);
  will-change: transform;
  pointer-events: none;
}
/* `.tabs .tab`, not `.tab`: the chapter band squares every button inside
   it (WidgetBreakout `:deep(button)`), and the pills must win that. The
   buttons also carry `ob-round`: index.css squares every `.widget-root`
   button with `!important`, which left the hover fill with sharp corners
   inside the pill track (OPENBRAIN-180). */
.tabs .tab {
  position: relative;
  min-width: 0;
  padding: 9px 8px;
  border: 0;
  border-radius: 100px;
  background: transparent;
  color: #fbf8ff;
  font-family: var(--font-ui, inherit);
  font-size: var(--ui-size-18, 1.125rem);
  font-weight: 400;
  line-height: 1;
  letter-spacing: -0.0125em;
  text-align: center;
  text-transform: uppercase;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.15s;
}
.tabs .tab:hover:not(.tab--on) {
  background: rgb(255 255 255 / 0.08);
}
.tabs .tab:disabled {
  cursor: default;
}
.tabs .tab:focus-visible {
  outline: 2px solid #fbf8ff;
  outline-offset: 2px;
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
  fill: rgb(var(--accent-rgb) / 0.34);
}
.region:focus-visible path {
  stroke: var(--violet);
  stroke-width: 3;
}
:global([data-reduce-motion="1"]) .region path,
:global([data-reduce-motion="1"]) .region-label circle,
:global([data-reduce-motion="1"]) .region-label text,
:global([data-reduce-motion="1"]) .tabs .tab,
:global([data-reduce-motion="1"]) .tabs__thumb,
:global([data-reduce-motion="1"]) .phreno__legend-caret {
  transition: none;
}
@media (prefers-reduced-motion: reduce) {
  :root:not([data-reduce-motion="0"]) .region path,
  :root:not([data-reduce-motion="0"]) .region-label circle,
  :root:not([data-reduce-motion="0"]) .region-label text,
  :root:not([data-reduce-motion="0"]) .tabs .tab,
  :root:not([data-reduce-motion="0"]) .tabs__thumb,
  :root:not([data-reduce-motion="0"]) .phreno__legend-caret {
    transition: none;
  }
}

/* ── the source text ──
   On the plate itself, white on the dark surface (Figma 68:88, 68:270):
   the organ's title, then its quotations. */
.card {
  position: relative;
  width: 100%;
  /* From the skull's crown down (Figma 68:88 sits 45px under the stage's
     top), and no taller than the skull beside it: long source text scrolls
     rather than growing the row and moving the skull. */
  align-self: start;
  margin-top: 2.5rem;
  max-height: calc(var(--skull-h) - 2.5rem);
  box-sizing: border-box;
  padding: 0 2.75rem 0 0; /* the close button's column */
  color: var(--bone);
  overflow-y: auto;
  overscroll-behavior: auto;
}
.card-instruction {
  align-self: start;
  margin: 2.5rem 0 0;
  padding: 0 2.75rem 0 0;
  font-size: var(--type-body-sm-size, 1.0625rem);
  line-height: 1.5;
  color: var(--bone);
  opacity: 0.7;
}
/* "Browse an organ" under the switch (Figma 169:259, 169:261): a small
   label and the list as a rule that runs to the switch's edge, in the
   plate's ink. The native list keeps its own colours. */
.faculty-picker {
  display: flex;
  align-items: baseline;
  gap: 0.625rem;
  padding: 0 0.5rem 0 2.75rem;
  font-size: var(--ui-size-13, 0.8125rem);
  white-space: nowrap;
  color: var(--bone);
}
.faculty-picker select {
  flex: 1;
  min-width: 0;
  padding: 0.25rem 1.25rem 0.25rem 0;
  border: 0;
  border-bottom: 1px solid rgb(255 255 255 / 0.45);
  border-radius: 0;
  appearance: none;
  /* A small chevron at the rule's end says it opens. */
  background: transparent
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none' stroke='%23eceae4' stroke-width='1.4'%3E%3Cpath d='M1 1l4 4 4-4'/%3E%3C/svg%3E")
    no-repeat right 0.125rem center;
  color: var(--bone);
  font: inherit;
  text-overflow: ellipsis;
  cursor: pointer;
}
.faculty-picker select:disabled {
  cursor: default;
  opacity: 0.6;
}
.faculty-picker select:focus-visible {
  outline: 2px solid var(--violet);
  outline-offset: 2px;
}
.faculty-picker option {
  color: #222;
}
.region-label {
  pointer-events: none;
}
/* The number badges (Figma 169:217): the chapter's colour on white, in the
   mono face; the chosen organ's is filled (169:233). */
.region-label circle {
  fill: #fff;
  stroke: var(--violet);
  stroke-width: 1.5;
  transition: fill 0.15s;
}
.region-label text {
  fill: var(--violet);
  font: 600 17px var(--font-mono, monospace);
  transition: fill 0.15s;
}
.region--on .region-label circle {
  fill: rgb(var(--color-chapter-deep, 118 21 245));
  stroke: rgb(var(--color-chapter-deep, 118 21 245));
}
.region--on .region-label text {
  fill: #fff;
}
.card__editorial {
  margin: 0 0 1rem;
  padding-left: 0.75rem;
  border-left: 3px solid var(--violet);
  font-size: var(--ui-size-14, 0.875rem);
  line-height: 1.5;
  color: rgb(236 234 228 / 0.8);
}
.card__close {
  position: absolute;
  top: 0;
  right: 0;
  width: 2rem;
  height: 2rem;
  border: none;
  background: transparent;
  color: var(--bone);
  font-size: 0.9rem;
  cursor: pointer;
  opacity: 0.55;
}
.card__close:hover,
.card__close:focus-visible {
  opacity: 1;
}
/* The organ's title (Figma 68:88): the UI face at 20px, regular, white. */
.card__title {
  margin: 0 0 1rem;
  padding: 0; /* the global h3 rule adds some */
  font-family: var(--font-ui, inherit);
  font-size: var(--ui-size-20, 1.25rem);
  font-weight: 400;
  line-height: 1.55;
  letter-spacing: 0.025em;
  color: #fff;
}
/* The quotations (Figma 169:251): 15px on a 25px line, white. */
.card__text {
  margin-top: 1.5rem;
  font-size: var(--ui-size-15, 0.9375rem);
  line-height: 1.67;
  letter-spacing: 0.00625em;
  color: #fff;
}
.card__title + .card__text {
  margin-top: 0.75rem;
}

/* ── footer citation ──
   The figure legend's face on the dark pane (IllustrationPlaceholder
   .figure-pane--dark .fig-legend), under the skull as the Figma's toolbar
   legend sits. */
.phreno__foot {
  flex-shrink: 0;
  padding: 0.75rem 2rem 1rem;
  font-family: var(--font-mono, monospace);
  font-size: 0.71875rem;
  line-height: 1.3;
  letter-spacing: 0.06em;
  color: var(--bone);
  opacity: 0.7;
}

/* ── narrow viewports: the skull has the body; the text is a sheet over it ──
   (OPENBRAIN-160; SHEET_MEDIA_QUERY in helper/sheetDetents repeats this) */
@media (max-width: 759.98px) {
  .phreno__chrome {
    grid-template-columns: minmax(0, 1fr);
    padding: 0.75rem 1rem 0;
  }
  .phreno__views {
    gap: 0.75rem;
  }
  /* Three labels in a 390px column: the pills shrink a step. */
  .tabs .tab {
    padding: 0.5rem 0.25rem;
    font-size: var(--ui-size-15, 0.9375rem);
  }
  .faculty-picker {
    padding-left: 0.75rem;
  }
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
       the row or as wide as the column, whichever is less, in the middle.
       Placed, so the legend can share its cell. */
    grid-row: 1;
    grid-column: 1;
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
  /* A finger needs 44px: the view pills, the organ list and the sheet's
     close and grip (OPENBRAIN-190). */
  .tabs .tab {
    min-height: 2.75rem;
  }
  .faculty-picker {
    align-items: center;
  }
  .faculty-picker select {
    min-height: 2.75rem;
  }

  /* The legend's control, in the body's second row: the figures' "Legend"
     control on the plate. */
  .phreno__legend-row {
    grid-row: 2;
    grid-column: 1;
    display: flex;
    align-items: center;
  }
  .phreno__legend-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    height: 2.75rem;
    padding: 0 0.75rem;
    border: 1px solid rgb(255 255 255 / 0.28);
    background: transparent;
    color: var(--bone);
    font-family: var(--font-mono, monospace);
    font-size: 0.65625rem;
    font-weight: 600;
    line-height: 1;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    cursor: pointer;
  }
  .phreno__legend-btn:hover {
    border-color: var(--bone);
    background: rgb(255 255 255 / 0.08);
  }
  .phreno__legend-btn:focus-visible {
    outline: 2px solid var(--bone);
    outline-offset: 2px;
  }
  /* It opens upwards, over the skull: the caret points up until it does. */
  .phreno__legend-caret {
    transition: transform 0.16s ease;
  }
  .phreno__legend-btn[aria-expanded="true"] .phreno__legend-caret {
    transform: rotate(180deg);
  }
  /* Open: over the foot of the skull's row, on the sheet's surface, as
     tall as the row at most (it scrolls past that). */
  .phreno__legend {
    grid-row: 1;
    grid-column: 1;
    align-self: end;
    z-index: 1;
    max-height: 100%;
    overflow-y: auto;
    overscroll-behavior: contain;
    margin: 0 -1rem;
    padding: 1rem;
    border-top: 1px solid rgb(255 255 255 / 0.12);
    background: rgb(var(--color-dark-surface-2, 42 42 42) / 0.97);
  }
  .phreno__legend-text {
    margin: 0;
    font-size: var(--ui-size-14, 0.875rem);
    line-height: 1.5;
  }
  .phreno__legend-source {
    margin: 0.75rem 0 0;
    font-family: var(--font-mono, monospace);
    font-size: 0.71875rem;
    line-height: 1.4;
    letter-spacing: 0.06em;
    opacity: 0.75;
  }
  /* Folded: out of sight, still in the document. */
  .phreno__legend--folded {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    border: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  /* The sheet: the body's bottom edge up, --sheet-f of its height. Its own
     surface, the lighter dark (the plate reads white on dark now), lifted
     off the skull by a hairline and a shadow. */
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
    border-top: 1px solid rgb(255 255 255 / 0.12);
    border-radius: var(--radius-control) var(--radius-control) 0 0;
    background: rgb(var(--color-dark-surface-2, 42 42 42));
    box-shadow: 0 -8px 28px rgb(0 0 0 / 0.5);
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
    height: 2.75rem;
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
    background: rgb(255 255 255 / 0.3);
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
    top: 0;
    right: 0.25rem;
    z-index: 1;
    width: 2.75rem;
    height: 2.75rem;
  }
  .card--sheet .card__body {
    flex: 1;
    min-height: 0;
    padding: 0 1.25rem 2rem;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
}
:global([data-reduce-motion="1"]) .card--sheet {
  transition: none;
}
@media (prefers-reduced-motion: reduce) {
  :root:not([data-reduce-motion="0"]) .card--sheet {
    transition: none;
  }
}
</style>
