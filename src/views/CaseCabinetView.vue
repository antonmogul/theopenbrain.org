<script setup>
/*
 * CaseCabinetView — "The Case Cabinet" prototype (demo).
 *
 * A drawer of patient-case folders. Clicking one makes a single purple element
 * grow out of that exact folder's slot, tilt upright, and unfold into a two-leaf
 * spread (brain + numbered regions | case transcript). Close reverses it.
 *
 * MORPH MODEL — one dedicated "flyer" element, animated with plain GSAP tweens.
 * We deliberately do NOT reparent or Flip a v-for node (that corrupts Vue's
 * virtual DOM and fights the scoped-CSS cascade). Instead:
 *   • The stack folders are static list items.
 *   • On click we read the clicked folder's screen rect, seed the flyer to that
 *     exact rect (position:fixed), then tween width/height/top/left/rotation to
 *     the centered open size. The flyer's content cross-lives inside it, so the
 *     same visible object grows and unfolds — no hand-off between two elements.
 *
 * Data comes from the mock seam `@/mocks/caseFiles` — swap for Supabase later.
 * Unlisted route (like /styleguide): open /cabinet directly.
 */
import { ref, onMounted, nextTick } from "vue";
import gsap from "gsap";
import { useCaseFiles } from "@/mocks/caseFiles";

const cases = ref([]);
const openCase = ref(null); // the case object being shown, or null
const animating = ref(false);

/*
 * ── Timeline scrubber (dev tool) ──────────────────────────────────────────
 * Holds the live open/close timeline so the on-screen scrubber can pause it and
 * step through frame by frame. Purely a tuning aid — `DEBUG_TIMELINE` gates the
 * whole panel, so flipping it to false ships the animation with no UI.
 */
const DEBUG_TIMELINE = true;
const activeTl = ref(null); // the GSAP timeline currently on screen
const scrubValue = ref(0); // 0–1 progress, two-way bound to the range input
const scrubbing = ref(false); // true once the user grabs the slider (pauses tl)
const tlLabel = ref(""); // which sequence is loaded (open / close)

// Named beats, so the scrubber can jump straight to a moment worth inspecting.
const TL_MARKERS = [
  { at: 0, name: "in drawer" },
  { at: 0.25, name: "rising" },
  { at: 0.45, name: "upright" },
  { at: 0.7, name: "opening" },
  { at: 1, name: "open" },
];

// Mirror the timeline's own progress into the slider while it plays freely.
function trackTimeline(tl, label) {
  if (!DEBUG_TIMELINE) return tl;
  activeTl.value = tl;
  tlLabel.value = label;
  scrubbing.value = false;
  tl.eventCallback("onUpdate", () => {
    if (!scrubbing.value) scrubValue.value = tl.progress();
  });
  return tl;
}

function onScrub(e) {
  const p = Number(e.target.value);
  scrubValue.value = p;
  const tl = activeTl.value;
  if (!tl) return;
  scrubbing.value = true;
  tl.pause();
  tl.progress(p);
}

function scrubTo(p) {
  const tl = activeTl.value;
  if (!tl) return;
  scrubbing.value = true;
  scrubValue.value = p;
  tl.pause();
  tl.progress(p);
}

// Nudge by a single frame-ish step, for pinning down an exact moment.
function stepScrub(delta) {
  scrubTo(Math.min(1, Math.max(0, scrubValue.value + delta)));
}

function resumeTimeline() {
  const tl = activeTl.value;
  if (!tl) return;
  scrubbing.value = false;
  tl.play();
}
const stackEls = ref([]); // stack folder nodes (for entrance + rect capture)
const flyerEl = ref(null); // the 3D stage (positioned/scaled onto the folder slot)
const bookEl = ref(null); // preserve-3d book; rotates portrait→upright
const rightLeafEl = ref(null); // hinged cover that swings open

const { fetchCases } = useCaseFiles();

onMounted(async () => {
  cases.value = await fetchCases();
  await nextTick();
  // Opacity-only entrance so it doesn't overwrite the CSS stacking transform.
  gsap.from(stackEls.value, {
    opacity: 0,
    duration: 0.5,
    ease: "power3.out",
    stagger: 0.08,
  });
});

function setStackRef(el, i) {
  if (el) stackEls.value[i] = el;
}

