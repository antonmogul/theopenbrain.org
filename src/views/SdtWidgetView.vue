<script setup>
/*
 * SdtWidgetView — Signal Detection Theory interactive widget.
 *
 * Ported from Arjun's sdt_widget.html (chapter-attention/source/widgets/).
 * The maths are extracted into src/helper/sdt.js for testability.
 *
 * Hosting decision: Vue SFC rewrite. The widget consumes brand.css design
 * tokens so it inherits theme/accent preferences automatically. The original
 * maths are preserved verbatim in the helper; only the rendering changed
 * (from imperative DOM to Vue reactive SVG).
 *
 * OPENBRAIN-13: pilot widget for the reusable hosting pattern.
 *
 * Design ownership: Sonia owns design. This is a token-swap only — the
 * widget's interaction and pedagogy are unchanged from the original.
 */
import { ref, computed, onUnmounted } from "vue";
import { Phi, Phinv, pdf, sdtRates } from "@/helper/sdt";

// ── State ──────────────────────────────────────────────────────────────
const dp = ref(1.5); // d-prime (sensitivity)
const criterion = ref(0.75); // criterion position on evidence axis
const preset = ref(0); // 0 = none, 1 = two observers, 2 = same H
const isDragging = ref(false);

// ── Derived values ─────────────────────────────────────────────────────
const rates = computed(() => sdtRates(dp.value, criterion.value));

// ── Evidence axis geometry ─────────────────────────────────────────────
const EX0 = -4;
const EX1 = 6;
const EW = 420;
const EH = 260;
const EPAD = 28;
const PKH = 150;

/** Map evidence-axis value → SVG x coordinate. */
function ex(v) {
  return 20 + ((v - EX0) / (EX1 - EX0)) * (EW - 40);
}

/** Map SVG x coordinate → evidence-axis value (inverse of ex). */
function exInv(px) {
  return EX0 + ((px - 20) / (EW - 40)) * (EX1 - EX0);
}

/** Map density value → SVG y coordinate. */
function ey(d) {
  return EH - EPAD - (d / pdf(0)) * PKH;
}

// ── SVG path builders ──────────────────────────────────────────────────

/** Build a filled area path for N(mean, 1) between [a, b]. */
function areaPath(mean, a, b) {
  const step = (b - a) / 60;
  let d = `M ${ex(a)} ${ey(0)}`;
  for (let x = a; x <= b + 1e-9; x += step) {
    d += ` L ${ex(x)} ${ey(pdf(x - mean))}`;
  }
  d += ` L ${ex(b)} ${ey(0)} Z`;
  return d;
}

/** Build the outline curve path for N(mean, 1). */
function curvePath(mean) {
  let d = "";
  for (let x = EX0; x <= EX1 + 1e-9; x += 0.1) {
    d += (d ? " L " : "M ") + ex(x) + " " + ey(pdf(x - mean));
  }
  return d;
}

// ── Computed SVG paths ─────────────────────────────────────────────────
const baseLine = computed(() => ey(0));
const critX = computed(() => ex(criterion.value));

// Shaded regions
const correctRejectPath = computed(() => areaPath(0, EX0, criterion.value));
const falseAlarmPath = computed(() => areaPath(0, criterion.value, EX1));
const missPath = computed(() => areaPath(dp.value, EX0, criterion.value));
const hitPath = computed(() => areaPath(dp.value, criterion.value, EX1));

// Outline curves
const noiseCurve = computed(() => curvePath(0));
const signalCurve = computed(() => curvePath(dp.value));

// Mean tick positions
const noiseMeanX = computed(() => ex(0));
const signalMeanX = computed(() => ex(dp.value));

// d′ label
const dpLabelX = computed(() => ex(dp.value / 2));
const dpLabelY = computed(() => baseLine.value + 16);
const dpLabelText = computed(() => `d′ = ${dp.value.toFixed(2)}`);

// Criterion line top
const critLineTop = computed(() => ey(pdf(0)) - 6);

// ── ROC geometry ───────────────────────────────────────────────────────
const RW = 260;
const RH = 260;
const RM = 34;

function rx(f) {
  return RM + f * (RW - RM - 14);
}
function ry(h) {
  return RH - RM - h * (RH - RM - 14);
}

