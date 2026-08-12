<script setup>
/*
 * ContrastResponseGainView — Contrast Gain vs Response Gain widget.
 *
 * Ported from Arjun's contrast_response_gain_widget.html.
 * Two models of how attention modulates the contrast-response function
 * (Reynolds, Pasternak & Desimone 2000, Fig 1). Toggle between contrast
 * gain (leftward shift) and response gain (vertical stretch), adjust
 * attention strength with a slider.
 *
 * OPENBRAIN-13: third widget port (follows SDT pilot pattern).
 *
 * Design ownership: Sonia owns design. This is a token-swap only — the
 * widget's interaction and pedagogy are unchanged from the original.
 *
 * Colour mapping from original → brand.css tokens:
 *   --bg:#242424       → rgb(var(--color-bg))
 *   --panel:#2c2c2c    → rgb(var(--color-paper))
 *   --ink:#e8e8e8      → rgb(var(--color-ink))
 *   --dim:#8a8a8a      → rgb(var(--color-mute))
 *   --line:#3a3a3a     → rgb(var(--color-line))
 *   --att:#e6178c      → rgb(var(--color-accent))
 *   --att-dim:#7a1450  → rgb(var(--color-accent) / 0.4)
 *   --unatt:#6f9099    → kept as-is (cool grey-blue, no token)
 *   --crit:#f4f4f4     → rgb(var(--color-ink))
 *   --band:#3a3a3a     → rgb(var(--color-line))
 */
import { ref, computed } from "vue";
import {
  naka,
  bandLo,
  bandHi,
  computeAttended,
  niceCeil,
} from "@/helper/contrastResponse";

// ── State ─────────────────────────────────────────────────────────────
const mode = ref("shift"); // 'shift' | 'scale'
const strength = ref(1.51);

// ── Chart geometry ────────────────────────────────────────────────────
const W = 620;
const H = 380;
const ML = 50;
const MR = 50;
const MT = 20;
const MB = 40;
const PW = W - ML - MR;
const PH = H - MT - MB;
const xMin = 0; // log10(contrast), 1–100%
const xMax = 2;
const N_PTS = 160;

function xPix(logc) {
  return ML + ((logc - xMin) / (xMax - xMin)) * PW;
}
function yPixL(r, rMax) {
  return MT + PH - (r / rMax) * PH;
}
function yPixR(p, pMax) {
  return MT + PH - (p / pMax) * PH;
}

// ── X-axis contrast ticks ─────────────────────────────────────────────
const xTicks = [1, 3, 10, 30, 100].map((c) => ({
  x: xPix(Math.log10(c)),
  label: String(c),
}));

// ── Dynamic-range band ────────────────────────────────────────────────
const bandX = xPix(Math.log10(bandLo));
const bandW = xPix(Math.log10(bandHi)) - bandX;

// ── Computed curve data ───────────────────────────────────────────────
const curveData = computed(() => {
  const cs = [];
  const base = [];
  const att = [];
  const pct = [];

  for (let i = 0; i <= N_PTS; i++) {
    const logc = xMin + ((xMax - xMin) * i) / N_PTS;
    const c = Math.pow(10, logc);
    const b = naka(c);
    const a = computeAttended(c, mode.value, strength.value);
    cs.push(c);
    base.push(b);
    att.push(a);
    pct.push(((a - b) / b) * 100);
  }

  const rMax = niceCeil(Math.max(...base, ...att) * 1.12, 10);
  const pMaxRaw = Math.max(...pct);
  const pMax = niceCeil(pMaxRaw * 1.15, mode.value === "shift" ? 5 : 25);

  // Find peak of pct curve
  let peakI = 0;
  for (let i = 1; i < pct.length; i++) {
    if (pct[i] > pct[peakI]) peakI = i;
  }
  const peakC = cs[peakI];
  const peakP = pct[peakI];
  const isInterior = peakI > 3 && peakI < N_PTS - 3;

  return { cs, base, att, pct, rMax, pMax, peakC, peakP, peakI, isInterior };
});

// ── SVG path builders ─────────────────────────────────────────────────
function buildPath(vals, yFn) {
  let d = "";
  vals.forEach((v, i) => {
    const x = xPix(xMin + ((xMax - xMin) * i) / N_PTS);
    const y = yFn(v);
    d += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1) + " ";
  });
  return d;
}

