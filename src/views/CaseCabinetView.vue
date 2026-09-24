<script setup>
/*
 * CaseCabinetView — "Wilder Penfield and the Montreal Procedure"
 * (Figma Open-Brain-Chapters, node 3:1653, row 2 storyboard).
 *
 * A drawer of seven patient folders seen from above, tabs up. Choosing one:
 *   1. it lifts out of the drawer,
 *   2. rotates 90° clockwise into an upright portrait folder (tab now on the
 *      right edge) while narrowing to the upright size,
 *   3. its front cover swings open to the left: a paper-clipped photo of the
 *      brain on the inside of the cover, the case transcript on the paper.
 * Closing plays the same timeline backwards.
 *
 * ONE OUTLINE, NO ART SWAP. The travelling folder is the drawer folder's own
 * outline (helper/folderPath) re-drawn every frame from tweened numbers, so it
 * never changes identity mid-flight. At the upright pose that rotated outline
 * IS the open folder's back leaf; the paper and the front cover appear on top
 * of it in the same purple, which is why the hand-off cannot be seen.
 *
 * Everything is laid out in the Figma frame's own pixels (1729 × 993) on a
 * canvas scaled to fit; the title and the source line are real HTML outside
 * the canvas so they stay readable when the stage is small.
 *
 * Data comes from the mock seam `@/mocks/caseFiles` — swap for Supabase later.
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
import { useCaseFiles, CASE_SOURCE } from "@/mocks/caseFiles";
import { folderPath } from "@/helper/folderPath";
import { readSpeed } from "@/helper/debugFlags";
import { reducedMotionK } from "@/helper/motion";

// ── Geometry, in Figma frame pixels ─────────────────────────────────────────
const STAGE_W = 1729;
const STAGE_H = 993;
const RULE_Y = 927; // the line above the source caption; folders stop here
// Drawer bands measured off Figma frame 169:30: each tab starts where the
// folder in front of it is last visible, so a band is one tab high.
const DRAWER = { top: 140, step: 93, h: 690, tab: 93, r: 50 };
// Upright pose (storyboard frame 5), sized to Figma frame 171:3383: a
// portrait folder 781 tall from y=107, clear of the title, standing right of
// centre. `w` is its height once rotated, `h` its width (tab included).
const UPRIGHT = { cx: 1180, cy: 497, w: 780, h: 600, tab: 52, r: 12 };
// The open spread's centre is nudged onto the stage's centre line.
const SPREAD_SHIFT = STAGE_W / 2 - (UPRIGHT.cx - UPRIGHT.h / 2);
const CLIP_SRC = "/publicAssets/images/case-cabinet/paper-clip.png";

// The open folder's body (upright coordinates): the cover and paper sit here.
const BODY = {
  left: UPRIGHT.cx - UPRIGHT.h / 2,
  top: UPRIGHT.cy - UPRIGHT.w / 2,
  width: UPRIGHT.h - UPRIGHT.tab,
  height: UPRIGHT.w,
};

const cases = ref([]);
const openCase = ref(null);
const busy = ref(false);

const stageEl = ref(null);
const pullEl = ref(null);
const coverEl = ref(null);
const bookEl = ref(null);
const closeBtn = ref(null);

// The travelling folder, tweened directly by GSAP (reactive → re-drawn).
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

const drawerY = (i) => DRAWER.top + i * DRAWER.step;

function outline(c, w, h, tab, r) {
  return folderPath({
    w,
    h,
    a: c.tabSpan[0] * w,
    b: c.tabSpan[1] * w,
    tab,
    r,
  });
}

function tabStyle(c, w, tab) {
  const a = c.tabSpan[0] * w;
  const b = c.tabSpan[1] * w;
  return { left: `${a}px`, width: `${b - a}px`, "--t": `${tab}px` };
}

const drawerOutlines = computed(() =>
  cases.value.map((c) => outline(c, STAGE_W, DRAWER.h, DRAWER.tab, DRAWER.r))
);
const flyOutline = computed(() =>
  openCase.value ? outline(openCase.value, fly.w, fly.h, fly.tab, fly.r) : ""
);

// ── Fit the Figma canvas to the container ───────────────────────────────────
const scale = ref(1);
const offsetX = ref(0);
let ro = null;
function fit() {
  const el = stageEl.value;
  if (!el) return;
  const width = el.clientWidth;
  const byHeight =
    typeof window === "undefined"
      ? Infinity
      : (window.innerHeight * 0.92) / STAGE_H;
  scale.value = Math.min(width / STAGE_W, byHeight);
  offsetX.value = Math.max(0, (width - STAGE_W * scale.value) / 2);
}

// ── Timeline ────────────────────────────────────────────────────────────────
const K = reducedMotionK();
const SPEED =
  readSpeed(typeof window === "undefined" ? "" : window.location.search) * K;
let tl = null;

const { fetchCases } = useCaseFiles();

onMounted(async () => {
  cases.value = await fetchCases();
  await nextTick();
  fit();
  if (typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(fit);
    ro.observe(stageEl.value);
  }
  window.addEventListener("keydown", onKey);
});

onBeforeUnmount(() => {
  ro?.disconnect();
  tl?.kill();
  window.removeEventListener("keydown", onKey);
});

function onKey(e) {
  if (e.key === "Escape" && openCase.value) close();
}

async function open(c, i) {
  if (busy.value || openCase.value) return;
  busy.value = true;
  openCase.value = c;
  Object.assign(fly, {
    visible: 0,
    book: 0,
    x: 0,
    y: drawerY(i),
    w: STAGE_W,
    h: DRAWER.h,
    rot: 0,
    tab: DRAWER.tab,
    r: DRAWER.r,
  });
  await nextTick();

  gsap.set(pullEl.value, { x: 0 });
  gsap.set(coverEl.value, { rotationY: 0 });
  const markers = bookEl.value.querySelectorAll(".marker");
  const notes = bookEl.value.querySelectorAll(".note");
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
    onComplete: () => {
      busy.value = false;
      closeBtn.value?.focus();
    },
    onReverseComplete: () => {
      openCase.value = null;
      fly.visible = 0;
      fly.book = 0;
      busy.value = false;
    },
  });
  // Handle for scripts/filmstrip.mjs, which seeks the timeline to capture
  // frames. Dev builds only; no visible UI.
  if (import.meta.env.DEV) window.__cc = { tl, label: "open" };

  tl.set(fly, { visible: 1 })
    // 1) Lift it out of its slot, starting to turn.
    .to(fly, {
      y: fly.y - 150,
      rot: 12,
      duration: 0.4 * SPEED,
      ease: "power2.out",
    })
    // 2) Swing upright, narrowing to the portrait folder.
    .to(fly, { ...upright, duration: 0.95 * SPEED, ease: "power2.inOut" })
    // 3) The paper and the cover arrive under/over the upright outline.
    .set(fly, { book: 1 })
    // 4) The cover swings open to the left; the spread slides to centre.
    .to(coverEl.value, {
      rotationY: -180,
      duration: 0.9 * SPEED,
      ease: "power2.inOut",
    })
    .to(
      pullEl.value,
      { x: SPREAD_SHIFT, duration: 0.9 * SPEED, ease: "power2.inOut" },
      "<"
    );
  if (markers.length)
    tl.from(
      markers,
      {
        scale: 0,
        autoAlpha: 0,
        duration: 0.3 * SPEED,
        ease: "back.out(2)",
        stagger: 0.05 * SPEED,
      },
      "-=0.25"
    );
  if (notes.length)
    tl.from(
      notes,
      {
        y: 12,
        autoAlpha: 0,
        duration: 0.3 * SPEED,
        ease: "power2.out",
        stagger: 0.08 * SPEED,
      },
      "<"
    );
}

function close() {
  if (!openCase.value || !tl) return;
  // Also fine mid-open: reverse() runs it back from wherever it is.
  busy.value = true;
  if (import.meta.env.DEV) window.__cc = { tl, label: "close" };
  tl.timeScale(1.25).reverse();
}
</script>

<template>
  <section
    ref="stageEl"
    class="widget-root cabinet"
    aria-label="Case cabinet: Wilder Penfield and the Montreal Procedure"
  >
    <div class="frame" :style="{ height: `${(RULE_Y + 1) * scale}px` }">
      <div
        class="canvas"
        :style="{
          width: `${STAGE_W}px`,
          height: `${STAGE_H}px`,
          transform: `translateX(${offsetX}px) scale(${scale})`,
        }"
      >
        <!-- The drawer: back folder first, front folder last. Only the painted
           outline takes clicks, so a folder's empty corner never steals a
           click meant for the tab behind it. -->
        <div class="drawer" :style="{ height: `${RULE_Y}px` }">
          <button
            v-for="(c, i) in cases"
            :key="c.id"
            type="button"
            class="folder"
            :data-id="c.id"
            :class="{
              'folder--out': fly.visible && openCase && openCase.id === c.id,
            }"
            :style="{
              top: `${drawerY(i)}px`,
              width: `${STAGE_W}px`,
              height: `${DRAWER.h}px`,
              '--tint': c.tint,
            }"
            :aria-label="`Open case ${c.caseNo}, patient ${c.tab}`"
            :tabindex="openCase ? -1 : 0"
            @click="open(c, i)"
          >
            <svg
              class="folder__svg"
              :width="STAGE_W"
              :height="DRAWER.h"
              aria-hidden="true"
            >
              <path :d="drawerOutlines[i]" />
            </svg>
            <span class="tab" :style="tabStyle(c, STAGE_W, DRAWER.tab)">
              <span class="tab__no">{{ c.caseNo }}</span>
              <span class="tab__initials">{{ c.tab }}</span>
            </span>
          </button>
        </div>

        <!-- Click-away layer while a file is out. -->
        <div v-if="openCase" class="scrim" @click="close"></div>

        <!-- The pulled file. Clipped at the rule, so it rises out of the drawer
           rather than appearing over the source line. -->
        <div
          v-if="openCase"
          ref="pullEl"
          class="pull"
          :style="{ '--tint': openCase.tint }"
        >
          <div
            v-show="fly.visible"
            class="flyer"
            :style="{
              left: `${fly.x}px`,
              top: `${fly.y}px`,
              width: `${fly.w}px`,
              height: `${fly.h}px`,
              transform: `rotate(${fly.rot}deg)`,
            }"
          >
            <svg
              class="folder__svg"
              :width="fly.w"
              :height="fly.h"
              aria-hidden="true"
            >
              <path :d="flyOutline" />
            </svg>
            <span class="tab" :style="tabStyle(openCase, fly.w, fly.tab)">
              <span class="tab__no">{{ openCase.caseNo }}</span>
              <span class="tab__initials">{{ openCase.tab }}</span>
            </span>
          </div>

          <div
            ref="bookEl"
            class="book"
            :class="{ 'book--shown': fly.book }"
            :style="{
              left: `${BODY.left}px`,
              top: `${BODY.top}px`,
              width: `${BODY.width}px`,
              height: `${BODY.height}px`,
            }"
            role="dialog"
            :aria-label="`Case ${openCase.caseNo}, patient ${openCase.tab}`"
          >
            <!-- The back leaf's paper: the transcript. -->
            <div class="paper">
              <p class="paper__head">
                <span class="paper__case"
                  >Case {{ openCase.caseNo }} · {{ openCase.tab }}</span
                >
                <span v-if="openCase.point" class="paper__point">{{
                  openCase.point
                }}</span>
              </p>
              <div v-if="openCase.notes.length" class="transcript">
                <div
                  v-for="(note, ni) in openCase.notes"
                  :key="ni"
                  class="note"
                  :class="{ 'note--caption': !note.text }"
                >
                  <span v-if="note.speaker" class="note__speaker">{{
                    note.speaker
                  }}</span>
                  <p v-if="note.text" class="note__text">{{ note.text }}</p>
                  <p v-if="note.caption" class="note__caption">
                    {{ note.caption }}
                  </p>
                </div>
              </div>
              <p v-else class="paper__pending">
                Case notes from Penfield &amp; Perot (1963) to come.
              </p>
            </div>

            <!-- The front cover, hinged on its left edge. Outside face = the
               folder; inside face = the paper-clipped photo of the brain. -->
            <div ref="coverEl" class="cover">
              <div class="cover__face cover__face--out"></div>
              <div class="cover__face cover__face--in">
                <div class="photo">
                  <div class="photo__art">
                    <img
                      v-if="openCase.illustration"
                      :src="openCase.illustration"
                      alt="Brain illustration with the stimulated points numbered"
                    />
                    <svg
                      v-else
                      viewBox="0 0 320 240"
                      class="photo__placeholder"
                      aria-hidden="true"
                    >
                      <path
                        d="M52 132 q-26 -72 58 -98 q38 -18 86 0 q58 5 68 54 q28 28 -4 58 q4 36 -42 40 q-28 22 -66 4 q-48 14 -72 -18 q-38 -22 -28 -40 z"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                      />
                      <path
                        d="M84 82 q28 22 10 50 M138 64 q10 36 -10 64 M196 72 q18 32 0 64 M108 136 q38 14 76 0"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.5"
                        opacity="0.5"
                      />
                    </svg>
                    <span
                      v-for="rg in openCase.regions"
                      :key="rg.n"
                      class="marker"
                      :style="{ left: `${rg.x}%`, top: `${rg.y}%` }"
                      >{{ rg.n }}</span
                    >
                  </div>
                </div>
                <img class="clip" :src="CLIP_SRC" alt="" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>

        <div class="rule" :style="{ top: `${RULE_Y}px` }"></div>
      </div>
      <p class="cabinet__title">Wilder Penfield and the Montreal Procedure</p>
    </div>

    <div class="cabinet__foot">
      <p class="cabinet__source">{{ CASE_SOURCE }}</p>
      <button
        v-if="openCase"
        ref="closeBtn"
        type="button"
        class="flyer__close"
        aria-label="Close the file"
        @click="close"
      >
        Close file ✕
      </button>
    </div>
  </section>
</template>

<style scoped>
/* The stage is the Figma frame's own dark surface (#333), not a theme token:
   the widget reads the same in light and dark mode, like a figure. */
