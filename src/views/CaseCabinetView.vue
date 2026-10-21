<script setup>
/* Preserve the approved 2D drawer → lift → quarter-turn → hinged cover
 * storyboard. Only its decorative canvas is scaled. The final open file is
 * normal responsive DOM, so the original scientific maps and notes stay
 * readable. One reversible timeline joins the two representations.
 */
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  watch,
  ref,
} from "vue";
import gsap from "gsap";
import { CASE_SOURCE, useCaseFiles } from "@/mocks/caseFiles";
import { folderPath } from "@/helper/folderPath";
import { readSpeed } from "@/helper/debugFlags";
import { reducedMotionPreferred } from "@/helper/readerJump";

// Geometry and tab positions retained from the baseline storyboard.
const STAGE_W = 1729;
const STAGE_H = 993;
const RULE_Y = 927;
const DRAWER = { top: 140, step: 93, h: 690, tab: 93, r: 50 };
const UPRIGHT = { cx: 1180, cy: 497, w: 780, h: 600, tab: 52, r: 12 };
const BODY = {
  left: UPRIGHT.cx - UPRIGHT.h / 2,
  top: UPRIGHT.cy - UPRIGHT.w / 2,
  width: UPRIGHT.h - UPRIGHT.tab,
  height: UPRIGHT.w,
};
const SPREAD_SHIFT = STAGE_W / 2 - (UPRIGHT.cx - UPRIGHT.h / 2);
const TAB_SPANS = {
  ge: [0.113, 0.429],
  sbe: [0.569, 0.871],
  gp: [0.254, 0.55],
  yn: [0.265, 0.563],
  nc: [0.577, 0.875],
  abra: [0.127, 0.429],
  rw: [0.442, 0.746],
};
const CLIP_SRC = "/publicAssets/images/case-cabinet/paper-clip.png";
const cases = ref([]);
const openCase = ref(null);
const selectedPoint = ref(null);
const mapZoom = ref(100);
const phase = ref("closed");
const animationMode = ref("immediate");
const desktop = ref(window.matchMedia("(min-width: 761px)").matches);
const bodyEl = ref(null);
const sceneEl = ref(null);
const pullEl = ref(null);
const coverEl = ref(null);
const workspaceEl = ref(null);
const fileHeading = ref(null);
const closeButton = ref(null);
const transcriptEl = ref(null);
const folderEls = new Map();
const scale = ref(1);
const offsetX = ref(0);
const offsetY = ref(0);
const flyerEl = ref(null);
const flyShapeEl = ref(null);
const uprightShapeEl = ref(null);
const bookEl = ref(null);
const mapScrollEl = ref(null);
const mapBaseWidth = ref(0);
const mobileView = ref("map");
const loadState = ref("loading");
let mapObserver = null;
// GSAP owns this decorative model. It must never schedule Vue renders.
const fly = {
  visible: 0,
  book: 0,
  x: 0,
  y: 0,
  w: STAGE_W,
  h: DRAWER.h,
  rot: 0,
  tab: DRAWER.tab,
  r: DRAWER.r,
  morph: 0,
};
let disposed = false;
let generation = 0;
let tl = null;
let resizeObserver = null;
let motionObserver = null;
let desktopQuery = null;
let motionQuery = null;
let queuedCase = null;
let focusFrame = null;
const { fetchCases } = useCaseFiles();
const point = computed(
  () => openCase.value?.points.find((p) => p.id === selectedPoint.value) ?? null
);
const hotspots = computed(() =>
  (openCase.value?.points || []).flatMap((p) =>
    p.hotspots.map((spot, i) => ({ ...spot, id: p.id, key: `${p.id}-${i}` }))
  )
);
const drawerY = (i) => DRAWER.top + i * DRAWER.step;
function outline(c, w, h, tab, r) {
  const span = TAB_SPANS[c.id];
  return folderPath({ w, h, a: span[0] * w, b: span[1] * w, tab, r });
}
function tabStyle(c, w, tab) {
  const [a, b] = TAB_SPANS[c.id];
  return { left: `${a * w}px`, width: `${(b - a) * w}px`, "--t": `${tab}px` };
}
const drawerOutlines = computed(() =>
  cases.value.map((c) => outline(c, STAGE_W, DRAWER.h, DRAWER.tab, DRAWER.r))
);
// Two immutable silhouettes crossfade while their common layer transforms.
const flyOutline = computed(() =>
  openCase.value
    ? outline(openCase.value, STAGE_W, DRAWER.h, DRAWER.tab, DRAWER.r)
    : ""
);
const uprightOutline = computed(() =>
  openCase.value
    ? outline(openCase.value, UPRIGHT.w, UPRIGHT.h, UPRIGHT.tab, UPRIGHT.r)
    : ""
);
function renderFly() {
  if (
    !flyerEl.value ||
    !bookEl.value ||
    !flyShapeEl.value ||
    !uprightShapeEl.value
  )
    return;
  flyerEl.value.style.transform = `translate3d(${fly.x + (fly.w - STAGE_W) / 2}px, ${fly.y + (fly.h - DRAWER.h) / 2}px, 0) rotate(${fly.rot}deg) scale(${fly.w / STAGE_W}, ${fly.h / DRAWER.h})`;
  flyerEl.value.style.visibility = fly.visible ? "visible" : "hidden";
  bookEl.value.style.visibility = fly.book ? "visible" : "hidden";
  flyShapeEl.value.style.opacity = String(1 - fly.morph);
  uprightShapeEl.value.style.opacity = String(fly.morph);
}
function fitMap() {
  const el = mapScrollEl.value,
    image = openCase.value?.image;
  if (!el || !image) return;
  const width = Math.floor(
    Math.min(el.clientWidth, (el.clientHeight * image.width) / image.height)
  );
  if (width > 0 && width !== mapBaseWidth.value) mapBaseWidth.value = width;
}
watch(mapScrollEl, (el) => {
  mapObserver?.disconnect();
  if (el && typeof ResizeObserver !== "undefined") {
    mapObserver = new ResizeObserver(fitMap);
    mapObserver.observe(el);
  }
  nextTick(fitMap);
});
watch(mapZoom, async (zoom) => {
  if (zoom !== 100) return;
  await nextTick();
  mapScrollEl.value?.scrollTo?.(0, 0);
});
async function resetReading() {
  selectedPoint.value = null;
  mapZoom.value = 100;
  mobileView.value = "map";
  await nextTick();
  if (mapScrollEl.value) mapScrollEl.value.scrollTo?.(0, 0);
  if (transcriptEl.value) transcriptEl.value.scrollTop = 0;
  fitMap();
}
function fit() {
  const w = bodyEl.value?.clientWidth || window.innerWidth;
  const h = bodyEl.value?.clientHeight || window.innerHeight * 0.76;
  const nextScale = Math.min(w / STAGE_W, h / STAGE_H);
  if (scale.value !== nextScale) scale.value = nextScale;
  offsetX.value = Math.max(0, (w - STAGE_W * scale.value) / 2);
  offsetY.value = Math.max(0, (h - STAGE_H * scale.value) / 2);
}
function revealWorkspace() {
  if (sceneEl.value) gsap.set(sceneEl.value, { autoAlpha: 0 });
  if (workspaceEl.value) gsap.set(workspaceEl.value, { autoAlpha: 1 });
}
function opened() {
  if (disposed || phase.value !== "opening") return;
  phase.value = "open";
  const token = generation;
  nextTick(() => {
    if (disposed || phase.value !== "open" || token !== generation) return;
    revealWorkspace();
    fileHeading.value?.focus({ preventScroll: true });
    // A browser can drop focus to body while releasing an inert subtree.
    // Retry after its rendering update only if no other control gained focus.
    const needsFocus = () =>
      document.activeElement === closeButton.value ||
      document.activeElement === document.body;
    if (needsFocus()) {
      focusFrame = requestAnimationFrame(() => {
        focusFrame = null;
        if (
          !disposed &&
          phase.value === "open" &&
          token === generation &&
          needsFocus()
        )
          fileHeading.value?.focus({ preventScroll: true });
      });
    }
  });
}
async function returnedToDrawer() {
  if (disposed || phase.value !== "closing") return;
  const id = openCase.value?.id;
  const next = queuedCase;
  queuedCase = null;
  generation++;
  if (import.meta.env.DEV && window.__cc?.tl === tl) delete window.__cc;
  tl?.kill();
  tl = null;
  openCase.value = null;
  selectedPoint.value = null;
  fly.visible = 0;
  fly.book = 0;
  phase.value = "closed";
  if (sceneEl.value) gsap.set(sceneEl.value, { autoAlpha: 1 });
  await nextTick();
  if (disposed) return;
  if (next) return open(next);
  folderEls.get(id)?.focus();
}
function layoutChanged() {
  desktop.value = desktopQuery.matches;
  fit();
  // A viewport/motion-preference change cannot strand a half-open folder.
  if (!desktop.value || reducedMotionPreferred()) {
    if (import.meta.env.DEV && window.__cc?.tl === tl) delete window.__cc;
    tl?.kill();
    tl = null;
    animationMode.value = "immediate";
    if (phase.value === "opening") opened();
    else if (phase.value === "closing") returnedToDrawer();
  }
}
onMounted(async () => {
  desktopQuery = window.matchMedia("(min-width: 761px)");
  motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  desktopQuery.addEventListener?.("change", layoutChanged);
  motionQuery.addEventListener?.("change", layoutChanged);
  if (typeof MutationObserver !== "undefined") {
    motionObserver = new MutationObserver(layoutChanged);
    motionObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-reduce-motion"],
    });
  }
  try {
    const result = await fetchCases();
    if (disposed) return;
    cases.value = result;
    loadState.value = result.length ? "ready" : "empty";
    // Decode the original maps before their folder reaches the reading view.
    for (const c of result) {
      const image = new Image();
      image.src = c.illustration;
      image.decode?.().catch(() => {});
    }
  } catch {
    loadState.value = "error";
  }
  await nextTick();
  if (disposed) return;
  fit();
  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(fit);
    resizeObserver.observe(bodyEl.value);
  }
});
onBeforeUnmount(() => {
  disposed = true;
  generation++;
  queuedCase = null;
  cancelAnimationFrame(focusFrame);
  resizeObserver?.disconnect();
  mapObserver?.disconnect();
  motionObserver?.disconnect();
  desktopQuery?.removeEventListener?.("change", layoutChanged);
  motionQuery?.removeEventListener?.("change", layoutChanged);
  tl?.kill();
  if (import.meta.env.DEV && window.__cc?.tl === tl) delete window.__cc;
});

