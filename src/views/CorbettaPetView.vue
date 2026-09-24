<script setup>
/*
 * CorbettaPetView — "Attention selects visual cortex" (Attention chapter).
 *
 * Ported from Arjun's corbetta_pet_attention_widget_v2/index.html
 * (original kept byte-for-byte in src/widgets/source/). The visual input
 * stays constant; attending to shape, colour or velocity lights up the
 * schematic PET foci of Corbetta et al. (1990), and the spatial mode (a
 * conceptual comparison, not tested in that study) washes the hemisphere
 * contralateral to the attended visual field.
 *
 * OPENBRAIN-88. Looks like the author's original, not restyled (the
 * OPENBRAIN-75 rule): the palette, sizes and layout are the original's,
 * scoped to `.cpa`. The hotspot geometry is in the image's own 1536×1024
 * pixel space (the SVG viewBox), so it lines up with the photo at any size
 * as long as the stage keeps the image's 3:2 ratio.
 *
 * The original's `@media (max-width: 590px)` is a container query here, so
 * the phone layout also applies inside a narrow reader stage.
 */
import { ref, computed, useId } from "vue";

const IMAGE_SRC = "/publicAssets/images/widgets/corbetta_head_brain.webp";

// SVG ids (filters, gradients, title/desc) must be unique per instance: the
// widget can be mounted twice on one page (inline stage + demo modal).
const uid = `cpa-${useId()}`;
const ids = {
  title: `${uid}-title`,
  desc: `${uid}-desc`,
  glow: `${uid}-glow`,
  wideGlow: `${uid}-wide-glow`,
  shape: `${uid}-shape-g`,
  color: `${uid}-color-g`,
  velocity: `${uid}-velocity-g`,
  space: `${uid}-space-g`,
};

const FEATURES = [
  { key: "shape", label: "Shape" },
  { key: "color", label: "Color" },
  { key: "velocity", label: "Velocity" },
];
const SIDES = [
  { key: "left", label: "Left visual field" },
  { key: "right", label: "Right visual field" },
];

/* Hotspot foci, verbatim from the original: a soft gradient halo plus a
   solid core per focus, in image pixel coordinates. */
const SPOTS = {
  // Shape: ventral occipital/fusiform plus bilateral temporal foci.
  shape: {
    fill: "#e76f51",
    foci: [
      { cx: 1030, cy: 565, rx: 118, ry: 76, crx: 24, cry: 17 },
      { cx: 1255, cy: 525, rx: 112, ry: 76, crx: 23, cry: 16 },
      { cx: 850, cy: 505, rx: 98, ry: 68, crx: 21, cry: 15 },
      { cx: 1370, cy: 500, rx: 82, ry: 62, crx: 20, cry: 14 },
    ],
  },
  // Color: bilateral lingual/dorsolateral occipital foci.
  color: {
    fill: "#7f72c8",
    foci: [
      { cx: 1110, cy: 505, rx: 115, ry: 98, crx: 24, cry: 19 },
      { cx: 1325, cy: 430, rx: 100, ry: 88, crx: 22, cry: 18 },
      { cx: 930, cy: 455, rx: 88, ry: 74, crx: 19, cry: 15 },
    ],
  },
  // Velocity: left inferior parietal focus.
  velocity: {
    fill: "#4b8fc8",
    foci: [{ cx: 925, cy: 300, rx: 145, ry: 110, crx: 27, cry: 20 }],
  },
};

const COPY = {
  shape: {
    callout: "ventral + temporal",
    lead: "Attend shape:",
    body: "activity increases across ventral occipital, fusiform/parahippocampal, and temporal regions involved in form and object processing.",
  },
  color: {
    callout: "lingual + occipital",
    lead: "Attend color:",
    body: "activity increases bilaterally in lingual and dorsolateral occipital cortex, regions associated with color-sensitive visual processing.",
  },
  velocity: {
    callout: "left inferior parietal",
    lead: "Attend velocity:",
    body: "activity shifts toward a left inferior parietal region associated with processing coherent motion and velocity information.",
  },
};