.cabinet {
  --cc-stage: #333;
  position: relative;
  width: 100%;
  overflow: hidden;
  background: var(--cc-stage);
  color: #fff;
}
.frame {
  position: relative;
  overflow: hidden;
}
.canvas {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
}

.cabinet__title {
  position: absolute;
  left: 3.4%;
  right: 3.4%;
  margin: 0;
  color: #fff;
  pointer-events: none;
  top: 4.8%;
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: clamp(0.75rem, 1.05vw, 1.125rem);
  letter-spacing: 0.01em;
}
.cabinet__foot {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 3.4% 0.9rem;
}
.cabinet__source {
  flex: 1;
  margin: 0;
  font-family: var(--font-ui, var(--font-body));
  font-style: italic;
  font-weight: 600;
  font-size: clamp(0.625rem, 0.75vw, 0.8125rem);
  line-height: 1.4;
}

/* ── the drawer ─────────────────────────────────────────────────────────── */
.drawer {
  position: absolute;
  inset: 0 0 auto 0;
  overflow: hidden;
}
.rule {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: rgb(255 255 255 / 0.7);
}
.folder {
  position: absolute;
  left: 0;
  padding: 0;
  border: 0;
  background: none;
  color: #fff;
  cursor: pointer;
  pointer-events: none; /* only the painted outline is a target */
  transition: transform 0.25s ease;
}
.folder__svg {
  position: absolute;
  inset: 0;
  overflow: visible;
  filter: drop-shadow(0 -6px 10px rgb(0 0 0 / 0.28));
}
.folder__svg path {
  fill: var(--tint);
  pointer-events: visiblePainted;
}
.folder:hover,
.folder:focus-visible {
  transform: translateY(-12px);
}
.folder:focus-visible {
  outline: none;
}
.folder:focus-visible .tab__initials {
  text-decoration: underline;
  text-underline-offset: 0.2em;
}
.folder--out {
  visibility: hidden;
}

