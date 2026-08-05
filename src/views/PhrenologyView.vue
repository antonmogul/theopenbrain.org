<script setup>
/*
 * PhrenologyView — "Widget 1: Phrenology" prototype (History chapter).
 *
 * An engraved skull the reader can turn and interrogate:
 *   • Tab bar (ANTERIOR / LATERAL / POSTERIOR) "rotates" the skull. There is no
 *     real 3D model — each view is its own engraving, and GSAP sells the turn:
 *     the outgoing view yaws away in perspective while the incoming one yaws in
 *     from the opposite side (direction-aware, based on tab order).
 *   • The phrenology region map draws itself over the skull (stroke-dashoffset
 *     line drawing — no paid DrawSVG plugin needed), then numbered faculty
 *     hotspots pop in with a stagger.
 *   • Clicking a hotspot expands a label pill and slides in a paper detail
 *     card from the right while the skull cedes ground to the left
 *     (mirrors Figma frame 2 of the storyboard).
 *
 * Art: the real Figma engravings live in
 *   public/publicAssets/images/phrenology/{skull,lines}-{anterior|lateral|posterior}.png
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
  popStagger: 0.05, // hotspot cascade
  panel: 0.55, // detail card slide
  easeOut: "power2.in",
  easeIn: "power3.out",
};

const { fetchViews } = usePhrenology();

const views = ref([]);
const activeIdx = ref(0);
const activeRegion = ref(null); // region object shown in the detail card
const animating = ref(false);

const stageEl = ref(null); // perspective wrapper
const skullEl = ref(null); // the yawing card
const linesEl = ref(null); // raster phrenology-map overlay (real Figma asset)
const hotspotEls = ref([]);
const panelEl = ref(null);
const pillEl = ref(null);

const activeView = computed(() => views.value[activeIdx.value] ?? null);
const engravingSrc = computed(() =>
  activeView.value
    ? `/publicAssets/images/phrenology/skull-${activeView.value.id}.png`
    : ""
);
const linesSrc = computed(() =>
  activeView.value
    ? `/publicAssets/images/phrenology/lines-${activeView.value.id}.png`
    : ""
);

function setHotspotRef(el, i) {
  if (el) hotspotEls.value[i] = el;
}

/* ── Keyboard navigation between hotspots ─────────────────────────────────
 * Arrow keys cycle focus through the numbered dots (the primary interactive
 * elements); Enter/Space activates natively (they're <button>s); Escape
 * closes the detail card.
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
  const dots = hotspotEls.value.filter(Boolean);
  if (!dots.length) return;
  const i = dots.indexOf(document.activeElement);
  const next = dots[(i + (forward ? 1 : -1) + dots.length) % dots.length];
  next.focus();
}

/* Reveal the region map + pop the hotspots into a given timeline: the Figma
 * line overlay is a raster PNG, so it reveals with a crown-to-jaw clip wipe. */
function addRevealTo(tl, position = ">") {
  tl.fromTo(
    linesEl.value,
    { clipPath: "inset(0 0 100% 0)", opacity: 0.6 },
    {
      clipPath: "inset(0 0 0% 0)",
      opacity: 1,
      duration: MOTION.draw * K,
      ease: "power1.inOut",
    },
    position
  );
  tl.fromTo(
    hotspotEls.value,
    { scale: 0, opacity: 0 },
    {
      scale: 1,
      opacity: 1,
      duration: 0.35 * K,
      ease: "back.out(2.2)",
      stagger: MOTION.popStagger * K,
    },
    "<0.25"
  );
  return tl;
}