const baseCurvePath = computed(() =>
  buildPath(curveData.value.base, (v) => yPixL(v, curveData.value.rMax))
);
const attCurvePath = computed(() =>
  buildPath(curveData.value.att, (v) => yPixL(v, curveData.value.rMax))
);
const pctCurvePath = computed(() =>
  buildPath(curveData.value.pct, (v) => yPixR(v, curveData.value.pMax))
);

// ── Y-axis ticks (left: spikes/s) ────────────────────────────────────
const yLeftTicks = computed(() => {
  const { rMax } = curveData.value;
  const ticks = [];
  for (let v = 0; v <= rMax; v += rMax / 4) {
    ticks.push({ y: yPixL(v, rMax), label: Math.round(v), isZero: v === 0 });
  }
  return ticks;
});

// ── Y-axis ticks (right: % increase) ─────────────────────────────────
const yRightTicks = computed(() => {
  const { pMax } = curveData.value;
  const ticks = [];
  for (let v = 0; v <= pMax; v += pMax / 4) {
    ticks.push({ y: yPixR(v, pMax), label: Math.round(v) });
  }
  return ticks;
});

// ── Peak marker ───────────────────────────────────────────────────────
const peakX = computed(() => xPix(Math.log10(curveData.value.peakC)));
const peakY = computed(() =>
  yPixR(curveData.value.peakP, curveData.value.pMax)
);
const peakLabelAnchor = computed(() =>
  peakX.value > ML + PW - 90 ? "end" : "start"
);
const peakLabelX = computed(() =>
  peakX.value > ML + PW - 90 ? peakX.value - 8 : peakX.value + 8
);
const peakLabelText = computed(
  () =>
    `${curveData.value.peakC.toFixed(0)}%, +${curveData.value.peakP.toFixed(0)}%`
);

// ── Readouts ──────────────────────────────────────────────────────────
const peakLocText = computed(() => {
  if (curveData.value.isInterior) {
    return curveData.value.peakC.toFixed(0) + "% contrast";
  }
  return "high contrast (no interior peak)";
});
const peakValText = computed(() => {
  const p = curveData.value.peakP.toFixed(0);
  if (curveData.value.isInterior) {
    return "+" + p + "%";
  }
  return "+" + p + "% and still rising";
});

// ── Note text ─────────────────────────────────────────────────────────
const noteHtml = computed(() => {
  if (mode.value === "shift") {
    return `<strong>Contrast gain:</strong> attention multiplies effective contrast by ${strength.value.toFixed(2)}×, shifting the curve leftward. The % increase is largest for stimuli near the low-to-mid end of the dynamic range and falls off at high contrast, where both curves have already saturated.`;
  }
  return `<strong>Response gain:</strong> attention multiplies the response above baseline by ${strength.value.toFixed(2)}×, stretching the curve vertically. The % increase grows monotonically with contrast and is largest for the strongest stimuli — the opposite diagnostic signature from contrast gain.`;
});

// ── Actions ───────────────────────────────────────────────────────────
function setMode(m) {
  mode.value = m;
}
function onSlider(e) {
  strength.value = parseFloat(e.target.value);
}
</script>