async function open(c) {
  if (disposed) return;
  if (openCase.value && phase.value === "open") {
    if (openCase.value.id === c.id) return;
    const token = ++generation;
    tl?.kill();
    tl = null;
    openCase.value = c;
    await resetReading();
    if (disposed || token !== generation || phase.value !== "open") return;
    if (
      animationMode.value === "storyboard" &&
      desktop.value &&
      !reducedMotionPreferred()
    ) {
      prepareFly(c);
      createTimeline();
      tl.pause().progress(1, true);
      renderFly();
    }
    revealWorkspace();
    return;
  }
  if (openCase.value) {
    if (openCase.value.id === c.id && phase.value !== "closing") return;
    queuedCase = c;
    if (phase.value !== "closing") close({ keepQueue: true });
    return;
  }
  const token = ++generation;
  openCase.value = c;
  resetReading();
  phase.value = "opening";
  animationMode.value =
    desktop.value && !reducedMotionPreferred() ? "storyboard" : "immediate";
  prepareFly(c);
  await nextTick();
  if (disposed || token !== generation || phase.value !== "opening") return;
  closeButton.value?.focus();
  if (animationMode.value === "immediate") {
    opened();
    return;
  }
  createTimeline();
}
function prepareFly(c) {
  Object.assign(fly, {
    visible: 0,
    book: 0,
    x: 0,
    y: drawerY(cases.value.findIndex((item) => item.id === c.id)),
    w: STAGE_W,
    h: DRAWER.h,
    rot: 0,
    tab: DRAWER.tab,
    r: DRAWER.r,
    morph: 0,
  });
}
function createTimeline() {
  fit();
  renderFly();
  gsap.set(sceneEl.value, { autoAlpha: 1 });
  gsap.set(workspaceEl.value, { autoAlpha: 0 });
  gsap.set(pullEl.value, { x: 0 });
  gsap.set(coverEl.value, { rotationY: 0 });
  const speed = readSpeed(window.location.search);
  const upright = {
    x: UPRIGHT.cx - UPRIGHT.w / 2,
    y: UPRIGHT.cy - UPRIGHT.h / 2,
    w: UPRIGHT.w,
    h: UPRIGHT.h,
    rot: 90,
    tab: UPRIGHT.tab,
    r: UPRIGHT.r,
  };
  tl = gsap.timeline({
    onComplete: opened,
    onReverseComplete: returnedToDrawer,
    onUpdate: renderFly,
  });
  tl.set(fly, { visible: 1 })
    .to(fly, {
      y: fly.y - 150,
      rot: 12,
      duration: 0.4 * speed,
      ease: "power2.out",
    })
    .to(fly, {
      ...upright,
      morph: 1,
      duration: 0.95 * speed,
      ease: "power2.inOut",
    })
    .set(fly, { book: 1 })
    .to(coverEl.value, {
      rotationY: -180,
      duration: 0.9 * speed,
      ease: "power2.inOut",
    })
    .to(
      pullEl.value,
      { x: SPREAD_SHIFT, duration: 0.9 * speed, ease: "power2.inOut" },
      "<"
    )
    // Handoff to unscaled DOM reading panes; reverse brings the same spread back.
    .to(sceneEl.value, { autoAlpha: 0, duration: 0.2 * speed })
    .to(workspaceEl.value, { autoAlpha: 1, duration: 0.2 * speed }, "<");
  if (import.meta.env.DEV) window.__cc = { tl, label: "open" };
}
function close({ keepQueue = false } = {}) {
  if (!openCase.value || disposed) return;
  if (!keepQueue) queuedCase = null;
  if (phase.value === "closing") return;
  closeButton.value?.focus({ preventScroll: true });
  phase.value = "closing";
  if (!desktop.value || reducedMotionPreferred()) {
    returnedToDrawer();
    return;
  }
  if (tl && animationMode.value === "storyboard") {
    if (tl.totalTime() === 0) {
      returnedToDrawer();
      return;
    }
    if (import.meta.env.DEV) window.__cc = { tl, label: "close" };
    // Works at any point in the lift, turn, cover opening or final handoff.
    tl.timeScale(1.25).reverse();
  } else returnedToDrawer();
}
async function selectPoint(id) {
  if (phase.value !== "open") return;
  selectedPoint.value = id;
  if (!desktop.value) mobileView.value = "notes";
  await nextTick();
  if (transcriptEl.value) {
    transcriptEl.value.scrollTop = 0;
    if (!desktop.value) transcriptEl.value.focus({ preventScroll: true });
  }
}
function onKeydown(e) {
  if (e.key === "Escape" && openCase.value) {
    e.preventDefault();
    e.stopPropagation();
    close();
  }
}
</script>
<template>
  <section
    class="widget-root cabinet"
    :data-phase="phase"
    :data-animation-mode="animationMode"
    aria-label="Case cabinet: Wilder Penfield and the Montreal Procedure"
    @keydown="onKeydown"
  >
    <header class="cabinet__head">
      <button
        v-if="openCase"
        type="button"
        class="back-button"
        ref="closeButton"
        @click="close()"
      >
        ← Back to cases
      </button>
      <p v-else class="cabinet__eyebrow">
        Penfield’s case files <span>Penfield &amp; Perot · 1963</span>
      </p>
      <p class="cabinet__status" role="status">
        {{
          phase === "opening"
            ? "Opening the folder…"
            : phase === "closing"
              ? "Returning the folder…"
              : openCase
                ? `${openCase.tab} · ${openCase.points.length} stimulation points`
                : "Seven patients. Their words, on record."
        }}
      </p>
    </header>

    <div
      ref="bodyEl"
      class="cabinet-body"
      :class="{ 'cabinet-body--desktop': desktop }"
    >
      <p v-if="loadState !== 'ready'" class="cabinet-state" role="status">
        {{
          loadState === "loading"
            ? "Preparing the case files…"
            : loadState === "empty"
              ? "No case files are available."
              : "The case files could not load. Reload to try again."
        }}
      </p>
      <div
        v-if="desktop"
        ref="sceneEl"
        class="storyboard"
        :aria-hidden="openCase ? 'true' : undefined"
        :inert="openCase ? true : undefined"
      >
        <div
          class="storyboard__canvas"
          :style="{
            width: `${STAGE_W}px`,
            height: `${STAGE_H}px`,
            transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
          }"
        >
          <p class="storyboard__instruction">Choose a patient’s folder</p>
          <div class="story-drawer" :style="{ height: `${RULE_Y}px` }">
            <button
              v-for="(c, i) in cases"
              :key="c.id"
              :ref="(el) => el && folderEls.set(c.id, el)"
              type="button"
              class="story-folder"
              :class="{
                'story-folder--out': openCase?.id === c.id,
              }"
              :data-id="c.id"
              :style="{
                top: `${drawerY(i)}px`,
                width: `${STAGE_W}px`,
                height: `${DRAWER.h}px`,
                '--tint': c.tint,
              }"
              :aria-label="`Open case ${c.caseNo}, patient ${c.tab}`"
              :tabindex="openCase ? -1 : 0"
              @click="open(c)"
            >
              <svg
                class="story-folder__svg"
                :width="STAGE_W"
                :height="DRAWER.h"
                aria-hidden="true"
              >
                <path :d="drawerOutlines[i]" />
              </svg>
              <span class="story-tab" :style="tabStyle(c, STAGE_W, DRAWER.tab)"
                ><span class="story-tab__number">{{ c.caseNo }}</span
                ><span class="story-tab__initials">{{ c.tab }}</span></span
              >
            </button>
          </div>
          <div
            v-if="openCase"
            ref="pullEl"
            class="story-pull"
            :style="{ '--tint': openCase.tint }"
            aria-hidden="true"
          >
            <div
              ref="flyerEl"
              class="story-flyer"
              :style="{ width: `${STAGE_W}px`, height: `${DRAWER.h}px` }"
            >
              <svg
                ref="flyShapeEl"
                class="story-folder__svg"
                :width="STAGE_W"
                :height="DRAWER.h"
              >
                <path :d="flyOutline" />
              </svg>
              <svg
                ref="uprightShapeEl"
                class="story-folder__svg"
                :width="STAGE_W"
                :height="DRAWER.h"
                :viewBox="`0 0 ${UPRIGHT.w} ${UPRIGHT.h}`"
                preserveAspectRatio="none"
              >
                <path :d="uprightOutline" />
              </svg>
              <span
                class="story-tab"
                :style="tabStyle(openCase, STAGE_W, DRAWER.tab)"
                ><span class="story-tab__number">{{ openCase.caseNo }}</span
                ><span class="story-tab__initials">{{
                  openCase.tab
                }}</span></span
              >
            </div>
            <div
              ref="bookEl"
              class="story-book"
              :style="{
                left: `${BODY.left}px`,
                top: `${BODY.top}px`,
                width: `${BODY.width}px`,
                height: `${BODY.height}px`,
              }"
            >
              <div class="story-paper">
                <strong>Case {{ openCase.caseNo }} · {{ openCase.tab }}</strong>
                <p>
                  Select a numbered stimulation point to read the original notes
                </p>
              </div>
              <div ref="coverEl" class="story-cover">
                <div class="story-cover__face story-cover__face--out"></div>
                <div class="story-cover__face story-cover__face--in">
                  <div class="story-photo">
                    <img :src="openCase.illustration" alt="" />
                  </div>
                  <img class="story-clip" :src="CLIP_SRC" alt="" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        v-if="!desktop && !openCase"
        class="drawer"
        aria-label="Patient case files"
      >
        <p class="drawer__instruction">
          Choose a patient, then select a numbered stimulation point to read
          Penfield’s original notes
        </p>
        <button
          v-for="c in cases"
          :key="c.id"
          :ref="(el) => el && folderEls.set(c.id, el)"
          type="button"
          class="folder"
          :data-id="c.id"
          :style="{ '--tint': c.tint }"
          :aria-label="`Open case ${c.caseNo}, patient ${c.tab}`"
          @click="open(c)"
        >
          <span class="folder__number">{{ c.caseNo }}</span>
          <span class="folder__name">{{ c.tab }}</span>
          <span class="folder__action">Open case →</span>
        </button>
      </div>

      <div
        v-if="openCase"
        ref="workspaceEl"
        class="casefile"
        :class="{ 'casefile--desktop': desktop }"
        :style="{ '--tint': openCase.tint }"
        :aria-hidden="phase !== 'open' ? 'true' : undefined"
        :inert="phase !== 'open' ? true : undefined"
      >
        <nav class="case-tabs" aria-label="Switch patient case">
          <button
            v-for="c in cases"
            :key="c.id"
            type="button"
            :aria-pressed="c.id === openCase.id"
            @click="open(c)"
          >
            {{ c.caseNo }} · {{ c.tab }}
          </button>
        </nav>
        <h3
          ref="fileHeading"
          class="casefile__title"
          tabindex="-1"
          aria-live="polite"
        >
          Case {{ openCase.caseNo }} · {{ openCase.tab }}
        </h3>
        <div v-if="!desktop" class="reading-views" aria-label="Reading view">
          <button
            type="button"
            :aria-pressed="mobileView === 'map'"
            @click="mobileView = 'map'"
          >
            Brain map
          </button>
          <button
            type="button"
            :aria-pressed="mobileView === 'notes'"
            @click="mobileView = 'notes'"
          >
            {{ point ? `Point ${point.id} · notes` : "Original notes" }}
          </button>
        </div>
        <div class="casefile__spread" :data-mobile-view="mobileView">
          <div class="map-pane">
            <figure class="brain-map">
              <div class="map-heading">
                <span>Original brain map</span
                ><span>{{ openCase.points.length }} points</span>
              </div>
              <div class="map-zoom" aria-label="Map magnification">
                <button
                  type="button"
                  :aria-disabled="mapZoom === 100"
                  aria-label="Reduce map magnification"
                  @click="mapZoom = Math.max(100, mapZoom - 50)"
                >
                  −
                </button>
                <span>{{ mapZoom }}%</span>
                <button
                  type="button"
                  :aria-disabled="mapZoom === 250"
                  aria-label="Enlarge map"
                  @click="mapZoom = Math.min(250, mapZoom + 50)"
                >
                  +
                </button>
                <button
                  type="button"
                  class="map-reset"
                  :aria-disabled="mapZoom === 100"
                  @click="mapZoom = 100"
                >
                  Fit
                </button>
              </div>
              <div
                ref="mapScrollEl"
                class="map-scroll"
                tabindex="0"
                aria-label="Brain map; enlarge for closely spaced labels"
              >
                <div
                  class="brain-map__image"
                  :style="{
                    aspectRatio: `${openCase.image.width} / ${openCase.image.height}`,
                    width: mapBaseWidth
                      ? `${(mapBaseWidth * mapZoom) / 100}px`
                      : `${mapZoom}%`,
                  }"
                >
                  <img
                    :src="openCase.illustration"
                    @load="fitMap"
                    :width="openCase.image.width"
                    :height="openCase.image.height"
                    :alt="`Original brain map for case ${openCase.caseNo}, ${openCase.tab}, with stimulation points labelled`"
                  />
                  <button
                    v-for="spot in hotspots"
                    :key="spot.key"
                    type="button"
                    class="marker"
                    :class="{ 'marker--selected': selectedPoint === spot.id }"
                    :data-point="spot.id"
                    :style="{ left: `${spot.x}%`, top: `${spot.y}%` }"
                    :aria-label="`Read point ${spot.id} for ${openCase.tab}`"
                    :aria-pressed="selectedPoint === spot.id"
                    @click="selectPoint(spot.id)"
                  >
                    <span>{{ spot.id }}</span>
                  </button>
                </div>
              </div>
              <figcaption>
                {{ openCase.image.caption }} · Original illustration, Penfield
                &amp; Perot (1963)
              </figcaption>
            </figure>
            <p class="map-help">
              Select a number on the map or in the list. Repeated stimulations
              appear in their original order.
            </p>
            <p class="points-label">Stimulation points</p>
            <nav class="point-list" aria-label="Stimulation points">
              <button
                v-for="p in openCase.points"
                :key="p.id"
                type="button"
                :data-point-option="p.id"
                :aria-pressed="selectedPoint === p.id"
                @click="selectPoint(p.id)"
              >
                {{ p.id
                }}<span v-if="p.mapNote" class="point-list__unmapped">
                  · map unconfirmed</span
                >
              </button>
            </nav>
            <p
              v-for="p in openCase.points.filter((p) => p.mapNote)"
              :key="p.id"
              class="source-note"
            >
              {{ p.mapNote }}
            </p>
          </div>
          <section
            ref="transcriptEl"
            class="transcript"
            aria-label="Original stimulation notes"
            tabindex="0"
          >
            <template v-if="point">
              <p class="note-label">
                Original stimulation notes · {{ point.events.length }}
                {{ point.events.length === 1 ? "entry" : "entries" }}
              </p>
              <h4 aria-live="polite">
                Point {{ point.id }} · {{ openCase.tab }}
              </h4>
              <p v-if="point.mapNote" class="source-note">
                {{ point.mapNote }}
              </p>
              <article
                v-for="event in point.events"
                :key="event.id"
                class="note"
                :data-event="event.id"
              >
                <p class="note__text">{{ event.text }}</p>
              </article>
            </template>
            <div v-else class="transcript__instruction">
              <p class="note-label">From the operating room</p>
              <h4>What did the patient experience?</h4>
              <p>
                Choose a numbered point on the map or in the list to read the
                patient’s reports and Penfield’s original annotations.
              </p>
              <button
                v-if="openCase.points.length"
                type="button"
                class="start-reading"
                @click="selectPoint(openCase.points[0].id)"
              >
                Read point {{ openCase.points[0].id }} →
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
    <footer class="cabinet__source">{{ CASE_SOURCE }}</footer>
  </section>