onMounted(async () => {
  views.value = await fetchViews();
  await nextTick();
  // Entrance: skull surfaces, map draws, hotspots arrive.
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

  // Outgoing: hotspots scatter, lines fade fast, skull yaws away.
  tl.to(hotspotEls.value, { scale: 0, opacity: 0, duration: 0.18 * K }, 0);
  tl.to(linesEl.value, { opacity: 0, duration: 0.18 * K }, 0);
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
  hotspotEls.value = [];
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

/* ── Hotspot → label pill + detail card ──────────────────────────────────── */
async function selectRegion(region) {
  if (animating.value) return;
  const opening = !activeRegion.value;
  activeRegion.value = region;
  await nextTick();

  const tl = gsap.timeline();
  // Pill unrolls from its dot.
  tl.fromTo(
    pillEl.value,
    { scaleX: 0, opacity: 0 },
    { scaleX: 1, opacity: 1, duration: 0.3 * K, ease: MOTION.easeIn },
    0
  );
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
  <div class="phreno">
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
          <!-- Figma engraving + phrenology-map line overlay -->
          <img :src="engravingSrc" alt="" class="skull__img" />
          <img ref="linesEl" :src="linesSrc" alt="" class="skull__lines" />

          <!-- numbered faculty hotspots -->
          <button
            v-for="(r, i) in activeView.regions"
            :key="r.n + r.name"
            :ref="(el) => setHotspotRef(el, i)"
            class="dot"
            :class="{ 'dot--on': activeRegion?.n === r.n }"
            :style="{ left: r.x + '%', top: r.y + '%' }"
            :aria-label="`${r.n} — ${r.name}`"
            @click="selectRegion(r)"
          >
            {{ r.n }}
          </button>

          <!-- label pill unrolling from the active dot -->
          <span
            v-if="activeRegion"
            ref="pillEl"
            class="pill"
            :style="{
              left: activeRegion.x + 3.5 + '%',
              top: activeRegion.y + '%',
            }"
          >
            {{ activeRegion.name }}
          </span>
        </div>
      </div>

      <!-- paper detail card (Figma frame 2) -->
      <aside v-if="activeRegion" ref="panelEl" class="card">
        <button class="card__close" aria-label="Close" @click="closePanel()">
          ✕
        </button>
        <span class="card__badge">
          <i class="card__num">{{ activeRegion.n }}</i
          >{{ activeRegion.name }}
        </span>
        <p class="card__text">{{ activeRegion.blurb }}</p>
        <p class="card__text card__text--mute">
          — from the phrenological chart after Spurzheim; faculties were claimed
          to be legible in the relief of the living skull.
        </p>
        <figure class="card__figures">
          <img
            class="card__fig"
            src="/publicAssets/images/phrenology/skull-anterior.png"
            alt="Anterior skull engraving"
            loading="lazy"
          />
          <img
            class="card__fig"
            src="/publicAssets/images/phrenology/skull-lateral.png"
            alt="Lateral skull engraving"
            loading="lazy"
          />
          <figcaption class="card__cap">
            Comparative engravings — anterior and lateral plates.
          </figcaption>
        </figure>
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
  --violet: #8b5cf6;
  --violet-soft: #a78bfa;
  position: relative;
  min-height: 100vh;
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
.skull__img,
.skull__lines {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* ── hotspots + pill ── */
.dot {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1.5px solid var(--violet-soft);
  background: rgb(35 34 39 / 0.75);
  color: var(--violet-soft);
  font-size: 0.65rem;
  font-family: var(--font-mono, monospace);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition:
    background-color 0.15s,
    color 0.15s,
    border-color 0.15s;
}
.dot:hover,
.dot--on {
  background: var(--violet);
  border-color: var(--violet);
  color: #fff;
}
.pill {
  position: absolute;
  transform: translateY(-50%);
  transform-origin: left center;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  background: var(--violet);
  color: #fff;
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  pointer-events: none;
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
  gap: 0.5rem;
  padding: 0.3rem 0.9rem 0.3rem 0.3rem;
  border-radius: 999px;
  background: var(--violet);
  color: #fff;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.card__num {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgb(255 255 255 / 0.25);
  font-style: normal;
  font-family: var(--font-mono, monospace);
  font-size: 0.65rem;
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
.card__figures {
  margin-top: 1.75rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
.card__fig {
  aspect-ratio: 4 / 3;
  width: 100%;
  border-radius: 3px;
  object-fit: cover;
  /* The engraving strokes are pale, so they need a dark backing to stay
     legible on the pale paper card. */
  background: #2b2a2e;
}
.card__cap {
  grid-column: 1 / -1;
  font-size: 0.7rem;
  opacity: 0.5;
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
    max-height: 55vh;
    border-radius: 12px 12px 0 0;
    box-shadow: 0 -12px 40px rgb(0 0 0 / 0.45);
    padding: 1.5rem 1.5rem 2rem;
  }
}
</style>