/*
 * Compute the transform that makes the fixed, full-size flyer *look like* the
 * small folder sitting in its stack slot. The flyer's layout box is always the
 * open size (960×640, centered). We translate+scale it down onto the folder's
 * on-screen rect; animating that transform back to identity is the morph.
 * Transforms don't trigger layout and don't collide with Vue's reactive :style,
 * which is why this is reliable where animating width/top was not.
 */
/*
 * Seed the flyer so it starts as the FRONT FOLDER lying flat in the drawer, then
 * (in phase 1) it pivots up — rotating clockwise toward upright while shrinking —
 * like lifting a file out of the stack. To read as the landscape drawer folder,
 * the portrait leaf is seeded rotated -90° and scaled so its (rotated) width
 * spans the folder width; the pivot origin is the folder's bottom-left corner so
 * it swings up-and-right from where it sits. Phase 1 tweens rotation -90→0 (i.e.
 * clockwise to upright portrait) + scale down + move to center.
 */
function drawerSeed(flyer, r) {
  const s = leafSize(flyer);
  /*
   * The file is a rigid object: it ROTATES out of the drawer, it does not
   * deform. So the seed uses a single UNIFORM scale plus a -90° rotation —
   * never scaleX ≠ scaleY. (Matching the folder's box on both axes would mean
   * scaling x1.92 by one axis and x0.47 by the other: the folder is aspect
   * ~3.07, the leaf ~0.75. That stretch is what reads as "morphing" rather
   * than rotating, and it distorts the tab and everything else inside.)
   *
   * Lying on its side (-90°) the portrait leaf presents its HEIGHT horizontally
   * and its WIDTH vertically. We match the leaf's width to the folder's height,
   * so the file spans the drawer slot's thickness and keeps its proportions.
   * The overhang past the folder's width is correct: a portrait file really is
   * longer than the drawer front it sits behind.
   *
   * Origin is "left top" to match the flyer's top-left anchor at viewport
   * centre; rotating about that corner swings the body up-and-right out of the
   * slot, so the pivot reads as lifting the file rather than sliding it.
   */
  // Lying at -90° the leaf's HEIGHT runs horizontally, so match that to the
  // folder's width — the file spans the drawer front, and its (portrait) width
  // becomes the visible depth, overhanging the slot as a real file would.
  const scale = r.width / s.h;
  // Rotating -90° about the top-left corner puts the box ABOVE that corner, so
  // drop the anchor by the rotated height (s.w * scale) to land it in the slot.
  return {
    x: r.left - window.innerWidth / 2,
    y: r.top - window.innerHeight / 2 + s.w * scale,
    scaleX: scale,
    scaleY: scale,
    rotation: -90,
    transformOrigin: "left top",
  };
}

// Global slow-mo multiplier while we tune the motion. Set to 1 to ship.
const SPEED = 3;

// Leaf layout size — read from offsetWidth/Height, which are TRANSFORM-INDEPENDENT
// (getBoundingClientRect is not, so it gives wrong numbers mid-animation).
function leafSize(flyer) {
  return { w: flyer.offsetWidth, h: flyer.offsetHeight };
}
// The flyer (one leaf) is anchored top-left at viewport center, and every tween
// uses transformOrigin "left top" (see drawerSeed), so centring means shifting
// the top-left corner back by half the leaf's size.
function portraitCenter(flyer) {
  const s = leafSize(flyer);
  return { x: -s.w / 2, y: -s.h / 2 };
}
// Open book, centered as two leaves straddling the spine at viewport center:
// left leaf shifts a full width left; vertically centered.
function openCenter(flyer) {
  const s = leafSize(flyer);
  return { x: -s.w, y: -s.h / 2 };
}

/*
 * The flyer's layout box is ONE portrait leaf. It mounts hidden; we seed it onto
 * the clicked folder's slot BEFORE revealing, so there is no center-flash. Then:
 * rise to upright portrait → shift to centered → swing the cover open.
 */