/** Build ROC curve path for a given d′. */
function rocCurve(d) {
  let s = "";
  for (let c = 6; c >= -6; c -= 0.06) {
    const F = Phi(-c);
    const H = Phi(d - c);
    s += (s ? " L " : "M ") + rx(F).toFixed(1) + " " + ry(H).toFixed(1);
  }
  return s;
}

const rocMainCurve = computed(() => rocCurve(dp.value));
const rocGhostCurve = computed(() => (preset.value === 2 ? rocCurve(0.8) : ""));
const rocDotCx = computed(() => rx(rates.value.falseAlarmRate));
const rocDotCy = computed(() => ry(rates.value.hitRate));
const rocDiagX1 = computed(() => rx(0));
const rocDiagY1 = computed(() => ry(0));
const rocDiagX2 = computed(() => rx(1));
const rocDiagY2 = computed(() => ry(1));
const rocLabelX = computed(() => (rx(0) + rx(1)) / 2);
const rocLabelYAxis = computed(() => (ry(0) + ry(1)) / 2);

// Ghost markers for presets
const ghostMarkers = computed(() => {
  if (preset.value === 1) {
    // Two observers, same d′
    return [-0.4, 1.4].map((cc) => ({
      cx: rx(Phi(-cc)),
      cy: ry(Phi(dp.value - cc)),
      cool: false,
    }));
  }
  if (preset.value === 2) {
    // Same H on two different d′ curves
    const H = 0.75;
    const c1 = dp.value - Phinv(H);
    const c2 = 0.8 - Phinv(H);
    return [
      { cx: rx(Phi(-c1)), cy: ry(H), cool: false },
      { cx: rx(Phi(-c2)), cy: ry(H), cool: true },
    ];
  }
  return [];
});

// ── Readouts ───────────────────────────────────────────────────────────
const hitRateText = computed(() => rates.value.hitRate.toFixed(3));
const falseAlarmText = computed(() => rates.value.falseAlarmRate.toFixed(3));
const dpText = computed(() => dp.value.toFixed(2));
const criterionText = computed(() => {
  const c = rates.value.criterion;
  return (c >= 0 ? "+" : "") + c.toFixed(2);
});

// ── Preset notes ───────────────────────────────────────────────────────
const NOTES = {
  0: "Drag the criterion line to sweep along one ROC curve — sensitivity holds, only bias moves. Change d′ to jump to a different curve.",
  1: "<b>Two observers, identical d′.</b> Same sensitivity, different criteria — their hit and false-alarm rates diverge, yet both sit on the <em>same</em> curve. Raw performance would call them different; d′ does not.",
  2: "<b>Same hit rate, different d′.</b> Both observers report the signal equally often, but one sits on a curve bowed further from the diagonal. Equal H, unequal sensitivity — the hit rate alone hides it.",
};
const noteHtml = computed(() => NOTES[preset.value]);

// ── Interactions ───────────────────────────────────────────────────────

function onSlider(e) {
  dp.value = +e.target.value;
  if (preset.value) clearPreset();
}

function togglePreset(n) {
  if (preset.value === n) {
    clearPreset();
    return;
  }
  preset.value = n;
  if (n === 1) {
    dp.value = 1.5;
  }
  if (n === 2) {
    dp.value = 1.8;
  }
}

function clearPreset() {
  preset.value = 0;
}

// ── Criterion dragging ─────────────────────────────────────────────────
const distSvgRef = ref(null);

function startDrag(e) {
  e.preventDefault();
  isDragging.value = true;
  moveCriterion(e);
  window.addEventListener("pointermove", moveCriterion);
  window.addEventListener("pointerup", stopDrag, { once: true });
}

function moveCriterion(e) {
  const svg = distSvgRef.value;
  if (!svg) return;
  const rect = svg.getBoundingClientRect();
  const px = ((e.clientX - rect.left) / rect.width) * EW;
  criterion.value = Math.max(EX0 + 0.2, Math.min(EX1 - 0.2, exInv(px)));
}

function stopDrag() {
  isDragging.value = false;
  window.removeEventListener("pointermove", moveCriterion);
}

