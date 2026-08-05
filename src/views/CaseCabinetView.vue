<script setup>
/*
 * CaseCabinetView — "The Case Cabinet" prototype (demo).
 *
 * A drawer of patient-case folders. Clicking one makes the folder itself grow
 * out of its slot into a two-leaf spread (brain + numbered regions | case
 * transcript). Close reverses it — same system, same maths.
 *
 * MORPH MODEL — GSAP Flip on the REAL clicked v-for node, both directions.
 * open() records the folder's drawer state, promotes it to `.folder--flying`
 * (fixed position, open-card size) and Flip.from() animates the diff. close()
 * records the open state, demotes the class, and Flip.from() animates it home.
 * The teleported `.flyer` only carries the spread's CONTENTS (illustration,
 * hinged notes page); it fades in over the arrived folder and out before the
 * return flight, so one continuous element does all the travelling.
 *
 * Data comes from the mock seam `@/mocks/caseFiles` — swap for Supabase later.
 * Unlisted route (like /styleguide): open /case-cabinet directly.
 */
import { ref, onMounted, nextTick } from "vue";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { useCaseFiles } from "@/mocks/caseFiles";
import { readSpeed, readScrub } from "@/helper/debugFlags";
import { reducedMotionK } from "@/helper/motion";

gsap.registerPlugin(Flip);

const cases = ref([]);
const openCase = ref(null); // the case object being shown, or null
const animating = ref(false);
/*
 * .folder--flying (open-card geometry) is tracked separately from openCase:
 * during close() the class must come off while the spread is still mounted, so
 * Flip can diff "open card" → "drawer slot" and fly the folder home under the
 * still-visible veil. returningId marks that homebound folder so CSS can keep
 * it above the veil and exempt from the stack dimming until the flight lands.
 */
const flyingId = ref(null); // folder carrying .folder--flying
const returningId = ref(null); // folder flying home during close()

/*
 * ── Timeline scrubber (dev tool) ──────────────────────────────────────────
 * Holds the live open/close timeline so the on-screen scrubber can pause it and
 * step through frame by frame. Purely a tuning aid.
 *
 * Two separate gates, deliberately:
 *   • DEBUG_TIMELINE — the visible on-screen scrubber panel. Off by default so
 *     the animation is demo-ready; opt in with ?scrub=1 when tuning.
 *   • EXPOSE_TIMELINE — the `window.__cc` handle that scripts/filmstrip.mjs
 *     seeks to capture frames. Dev builds only, no visible UI, so the filmstrip
 *     harness keeps working without a scrubber on screen.
 */
const SEARCH = typeof window === "undefined" ? "" : window.location.search;
const DEBUG_TIMELINE = readScrub(SEARCH);
const EXPOSE_TIMELINE = import.meta.env.DEV;
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
  // Handle for scripts/filmstrip.mjs, which seeks this timeline to capture
  // frames off-screen. Dev-only, and independent of the visible panel so the
  // filmstrip can run against a demo-clean UI.
  if (EXPOSE_TIMELINE) window.__cc = { tl, label };
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
const stackEls = ref([]); // stack folder nodes (entrance stagger + Flip targets)
const flyerEl = ref(null); // teleported spread contents (fades over the folder)
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

// Global slow-mo multiplier for tuning. 1 is ship speed; ?slow=N slows the whole
// sequence by N without touching the individual beat durations, so the timings
// that ship are the ones being judged. K additionally collapses everything to
// ~0 under reduced motion (shared convention — see src/helper/motion.js).
const K = reducedMotionK();
const SPEED = readSpeed(SEARCH) * K;

/*
 * The flyer's layout box is ONE portrait leaf. It mounts hidden; we seed it onto
 * the clicked folder's slot BEFORE revealing, so there is no center-flash. Then:
 * rise to upright portrait → shift to centered → swing the cover open.
 */