<template>
  <div class="crg-wrap">
    <div class="crg-head">
      <h1 class="t-label">Contrast Gain vs. Response Gain</h1>
      <span class="crg-sub t-caption">
        Reynolds, Pasternak &amp; Desimone (2000), Fig.&nbsp;1 — two models of
        how attention modulates the contrast&ndash;response function
      </span>
    </div>

    <div class="crg-stage">
      <!-- LEFT: Chart -->
      <div class="crg-cell">
        <h2 class="crg-section-label t-overline">
          Contrast&ndash;Response Function
        </h2>
        <svg
          :viewBox="`0 0 ${W} ${H}`"
          aria-label="Contrast-response function chart"
          class="crg-svg"
        >
          <!-- Dynamic-range band -->
          <rect
            class="crg-dyn-band"
            :x="bandX"
            :y="MT"
            :width="bandW"
            :height="PH"
          />

          <!-- X gridlines + labels -->
          <template v-for="tick in xTicks" :key="tick.label">
            <line
              class="crg-grid-line"
              :x1="tick.x"
              :y1="MT"
              :x2="tick.x"
              :y2="MT + PH"
            />
            <text
              class="crg-axis-label"
              :x="tick.x"
              :y="MT + PH + 16"
              text-anchor="middle"
            >
              {{ tick.label }}
            </text>
          </template>
          <text
            class="crg-axis-title"
            :x="ML + PW / 2"
            :y="H - 4"
            text-anchor="middle"
          >
            Contrast (%)
          </text>

          <!-- Y-left gridlines + labels (spikes/s) -->
          <template v-for="tick in yLeftTicks" :key="'yl' + tick.label">
            <line
              class="crg-grid-line"
              :x1="ML"
              :y1="tick.y"
              :x2="ML + PW"
              :y2="tick.y"
              :opacity="tick.isZero ? 1 : 0.4"
            />
            <text
              class="crg-axis-label"
              :x="ML - 8"
              :y="tick.y + 3"
              text-anchor="end"
            >
              {{ tick.label }}
            </text>
          </template>
          <text
            class="crg-axis-title"
            :transform="`translate(14,${MT + PH / 2}) rotate(-90)`"
            text-anchor="middle"
          >
            Spikes/s
          </text>

          <!-- Y-right labels (% increase) -->
          <text
            v-for="tick in yRightTicks"
            :key="'yr' + tick.label"
            class="crg-axis-label"
            :x="ML + PW + 8"
            :y="tick.y + 3"
            text-anchor="start"
          >
            {{ tick.label }}
          </text>
          <text
            class="crg-axis-title"
            :transform="`translate(${W - 12},${MT + PH / 2}) rotate(90)`"
            text-anchor="middle"
          >
            % increase
          </text>

          <!-- Curves -->
          <path :d="baseCurvePath" class="crg-curve-unatt" />
          <path :d="attCurvePath" class="crg-curve-att" />
          <path :d="pctCurvePath" class="crg-curve-pct" />

          <!-- Peak marker -->
          <line
            class="crg-peak-line"
            :x1="peakX"
            :y1="MT"
            :x2="peakX"
            :y2="MT + PH"
          />
          <circle class="crg-peak-dot" :cx="peakX" :cy="peakY" r="4" />
          <text
            class="crg-peak-label"
            :x="peakLabelX"
            :y="peakY - 8"
            :text-anchor="peakLabelAnchor"
          >
            {{ peakLabelText }}
          </text>
        </svg>
      </div>

      <!-- RIGHT: Controls -->
      <div class="crg-cell">
        <h2 class="crg-section-label t-overline">Model</h2>
        <div class="crg-toggle">
          <button
            class="crg-toggle-btn"
            :class="{ active: mode === 'shift' }"
            @click="setMode('shift')"
          >
            Contrast gain<br />(shift)
          </button>
          <button
            class="crg-toggle-btn"
            :class="{ active: mode === 'scale' }"
            @click="setMode('scale')"
          >
            Response gain<br />(scale)
          </button>
        </div>

        <h2 class="crg-section-label t-overline" style="margin-top: 20px">
          Attention Strength
        </h2>
        <div class="crg-slider-row">
          <input
            type="range"
            min="1.0"
            max="2.2"
            step="0.01"
            :value="strength"
            class="crg-slider"
            @input="onSlider"
          />
          <span class="crg-slider-val t-mono">
            {{ strength.toFixed(2) }}&times;
          </span>
        </div>

        <div class="crg-reads">
          <div class="crg-r">
            <div class="crg-rk t-overline">Peak effect location</div>
            <div class="crg-rv crg-rv-att t-mono">{{ peakLocText }}</div>
          </div>
          <div class="crg-r">
            <div class="crg-rk t-overline">Peak % increase</div>
            <div class="crg-rv crg-rv-att t-mono">{{ peakValText }}</div>
          </div>
        </div>

        <!-- eslint-disable-next-line vue/no-v-html -->
        <p class="crg-note t-caption" v-html="noteHtml" />
      </div>
    </div>

    <!-- Key -->
    <div class="crg-key">
      <span class="crg-k">
        <span class="crg-swatch crg-swatch-unatt" />Unattended
      </span>
      <span class="crg-k">
        <span class="crg-swatch crg-swatch-att" />Attended
      </span>
      <span class="crg-k">
        <span class="crg-swatch crg-swatch-dash" />% increase (right axis)
      </span>
      <span class="crg-k">
        <span class="crg-swatch crg-swatch-band" />Dynamic range
      </span>
    </div>
  </div>