// ── Keyboard: arrow keys move criterion ────────────────────────────────
function onKeydown(e) {
  const STEP = 0.1;
  if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
    e.preventDefault();
    criterion.value = Math.max(EX0 + 0.2, criterion.value - STEP);
  } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
    e.preventDefault();
    criterion.value = Math.min(EX1 - 0.2, criterion.value + STEP);
  }
}

// Clean up listeners on unmount
onUnmounted(() => {
  window.removeEventListener("pointermove", moveCriterion);
});
</script>

<template>
  <div class="sdt-wrap">
    <div class="sdt-head">
      <h1 class="t-label">Signal Detection Theory</h1>
      <span class="sdt-sub t-caption">
        drag the criterion &middot; move d&prime; &middot; watch the ROC
      </span>
    </div>

    <div class="sdt-stage">
      <!-- LEFT: Evidence axis -->
      <div class="sdt-cell">
        <h2 class="sdt-section-label t-overline">Evidence axis</h2>
        <svg
          ref="distSvgRef"
          :viewBox="`0 0 ${EW} ${EH}`"
          aria-label="Noise and signal distributions with draggable criterion"
          class="sdt-svg"
        >
          <!-- Baseline -->
          <line
            :x1="ex(EX0)"
            :y1="baseLine"
            :x2="ex(EX1)"
            :y2="baseLine"
            class="sdt-baseline"
          />

          <!-- Shaded outcome regions -->
          <path :d="correctRejectPath" class="sdt-fill-noise-dim" />
          <path :d="falseAlarmPath" class="sdt-fill-noise" />
          <path :d="missPath" class="sdt-fill-signal-dim" />
          <path :d="hitPath" class="sdt-fill-signal" />

          <!-- Outline curves -->
          <path :d="noiseCurve" class="sdt-stroke-noise" />
          <path :d="signalCurve" class="sdt-stroke-signal" />

          <!-- Mean ticks -->
          <line
            :x1="noiseMeanX"
            :y1="baseLine"
            :x2="noiseMeanX"
            :y2="baseLine + 5"
            class="sdt-stroke-noise sdt-tick"
          />
          <line
            :x1="signalMeanX"
            :y1="baseLine"
            :x2="signalMeanX"
            :y2="baseLine + 5"
            class="sdt-stroke-signal sdt-tick"
          />

          <!-- d′ span label -->
          <line
            :x1="ex(0)"
            :y1="dpLabelY"
            :x2="ex(dp)"
            :y2="dpLabelY"
            class="sdt-stroke-mute"
          />
          <text
            :x="dpLabelX"
            :y="dpLabelY + 12"
            class="sdt-label-mute"
            text-anchor="middle"
          >
            {{ dpLabelText }}
          </text>

          <!-- Criterion line -->
          <line
            :x1="critX"
            :y1="baseLine + 6"
            :x2="critX"
            :y2="critLineTop"
            class="sdt-criterion-line"
          />
          <text
            :x="critX"
            y="22"
            class="sdt-criterion-label"
            text-anchor="middle"
          >
            criterion
          </text>

          <!-- Invisible drag target -->
          <rect
            :x="critX - 11"
            y="10"
            width="22"
            :height="baseLine - 4"
            fill="transparent"
            style="cursor: ew-resize"
            tabindex="0"
            role="slider"
            :aria-valuenow="criterion.toFixed(2)"
            aria-valuemin="-3.8"
            aria-valuemax="5.8"
            aria-label="Criterion position"
            @pointerdown="startDrag"
            @keydown="onKeydown"
          />
        </svg>

        <!-- Readouts -->
        <div class="sdt-reads">
          <div class="sdt-r">
            <div class="sdt-k t-overline">HIT&nbsp;RATE&nbsp;H</div>
            <div class="sdt-v sdt-v-signal t-mono">{{ hitRateText }}</div>
          </div>
          <div class="sdt-r">
            <div class="sdt-k t-overline">FALSE&nbsp;ALARM&nbsp;F</div>
            <div class="sdt-v sdt-v-noise t-mono">{{ falseAlarmText }}</div>
          </div>
          <div class="sdt-r">
            <div class="sdt-k t-overline">d&prime;</div>
            <div class="sdt-v t-mono">{{ dpText }}</div>
          </div>
          <div class="sdt-r">
            <div class="sdt-k t-overline">CRITERION&nbsp;c</div>
            <div class="sdt-v t-mono">{{ criterionText }}</div>
          </div>
        </div>

        <!-- d′ slider -->
        <div class="sdt-ctl">
          <label class="sdt-slider-label t-overline">
            d&prime;
            <input
              type="range"
              min="0"
              max="3"
              step="0.01"
              :value="dp"
              @input="onSlider"
              class="sdt-slider"
            />
          </label>
        </div>
      </div>

      <!-- MIDDLE: ROC -->
      <div class="sdt-cell">
        <h2 class="sdt-section-label t-overline">ROC space</h2>
        <svg
          :viewBox="`0 0 ${RW} ${RH}`"
          aria-label="Receiver operating characteristic curve"
          class="sdt-svg"
        >
          <!-- Frame -->
          <rect
            :x="RM"
            y="14"
            :width="RW - RM - 14"
            :height="RH - RM - 14"
            fill="none"
            class="sdt-roc-frame"
          />
          <!-- Chance diagonal -->
          <line
            :x1="rocDiagX1"
            :y1="rocDiagY1"
            :x2="rocDiagX2"
            :y2="rocDiagY2"
            class="sdt-roc-chance"
          />
          <!-- Axis labels -->
          <text
            :x="rocLabelX"
            :y="RH - 6"
            class="sdt-label-mute"
            text-anchor="middle"
          >
            false alarm F
          </text>
          <text
            x="12"
            :y="rocLabelYAxis"
            class="sdt-label-mute"
            text-anchor="middle"
            :transform="`rotate(-90 12 ${rocLabelYAxis})`"
          >
            hit rate H
          </text>

          <!-- Ghost curve (preset 2) -->
          <path
            v-if="rocGhostCurve"
            :d="rocGhostCurve"
            class="sdt-roc-ghost-curve"
          />
          <!-- Main ROC curve -->
          <path :d="rocMainCurve" class="sdt-roc-main-curve" />

          <!-- Ghost markers -->
          <circle
            v-for="(g, i) in ghostMarkers"
            :key="i"
            :cx="g.cx"
            :cy="g.cy"
            r="4"
            fill="none"
            :class="g.cool ? 'sdt-ghost-cool' : 'sdt-ghost-warm'"
          />

          <!-- Live dot -->
          <circle :cx="rocDotCx" :cy="rocDotCy" r="5" class="sdt-roc-dot" />
        </svg>

        <!-- Preset buttons -->
        <div class="sdt-presets">
          <button
            :class="{ 'sdt-btn-on': preset === 1 }"
            class="sdt-btn"
            @click="togglePreset(1)"
          >
            Two observers, same d&prime;
          </button>
          <button
            :class="{ 'sdt-btn-on': preset === 2 }"
            class="sdt-btn"
            @click="togglePreset(2)"
          >
            Same H, different d&prime;
          </button>
        </div>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <p class="sdt-note t-caption" v-html="noteHtml" />
      </div>

      <!-- RIGHT: Key -->
      <div class="sdt-cell sdt-key">
        <h2 class="sdt-section-label t-overline">Key</h2>
        <div class="sdt-key-row t-overline">
          <span class="sdt-swatch sdt-swatch-noise" />noise
        </div>
        <div class="sdt-key-row t-overline">
          <span class="sdt-swatch sdt-swatch-signal" />signal + noise
        </div>
        <div class="sdt-key-row t-overline">
          <span class="sdt-key-line" />criterion
        </div>
        <div class="sdt-key-row t-overline">
          <span class="sdt-swatch sdt-swatch-signal" />hit
        </div>
        <div class="sdt-key-row t-overline">
          <span class="sdt-swatch sdt-swatch-signal-dim" />miss
        </div>
        <div class="sdt-key-row t-overline">
          <span class="sdt-swatch sdt-swatch-noise" />false alarm
        </div>
        <div class="sdt-key-row t-overline">
          <span class="sdt-swatch sdt-swatch-noise-dim" />correct reject
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * SDT Widget styles — token-swapped from the original hardcoded hex.
 *
 * Colour mapping from original → brand.css tokens:
 *   --bg:#242424       → rgb(var(--color-bg))
 *   --panel:#2c2c2c    → rgb(var(--color-paper))
 *   --ink:#e8e8e8      → rgb(var(--color-ink))
 *   --dim:#8a8a8a      → rgb(var(--color-mute))
 *   --line:#3a3a3a     → rgb(var(--color-line))
 *   --signal:#e6178c   → rgb(var(--color-accent))     (≈ #E91E8C)
 *   --noise:#6f9099    → kept as-is (no matching token; cool grey-blue)
 *
 * The noise/signal dim variants are opacity-shifted from the base colours.
 */