async function open(c, evt) {
  if (!c.openable || openCase.value || animating.value) return;
  animating.value = true;

  /*
   * ONE ELEMENT, START TO FINISH — this is a GSAP Flip, not a hand-off.
   *
   * We record the clicked folder's real state, then let Vue promote that SAME
   * node into the open layout (`.folder--flying` lifts it to fixed position and
   * the open size). Flip.from() diffs the two states and animates the actual
   * element between them. There is no second node to seed, disguise or
   * cross-fade — which is what made the previous version read as a new element
   * appearing: it genuinely was one.
   *
   * Flip handles the position/parent change safely, so the old worry about
   * reparenting a v-for node and corrupting the vdom doesn't apply: Vue still
   * owns the node, we only change its class.
   */
  const folderNode = evt.currentTarget;
  // The mount entrance (gsap.from opacity) can leave an inline opacity behind;
  // clear it so the flying folder is never animated out from under us.
  gsap.set(folderNode, { clearProps: "opacity" });
  const state = Flip.getState(folderNode, {
    props: "borderRadius,backgroundColor",
  });

  openCase.value = c;
  flyingId.value = c.id;
  await nextTick();
  const flyer = flyerEl.value;
  const right = rightLeafEl.value;

  gsap.set(right, { rotationY: -180 }); // right cover folded shut over the file
  gsap.set(flyer.querySelector(".flyer__close"), { autoAlpha: 0 });
  // The flyer carries the spread's contents. It stays hidden until the Flip has
  // delivered the folder to the open position, then fades in over it.
  gsap.set(flyer, { autoAlpha: 0 });

  // Animate the real folder from its drawer slot into the open card.
  const flip = Flip.from(state, {
    duration: 0.7 * SPEED,
    ease: "power3.inOut",
    absolute: true,
    scale: false, // tween width/height, so the tab and contents don't distort
  });

  const tl = trackTimeline(
    gsap.timeline({
      onComplete: () => (animating.value = false),
    }),
    "open"
  );

  // 1) The Flip itself: the real folder travels from its drawer slot to the
  //    open card, tweening size and border-radius as one continuous object.
  tl.add(flip)
    // 2) The spread's contents fade in over the arrived folder, then the cover
    //    swings open. The folder itself remains the card beneath.
    .to(flyer, { autoAlpha: 1, duration: 0.25 * SPEED }, ">-" + 0.15 * SPEED)
    .to(
      right,
      { rotationY: 0, duration: 0.7 * SPEED, ease: "power2.inOut" },
      ">-" + 0.1 * SPEED
    )
    // 3) Reveal the file + notes as it finishes opening.
    .to(
      flyer.querySelector(".flyer__close"),
      { autoAlpha: 1, duration: 0.2 * SPEED },
      "-=" + 0.2 * SPEED
    )
    .from(
      flyer.querySelectorAll(".region-marker"),
      {
        scale: 0,
        autoAlpha: 0,
        duration: 0.3 * SPEED,
        ease: "back.out(2)",
        stagger: 0.04 * SPEED,
      },
      "-=" + 0.3 * SPEED
    )
    .from(
      flyer.querySelectorAll(".note"),
      {
        x: 20,
        autoAlpha: 0,
        duration: 0.3 * SPEED,
        ease: "power2.out",
        stagger: 0.07 * SPEED,
      },
      "-=" + 0.3 * SPEED
    );
}

/*
 * Mirror of open(): same Flip, opposite direction. We capture the folder's
 * open-card state, demote it back to a stack item, and let Flip.from() animate
 * the diff — the identical maths the outbound flight used, so the two read as
 * one system. Flip's immediateRender holds the folder at the open position
 * until its slot in the timeline, so nothing jumps when the class comes off.
 */
async function close() {
  if (!openCase.value || animating.value) return;
  animating.value = true;
  const flyer = flyerEl.value;
  const right = rightLeafEl.value;
  const c = openCase.value;
  const folderNode = stackEls.value[cases.value.indexOf(c)];

  // No node to fly home (shouldn't happen — openCase always comes from cases):
  // just drop the spread rather than animating a detached ghost.
  if (!folderNode) {
    openCase.value = null;
    flyingId.value = null;
    animating.value = false;
    return;
  }

  const state = Flip.getState(folderNode, {
    props: "borderRadius,backgroundColor",
  });
  // Demote the folder to its stack layout. returningId keeps it above the veil
  // and disables the hover transition so CSS doesn't fight Flip's per-tick
  // positioning on the way home.
  flyingId.value = null;
  returningId.value = c.id;
  await nextTick();

  // Created here (immediateRender re-seeds the folder at the open card), played
  // later in the timeline — after the cover has swung shut over it.
  const flip = Flip.from(state, {
    duration: 0.6 * SPEED,
    ease: "power3.inOut",
    absolute: true,
    scale: false, // same as open(): tween the box, don't distort the tab
  });

  const tl = trackTimeline(
    gsap.timeline({
      onComplete: () => {
        openCase.value = null;
        returningId.value = null;
        animating.value = false;
      },
    }),
    "close"
  );
  // Reverse the open, beat for beat: contents away → cover swings shut → the
  // spread fades out over the folder → the folder Flips back into its slot.
  tl.to(flyer.querySelector(".flyer__close"), {
    autoAlpha: 0,
    duration: 0.15 * SPEED,
  })
    .to(
      right,
      { rotationY: -180, duration: 0.5 * SPEED, ease: "power2.inOut" },
      "<"
    )
    .to(flyer, { autoAlpha: 0, duration: 0.2 * SPEED }, ">-" + 0.15 * SPEED)
    .add(flip, ">-" + 0.05 * SPEED);
}
</script>

