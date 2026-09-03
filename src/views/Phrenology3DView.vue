<script setup>
/*
 * Phrenology3DView — 3D prototype of Widget 1 (History chapter).
 *
 * Uses Google's <model-viewer> web component to render a GLB skull that the
 * reader can freely orbit, zoom, and tap. Phrenology faculty hotspots are
 * pinned to the skull surface as model-viewer "hotspot" slots — they track
 * with the model as it rotates (no manual raycasting needed).
 *
 * This is the 3D counterpart to PhrenologyView.vue (the flat-engraving
 * version). Both share the same mock data from @/mocks/phrenology.js.
 *
 * GLB model: public/publicAssets/models/skull.glb ships with the app
 * (quantized + webp, ~407 KB — see OPENBRAIN-7). The placeholder message
 * only appears if it fails to load.
 *
 * Data seam: @/mocks/phrenology — swap for Supabase later.
 * Unlisted route: /phrenology-3d (not linked in nav).
 */
import { ref, computed, onMounted, nextTick } from "vue";
import "@google/model-viewer";
import gsap from "gsap";
import { PHRENOLOGY_CITATION, usePhrenology } from "@/mocks/phrenology";
import { reducedMotionK } from "@/helper/motion";

// Narrow viewports get the detail card as a bottom sheet (see the media query
// below), so its slide animation runs on the y axis instead of x.
const isNarrow = () => window.matchMedia("(max-width: 760px)").matches;

/* ── Reduce-motion multiplier (shared convention, src/helper/motion.js) ───── */
const K = reducedMotionK();

const { fetchViews } = usePhrenology();

const views = ref([]);
const activeRegion = ref(null);
const modelLoaded = ref(false);
const modelError = ref(false);

const viewerEl = ref(null);
const panelEl = ref(null);
const hotspotEls = ref({});

/* Flatten all regions from every view into one list for the 3D model,
 * since the user can orbit freely and see all zones at once.
 * De-duplicate by faculty number (same faculty appears on multiple views). */
const allRegions = computed(() => {
  const seen = new Set();
  const regions = [];
  for (const v of views.value) {
    for (const r of v.regions) {
      if (!seen.has(r.n)) {
        seen.add(r.n);
        regions.push(r);
      }
    }
  }
  return regions;
});

const MODEL_SRC = "/publicAssets/models/skull.glb";

/* ── Hotspot ref collector ────────────────────────────────────────────────── */
function setHotspotRef(el, n) {
  if (el) hotspotEls.value[n] = el;
}

/* ── Region selection ─────────────────────────────────────────────────────── */
async function selectRegion(region) {
  const wasOpen = !!activeRegion.value;
  activeRegion.value = region;
  await nextTick();

  if (!panelEl.value) return;
  const tl = gsap.timeline();

  if (!wasOpen) {
    // Panel slides in — from the right on wide screens, up from the bottom
    // (as a sheet) on narrow ones.
    const from = isNarrow()
      ? { yPercent: 110, opacity: 0.4 }
      : { xPercent: 108, opacity: 0.4 };
    const to = isNarrow()
      ? { yPercent: 0, opacity: 1, duration: 0.55 * K, ease: "power3.out" }
      : { xPercent: 0, opacity: 1, duration: 0.55 * K, ease: "power3.out" };
    tl.fromTo(panelEl.value, from, to, 0);
  } else {
    // Panel content dips & refreshes
    tl.fromTo(
      panelEl.value,
      { opacity: 0.4, y: 10 },
      { opacity: 1, y: 0, duration: 0.3 * K, ease: "power3.out" },
      0
    );
  }
}

function closePanel() {
  if (!activeRegion.value) return;
  const tl = gsap.timeline({
    onComplete: () => (activeRegion.value = null),
  });
  tl.to(panelEl.value, {
    ...(isNarrow() ? { yPercent: 110 } : { xPercent: 108 }),
    opacity: 0.4,
    duration: 0.4 * K,
    ease: "power2.in",
  });
}

/* ── Lifecycle ────────────────────────────────────────────────────────────── */
onMounted(async () => {
  views.value = await fetchViews();

  // Wait for model-viewer to load the model.
  // The "load" event may fire before onMounted runs (web component lifecycle
  // is independent of Vue's), so also check modelIsVisible as a fallback.
  await nextTick();
  const mv = viewerEl.value;
  if (!mv) return;

  function onModelReady() {
    if (modelLoaded.value) return; // debounce
    modelLoaded.value = true;
    const dots = Object.values(hotspotEls.value);
    // clearProps is essential: model-viewer fades away-facing hotspots via a
    // shadow ::slotted(*) opacity rule, which any leftover inline opacity
    // would override — the dots would then bleed through the skull forever.
    gsap.from(dots, {
      scale: 0,
      opacity: 0,
      duration: 0.35 * K,
      ease: "back.out(2.2)",
      stagger: 0.06 * K,
      delay: 0.3 * K,
      clearProps: "opacity,scale,transform",
    });
  }

  // Already loaded before we attached the listener?
  if (mv.modelIsVisible) {
    onModelReady();
  }
  mv.addEventListener("load", onModelReady);
  mv.addEventListener("error", () => {
    modelError.value = true;
  });
});