// ── State ─────────────────────────────────────────────────────────────
const mode = ref("feature"); // 'feature' | 'spatial'
const feature = ref("shape"); // 'shape' | 'color' | 'velocity'
const side = ref("left"); // attended visual field

const isFeature = computed(() => mode.value === "feature");

// Visual fields project mainly to the contralateral hemisphere.
const hemi = computed(() => (side.value === "left" ? "right" : "left"));

/* Callout geometry, as the original's render() sets it: velocity points up
   to the parietal focus, shape/colour point down from their first focus. */
const callout = computed(() => {
  if (feature.value === "velocity") {
    return {
      x1: 925,
      y1: 300,
      x2: 720,
      y2: 235,
      bx: 455,
      by: 190,
      bw: 285,
      tx: 597,
      ty: 227,
    };
  }
  const color = feature.value === "color";
  return {
    x1: color ? 1110 : 1030,
    y1: color ? 505 : 565,
    x2: 760,
    y2: 740,
    bx: 545,
    by: 712,
    bw: 265,
    tx: 677,
    ty: 749,
  };
});

const takeaway = computed(() => {
  if (isFeature.value) {
    const c = COPY[feature.value];
    return { lead: c.lead, body: c.body };
  }
  return {
    lead: `Attend ${side.value} field:`,
    body: `the emphasis shifts toward ${hemi.value} visual cortex because each visual hemifield is represented primarily in the opposite hemisphere.`,
  };
});

function spotOn(name) {
  return isFeature.value && feature.value === name;
}
function washOn(h) {
  return !isFeature.value && hemi.value === h;
}
</script>