/* ── Local vars (scoped to the widget) ───────────────────────────────── */
.sdt-wrap {
  --sdt-noise: #6f9099;
  --sdt-noise-dim: #3d4f53;
  --sdt-signal: rgb(var(--color-accent));
  --sdt-signal-dim: rgb(var(--color-accent) / 0.4);
  --sdt-crit: rgb(var(--color-ink));
  --sdt-line: rgb(var(--color-line));
  --sdt-mute: rgb(var(--color-mute));
  --sdt-ink: rgb(var(--color-ink));

  max-width: 1100px;
  margin: 0 auto;
  padding: 22px;
}

/* ── Header ──────────────────────────────────────────────────────────── */
.sdt-head {
  display: flex;
  align-items: baseline;
  gap: 14px;
  margin-bottom: 4px;
}
.sdt-sub {
  color: var(--sdt-mute);
}

/* ── Stage grid ──────────────────────────────────────────────────────── */
.sdt-stage {
  display: grid;
  grid-template-columns: 1fr 1fr 176px;
  gap: 0;
  border: 1px solid var(--sdt-line);
  border-radius: 4px;
  overflow: hidden;
  background: rgb(var(--color-paper));
}

.sdt-cell {
  padding: 16px;
}
.sdt-cell + .sdt-cell {
  border-left: 1px solid var(--sdt-line);
}