/* The tab label: case number in a ring, initials set wide on the right. It is
   laid along the outline's tab and sized from the tab height (--t), so it
   shrinks with the tab as the folder stands up. */
.tab {
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
.tab__no {
  flex: none;
  display: grid;
  place-items: center;
  width: calc(var(--t) * 0.52);
  height: calc(var(--t) * 0.52);
  border: 1.5px solid rgb(255 255 255 / 0.9);
  border-radius: 50%;
  font-size: calc(var(--t) * 0.25);
  letter-spacing: -0.04em;
}
.tab__initials {
  font-size: calc(var(--t) * 0.38);
  letter-spacing: 0.12em;
  white-space: nowrap;
}

/* ── the pulled file ────────────────────────────────────────────────────── */
.scrim {
  position: absolute;
  inset: 0;
  z-index: 5;
  cursor: pointer;
}
.pull {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
  /* Rises out of the drawer: nothing of it shows below the rule. */
  clip-path: inset(-400px -400px 66px -400px);
}
.flyer {
  position: absolute;
  transform-origin: 50% 50%;
}
.flyer .folder__svg {
  filter: drop-shadow(0 10px 18px rgb(0 0 0 / 0.35));
}
.flyer .folder__svg path {
  pointer-events: none;
}

.book {
  position: absolute;
  perspective: 2600px;
  visibility: hidden;
  pointer-events: auto;
}
.book--shown {
  visibility: visible;
}
.paper {
  position: absolute;
  inset: 22px 22px 22px 22px;
  background: #fff;
  color: #1a1a1a;
  box-shadow: 0 3px 3px rgb(0 0 0 / 0.1);
  padding: 44px 40px;
  box-sizing: border-box;
  overflow-y: auto;
}
.paper__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 28px;
  font-family: var(--font-mono);
  font-size: 18px;
  color: rgb(0 0 0 / 0.55);
}
.paper__point {
  display: inline-block;
  background: var(--tint);
  color: #fff;
  padding: 4px 10px;
  font-size: 20px;
}
.paper__pending {
  font-family: var(--font-mono);
  font-size: 18px;
  color: rgb(0 0 0 / 0.5);
}
.transcript {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 22px;
  background: #f2f2f2;
}
.note {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-left: 62px;
  position: relative;
}
.note__speaker {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid var(--tint);
  color: var(--tint);
  background: #fff;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
}
.note__text {
  margin: 0;
  padding: 12px 16px;
  background: #fff;
  font-size: 20px;
  line-height: 1.35;
}
.note--caption {
  justify-content: flex-end;
}
.note__caption {
  margin: 0;
  max-width: 34ch;
  text-align: right;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.5;
  color: rgb(0 0 0 / 0.65);
}