<template>
  <div class="widget-root cpa">
    <main class="cpa-wrap">
      <header class="cpa-head">
        <h1 class="cpa-title">Attention selects visual cortex</h1>
        <div class="cpa-sub">
          The visual input stays constant; the attended feature—or
          location—changes which cortical population is emphasized.
        </div>
      </header>

      <section
        class="cpa-card"
        aria-label="Interactive explanation of feature and spatial attention in visual cortex"
      >
        <div class="cpa-stage">
          <div class="cpa-stim-note">
            <template v-if="isFeature">
              Attend to subtle changes in <strong>{{ feature }}</strong>
            </template>
            <template v-else>
              Attend the <strong>{{ side }} visual field</strong>
            </template>
          </div>
          <aside class="cpa-pet-badge">
            <div class="cpa-kicker">Corbetta et al. · PET</div>
            <div class="cpa-badge-title">Blood-flow enhancement</div>
            <div class="cpa-badge-copy">
              Selective attention was compared with divided attention while the
              physical displays were matched.
            </div>
          </aside>
          <img
            class="cpa-brain-img"
            :src="IMAGE_SRC"
            width="1536"
            height="1024"
            alt="Translucent human head looking toward a visual display, with posterior visual cortex exposed in a rear-oblique view"
          />
          <div class="cpa-overlay">
            <svg
              viewBox="0 0 1536 1024"
              role="img"
              :aria-labelledby="`${ids.title} ${ids.desc}`"
            >
              <title :id="ids.title">
                Attention-dependent activity over posterior human cortex
              </title>
              <desc :id="ids.desc">
                Colored clusters change with attention to shape, color,
                velocity, or a visual-field location.
              </desc>
              <defs>
                <filter
                  :id="ids.glow"
                  x="-100%"
                  y="-100%"
                  width="300%"
                  height="300%"
                >
                  <feGaussianBlur stdDeviation="18" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter
                  :id="ids.wideGlow"
                  x="-80%"
                  y="-80%"
                  width="260%"
                  height="260%"
                >
                  <feGaussianBlur stdDeviation="42" />
                </filter>
                <radialGradient
                  v-for="name in ['shape', 'color', 'velocity']"
                  :id="ids[name]"
                  :key="name"
                >
                  <stop
                    offset="0"
                    :stop-color="SPOTS[name].fill"
                    stop-opacity="1"
                  />
                  <stop
                    offset="1"
                    :stop-color="SPOTS[name].fill"
                    stop-opacity="0"
                  />
                </radialGradient>
                <radialGradient :id="ids.space">
                  <stop offset="0" stop-color="#f5d90a" stop-opacity=".9" />
                  <stop offset="1" stop-color="#f5d90a" stop-opacity="0" />
                </radialGradient>
              </defs>

              <!-- Conceptual hemisphere washes projected onto the rear-oblique surface. -->
              <ellipse
                class="cpa-wash"
                :class="{ 'is-on': washOn('left') }"
                :fill="`url(#${ids.space})`"
                :filter="`url(#${ids.wideGlow})`"
                cx="1010"
                cy="455"
                rx="260"
                ry="290"
                data-wash="left"
              />
              <ellipse
                class="cpa-wash"
                :class="{ 'is-on': washOn('right') }"
                :fill="`url(#${ids.space})`"
                :filter="`url(#${ids.wideGlow})`"
                cx="1290"
                cy="390"
                rx="205"
                ry="245"
                data-wash="right"
              />

              <g v-for="(group, name) in SPOTS" :key="name" :data-spots="name">
                <template v-for="(f, i) in group.foci" :key="i">
                  <ellipse
                    class="cpa-hotspot"
                    :class="{ 'is-on': spotOn(name) }"
                    :fill="`url(#${ids[name]})`"
                    :filter="`url(#${ids.glow})`"
                    :cx="f.cx"
                    :cy="f.cy"
                    :rx="f.rx"
                    :ry="f.ry"
                  />
                  <ellipse
                    class="cpa-hotspot cpa-core"
                    :class="{ 'is-on': spotOn(name) }"
                    :fill="group.fill"
                    :filter="`url(#${ids.glow})`"
                    :cx="f.cx"
                    :cy="f.cy"
                    :rx="f.crx"
                    :ry="f.cry"
                  />
                </template>
              </g>

              <g class="cpa-callout" :class="{ 'is-on': isFeature }">
                <line
                  class="cpa-callout-line"
                  :x1="callout.x1"
                  :y1="callout.y1"
                  :x2="callout.x2"
                  :y2="callout.y2"
                />
                <rect
                  class="cpa-callout-box"
                  :x="callout.bx"
                  :y="callout.by"
                  :width="callout.bw"
                  height="58"
                  rx="10"
                />
                <text
                  class="cpa-callout-text"
                  :x="callout.tx"
                  :y="callout.ty"
                  text-anchor="middle"
                >
                  {{ COPY[feature].callout }}
                </text>
              </g>
            </svg>
          </div>
          <div class="cpa-orientation">
            rear-oblique view · posterior visual cortex exposed
          </div>
        </div>

        <div class="cpa-controls">
          <div
            class="cpa-row cpa-mode"
            role="group"
            aria-label="Choose type of attention"
          >
            <span class="cpa-control-name">Attention type</span>
            <button
              type="button"
              class="cpa-btn"
              :class="{ 'is-active': isFeature }"
              :aria-pressed="String(isFeature)"
              @click="mode = 'feature'"
            >
              Feature · PET study
            </button>
            <button
              type="button"
              class="cpa-btn"
              :class="{ 'is-active': !isFeature }"
              :aria-pressed="String(!isFeature)"
              @click="mode = 'spatial'"
            >
              Spatial · comparison
            </button>
          </div>
          <div
            v-show="isFeature"
            class="cpa-row cpa-options"
            role="group"
            aria-label="Choose attended feature"
          >
            <span class="cpa-control-name">Attend to</span>
            <button
              v-for="f in FEATURES"
              :key="f.key"
              type="button"
              class="cpa-btn"
              :class="{ 'is-active': feature === f.key }"
              :aria-pressed="String(feature === f.key)"
              :data-feature="f.key"
              @click="feature = f.key"
            >
              {{ f.label }}
            </button>
          </div>
          <div
            v-show="!isFeature"
            class="cpa-row cpa-options"
            role="group"
            aria-label="Choose attended visual field"
          >
            <span class="cpa-control-name">Attend to</span>
            <button
              v-for="s in SIDES"
              :key="s.key"
              type="button"
              class="cpa-btn"
              :class="{ 'is-active': side === s.key }"
              :aria-pressed="String(side === s.key)"
              :data-side="s.key"
              @click="side = s.key"
            >
              {{ s.label }}
            </button>
          </div>
        </div>
        <p class="cpa-takeaway">
          <strong>{{ takeaway.lead }}</strong> {{ takeaway.body }}
        </p>
        <p class="cpa-source-note">
          Feature mode summarizes Corbetta et al. (1990), <em>Science</em>
          248:1556–1559. Hotspots are schematic projections of the reported PET
          foci, not a statistical brain map. Spatial mode is a conceptual
          comparison and was not tested in this experiment.
        </p>
      </section>
    </main>
  </div>
