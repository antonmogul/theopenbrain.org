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
  reactive,
  ref,
} from "vue";
import gsap from "gsap";
import { CASE_SOURCE, useCaseFiles } from "@/mocks/caseFiles";
import { folderPath } from "@/helper/folderPath";
import { readSpeed } from "@/helper/debugFlags";
import { reducedMotionK } from "@/helper/motion";

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
const fly = reactive({
  visible: 0,
  book: 0,
  x: 0,
  y: 0,
  w: STAGE_W,
  h: DRAWER.h,
  rot: 0,
  tab: DRAWER.tab,
  r: DRAWER.r,
});
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
const flyOutline = computed(() =>
  openCase.value ? outline(openCase.value, fly.w, fly.h, fly.tab, fly.r) : ""
);
function fit() {
  const w = bodyEl.value?.clientWidth || window.innerWidth;
  const h = bodyEl.value?.clientHeight || window.innerHeight * 0.76;
  scale.value = Math.min(w / STAGE_W, h / STAGE_H);
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
  if (!desktop.value || reducedMotionK() < 1) {
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
  const result = await fetchCases();
  if (disposed) return;
  cases.value = result;
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
  motionObserver?.disconnect();
  desktopQuery?.removeEventListener?.("change", layoutChanged);
  motionQuery?.removeEventListener?.("change", layoutChanged);
  tl?.kill();
  if (import.meta.env.DEV && window.__cc?.tl === tl) delete window.__cc;
});