</template>

<style scoped>
.cabinet-body {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
}
.cabinet-body--desktop {
  /* The drawer's floor; the chapter's full-screen band sizes the cabinet by
     flex instead and sets it to 0 (OPENBRAIN-147). */
  min-height: 0;
}
.storyboard {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
.storyboard__canvas {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
}
.storyboard__instruction {
  position: absolute;
  top: 45px;
  left: 3.4%;
  font: 24px var(--font-mono);
  opacity: 0.8;
}
.story-drawer {
  position: absolute;
  inset: 0 0 auto;
  overflow: hidden;
}
.story-folder {
  position: absolute;
  left: 0;
  border: 0;
  padding: 0;
  background: none;
  color: #fff;
  cursor: pointer;
  pointer-events: none;
}
.story-folder__svg {
  position: absolute;
  inset: 0;
  overflow: visible;
  filter: drop-shadow(0 -6px 10px rgb(0 0 0 / 0.28));
}
.story-folder__svg path {
  fill: var(--tint);
  pointer-events: visiblePainted;
}
.story-folder:hover,
.story-folder:focus-visible {
  filter: brightness(1.12);
}
.story-folder:focus-visible {
  outline: none;
}
.story-folder:focus-visible .story-tab__initials {
  text-decoration: underline;
  text-underline-offset: 0.2em;
}
.story-folder--out {
  visibility: hidden;
}
.story-tab {
  position: absolute;
  top: 0;
  height: var(--t);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 calc(var(--t) * 0.42);
  box-sizing: border-box;
  font-family: var(--font-mono);
  pointer-events: none;
}
.story-tab__number {
  display: grid;
  place-items: center;
  width: calc(var(--t) * 0.52);
  height: calc(var(--t) * 0.52);
  border: 1.5px solid rgb(255 255 255 / 0.9);
  border-radius: 50%;
  font-size: calc(var(--t) * 0.25);
}
.story-tab__initials {
  font-size: calc(var(--t) * 0.38);
  letter-spacing: 0.12em;
  white-space: nowrap;
}
.story-pull {
  position: absolute;
  inset: 0;
  pointer-events: none;
  clip-path: inset(-400px -400px 66px -400px);
}
.story-flyer {
  position: absolute;
  transform-origin: 50% 50%;
  visibility: hidden;
  will-change: transform;
}
.story-flyer .story-folder__svg {
  filter: none;
}
.story-flyer .story-folder__svg path {
  pointer-events: none;
}
.story-book {
  visibility: hidden;
  position: absolute;
  perspective: 2600px;
}
.story-paper {
  position: absolute;
  inset: 22px;
  padding: 44px 40px;
  background: #fff;
  color: #1a1a1a;
  font-size: 24px;
  box-sizing: border-box;
}
.story-paper p {
  font-size: 22px;
  line-height: 1.6;
}
.story-cover {
  position: absolute;
  inset: 0;
  transform-origin: 0 50%;
  transform-style: preserve-3d;
}
.story-cover__face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  background: var(--tint);
}
.story-cover__face--out {
  box-shadow: 0 3px 3px rgb(0 0 0 / 0.1);
}
.story-cover__face--in {
  transform: rotateY(180deg);
}
.story-photo {
  position: absolute;
  left: 9%;
  top: 8%;
  width: 80%;
  height: 78%;
  padding: 5%;
  box-sizing: border-box;
  background: #fff;
  transform: rotate(-6deg);
  box-shadow: 0 4px 10px rgb(0 0 0 / 0.18);
}
.story-photo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.story-clip {
  position: absolute;
  left: 58%;
  top: 2.5%;
  width: 120px;
  transform: rotate(-6deg);
}
@media (prefers-reduced-motion: reduce) {
  .story-folder {
    transition: none;
  }
}
[data-reduce-motion="1"] .story-folder {
  transition: none;
}