.sdt-section-label {
  color: var(--sdt-mute);
  margin: 0 0 10px;
}

/* ── SVG ─────────────────────────────────────────────────────────────── */
.sdt-svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}
.sdt-svg text {
  font-family: var(--font-mono, "JetBrains Mono", monospace);
}

.sdt-baseline {
  stroke: var(--sdt-line);
  stroke-width: 1;
}

/* Filled regions */
.sdt-fill-noise-dim {
  fill: var(--sdt-noise-dim);
  fill-opacity: 0.9;
}
.sdt-fill-noise {
  fill: var(--sdt-noise);
  fill-opacity: 0.55;
}
.sdt-fill-signal-dim {
  fill: var(--sdt-signal-dim);
  fill-opacity: 0.9;
}
.sdt-fill-signal {
  fill: var(--sdt-signal);
  fill-opacity: 0.6;
}

/* Outline curves */
.sdt-stroke-noise {
  fill: none;
  stroke: var(--sdt-noise);
  stroke-width: 1.5;
}
.sdt-stroke-signal {
  fill: none;
  stroke: var(--sdt-signal);
  stroke-width: 1.5;
}
.sdt-tick {
  fill: none;
}
.sdt-stroke-mute {
  stroke: var(--sdt-mute);
  stroke-width: 1;
}
.sdt-label-mute {
  fill: var(--sdt-mute);
  font-size: 10px;
}

/* Criterion */
.sdt-criterion-line {
  stroke: var(--sdt-crit);
  stroke-width: 2;
}
.sdt-criterion-label {
  fill: var(--sdt-crit);
  font-size: 10px;
}

/* ── Readouts ────────────────────────────────────────────────────────── */
.sdt-reads {
  display: flex;
  gap: 0;
  margin-top: 12px;
  border-top: 1px solid var(--sdt-line);
}
.sdt-r {
  flex: 1;
  padding: 9px 4px;
  text-align: center;
}
.sdt-r + .sdt-r {
  border-left: 1px solid var(--sdt-line);
}
.sdt-k {
  font-size: 10px;
  color: var(--sdt-mute);
}
.sdt-v {
  font-size: 17px;
  margin-top: 3px;
  color: var(--sdt-ink);
}
.sdt-v-signal {
  color: var(--sdt-signal);
}
.sdt-v-noise {
  color: var(--sdt-noise);
}