</template>

<style scoped>
/*
 * The original's palette and metrics, scoped to .cpa. Its global rules
 * (`*`, html/body, svg, text, button) are re-targeted at the widget's own
 * classes so nothing leaks into the reader and the reader's element styles
 * do not reach in.
 */
.cpa {
  --cpa-bg: #eef0f0;
  --cpa-panel: #f8f8f7;
  --cpa-ink: #1a1a1a;
  --cpa-dim: #6b7280;
  --cpa-line: #dcdedd;
  --cpa-teal: #1fb3a3;
  --cpa-sans: var(
    --font-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    Helvetica,
    Arial,
    sans-serif
  );

  container: cpa / inline-size;
  box-sizing: border-box;
  padding: 22px;
  background: var(--cpa-bg);
  color: var(--cpa-ink);
  font-family: var(--cpa-sans);
}
.cpa *,
.cpa *::before,
.cpa *::after {
  box-sizing: border-box;
}

.cpa-wrap {
  display: block;
  max-width: 680px;
  margin: 0 auto;
}
.cpa-head {
  margin-bottom: 14px;
}
.cpa-title {
  font-size: 15px;
  line-height: 1.25;
  font-weight: 700;
  margin: 0 0 4px;
  padding: 0;
  color: var(--cpa-ink);
}
.cpa-sub {
  font-size: 12px;
  color: var(--cpa-dim);
  line-height: 1.45;
}

.cpa-card {
  background: var(--cpa-panel);
  border: 1px solid var(--cpa-line);
  border-radius: 7px;
  padding: 18px;
}

/* ── Stage: photo + SVG overlay, both in the image's 3:2 frame ─────────── */
.cpa-stage {
  position: relative;
  aspect-ratio: 3 / 2;
  overflow: hidden;
  border-radius: 5px;
  background: #050606;
}
.cpa-brain-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  object-fit: cover;
}
.cpa-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.cpa-overlay svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.cpa-overlay text {
  font-family: var(--cpa-sans);
}

.cpa-hotspot {
  opacity: 0;
  transform-box: fill-box;
  transform-origin: center;
  transition:
    opacity 0.42s ease,
    transform 0.42s ease;
}
.cpa-hotspot.is-on {
  opacity: 0.9;
  transform: scale(1);
}
.cpa-core {
  opacity: 0;
}
.cpa-core.is-on {
  opacity: 1;
}
.cpa-wash {
  opacity: 0;
  transition: opacity 0.45s ease;
}
.cpa-wash.is-on {
  opacity: 0.42;
}
.cpa-callout {
  opacity: 0;
  transition: opacity 0.35s ease;
}
.cpa-callout.is-on {
  opacity: 1;
}
.cpa-callout-line {
  stroke: rgba(255, 255, 255, 0.76);
  stroke-width: 2.5;
  stroke-dasharray: 7 7;
}
.cpa-callout-box {
  fill: rgba(5, 7, 7, 0.82);
  stroke: rgba(255, 255, 255, 0.28);
}
.cpa-callout-text {
  fill: #fff;
  font-size: 22px;
  font-weight: 650;
}