async function open(c, evt) {
  if (!c.openable || openCase.value || animating.value) return;
  animating.value = true;

  const r = evt.currentTarget.getBoundingClientRect(); // folder's slot rect
  openCase.value = c;
  await nextTick();
  const flyer = flyerEl.value;
  const right = rightLeafEl.value;

  // Seed into the drawer (behind the front files) while still hidden → first
  // visible frame is the file tucked in the drawer, ready to rise up and out.
  const start = drawerSeed(flyer, r);
  gsap.set(flyer, start); // rotation is part of the seed (-90, landscape)
  gsap.set(right, { rotationY: -180 }); // right cover folded shut over the file
  gsap.set(flyer.querySelector(".flyer__close"), { autoAlpha: 0 });
  gsap.set(flyer, { autoAlpha: 1 }); // reveal only after the seed transform is set

  const tl = trackTimeline(
    gsap.timeline({
      onComplete: () => (animating.value = false),
    }),
    "open"
  );

  // 1) Rise + rotate to an upright CLOSED portrait, centered as a single leaf.
  const pc = portraitCenter(flyer);
  tl.to(flyer, {
    x: pc.x,
    y: pc.y,
    scaleX: 1,
    scaleY: 1,
    // -90 → 0: the file swings upright, rotating rather than stretching.
    rotation: 0,
    // Must match the seed's origin, or GSAP re-resolves it mid-tween and the
    // box jumps off the folder it just grew out of.
    transformOrigin: "left top",
    duration: 0.6 * SPEED,
    ease: "power3.inOut",
    force3D: true,
  })
    // 2) Shift to the open-book center as the right cover swings open.
    .to(flyer, { x: openCenter(flyer).x, duration: 0.7 * SPEED, ease: "power2.inOut" }, ">")
    .to(right, { rotationY: 0, duration: 0.7 * SPEED, ease: "power2.inOut" }, "<")
    // 3) Reveal the file + notes as it finishes opening.
    .to(flyer.querySelector(".flyer__close"), { autoAlpha: 1, duration: 0.2 * SPEED }, "-=" + 0.2 * SPEED)
    .from(
      flyer.querySelectorAll(".region-marker"),
      { scale: 0, autoAlpha: 0, duration: 0.3 * SPEED, ease: "back.out(2)", stagger: 0.04 * SPEED },
      "-=" + 0.3 * SPEED
    )
    .from(
      flyer.querySelectorAll(".note"),
      { x: 20, autoAlpha: 0, duration: 0.3 * SPEED, ease: "power2.out", stagger: 0.07 * SPEED },
      "-=" + 0.3 * SPEED
    );
}

async function close() {
  if (!openCase.value || animating.value) return;
  animating.value = true;
  const flyer = flyerEl.value;
  const right = rightLeafEl.value;
  const idx = cases.value.indexOf(openCase.value);
  const r = stackEls.value[idx]?.getBoundingClientRect();
  const pc = portraitCenter(flyer);
  const seed = r ? drawerSeed(flyer, r) : { scaleX: 0.9, scaleY: 0.9 };

  const tl = trackTimeline(
    gsap.timeline({
      onComplete: () => {
        openCase.value = null;
        animating.value = false;
      },
    }),
    "close"
  );
  // Reverse the open: swing cover shut (returning to portrait center) → sink back
  // down into the drawer slot behind the front files.
  tl.to(flyer.querySelector(".flyer__close"), { autoAlpha: 0, duration: 0.15 * SPEED })
    .to(right, { rotationY: -180, duration: 0.5 * SPEED, ease: "power2.inOut" }, "<")
    .to(flyer, { x: pc.x, duration: 0.5 * SPEED, ease: "power2.inOut" }, "<")
    .to(flyer, { ...seed, rotation: 10, duration: 0.5 * SPEED, ease: "power3.inOut" })
    .to(flyer, { autoAlpha: 0, duration: 0.15 * SPEED }, "-=0.1");
}
</script>