async function open(c) {
  if (disposed) return;
  if (openCase.value) {
    if (openCase.value.id === c.id && phase.value !== "closing") return;
    queuedCase = c;
    if (phase.value !== "closing") close({ keepQueue: true });
    return;
  }
  const token = ++generation;
  openCase.value = c;
  mapZoom.value = 100;
  selectedPoint.value = null;
  phase.value = "opening";
  animationMode.value =
    desktop.value && reducedMotionK() === 1 ? "storyboard" : "immediate";
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
  });
  await nextTick();
  if (disposed || token !== generation || phase.value !== "opening") return;
  closeButton.value?.focus();
  if (animationMode.value === "immediate") {
    opened();
    return;
  }
  fit();
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
  });
  tl.set(fly, { visible: 1 })
    .to(fly, {
      y: fly.y - 150,
      rot: 12,
      duration: 0.4 * speed,
      ease: "power2.out",
    })
    .to(fly, { ...upright, duration: 0.95 * speed, ease: "power2.inOut" })
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
  phase.value = "closing";
  if (!desktop.value || reducedMotionK() < 1) {
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
  await nextTick();
  if (transcriptEl.value) transcriptEl.value.scrollTop = 0;
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
      <h2>Wilder Penfield and the Montreal Procedure</h2>
      <button
        v-if="openCase"
        type="button"
        class="back-button"
        ref="closeButton"
        @click="close()"
      >
        Back to cases
      </button>
    </header>

    <div
      ref="bodyEl"
      class="cabinet-body"
      :class="{ 'cabinet-body--desktop': desktop }"
    >
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
                'story-folder--out': openCase?.id === c.id && fly.visible,
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
              v-show="fly.visible"
              class="story-flyer"
              :style="{
                left: `${fly.x}px`,
                top: `${fly.y}px`,
                width: `${fly.w}px`,
                height: `${fly.h}px`,
                transform: `rotate(${fly.rot}deg)`,
              }"
            >
              <svg class="story-folder__svg" :width="fly.w" :height="fly.h">
                <path :d="flyOutline" />
              </svg>
              <span
                class="story-tab"
                :style="tabStyle(openCase, fly.w, fly.tab)"
                ><span class="story-tab__number">{{ openCase.caseNo }}</span
                ><span class="story-tab__initials">{{
                  openCase.tab
                }}</span></span
              >
            </div>
            <div
              v-show="fly.book"
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
        <h3 ref="fileHeading" class="casefile__title" tabindex="-1">
          Case {{ openCase.caseNo }} · {{ openCase.tab }}
        </h3>
        <div class="casefile__spread">
          <div class="map-pane">
            <figure class="brain-map">
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
              </div>
              <div
                class="map-scroll"
                tabindex="0"
                aria-label="Brain map; enlarge for closely spaced labels"
              >
                <div
                  class="brain-map__image"
                  :style="{
                    aspectRatio: `${openCase.image.width} / ${openCase.image.height}`,
                    width: `${mapZoom}%`,
                  }"
                >
                  <img
                    :src="openCase.illustration"
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
            <p v-else class="transcript__instruction">
              Select a numbered stimulation point to read the patient’s reports
              and Penfield’s annotations
            </p>
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
}
.cabinet-body--desktop {
  min-height: min(760px, 76vh);
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
  transition: transform 0.2s;
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
  transform: translateY(-12px);
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
}
.story-flyer .story-folder__svg {
  filter: drop-shadow(0 10px 18px rgb(0 0 0 / 0.35));
}
.story-flyer .story-folder__svg path {
  pointer-events: none;
}
.story-book {
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
.casefile--desktop {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: var(--cc-stage);
}
.casefile--desktop .casefile__spread {
  background: var(--tint);
  padding: clamp(0.75rem, 2vw, 1.5rem);
  border-radius: 0.4rem;
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.25);
}
.casefile--desktop .map-pane {
  position: relative;
}
.casefile--desktop .map-pane::before {
  content: "";
  position: absolute;
  top: -1.5rem;
  left: 55%;
  width: 50px;
  height: 70px;
  background: url("/publicAssets/images/case-cabinet/paper-clip.png") center /
    contain no-repeat;
  pointer-events: none;
  z-index: 1;
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
  min-height: var(--widget-min-h, 100dvh);
  width: 100%;
  background: var(--cc-stage);
  color: #fff;
  font-family: var(--font-ui, var(--font-body));
  box-sizing: border-box;
}
.cabinet__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem clamp(1rem, 3vw, 2.5rem);
}
.cabinet__head h2 {
  margin: 0;
  font-size: clamp(1.05rem, 2vw, 1.5rem);
  color: inherit;
}
.back-button,
.case-tabs button,
.point-list button {
  border: 1px solid currentColor;
  border-radius: 0.35rem;
  padding: 0.6rem 0.75rem;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
button:focus-visible {
  outline: 3px solid #f5dc80;
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
.casefile * {
  /* The global reduced-motion rule implicitly transitions every property,
     including inherited visibility on each child. Keep this whole subtree
     immediately focusable when GSAP reveals it. */
  transition-property: none;
}
.casefile {
  /* GSAP owns inline visibility throughout the handoff. Keeping the initial
     state in CSS prevents Vue style patches from hiding the opened file. */
  opacity: 0;
  visibility: hidden;
  flex: 1;
  min-width: 0;
  padding: 0 clamp(1rem, 3vw, 2.5rem) 1.5rem;
}
.case-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.case-tabs button {
  font-size: 0.8rem;
}
.case-tabs [aria-pressed="true"] {
  background: #fff;
  color: #333;
}
.casefile__title {
  font-size: 1.25rem;
  color: inherit;
}
.casefile__spread {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: clamp(1rem, 3vw, 2rem);
  align-items: start;
}
.map-pane {
  min-width: 0;
}
.brain-map {
  margin: 0;
  padding: 1rem;
  background: #fff;
  color: #222;
  border-radius: 0.2rem;
}
.brain-map__image {
  position: relative;
  width: 100%;
}
.brain-map img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.brain-map figcaption {
  margin-top: 0.75rem;
  font-size: 0.75rem;
  line-height: 1.4;
}
.marker {
  position: absolute;
  transform: translate(-50%, -50%);
  display: grid;
  place-items: center;
  width: 0.85rem;
  height: 0.85rem;
  border: 1px solid var(--tint);
  border-radius: 50%;
  background: transparent;
  color: #312149;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
}
.marker span {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
.map-zoom {
  display: flex;
  align-items: center;
  justify-content: end;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.75rem;
}
.map-zoom button {
  width: 2rem;
  height: 2rem;
  background: #f4f0fa;
  color: #342348;
  border: 1px solid #8e78aa;
  border-radius: 0.25rem;
  cursor: pointer;
}
.map-zoom button[aria-disabled="true"] {
  opacity: 0.4;
  cursor: default;
}
.map-scroll {
  overflow: auto;
  max-height: 62dvh;
}
.marker:hover,
.marker--selected {
  background: var(--tint);
  color: #fff;
  box-shadow: 0 0 0 3px #fff;
}
.map-help {
  font-size: 0.85rem;
  line-height: 1.5;
}
.point-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}
.point-list button {
  min-width: 2.5rem;
}
.point-list [aria-pressed="true"] {
  background: #fff;
  color: #333;
}
.point-list__unmapped {
  font-size: 0.7rem;
}
.source-note {
  font-size: 0.8rem;
  line-height: 1.5;
  border-left: 3px solid #aa91ce;
  padding-left: 0.75rem;
}
.transcript {
  padding: clamp(1rem, 3vw, 2rem);
  background: #f8f6f1;
  color: #252329;
  border-radius: 0.2rem;
  max-height: 72dvh;
  overflow-y: auto;
  overscroll-behavior: contain;
  box-sizing: border-box;
}
.transcript h4 {
  margin: 0 0 1.5rem;
  color: #252329;
  font-size: 1.1rem;
}
.transcript__instruction {
  line-height: 1.6;
}
.note + .note {
  border-top: 1px solid #d6d2ca;
  margin-top: 1.25rem;
  padding-top: 1.25rem;
}
.note__text {
  margin: 0;
  font-size: 1rem;
  line-height: 1.7;
  white-space: pre-wrap;
}
.cabinet__source {
  padding: 1rem clamp(1rem, 3vw, 2.5rem);
  border-top: 1px solid rgb(255 255 255 / 0.2);
  font-size: 0.75rem;
  line-height: 1.5;
}
@media (max-width: 760px) {
  .cabinet__head {
    align-items: start;
  }
  .back-button {
    flex: none;
    font-size: 0.8rem;
  }
  .casefile__spread {
    grid-template-columns: 1fr;
  }
  .transcript {
    max-height: 65dvh;
  }
  .folder__action {
    display: none;
  }
  .marker {
    width: 0.75rem;
    height: 0.75rem;
  }
}
</style>