<template>
  <div class="cabinet">
    <header class="cabinet__head">
      <h1 class="t-h2">Case Cabinet</h1>
      <p class="t-body cabinet__sub">
        Select a patient file to review the case.
      </p>
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
        :class="{
          'folder--locked': !c.openable,
          'folder--flying': flyingId === c.id,
          'folder--returning': returningId === c.id,
        }"
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

    <!-- The spread's CONTENTS (the real folder does the morphing — see the
         MORPH MODEL header). `.book` is a preserve-3d stage: `.leaf--left`
         carries the file (brain + regions); `.leaf--right-hinge` starts folded
         shut over it (rotateY -180) and swings open at the spine to reveal the
         two-leaf landscape spread. Fades in over the arrived folder. -->
    <Teleport to="body">
      <div
        v-if="openCase"
        ref="flyerEl"
        class="flyer"
        :style="{ '--tint': openCase.tint }"
      >
        <button class="flyer__close" @click="close">✕</button>
        <div class="book">
          <!-- LEFT half: the cover (front) + the file inside (revealed on open).
               This leaf never moves, so the tab lives here — pinned to its LEFT
               (outer) edge, the far side from the spine. -->
          <div class="leaf leaf--left">
            <span class="folder__tab folder__tab--side">{{
              openCase.tab
            }}</span>
            <!-- the file: brain illustration + regions -->
            <div class="illus">
              <img
                v-if="openCase.illustration"
                :src="openCase.illustration"
                alt="Brain illustration"
                class="illus__img"
              />
              <svg
                v-else
                viewBox="0 0 320 260"
                class="illus__svg"
                aria-hidden="true"
              >
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
                <span v-if="note.speaker" class="note__speaker">{{
                  note.speaker
                }}</span>
                <div class="note__body">
                  <p v-if="note.text" class="note__text">{{ note.text }}</p>
                  <p v-if="note.caption" class="note__caption">
                    {{ note.caption }}
                  </p>
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
/* Dim the drawer behind the opened file — but never the flying folder itself
   (outbound or homebound), which has left the stack visually and must stay at
   full strength. */
.stack--dimmed .folder:not(.folder--flying):not(.folder--returning) {
  opacity: 0.25;
}
/* Open-card leaf dimensions, declared ONCE at :root because .folder (in .stack)
   and .flyer (teleported to <body>) live in different subtrees and custom
   properties don't cross between them. */
:global(:root) {
  --cc-leaf-w: min(480px, 46vw); /* one leaf = half the open landscape width */
  --cc-leaf-h: min(640px, 61.33vw); /* portrait height */
}
.folder {
  --tint: rgb(var(--color-chapter));
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
/*
 * The clicked folder's OPEN state. Flip animates the real node from its drawer
 * slot into this — it is the same element, promoted to fixed position and the
 * open card's size. Sized to one leaf so it lands as the spread's left half.
 */
.folder--flying {
  position: fixed;
  /* Positioned with plain offsets, NOT a translate: Flip owns `transform` while
     it animates, so a CSS translate here would be overwritten mid-flight and
     the element would land off-screen. calc() puts the left leaf's right edge
     on the viewport's centre line (the spine). */
  left: calc(50% - var(--cc-leaf-w));
  top: calc(50% - var(--cc-leaf-h) / 2);
  right: auto;
  bottom: auto;
  transform: none;
  width: var(--cc-leaf-w);
  height: var(--cc-leaf-h);
  border-radius: 18px 0 0 18px;
  z-index: 210;
}
/* Homebound flight (close). Flip owns the geometry; this only (a) keeps the
   folder above the veil — !important because the stacking z-index is set
   inline per folder — and (b) kills the hover transition so CSS doesn't lerp
   Flip's per-tick positioning on the way down. */
.folder--returning {
  z-index: 210 !important;
  transition: none;
}
/* Its raised tab keeps riding the outer (left) edge as it flies. */
.folder--flying::before {
  top: 40%;
  left: -34px;
  width: 30px;
  height: 76px;
  border-radius: 14px 0 0 14px;
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

/* ---- the spread's contents ----
   Since the Flip refactor the CLICKED FOLDER is the left leaf — it flies in and
   becomes the card. This element now only carries what sits inside/right of it:
   the file illustration and the hinged notes page. It must therefore align
   exactly with .folder--flying's open box, or you see two offset folders. */
.flyer {
  --tint: rgb(var(--color-chapter));
  position: fixed;
  /* Same geometry as .folder--flying: left leaf's right edge on the centre line. */
  top: calc(50% - var(--cc-leaf-h) / 2);
  left: calc(50% - var(--cc-leaf-w));
  z-index: 200;
  width: var(--cc-leaf-w);
  height: var(--cc-leaf-h);
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
  right: calc(-1 * var(--cc-leaf-w) + 16px);
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