<template>
  <div class="cabinet">
    <header class="cabinet__head">
      <h1 class="t-h2">Case Cabinet</h1>
      <p class="t-body cabinet__sub">Select a patient file to review the case.</p>
    </header>

    <!-- Backdrop + flyer are Teleported to <body> so they escape any ancestor
         `filter`/`transform` containing block (the route transition on .cabinet
         uses filter:blur, which would otherwise trap position:fixed). -->
    <Teleport to="body">
      <transition name="veil">
        <div v-if="openCase" class="veil" @click="close"></div>
      </transition>
    </Teleport>

    <!-- Dev-only scrubber: pause the morph and step through it frame by frame.
         Teleported so it sits above the veil/flyer. Gate off via DEBUG_TIMELINE. -->
    <Teleport to="body">
      <div v-if="DEBUG_TIMELINE && activeTl" class="scrubber">
        <div class="scrubber__row">
          <span class="scrubber__tag">{{ tlLabel }}</span>
          <span class="scrubber__pct">{{ Math.round(scrubValue * 100) }}%</span>
          <button class="scrubber__btn" @click="stepScrub(-0.02)">◀</button>
          <button class="scrubber__btn" @click="stepScrub(0.02)">▶</button>
          <button class="scrubber__btn" @click="resumeTimeline">play</button>
        </div>
        <input
          class="scrubber__range"
          type="range"
          min="0"
          max="1"
          step="0.005"
          :value="scrubValue"
          @input="onScrub"
        />
        <div class="scrubber__row scrubber__marks">
          <button
            v-for="m in TL_MARKERS"
            :key="m.name"
            class="scrubber__mark"
            @click="scrubTo(m.at)"
          >
            {{ m.name }}
          </button>
        </div>
      </div>
    </Teleport>

    <!-- The closed drawer: hanging files seen front-on. Index 0 (R.W.) is the
         FRONT folder (bottom, most visible); later folders sit behind and peek
         up. Tabs are staggered horizontally via each case's tabX. -->
    <div class="stack" :class="{ 'stack--dimmed': openCase }">
      <button
        v-for="(c, i) in cases"
        :key="c.id"
        :ref="(el) => setStackRef(el, i)"
        class="folder"
        :class="{ 'folder--locked': !c.openable, 'folder--hidden': openCase && openCase.id === c.id }"
        :style="{
          '--tint': c.tint,
          '--tab-x': c.tabX + '%',
          '--depth': i,
          zIndex: cases.length - i,
        }"
        @click="open(c, $event)"
      >
        <span class="folder__tab">{{ c.tab }}</span>
        <span class="folder__title">{{ c.title }}</span>
        <span v-if="!c.openable" class="folder__lock">soon</span>
      </button>
    </div>

    <!-- THE morphing element — a 3D book.
         `.book` is the spine-centered 3D stage. `.cover` (left half) is always
         visible = the closed portrait folder you see rising. `.leaf--right` is
         hinged at the spine and starts folded shut over the cover (rotateY -180),
         then swings open to reveal the two-leaf landscape spread. -->
    <Teleport to="body">
      <div v-if="openCase" ref="flyerEl" class="flyer" :style="{ '--tint': openCase.tint }">
        <button class="flyer__close" @click="close">✕</button>
        <div ref="bookEl" class="book">
          <!-- LEFT half: the cover (front) + the file inside (revealed on open).
               This leaf never moves, so the tab lives here — pinned to its LEFT
               (outer) edge, the far side from the spine. -->
          <div class="leaf leaf--left">
            <span class="folder__tab folder__tab--side">{{ openCase.tab }}</span>
            <!-- the file: brain illustration + regions -->
            <div class="illus">
              <img
                v-if="openCase.illustration"
                :src="openCase.illustration"
                alt="Brain illustration"
                class="illus__img"
              />
              <svg v-else viewBox="0 0 320 260" class="illus__svg" aria-hidden="true">
                <path
                  d="M60 150 q-30 -80 60 -110 q40 -20 90 0 q60 5 70 60 q30 30 -5 65 q5 40 -45 45 q-30 25 -70 5 q-50 15 -75 -20 q-40 -25 -20 -50 z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                />
                <path
                  d="M95 90 q30 25 10 55 M150 70 q10 40 -10 70 M210 80 q20 35 0 70 M120 150 q40 15 80 0"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  opacity="0.5"
                />
              </svg>
              <span
                v-for="rg in openCase.regions"
                :key="rg.n"
                class="region-marker"
                :style="{ left: rg.x + '%', top: rg.y + '%' }"
                >{{ rg.n }}</span
              >
            </div>
          </div>

          <!-- RIGHT half: hinged cover that swings open. Its BACK (facing us when
               closed) is the plain folder; its FRONT (seen when open) is the
               notes page. The tab is NOT here — it belongs to the stationary
               left leaf (see .folder__tab--side), so it stays on the folder's
               outer edge instead of travelling to the spine as this swings. -->
          <div ref="rightLeafEl" class="leaf--right-hinge">
            <!-- outer/back = plain folder cover -->
            <div class="cover-back"></div>
            <!-- inner/front = the transcript page -->
            <div class="leaf leaf--right">
              <span class="leaf__index">{{ openCase.regions[0]?.n }}</span>
              <div v-for="(note, ni) in openCase.notes" :key="ni" class="note">
                <span v-if="note.speaker" class="note__speaker">{{ note.speaker }}</span>
                <div class="note__body">
                  <p v-if="note.text" class="note__text">{{ note.text }}</p>
                  <p v-if="note.caption" class="note__caption">{{ note.caption }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.cabinet {
  min-height: 100vh;
  padding: 4rem clamp(1rem, 6vw, 6rem);
  background: rgb(var(--color-bg));
  color: rgb(var(--color-ink));
}
.cabinet__head {
  margin-bottom: 2.5rem;
}
.cabinet__sub {
  color: rgb(var(--color-mute));
  margin-top: 0.25rem;
}

/* ---- backdrop ---- */
.veil {
  position: fixed;
  inset: 0;
  z-index: 150;
  background: rgb(0 0 0 / 0.45);
  cursor: pointer;
}
.veil-enter-active,
.veil-leave-active {
  transition: opacity 0.35s;
}
.veil-enter-from,
.veil-leave-to {
  opacity: 0;
}

/* ---- closed drawer (hanging files, front-on) ---- */
.stack {
  position: relative;
  width: min(920px, 92vw);
  height: 480px;
  transition: opacity 0.3s;
}
.stack--dimmed {
  opacity: 0.25;
}
.folder {
  --tint: #8b5cf6;
  --depth: 0;
  --lip: 84px; /* vertical step between folders (how much of each shows) */
  position: absolute;
  left: 0;
  right: 0;
  /* Front folder (depth 0) sits at the bottom, fully visible. Deeper folders
     step UP by one lip each and tuck behind (lower z-index handled inline). */
  bottom: 0;
  transform: translateY(calc(var(--depth) * var(--lip) * -1));
  height: 300px;
  text-align: left;
  border: none;
  border-radius: 18px 18px 22px 22px;
  background: var(--tint);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 -8px 18px rgb(0 0 0 / 0.18);
  transition: transform 0.25s;
}
/* the raised tab, positioned horizontally per folder */
.folder::before {
  content: "";
  position: absolute;
  top: -26px;
  left: var(--tab-x, 20%);
  width: 150px;
  height: 30px;
  background: var(--tint);
  border-radius: 14px 14px 0 0;
}
.folder:hover {
  transform: translateY(calc(var(--depth) * var(--lip) * -1 - 14px));
}
/* the origin folder is hidden while its flyer is out */
.folder--hidden {
  visibility: hidden;
}
.folder__tab {
  position: absolute;
  top: -20px;
  left: calc(var(--tab-x, 20%) + 20px);
  font-weight: 700;
  letter-spacing: 0.12em;
  font-size: 0.72rem;
  z-index: 1;
}
.folder__title {
  position: absolute;
  top: 18px;
  left: 24px;
  font-weight: 600;
  font-size: 1rem;
}
.folder--locked {
  cursor: not-allowed;
  filter: saturate(0.7);
}
.folder__lock {
  position: absolute;
  right: 1.5rem;
  bottom: 1rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  opacity: 0.7;
}

/* ---- the morphing flyer: a 3D book ----
   The flyer box is ONE portrait leaf (half of the open landscape spread), pinned
   just right of viewport-center so its LEFT edge is the book spine. The right
   cover swings out from that spine to fill the left half → centered open book. */
.flyer {
  --tint: #8b5cf6;
  --leaf-w: min(480px, 46vw); /* one leaf = half the open landscape width */
  --leaf-h: min(640px, 61.33vw); /* portrait height */
  position: fixed;
  /* top-left anchored at viewport center; JS transform positions from there so
     GSAP owns the full transform (no CSS translate for it to clobber). */
  top: 50%;
  left: 50%;
  z-index: 200;
  width: var(--leaf-w);
  height: var(--leaf-h);
  perspective: 2000px;
  will-change: transform;
  /* Start hidden; open() seeds the transform onto the folder slot, THEN reveals,
     so the first painted frame is already on the folder (no center flash). */
  visibility: hidden;
  opacity: 0;
}
.book {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
}
/* Close sits at the top-right of the OPEN spread. The spread spans from the
   flyer's left edge to one leaf-width right of it, so top-right ≈ right:-100%. */
.flyer__close {
  position: absolute;
  top: 14px;
  right: calc(-1 * var(--leaf-w) + 16px);
  z-index: 20;
  display: grid;
  place-items: center;
  border: none;
  background: rgb(0 0 0 / 0.25);
  color: #fff;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.9rem;
}

/* ---- the two leaves ---- */
.leaf {
  padding: 2rem;
  box-sizing: border-box;
}
/* LEFT half = the file (brain). Fills the flyer box. */
.leaf--left {
  position: absolute;
  inset: 0;
  background: var(--tint);
  border-radius: 6px 0 0 6px;
  display: grid;
  place-items: center;
}
/* RIGHT hinge = swings open from the spine (the flyer's right edge). */
.leaf--right-hinge {
  position: absolute;
  top: 0;
  left: 100%;
  width: 100%;
  height: 100%;
  transform-origin: left center;
  transform-style: preserve-3d;
}
/* back face (seen closed) = plain folder cover */
.cover-back {
  position: absolute;
  inset: 0;
  background: var(--tint);
  border-radius: 0 6px 6px 0;
  backface-visibility: hidden;
  transform: rotateY(180deg);
}
/* front face (seen open) = the transcript page */
.leaf--right {
  position: absolute;
  inset: 0;
  background: #fff;
  color: #1a1a1a;
  border-radius: 0 6px 6px 0;
  overflow-y: auto;
  backface-visibility: hidden;
}
/* The folder's own tab, riding the stationary left leaf. It sits on that leaf's
   LEFT (outer) edge — the far side from the spine — so when the cover swings
   open the tab stays on the outside of the spread rather than drifting inward. */
.folder__tab--side {
  position: absolute;
  top: 40%;
  left: -34px;
  writing-mode: vertical-rl;
  transform: rotate(180deg); /* read bottom-up on the left edge */
  background: var(--tint);
  color: #fff;
  padding: 14px 6px;
  border-radius: 0 8px 8px 0;
  font-weight: 700;
  letter-spacing: 0.15em;
  font-size: 0.72rem;
  z-index: 1;
}
.illus {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: #fff;
  border-radius: 6px;
  display: grid;
  place-items: center;
  color: #1a1a1a;
  padding: 1rem;
}
.illus__img,
.illus__svg {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.region-marker {
  position: absolute;
  transform: translate(-50%, -50%);
  background: var(--tint);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  min-width: 20px;
  text-align: center;
}
.leaf__index {
  display: inline-block;
  background: var(--tint);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
  margin-bottom: 1.5rem;
}
.note {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.9rem;
  align-items: flex-start;
}
.note__speaker {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1.5px solid var(--tint);
  color: var(--tint);
  font-size: 0.6rem;
  font-weight: 700;
  display: grid;
  place-items: center;
}
.note__body {
  background: #f4f4f5;
  border-radius: 10px;
  padding: 0.6rem 0.9rem;
  flex: 1;
}
.note__text {
  font-size: 0.95rem;
}
.note__caption {
  font-size: 0.75rem;
  color: #71717a;
  margin-top: 0.25rem;
  text-align: right;
}

/* ── Timeline scrubber (dev tool, gated by DEBUG_TIMELINE) ─────────────── */
.scrubber {
  position: fixed;
  left: 50%;
  bottom: 1.25rem;
  transform: translateX(-50%);
  z-index: 999;
  width: min(560px, 92vw);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  background: rgb(18 18 20 / 0.92);
  color: #f4f4f5;
  box-shadow: 0 10px 30px rgb(0 0 0 / 0.35);
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.75rem;
}
.scrubber__row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.scrubber__tag {
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #a78bfa;
}
.scrubber__pct {
  margin-left: auto;
  opacity: 0.8;
}
.scrubber__btn {
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  border: 1px solid rgb(255 255 255 / 0.2);
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
}
.scrubber__btn:hover {
  background: rgb(255 255 255 / 0.12);
}
.scrubber__range {
  width: 100%;
  accent-color: #8b5cf6;
}
.scrubber__marks {
  justify-content: space-between;
}
.scrubber__mark {
  border: 0;
  background: transparent;
  color: rgb(255 255 255 / 0.6);
  cursor: pointer;
  font: inherit;
  padding: 0;
}
.scrubber__mark:hover {
  color: #fff;
  text-decoration: underline;
}
</style>