.cabinet {
  --cc-stage: #333;
  position: relative;
  display: flex;
  flex-direction: column;
  height: var(--widget-min-h, 100dvh);
  min-height: 0;
  width: 100%;
  background: var(--cc-stage);
  color: #fff;
  font-family: var(--font-ui, var(--font-body));
  box-sizing: border-box;
  /* The root is a <section>: inside the chapter the reader pads every
     section 15rem at the bottom (index.css), which left the drawer a third
     of its band (OPENBRAIN-147). */
  padding: 0;
}
.cabinet__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  height: 76px;
  flex: 0 0 76px;
  padding: 12px clamp(1rem, 3vw, 2.5rem);
  box-sizing: border-box;
}
.cabinet__eyebrow {
  margin: 0;
  font-size: 1rem;
}
.cabinet__eyebrow span {
  display: block;
  font: 12px var(--font-mono);
  opacity: 0.65;
  margin-top: 4px;
}
.cabinet__status {
  margin: 0;
  font-size: 13px;
  opacity: 0.8;
  text-align: right;
}
.cabinet-state {
  padding: 2rem;
}
.back-button,
.case-tabs button,
.point-list button,
.reading-views button,
.start-reading {
  border: 1px solid currentColor;
  border-radius: 0;
  min-height: 44px;
  padding: 0.5rem 0.75rem;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
button:focus-visible,
.map-scroll:focus-visible,
.transcript:focus-visible {
  outline: 3px solid #a08ac4;
  outline-offset: 3px;
}
.drawer {
  flex: 1;
  width: min(100%, 1000px);
  margin: auto;
  padding: 1rem clamp(1rem, 4vw, 3rem) 2rem;
  box-sizing: border-box;
}
.drawer__instruction {
  margin: 0 0 1.5rem;
  line-height: 1.5;
}
.folder {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  padding: 1rem 1.5rem;
  min-height: 4.5rem;
  color: #fff;
  background: var(--tint);
  border: 1px solid rgb(255 255 255 / 0.25);
  border-radius: 1rem 1rem 0 0;
  box-shadow: 0 -3px 10px rgb(0 0 0 / 0.2);
  text-align: left;
  cursor: pointer;
}
.folder + .folder {
  margin-top: -0.15rem;
}
.folder:hover {
  filter: brightness(1.12);
}
.folder__number {
  display: grid;
  place-items: center;
  border: 1px solid currentColor;
  border-radius: 50%;
  width: 2rem;
  height: 2rem;
}
.folder__name {
  flex: 1;
  font-family: var(--font-mono);
  letter-spacing: 0.08em;
  font-size: 1.1rem;
}
.folder__action {
  font-size: 0.85rem;
}
.casefile,
.casefile *,
.storyboard,
.storyboard * {
  /* The global reduced-motion rule implicitly transitions every property,
     including inherited visibility on each child. Keep this whole subtree
     immediately focusable when GSAP reveals it. */
  transition-property: none;
}
.casefile {
  /* GSAP owns only the workspace handoff; reading content stays unscaled. */
  opacity: 0;
  visibility: hidden;
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  padding: 0 clamp(1rem, 3vw, 2.5rem) 1rem;
  box-sizing: border-box;
  overflow: hidden;
  background: var(--cc-stage);
}
.case-tabs {
  display: flex;
  flex: none;
  overflow-x: auto;
  gap: 0.35rem;
  padding: 3px;
}
.case-tabs button {
  flex: none;
  font: 13px var(--font-mono);
  border-color: #777;
}
.case-tabs [aria-pressed="true"] {
  background: var(--tint);
  border-color: var(--tint);
  color: #fff;
}
.casefile__title {
  align-self: flex-start;
  margin: 14px 0;
  font-size: 20px;
  color: inherit;
  font-weight: 500;
}
.casefile__spread {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: clamp(1rem, 2vw, 1.75rem);
  flex: 1;
  min-height: 0;
  border-top: 4px solid var(--tint);
  padding-top: 1rem;
}
.map-pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
.brain-map {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 100px;
  margin: 0;
  padding: 12px;
  background: #fff;
  color: #252329;
}
.map-heading {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  gap: 1rem;
}
.map-heading span:last-child {
  color: #666;
}
.brain-map__image {
  position: relative;
  margin-inline: auto;
  flex: none;
}
.brain-map img {
  display: block;
  width: 100%;
  height: 100%;
}
.brain-map figcaption {
  flex: none;
  margin-top: 8px;
  font-size: 11px;
  line-height: 1.4;
}
.map-zoom {
  display: flex;
  align-items: center;
  justify-content: end;
  gap: 8px;
  margin: 6px 0;
  font: 12px var(--font-mono);
  flex: none;
}
.map-zoom button {
  min-width: 36px;
  height: 36px;
  padding: 0 8px;
  background: #f8f6f1;
  color: #342348;
  border: 1px solid #aaa;
  border-radius: 0;
  cursor: pointer;
}
.map-zoom button[aria-disabled="true"] {
  opacity: 0.4;
  cursor: default;
}
.map-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
}
.marker {
  position: absolute;
  transform: translate(-50%, -50%);
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--tint);
  border-radius: 0;
  background: transparent;
  cursor: pointer;
}
.marker span {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
.marker:hover,
.marker--selected {
  background: color-mix(in srgb, var(--tint) 40%, transparent);
  box-shadow: 0 0 0 2px #fff;
  border-width: 2px;
}
.map-help {
  margin: 10px 0;
  font-size: 12px;
  line-height: 1.5;
}
.points-label,
.note-label {
  font: 11px var(--font-mono);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin: 0 0 8px;
}
.point-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 100px;
  overflow-y: auto;
  flex: none;
  padding: 3px;
}
.point-list button {
  min-width: 44px;
  font-size: 13px;
}
.point-list [aria-pressed="true"] {
  background: #fff;
  color: #333;
}
.point-list__unmapped {
  font-size: 11px;
}
.source-note {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.5;
  border-left: 3px solid #aa91ce;
  padding-left: 10px;
}
.transcript {
  min-height: 0;
  height: 100%;
  padding: clamp(1rem, 2.5vw, 2rem);
  background: #f8f6f1;
  color: #252329;
  overflow-y: auto;
  overscroll-behavior: contain;
  box-sizing: border-box;
}
.transcript h4 {
  margin: 0 0 20px;
  color: inherit;
  font-size: 22px;
  font-weight: 500;
  line-height: 1.3;
}
.transcript .note-label {
  color: #69606d;
  margin-bottom: 12px;
}
.transcript__instruction {
  max-width: 38ch;
  margin-block: clamp(0px, 4vh, 40px);
}
.transcript__instruction p {
  font-size: 16px;
  line-height: 1.65;
}
.transcript__instruction .note-label {
  font-size: 11px;
}
.start-reading {
  margin-top: 12px;
  font-size: 14px;
}
.note + .note {
  border-top: 1px solid #d6d2ca;
  margin-top: 20px;
  padding-top: 20px;
}
.note__text {
  margin: 0;
  font-size: 16px;
  line-height: 1.7;
  white-space: pre-wrap;
}
.cabinet__source {
  flex: none;
  padding: 10px clamp(1rem, 3vw, 2.5rem);
  border-top: 1px solid #666;
  font-size: 11px;
  line-height: 1.5;
}
.reading-views {
  display: flex;
  flex: none;
  gap: 6px;
  margin-bottom: 10px;
}
.reading-views button {
  flex: 1;
  font-size: 13px;
}
.reading-views [aria-pressed="true"] {
  color: #333;
  background: #fff;
}
@media (max-width: 760px) {
  .cabinet__head {
    height: 68px;
    flex-basis: 68px;
    gap: 8px;
  }
  .cabinet__status {
    font-size: 11px;
    max-width: 44%;
  }
  .cabinet__eyebrow {
    font-size: 14px;
  }
  .back-button {
    flex: none;
    font-size: 13px;
  }
  .drawer {
    height: 100%;
    overflow-y: auto;
    padding-top: 0;
  }
  .drawer__instruction {
    font-size: 14px;
  }
  .folder {
    min-height: 60px;
    padding: 10px 16px;
  }
  .folder__action {
    display: none;
  }
  .casefile__title {
    align-self: flex-start;
    font-size: 18px;
    margin: 10px 0;
  }
  .casefile__spread {
    grid-template-columns: 1fr;
    padding-top: 10px;
  }
  .casefile__spread[data-mobile-view="map"] .transcript,
  .casefile__spread[data-mobile-view="notes"] .map-pane {
    display: none;
  }
  .point-list {
    max-height: 106px;
  }
  .cabinet__source {
    font-size: 10px;
    padding-block: 8px;
  }
}
</style>