</template>

<style scoped>
/*
 * Contrast Response Gain — token-swapped from the original hardcoded hex.
 *
 * Colour mapping from original → brand.css tokens:
 *   --bg:#242424       → rgb(var(--color-bg))
 *   --panel:#2c2c2c    → rgb(var(--color-paper))
 *   --ink:#e8e8e8      → rgb(var(--color-ink))
 *   --dim:#8a8a8a      → rgb(var(--color-mute))
 *   --line:#3a3a3a     → rgb(var(--color-line))
 *   --att:#e6178c      → rgb(var(--color-accent))
 *   --att-dim:#7a1450  → rgb(var(--color-accent) / 0.4)
 *   --unatt:#6f9099    → kept as-is (cool grey-blue, no matching token)
 *   --crit:#f4f4f4     → rgb(var(--color-ink))
 */

/* ── Local vars ─────────────────────────────────────────────────────── */
.crg-wrap {
  --crg-ink: rgb(var(--color-ink));
  --crg-mute: rgb(var(--color-mute));
  --crg-line: rgb(var(--color-line));
  --crg-accent: rgb(var(--color-accent));
  --crg-accent-dim: rgb(var(--color-accent) / 0.4);
  --crg-unatt: #6f9099;
  --crg-band: rgb(var(--color-line));

  max-width: 1100px;
  margin: 0 auto;
  padding: 22px;
}

/* ── Header ─────────────────────────────────────────────────────────── */
.crg-head {
  display: flex;
  align-items: baseline;
  gap: 14px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.crg-head h1 {
  margin: 0;
}
.crg-sub {
  color: var(--crg-mute);
}

/* ── Stage grid ─────────────────────────────────────────────────────── */
.crg-stage {
  display: grid;
  grid-template-columns: 1fr 260px;
  gap: 0;
  border: 1px solid var(--crg-line);
  border-radius: 4px;
  overflow: hidden;
  background: rgb(var(--color-paper));
}
.crg-cell {
  padding: 18px;
}
.crg-cell + .crg-cell {
  border-left: 1px solid var(--crg-line);
}
.crg-section-label {
  color: var(--crg-mute);
  margin: 0 0 12px;
}

/* ── SVG ────────────────────────────────────────────────────────────── */
.crg-svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}
.crg-svg text {
  font-family: var(--font-mono, "JetBrains Mono", monospace);
}
.crg-axis-label {
  fill: var(--crg-mute);
  font-size: 10px;
}
.crg-axis-title {
  fill: var(--crg-mute);
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.crg-grid-line {
  stroke: var(--crg-line);
  stroke-width: 1;
}
.crg-dyn-band {
  fill: var(--crg-band);
  opacity: 0.35;
}

/* Curves */
.crg-curve-unatt {
  fill: none;
  stroke: var(--crg-unatt);
  stroke-width: 2.25;
}
.crg-curve-att {
  fill: none;
  stroke: var(--crg-accent);
  stroke-width: 2.25;
}
.crg-curve-pct {
  fill: none;
  stroke: var(--crg-accent);
  stroke-width: 1.5;
  stroke-dasharray: 5 4;
  opacity: 0.85;
}

/* Peak marker */
.crg-peak-line {
  stroke: var(--crg-ink);
  stroke-width: 1;
  stroke-dasharray: 2 3;
  opacity: 0.6;
}
.crg-peak-dot {
  fill: var(--crg-ink);
  stroke: rgb(var(--color-bg));
  stroke-width: 1.5;
}
.crg-peak-label {
  fill: var(--crg-ink);
  font-size: 10px;
}

/* ── Toggle ─────────────────────────────────────────────────────────── */
.crg-toggle {
  display: flex;
  border: 1px solid var(--crg-line);
  border-radius: 3px;
  overflow: hidden;
}
.crg-toggle-btn {
  flex: 1;
  background: transparent;
  border: 0;
  color: var(--crg-mute);
  font-family: var(--font-body, -apple-system, BlinkMacSystemFont, sans-serif);
  font-size: 11.5px;
  padding: 9px 6px;
  cursor: pointer;
  line-height: 1.3;
  transition:
    background 0.12s,
    color 0.12s;
}
.crg-toggle-btn + .crg-toggle-btn {
  border-left: 1px solid var(--crg-line);
}
.crg-toggle-btn.active {
  background: var(--crg-accent-dim);
  color: var(--crg-ink);
}
.crg-toggle-btn:hover:not(.active) {
  background: rgb(var(--color-line) / 0.5);
}
.crg-toggle-btn:focus-visible {
  outline: 2px solid var(--crg-accent);
  outline-offset: -2px;
}

/* ── Slider ─────────────────────────────────────────────────────────── */
.crg-slider-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 2px;
}
.crg-slider {
  -webkit-appearance: none;
  appearance: none;
  flex: 1;
  height: 3px;
  background: var(--crg-line);
  border-radius: 2px;
  outline: none;
}
.crg-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--crg-accent);
  cursor: grab;
  border: 2px solid rgb(var(--color-bg));
  box-shadow: 0 0 0 1px var(--crg-accent);
}
.crg-slider::-webkit-slider-thumb:active {
  cursor: grabbing;
}
.crg-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--crg-accent);
  cursor: grab;
  border: 2px solid rgb(var(--color-bg));
  box-shadow: 0 0 0 1px var(--crg-accent);
}
.crg-slider:focus-visible::-webkit-slider-thumb {
  box-shadow: 0 0 0 3px rgb(var(--color-accent) / 0.4);
}
.crg-slider-val {
  font-size: 12px;
  color: var(--crg-accent);
  min-width: 44px;
  text-align: right;
}