/* The stimulus note and PET badge come before the photo in the DOM with no
   z-index, exactly as in the original, so the (opaque) photo paints over
   them and they are not visible; only the orientation caption, after the
   overlay, shows. Kept as authored: flagged to the author rather than
   "fixed" in the port. */
.cpa-stim-note {
  position: absolute;
  left: 16px;
  top: 232px;
  width: 190px;
  text-align: center;
  font-size: 9.5px;
  line-height: 1.35;
  color: rgba(255, 255, 255, 0.8);
  text-shadow: 0 1px 3px #000;
}
.cpa-stim-note strong {
  font-weight: 700;
}

.cpa-pet-badge {
  position: absolute;
  left: 18px;
  bottom: 17px;
  width: 225px;
  padding: 9px 10px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(5, 7, 7, 0.76);
  border-radius: 5px;
  color: #fff;
  backdrop-filter: blur(3px);
  line-height: normal;
}
.cpa-kicker {
  font-size: 9px;
  color: var(--cpa-teal);
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.cpa-badge-title {
  font-size: 11px;
  font-weight: 680;
  margin-top: 3px;
}
.cpa-badge-copy {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.67);
  line-height: 1.35;
  margin-top: 3px;
}
.cpa-orientation {
  position: absolute;
  right: 14px;
  bottom: 10px;
  font-size: 8.5px;
  line-height: normal;
  color: rgba(255, 255, 255, 0.64);
  letter-spacing: 0.03em;
  text-shadow: 0 1px 3px #000;
}

/* ── Controls ──────────────────────────────────────────────────────────── */
.cpa-controls {
  margin-top: 14px;
}
.cpa-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.cpa-control-name {
  font-size: 10px;
  color: var(--cpa-dim);
  width: 80px;
  text-align: right;
}
.cpa-btn {
  background: #fff;
  border: 1.5px solid var(--cpa-line);
  color: var(--cpa-ink);
  font: 600 12px var(--cpa-sans);
  line-height: normal;
  letter-spacing: normal;
  border-radius: 5px;
  padding: 8px 13px;
  margin: 0;
  cursor: pointer;
  transition: all 0.15s;
}
.cpa-btn:hover:not(.is-active) {
  border-color: var(--cpa-teal);
}
.cpa-btn.is-active {
  background: var(--cpa-teal);
  border-color: var(--cpa-teal);
  color: #fff;
}
.cpa-btn:focus-visible {
  outline: 2px solid var(--cpa-teal);
  outline-offset: 2px;
}
.cpa-mode .cpa-btn {
  min-width: 132px;
}
.cpa-options {
  min-height: 38px;
}

.cpa-takeaway {
  margin: 14px 2px 0;
  padding-top: 12px;
  border-top: 1px solid var(--cpa-line);
  font-size: 11px;
  line-height: 1.5;
  color: var(--cpa-dim);
}
.cpa-takeaway strong {
  color: var(--cpa-ink);
  font-weight: 700;
}
.cpa-source-note {
  margin: 8px 2px 0;
  font-size: 9.5px;
  color: #858987;
  line-height: 1.4;
}

/* The original's @media (max-width: 590px), as a container query so it also
   applies in a narrow reader stage. */
@container cpa (max-width: 590px) {
  .cpa-stim-note {
    top: 54%;
    left: 10px;
    width: 145px;
  }
  .cpa-pet-badge {
    display: none;
  }
  .cpa-orientation {
    right: 8px;
    bottom: 7px;
    font-size: 7.5px;
  }
  .cpa-control-name {
    width: 100%;
    text-align: center;
  }
}

/* Reduced motion: the reader's setting (data-reduce-motion on <html>) wins,
   otherwise the operating system's. */
[data-reduce-motion="1"] .cpa-hotspot,
[data-reduce-motion="1"] .cpa-wash,
[data-reduce-motion="1"] .cpa-callout,
[data-reduce-motion="1"] .cpa-btn {
  transition: none;
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-reduce-motion="0"]) .cpa-hotspot,
  html:not([data-reduce-motion="0"]) .cpa-wash,
  html:not([data-reduce-motion="0"]) .cpa-callout {
    transition: none;
  }
}
</style>