/* ── Camera presets for quick-orbit to named views ────────────────────────── */
const CAMERA_PRESETS = {
  anterior: "0deg 90deg auto",
  lateral: "90deg 90deg auto",
  posterior: "180deg 90deg auto",
};

function orbitTo(viewId) {
  if (!viewerEl.value || !CAMERA_PRESETS[viewId]) return;
  // model-viewer eases this natively (interpolation-decay on the element);
  // under reduced motion skip the glide entirely.
  viewerEl.value.cameraOrbit = CAMERA_PRESETS[viewId];
  if (K < 1) viewerEl.value.jumpCameraToGoal();
}

/* ── Keyboard navigation between hotspots ─────────────────────────────────
 * Arrow keys cycle focus through the numbered dots (the primary interactive
 * elements); Enter/Space activates the focused one natively (they're real
 * <button>s); Escape closes the detail card.
 *
 * Bound on the dot buttons with .stop — NOT on <model-viewer> — because the
 * component's own camera-controls also handle arrow keys (orbit nudges) via a
 * shadow-DOM listener higher in the composed path. Stopping propagation at
 * the button keeps "cycle hotspots" and "orbit camera" from firing together;
 * arrows with the viewer itself focused still orbit as model-viewer intends.
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
  const dots = allRegions.value
    .map((r) => hotspotEls.value[r.n])
    .filter(Boolean);
  if (!dots.length) return;
  const i = dots.indexOf(document.activeElement);
  const next = dots[(i + (forward ? 1 : -1) + dots.length) % dots.length];
  next.focus();
}
</script>

<template>
  <!-- eslint-disable vue/no-deprecated-slot-attribute -- `slot` here is <model-viewer>'s hotspot API (a native web-component slot), not the removed Vue 2 slot syntax -->
  <div class="phreno3d">
    <header class="phreno3d__chrome">
      <span class="phreno3d__eyebrow">Phrenology · 3D</span>
      <nav class="quick-nav" aria-label="Quick orbit">
        <button
          v-for="v in views"
          :key="v.id"
          class="quick-nav__btn"
          @click="orbitTo(v.id)"
        >
          {{ v.label }}
        </button>
      </nav>
    </header>

    <div class="phreno3d__body">
      <!-- model-viewer: the 3D skull -->
      <model-viewer
        v-if="!modelError"
        ref="viewerEl"
        :src="MODEL_SRC"
        alt="Phrenology skull — rotate to explore"
        camera-controls
        touch-action="pan-y"
        camera-orbit="0deg 75deg auto"
        interaction-prompt="auto"
        interpolation-decay="100"
        class="viewer"
        :style="{ opacity: modelLoaded ? 1 : 0 }"
      >
        <!-- Hotspots pinned to the skull surface -->
        <button
          v-for="r in allRegions"
          :key="r.n"
          :ref="(el) => setHotspotRef(el, r.n)"
          :slot="'hotspot-' + r.n"
          :data-position="r.pos"
          :data-normal="r.normal"
          class="dot"
          :class="{ 'dot--on': activeRegion?.n === r.n }"
          :aria-label="`${r.n} — ${r.name}`"
          @click="selectRegion(r)"
          @keydown.stop="onStageKeydown"
        >
          <span class="dot__num">{{ r.n }}</span>
          <span v-if="activeRegion?.n === r.n" class="dot__label">
            {{ r.name }}
          </span>
        </button>
      </model-viewer>

      <!-- Fallback when no GLB is present -->
      <div v-if="modelError" class="placeholder">
        <div class="placeholder__icon">🦴</div>
        <p class="placeholder__text">
          Drop a skull GLB model at<br />
          <code>public/publicAssets/models/skull.glb</code>
        </p>
        <p class="placeholder__hint">
          Try
          <a
            href="https://sketchfab.com/3d-models?q=human+skull&type=models&features=downloadable"
            target="_blank"
            rel="noopener"
          >
            Sketchfab
          </a>
          for free CC-licensed skull models (download as GLB).
        </p>
      </div>

      <!-- Loading state -->
      <div v-if="!modelLoaded && !modelError" class="loading">
        <span class="loading__spinner" />
        <span class="loading__text">Loading skull model…</span>
      </div>

      <!-- Detail card (same design as the 2D version) -->
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
      </aside>
    </div>

    <footer class="phreno3d__foot">
      <span
        >Orbit: click + drag · Zoom: scroll · Tap a numbered zone to learn
        more</span
      >
      <span class="phreno3d__cite">{{ PHRENOLOGY_CITATION }}</span>
      <a href="/phrenology" class="phreno3d__link">← 2D version</a>
    </footer>
  </div>
</template>

<style scoped>
/* Same dark plate as the 2D widget */
.phreno3d {
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
.phreno3d__chrome {
  padding: 1.25rem 2rem 0;
  display: flex;
  align-items: baseline;
  gap: 1.5rem;
}
.phreno3d__eyebrow {
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.55;
}
.quick-nav {
  display: flex;
  gap: 2px;
  border: 1px solid rgb(255 255 255 / 0.14);
  border-radius: 4px;
  overflow: hidden;
}
.quick-nav__btn {
  padding: 0.35rem 0.8rem;
  font-size: 0.65rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  background: transparent;
  border: none;
  color: var(--bone);
  opacity: 0.6;
  cursor: pointer;
  transition:
    opacity 0.15s,
    background-color 0.2s;
}
.quick-nav__btn:hover {
  opacity: 1;
  background: rgb(255 255 255 / 0.08);
}

/* ── viewer ── */
.phreno3d__body {
  position: relative;
  flex: 1;
  display: flex;
  align-items: stretch;
}
.viewer {
  flex: 1;
  min-height: 500px;
  background: transparent;
  transition: opacity 0.5s ease;
  --poster-color: transparent;
  /* Hotspots whose data-normal faces away from the camera fade out entirely
     instead of bleeding through the skull at reduced opacity. */
  --min-hotspot-opacity: 0;
}

/* ── hotspots ── */
.dot {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  /* No base opacity/transform here: the viewer itself is opacity-0 until the
     model loads (so the entrance gsap.from can't flash), and inline opacity
     must never linger — see onModelReady. */
}
.dot__num {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1.5px solid var(--violet-soft);
  background: rgb(35 34 39 / 0.85);
  color: var(--violet-soft);
  font-size: 0.65rem;
  font-family: var(--font-mono, monospace);
  transition:
    background-color 0.15s,
    color 0.15s,
    border-color 0.15s;
  backdrop-filter: blur(4px);
}
.dot:hover .dot__num,
.dot--on .dot__num {
  background: var(--violet);
  border-color: var(--violet);
  color: #fff;
}
.dot__label {
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  background: var(--violet);
  color: #fff;
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  pointer-events: none;
}

/* ── detail card ── */
.card {
  position: absolute;
  top: 4%;
  right: 2rem;
  bottom: 4%;
  width: min(420px, 38%);
  padding: 2rem 2.25rem;
  border-radius: 6px;
  background: #f2f0ec;
  color: #2b2a2e;
  box-shadow: -18px 0 48px rgb(0 0 0 / 0.4);
  overflow-y: auto;
  z-index: 2;
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

/* ── placeholder / loading ── */
.placeholder,
.loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  z-index: 1;
}
.placeholder__icon {
  font-size: 3rem;
}
.placeholder__text {
  text-align: center;
  font-size: 0.85rem;
  line-height: 1.6;
  opacity: 0.7;
}
.placeholder__text code {
  font-family: var(--font-mono, monospace);
  font-size: 0.75rem;
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  background: rgb(255 255 255 / 0.1);
}
.placeholder__hint {
  font-size: 0.75rem;
  opacity: 0.45;
}
.placeholder__hint a {
  color: var(--violet-soft);
  text-decoration: underline;
}
.loading__spinner {
  width: 28px;
  height: 28px;
  border: 2px solid rgb(255 255 255 / 0.15);
  border-top-color: var(--violet-soft);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.loading__text {
  font-size: 0.75rem;
  opacity: 0.5;
}

/* ── footer ── */
.phreno3d__foot {
  padding: 0.75rem 2rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  font-size: 0.65rem;
  opacity: 0.4;
}
.phreno3d__cite {
  font-style: italic;
  text-align: center;
}

/* ── narrow viewports: detail card becomes a bottom sheet ── */
@media (max-width: 760px) {
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
  .phreno3d__foot {
    flex-direction: column;
    gap: 0.35rem;
    text-align: center;
  }
}
.phreno3d__link {
  color: var(--violet-soft);
  text-decoration: none;
  opacity: 1;
}
.phreno3d__link:hover {
  text-decoration: underline;
}
</style>
