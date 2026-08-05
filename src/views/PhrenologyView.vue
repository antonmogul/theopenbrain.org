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
 * ART IS PLACEHOLDER. The inline SVGs below are stand-ins drawn by hand so the
 * motion can be evaluated. To use the real engravings, export the three skull
 * assets from Figma ("Widget 1 – Phrenology" → Assets) to
 *   public/publicAssets/images/phrenology/skull-{anterior|lateral|posterior}.png
 * and they will be used automatically (see `engravingSrc` + @error fallback).
 *
 * Data seam: @/mocks/phrenology — swap for Supabase later.
 * Unlisted route (like /case-cabinet): open /phrenology directly.
 */
import { ref, computed, onMounted, nextTick } from "vue";
import gsap from "gsap";
import { usePhrenology } from "@/mocks/phrenology";

/* ── Motion recipe ──────────────────────────────────────────────────────────
 * All feel-tuning lives here. Durations in seconds, angles in degrees.
 * `K` collapses every duration to ~0 when the user asked for reduced motion
 * (project convention: data-reduce-motion="1" on <html>).
 */
const K =
  document.documentElement.dataset.reduceMotion === "1" ||
  window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 0.001
    : 1;

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
const engravingOk = ref(true); // real PNG present? falls back to placeholder SVG

const stageEl = ref(null); // perspective wrapper
const skullEl = ref(null); // the yawing card
const linesEl = ref(null); // raster phrenology-map overlay (real Figma asset)
const overlayEl = ref(null); // <g> holding this view's region boundary lines
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

/* Prepare overlay paths for the draw-on: dash = own length, fully offset. */
function prepOverlay() {
  const paths = overlayEl.value?.querySelectorAll("path") ?? [];
  paths.forEach((p) => {
    const len = p.getTotalLength();
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = len;
  });
  return paths;
}

/* Reveal the region map + pop the hotspots into a given timeline.
 * Two art modes: the real Figma line overlay is a raster PNG, so it reveals
 * with a crown-to-jaw clip wipe; the placeholder SVG fallback line-draws. */