/* ── Controls ────────────────────────────────────────────────────────── */
.sdt-ctl {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  flex-wrap: wrap;
}
.sdt-slider-label {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--sdt-mute);
  font-size: 11px;
}
.sdt-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 180px;
  height: 2px;
  background: var(--sdt-line);
  border-radius: 2px;
  outline: none;
}
.sdt-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--sdt-signal);
  cursor: pointer;
  border: 2px solid rgb(var(--color-bg));
}
.sdt-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--sdt-signal);
  cursor: pointer;
  border: 2px solid rgb(var(--color-bg));
}
.sdt-slider:focus-visible::-webkit-slider-thumb {
  box-shadow: 0 0 0 3px rgb(var(--color-accent) / 0.4);
}

/* ── ROC ─────────────────────────────────────────────────────────────── */
.sdt-roc-frame {
  stroke: var(--sdt-line);
  stroke-width: 1;
}
.sdt-roc-chance {
  stroke: var(--sdt-line);
  stroke-width: 1;
  stroke-dasharray: 3 3;
}
.sdt-roc-main-curve {
  fill: none;
  stroke: var(--sdt-ink);
  stroke-width: 1.6;
}
.sdt-roc-ghost-curve {
  fill: none;
  stroke: var(--sdt-noise);
  stroke-width: 1.2;
  stroke-opacity: 0.5;
}
.sdt-roc-dot {
  fill: var(--sdt-signal);
  stroke: rgb(var(--color-bg));
  stroke-width: 1.5;
}
.sdt-ghost-warm {
  stroke: var(--sdt-ink);
  stroke-width: 1.5;
  stroke-opacity: 0.85;
}
.sdt-ghost-cool {
  stroke: var(--sdt-noise);
  stroke-width: 1.5;
  stroke-opacity: 0.85;
}

/* ── Presets & note ──────────────────────────────────────────────────── */
.sdt-presets {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}
.sdt-btn {
  font-family: var(--font-mono, "JetBrains Mono", monospace);
  font-size: 11px;
  letter-spacing: 0.03em;
  background: transparent;
  color: var(--sdt-ink);
  border: 1px solid var(--sdt-line);
  padding: 7px 11px;
  border-radius: 3px;
  cursor: pointer;
  transition:
    border-color 0.12s,
    color 0.12s;
}
.sdt-btn:hover {
  border-color: var(--sdt-mute);
}
.sdt-btn-on {
  border-color: var(--sdt-signal);
  color: var(--sdt-signal);
}
.sdt-btn:focus-visible {
  outline: 2px solid var(--sdt-signal);
  outline-offset: 2px;
}

.sdt-note {
  color: var(--sdt-mute);
  margin: 14px 0 0;
  min-height: 34px;
  line-height: 1.5;
}
.sdt-note :deep(b) {
  color: var(--sdt-ink);
  font-weight: 600;
}

/* ── Key panel ───────────────────────────────────────────────────────── */
.sdt-key-row {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 11px;
  font-size: 11px;
  color: var(--sdt-ink);
}
.sdt-swatch {
  width: 16px;
  height: 12px;
  border-radius: 2px;
  flex: none;
}
.sdt-swatch-noise {
  background: var(--sdt-noise);
}
.sdt-swatch-noise-dim {
  background: var(--sdt-noise-dim);
}
.sdt-swatch-signal {
  background: var(--sdt-signal);
}
.sdt-swatch-signal-dim {
  background: var(--sdt-signal-dim);
}
.sdt-key-line {
  width: 16px;
  height: 0;
  border-top: 2px solid var(--sdt-crit);
  flex: none;
}

/* ── Reduced motion ──────────────────────────────────────────────────── */
[data-reduce-motion="1"] .sdt-btn {
  transition: none;
}

/* ── Responsive ──────────────────────────────────────────────────────── */
@media (max-width: 820px) {
  .sdt-stage {
    grid-template-columns: 1fr;
  }
  .sdt-cell + .sdt-cell {
    border-left: none;
    border-top: 1px solid var(--sdt-line);
  }
}
</style>