/* ── Readouts ───────────────────────────────────────────────────────── */
.crg-reads {
  margin-top: 18px;
  border-top: 1px solid var(--crg-line);
  padding-top: 12px;
}
.crg-r + .crg-r {
  margin-top: 10px;
}
.crg-rk {
  font-size: 10px;
  color: var(--crg-mute);
}
.crg-rv {
  font-size: 14px;
  color: var(--crg-ink);
  margin-top: 2px;
}
.crg-rv-att {
  color: var(--crg-accent);
}

/* ── Note ───────────────────────────────────────────────────────────── */
.crg-note {
  margin-top: 16px;
  line-height: 1.5;
  color: var(--crg-mute);
  border-top: 1px solid var(--crg-line);
  padding-top: 12px;
}
.crg-note :deep(strong) {
  color: var(--crg-ink);
  font-weight: 600;
}

/* ── Key ────────────────────────────────────────────────────────────── */
.crg-key {
  display: flex;
  gap: 22px;
  flex-wrap: wrap;
  padding: 12px 18px;
  border: 1px solid var(--crg-line);
  border-top: 0;
  border-radius: 0 0 4px 4px;
  font-size: 11.5px;
  color: var(--crg-mute);
}
.crg-k {
  display: flex;
  align-items: center;
  gap: 7px;
}
.crg-swatch {
  width: 16px;
  height: 2.25px;
  border-radius: 1px;
  flex: none;
}
.crg-swatch-unatt {
  background: var(--crg-unatt);
}
.crg-swatch-att {
  background: var(--crg-accent);
}
.crg-swatch-dash {
  background: none;
  border-top: 2px dashed var(--crg-accent);
  height: 0;
  opacity: 0.85;
}
.crg-swatch-band {
  background: var(--crg-band);
  opacity: 0.6;
}

/* ── Reduced motion ─────────────────────────────────────────────────── */
[data-reduce-motion="1"] .crg-toggle-btn {
  transition: none;
}

/* ── Responsive ─────────────────────────────────────────────────────── */
@media (max-width: 820px) {
  .crg-stage {
    grid-template-columns: 1fr;
  }
  .crg-cell + .crg-cell {
    border-left: none;
    border-top: 1px solid var(--crg-line);
  }
}
</style>