/* The front cover, hinged on the spine (its left edge). */
.cover {
  position: absolute;
  inset: 0;
  transform-origin: 0 50%;
  transform-style: preserve-3d;
}
.cover__face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  background: var(--tint);
}
.cover__face--out {
  box-shadow: 0 3px 3px rgb(0 0 0 / 0.1);
}
.cover__face--in {
  transform: rotateY(180deg);
  filter: brightness(0.97);
}
.photo {
  position: absolute;
  left: 9%;
  top: 8%;
  width: 80%;
  aspect-ratio: 1.2;
  background: #fff;
  transform: rotate(-6deg);
  box-shadow: 0 4px 10px rgb(0 0 0 / 0.18);
  padding: 7%;
  box-sizing: border-box;
}
.photo__art {
  position: relative;
  width: 100%;
  height: 100%;
  color: #1a1a1a;
}
.photo__art img,
.photo__placeholder {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.clip {
  position: absolute;
  left: 58%;
  top: 2.5%;
  width: 120px;
  transform: rotate(-6deg);
  pointer-events: none;
}
.marker {
  position: absolute;
  transform: translate(-50%, -50%);
  background: var(--tint);
  color: #fff;
  font-family: var(--font-mono);
  font-size: 18px;
  line-height: 1;
  padding: 5px 7px;
  min-width: 34px;
  text-align: center;
}

.flyer__close {
  flex: none;
  padding: 0.45em 0.9em;
  border: 1px solid rgb(255 255 255 / 0.6);
  border-radius: 999px;
  background: rgb(0 0 0 / 0.35);
  color: #fff;
  font-family: var(--font-mono);
  font-size: clamp(0.6875rem, 0.8vw, 0.875rem);
  cursor: pointer;
}
.flyer__close:hover,
.flyer__close:focus-visible {
  background: rgb(0 0 0 / 0.6);
  outline: none;
  border-color: #fff;
}
</style>