function addRevealTo(tl, position = ">") {
  if (linesEl.value) {
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
  }
  const paths = prepOverlay();
  tl.to(
    paths,
    {
      strokeDashoffset: 0,
      duration: MOTION.draw * K,
      ease: "power1.inOut",
      stagger: MOTION.drawStagger * K,
    },
    linesEl.value ? "<" : position
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

  // Outgoing: hotspots scatter, lines un-draw fast, skull yaws away.
  tl.to(hotspotEls.value, { scale: 0, opacity: 0, duration: 0.18 * K }, 0);
  tl.to(
    [
      ...(overlayEl.value?.querySelectorAll("path") ?? []),
      ...(linesEl.value ? [linesEl.value] : []),
    ],
    { opacity: 0, duration: 0.18 * K },
    0
  );
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
  gsap.set(overlayEl.value?.querySelectorAll("path") ?? [], { opacity: 1 });
  inTl.fromTo(
    skullEl.value,
    { rotationY: -dir * MOTION.yawDeg, xPercent: -dir * 6, opacity: 0, scale: 0.92 },
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
    // Skull cedes ground; paper card slides in from the right.
    tl.to(
      stageEl.value,
      { xPercent: -16, scale: 0.92, duration: MOTION.panel * K, ease: MOTION.easeIn },
      0
    );
    tl.fromTo(
      panelEl.value,
      { xPercent: 108, opacity: 0.4 },
      { xPercent: 0, opacity: 1, duration: MOTION.panel * K, ease: MOTION.easeIn },
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
    xPercent: 108,
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
      <div ref="stageEl" class="stage">
        <div v-if="activeView" ref="skullEl" class="skull" :key="activeView.id">
          <!-- Real engraving if exported from Figma; placeholder SVG otherwise -->
          <img
            v-if="engravingOk"
            :src="engravingSrc"
            alt=""
            class="skull__img"
            @error="engravingOk = false"
          />
          <img
            v-if="engravingOk"
            ref="linesEl"
            :src="linesSrc"
            alt=""
            class="skull__lines"
          />
          <svg v-else class="skull__svg" viewBox="0 0 400 480" aria-hidden="true">
            <!-- ══ PLACEHOLDER ART — swap for Figma engravings ══ -->
            <g v-if="activeView.id === 'anterior'" class="bone">
              <path d="M200 26 C120 26 66 94 66 180 C66 232 84 272 108 296 C116 304 120 314 120 326 L120 346 C120 372 138 388 158 394 L166 412 C172 426 182 434 200 434 C218 434 228 426 234 412 L242 394 C262 388 280 372 280 346 L280 326 C280 314 284 304 292 296 C316 272 334 232 334 180 C334 94 280 26 200 26 Z" />
              <path d="M116 238 C112 262 126 280 150 282 C172 284 188 272 190 252 C192 234 178 224 156 224 C138 224 120 228 116 238 Z" class="bone--fill" />
              <path d="M284 238 C288 262 274 280 250 282 C228 284 212 272 210 252 C208 234 222 224 244 224 C262 224 280 228 284 238 Z" class="bone--fill" />
              <path d="M200 262 L186 306 C182 318 188 326 200 326 C212 326 218 318 214 306 Z" class="bone--fill" />
              <path d="M158 394 C158 414 170 424 200 424 C230 424 242 414 242 394" />
              <path d="M170 396 v22 M180 398 v24 M190 399 v25 M200 400 v24 M210 399 v25 M220 398 v24 M230 396 v22" class="bone--faint" />
              <path d="M120 210 C150 196 180 192 200 192 C220 192 250 196 280 210" class="bone--faint" />
              <path d="M200 30 q6 22 -4 44 q-6 22 4 44 q6 22 -2 40" class="bone--faint" />
            </g>
            <g v-else-if="activeView.id === 'lateral'" class="bone">
              <path d="M84 250 C70 130 150 38 250 38 C330 38 366 104 366 184 C366 248 336 292 296 308" />
              <path d="M84 250 C84 262 90 270 100 272 L112 274 C108 288 112 296 124 298 L134 300 C130 312 136 320 148 322 L160 324 L164 344 C166 356 176 362 190 362 L226 362 C246 362 258 352 260 336 L262 318 C280 316 292 308 296 308" />
              <path d="M132 240 C128 258 140 270 158 270 C174 270 184 258 182 244 C180 232 166 226 152 228 C142 230 134 234 132 240 Z" class="bone--fill" />
              <path d="M182 262 C210 268 232 272 246 282" class="bone--faint" />
              <circle cx="246" cy="286" r="7" class="bone--fill" />
              <path d="M172 344 v16 M182 346 v16 M192 347 v15 M202 347 v15 M212 346 v16 M222 344 v16" class="bone--faint" />
              <path d="M250 40 q-8 32 4 64 q8 32 -4 64" class="bone--faint" />
              <path d="M310 78 q-22 44 -12 88" class="bone--faint" />
            </g>
            <g v-else class="bone">
              <path d="M200 30 C118 30 70 100 70 190 C70 268 110 330 148 352 L148 380 C148 398 162 410 182 412 L218 412 C238 410 252 398 252 380 L252 352 C290 330 330 268 330 190 C330 100 282 30 200 30 Z" />
              <path d="M200 34 C196 62 204 92 200 118" class="bone--faint" />
              <path d="M200 116 C180 152 150 174 122 186" class="bone--faint" />
              <path d="M200 116 C220 152 250 174 278 186" class="bone--faint" />
              <path d="M160 358 h80 M166 372 h68" class="bone--faint" />
            </g>
          </svg>

          <!-- placeholder-mode region boundaries (violet, drawn on) -->
          <svg
            v-if="!engravingOk"
            class="skull__overlay"
            viewBox="0 0 400 480"
            aria-hidden="true"
          >
            <g ref="overlayEl" class="map">
              <template v-if="activeView.id === 'anterior'">
                <path d="M92 170 C130 118 270 118 308 170" />
                <path d="M118 122 C158 148 242 148 282 122" />
                <path d="M200 34 C196 90 204 140 200 190" />
                <path d="M142 58 C160 100 160 150 150 192" />
                <path d="M258 58 C240 100 240 150 250 192" />
              </template>
              <template v-else-if="activeView.id === 'lateral'">
                <path d="M104 200 C150 92 300 76 352 164" />
                <path d="M126 158 C190 96 300 104 350 190" />
                <path d="M170 62 C158 122 160 200 176 252" />
                <path d="M240 44 C232 120 236 200 250 272" />
                <path d="M302 62 C302 132 302 212 296 300" />
              </template>
              <template v-else>
                <path d="M102 198 C142 140 258 140 298 198" />
                <path d="M122 252 C160 204 240 204 278 252" />
                <path d="M200 42 C196 130 204 220 200 302" />
              </template>
            </g>
          </svg>

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
            :style="{ left: activeRegion.x + 3.5 + '%', top: activeRegion.y + '%' }"
          >
            {{ activeRegion.name }}
          </span>
        </div>
      </div>

      <!-- paper detail card (Figma frame 2) -->
      <aside v-if="activeRegion" ref="panelEl" class="card">
        <button class="card__close" aria-label="Close" @click="closePanel()">✕</button>
        <span class="card__badge">
          <i class="card__num">{{ activeRegion.n }}</i>{{ activeRegion.name }}
        </span>
        <p class="card__text">{{ activeRegion.blurb }}</p>
        <p class="card__text card__text--mute">
          — from the phrenological chart after Spurzheim; faculties were claimed
          to be legible in the relief of the living skull.
        </p>
        <figure class="card__figures">
          <span class="card__fig" />
          <span class="card__fig" />
          <figcaption class="card__cap">
            Comparative engravings — export from Figma assets.
          </figcaption>
        </figure>
      </aside>
    </div>

    <footer class="phreno__foot">
      Excerpts from: The Brain's Record of Auditory and Visual Experience — a
      final summary and discussion.
    </footer>
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
  transition: opacity 0.15s, background-color 0.2s, color 0.2s;
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
  /* Figma engraving assets are 450x435 (placeholder SVG stretches to match) */
  aspect-ratio: 450 / 435;
}
.skull__img,
.skull__lines,
.skull__svg,
.skull__overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.skull__img,
.skull__lines {
  object-fit: contain;
}
.bone path,
.bone circle {
  fill: none;
  stroke: var(--bone);
  stroke-width: 2.5;
  stroke-linecap: round;
}
.bone--fill {
  fill: rgb(0 0 0 / 0.35);
}
.bone--faint {
  stroke-width: 1.2;
  opacity: 0.45;
}
.map path {
  fill: none;
  stroke: var(--violet-soft);
  stroke-width: 1.5;
  opacity: 0.9;
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
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
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
  border-radius: 3px;
  background: repeating-linear-gradient(
    45deg,
    #e2ded6,
    #e2ded6 6px,
    #d8d3c9 6px,
    #d8d3c9 12px
  );
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
</style>
