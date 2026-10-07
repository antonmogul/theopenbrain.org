<script setup>
/*
 * PsychometricFunctionView — "The psychometric function" box widget.
 *
 * Ported from Arjun Krishnaswamy's psychometric_function_widget.html
 * (Attention & Working Memory chapter; original kept byte-for-byte in
 * src/widgets/source/). OPENBRAIN-88.
 *
 * Present a stimulus at a range of strengths: hover (or drag/tap) along the
 * plot to scrub the strength, switch the cartoon between a tone in noise and
 * a spot of light, and step through five presets (baseline, lower threshold,
 * liberal bias, high lapse, threshold vs. bias). Maths in
 * src/helper/psychometric.js.
 *
 * Like the other ports since OPENBRAIN-75 this keeps the author's look —
 * palette, system sans / mono fonts, layout — scoped to this component
 * rather than restyled into brand.css tokens.
 *
 * Deviations from the original, all additive:
 *  - The plot scrubs with pointer events (mouse hover as before, plus touch
 *    drag and tap), and is a keyboard slider (arrows ±1, Shift/PageUp/Down
 *    ±10, Home/End).
 *  - Both SVGs scale down with their container instead of being fixed-pixel,
 *    and below 520px of container width the outer and card padding shrink,
 *    so the widget fits a 390px phone and the reader's widget stage.
 *  - In the original, the `.annot` / `.annot-strong` CSS classes override the
 *    `fill` attributes given to the annotation text (a CSS rule always beats
 *    an SVG presentation attribute), so every label renders ink or muted,
 *    never teal/amber. The port reproduces that rendering and drops the
 *    dead attributes.
 */
import { computed, reactive, ref } from "vue";
import { PRESETS, halfPoint, psi } from "@/helper/psychometric";

// ---- palette (the original's :root custom properties) -------------------
const TEAL = "#0d8b8b";
const AMBER = "#d99a1f";
const GHOST = "#bdb9b0";
const AXIS = "#8d8880";
const GRID = "#ece9e2";
const GLYPH = "#3d3a35";
const MUTED = "#6f6b63";

const PRESET_BUTTONS = [
  { id: "baseline", label: "Baseline" },
  { id: "threshold", label: "Lower threshold" },
  { id: "bias", label: "Liberal bias" },
  { id: "lapse", label: "High lapse rate" },
  { id: "compare", label: "Threshold vs. bias" },
];

// Captions as [text, bold] runs (the original set them with innerHTML).
const CAPTIONS = {
  baseline: [
    ["Baseline.", true],
    [
      " Detection climbs from almost never to almost always over a narrow band of stimulus strengths. Two numbers summarise the curve: the ",
    ],
    ["threshold", true],
    [", the strength at which the observer says yes half the time, and the "],
    ["slope", true],
    [", how abruptly the transition happens."],
  ],
  threshold: [
    ["Lower threshold.", true],
    [
      " The observer has become more sensitive, and the whole curve slides toward weaker stimuli. The bottom of the curve stays on the floor: with no stimulus present, this observer still says no.",
    ],
  ],
  bias: [
    ["Liberal bias.", true],
    [
      " This observer is simply more willing to say yes. The curve also slides toward weaker stimuli — but now it lifts off the floor, because they report a stimulus on a quarter of the trials where nothing was presented at all.",
    ],
  ],
  lapse: [
    ["High lapse rate.", true],
    [
      " The curve never reaches the ceiling. However strong the stimulus, some trials are missed — not because the stimulus was too weak, but because the observer was not attending on that trial.",
    ],
  ],
  compare: [
    ["The problem.", true],
    [
      " A more sensitive observer and a more willing one produce curves that are nearly superimposable through the middle of the range. They separate only at the far left, where nothing was presented and one observer is saying yes anyway. That number — the ",
    ],
    ["false alarm rate", true],
    [
      " — is what tells the two apart, and it is where signal detection theory begins.",
    ],
  ],
};

const state = reactive({ preset: "baseline", modality: "sound", strength: 50 });

// ---- plot geometry ------------------------------------------------------
const W = 490;
const H = 340;
const M = { t: 16, r: 20, b: 52, l: 60 };
const pw = W - M.l - M.r;
const ph = H - M.t - M.b;
const X = (v) => M.l + (v / 100) * pw;
const Y = (v) => M.t + (1 - v) * ph;

function curvePath(p) {
  let d = "";
  let first = true;
  for (let x = 0; x <= 100.0001; x += 0.5) {
    d += (first ? "M" : "L") + X(x).toFixed(2) + " " + Y(psi(x, p)).toFixed(2);
    first = false;
  }
  return d;
}

const Y_TICKS = [0, 0.25, 0.5, 0.75, 1];
const X_TICKS = [0, 25, 50, 75, 100];
const Y_LABEL_Y = M.t + ph / 2;

const BASELINE_PATH = curvePath(PRESETS.baseline);
const PRESET_PATHS = Object.fromEntries(
  Object.entries(PRESETS).map(([k, p]) => [k, curvePath(p)])
);

const showGhost = computed(
  () => state.preset !== "baseline" && state.preset !== "compare"
);
const activeParams = computed(() =>
  state.preset === "compare" ? PRESETS.threshold : PRESETS[state.preset]
);
const pYes = computed(() => psi(state.strength, activeParams.value));

// Threshold marker (baseline / lower threshold presets).
const thresholdMark = computed(() => {
  const p = activeParams.value;
  return { x: X(p.alpha), y: Y(halfPoint(p)) };
});

// Liberal bias: false-alarm floor.
const FA_Y = Y(psi(0, PRESETS.bias));

// High lapse: ceiling.
const LAPSE_TOP_Y = Y(1 - PRESETS.lapse.lambda);

// Threshold vs. bias bracket at x = 0.
const CMP_YT = psi(0, PRESETS.threshold);
const CMP_YB = psi(0, PRESETS.bias);
const CMP_BX = X(0) + 16;
const CMP_MID_Y = Y((CMP_YT + CMP_YB) / 2);
const LEGEND_X = X(62);
const LEGEND_Y = Y(0.3);

// ---- scrub (pointer + keyboard) ----------------------------------------
const plotEl = ref(null);

function clampStrength(v) {
  return Math.max(0, Math.min(100, v));
}

function scrubTo(ev) {
  const el = plotEl.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  if (!rect.width) return;
  const sx = (ev.clientX - rect.left) * (W / rect.width);
  state.strength = clampStrength(((sx - M.l) / pw) * 100);
}

// Mouse: hovering scrubs, as in the original. Touch / pen: tap sets the
// strength and a horizontal drag scrubs (touch-action: pan-y leaves
// vertical page scrolling to the browser).
function onPointerDown(ev) {
  const el = ev.currentTarget;
  if (ev.pointerType !== "mouse" && el && el.setPointerCapture) {
    try {
      el.setPointerCapture(ev.pointerId);
    } catch {
      /* capture is a nicety; scrubbing works without it */
    }
  }
  scrubTo(ev);
}

function onKeydown(ev) {
  const big = 10;
  const step = ev.shiftKey ? big : 1;
  const now = Math.round(state.strength);
  let next = null;
  switch (ev.key) {
    case "ArrowRight":
    case "ArrowUp":
      next = now + step;
      break;
    case "ArrowLeft":
    case "ArrowDown":
      next = now - step;
      break;
    case "PageUp":
      next = now + big;
      break;
    case "PageDown":
      next = now - big;
      break;
    case "Home":
      next = 0;
      break;
    case "End":
      next = 100;
      break;
    default:
      return;
  }
  ev.preventDefault();
  state.strength = clampStrength(next);
}

const strengthLabel = computed(() => String(Math.round(state.strength)));
const pLabel = computed(() => pYes.value.toFixed(2));

// ---- cartoon ------------------------------------------------------------
const wavePath = computed(() => {
  const s = state.strength / 100;
  const amp = 3 + s * 52;
  let d = "";
  for (let i = 0; i <= 120; i++) {
    const cx = 14 + i * (118 / 120);
    const yy = 98 - amp * Math.sin((i / 120) * Math.PI * 6);
    d += (i ? "L" : "M") + cx.toFixed(2) + " " + yy.toFixed(2);
  }
  return d;
});

const spotFill = computed(() => {
  const lum = Math.round(125 + (state.strength / 100) * 128);
  return `rgb(${lum},${lum},${lum})`;
});

// ---- controls -----------------------------------------------------------
function setPreset(id) {
  state.preset = id;
}
function setMod(m) {
  state.modality = m;
}
</script>

<template>
  <div class="widget-root pf-root">
    <div class="pf-page">
      <div class="pf-widget">
        <p class="pf-eyebrow">Box &middot; measuring detection</p>
        <h1 class="pf-title">The psychometric function</h1>
        <p class="pf-lede">
          Present a stimulus at a range of strengths and record how often the
          observer says they detected it. The resulting curve is the same shape
          whatever the stimulus is made of &mdash; and three very different
          things can change it.
        </p>

        <div class="pf-row">
          <div class="pf-cartoon-panel">
            <div class="pf-seg" role="group" aria-label="Stimulus modality">
              <button
                type="button"
                :aria-pressed="String(state.modality === 'sound')"
                @click="setMod('sound')"
              >
                Sound
              </button>
              <button
                type="button"
                :aria-pressed="String(state.modality === 'light')"
                @click="setMod('light')"
              >
                Light
              </button>
            </div>
            <div class="pf-cartoon-box">
              <svg
                class="pf-cartoon"
                width="210"
                height="196"
                viewBox="0 0 210 196"
                role="img"
                aria-label="Stimulus at the selected strength"
              >
                <rect x="0" y="0" width="210" height="196" fill="#fff" />
                <template v-if="state.modality === 'sound'">
                  <path
                    :d="wavePath"
                    fill="none"
                    :stroke="TEAL"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                  <line
                    x1="14"
                    x2="132"
                    y1="98"
                    y2="98"
                    stroke="#e3dfd7"
                    stroke-width="1"
                  />
                  <path
                    d="M176 62 C158 58 146 74 147 94 C148 114 156 126 160 136 C164 146 170 150 176 148"
                    fill="none"
                    :stroke="GLYPH"
                    stroke-width="2.2"
                    stroke-linecap="round"
                  />
                  <path
                    d="M171 80 C160 82 157 96 163 105 C168 112 174 111 176 106"
                    fill="none"
                    :stroke="GLYPH"
                    stroke-width="1.8"
                    stroke-linecap="round"
                  />
                  <text x="105" y="180" text-anchor="middle" class="annot">
                    a tone in noise
                  </text>
                </template>
                <template v-else>
                  <rect
                    x="14"
                    y="24"
                    width="118"
                    height="118"
                    rx="3"
                    fill="#7d7a75"
                  />
                  <circle cx="73" cy="83" r="30" :fill="spotFill" />
                  <path
                    d="M144 83 Q170 60 196 83 Q170 106 144 83 Z"
                    fill="none"
                    :stroke="GLYPH"
                    stroke-width="2.2"
                    stroke-linejoin="round"
                  />
                  <circle
                    cx="170"
                    cy="83"
                    r="9"
                    fill="none"
                    :stroke="GLYPH"
                    stroke-width="2"
                  />
                  <circle cx="170" cy="83" r="3.4" :fill="GLYPH" />
                  <text x="105" y="180" text-anchor="middle" class="annot">
                    a spot against grey
                  </text>
                </template>
              </svg>
            </div>
            <div class="pf-readout">
              <span
                >strength <b>{{ strengthLabel }}</b></span
              >
              <span
                >P(&ldquo;yes&rdquo;) <b>{{ pLabel }}</b></span
              >
            </div>
          </div>

          <div class="pf-plot-panel">
            <svg
              ref="plotEl"
              class="pf-plot"
              :width="W"
              :height="H"
              :viewBox="`0 0 ${W} ${H}`"
              role="slider"
              tabindex="0"
              aria-label="Psychometric function: stimulus strength"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-valuenow="strengthLabel"
              :aria-valuetext="`strength ${strengthLabel}, P(yes) ${pLabel}`"
              @pointerdown="onPointerDown"
              @pointermove="scrubTo"
              @keydown="onKeydown"
            >
              <!-- gridlines + y ticks -->
              <g v-for="v in Y_TICKS" :key="`y${v}`">
                <line
                  :x1="M.l"
                  :x2="M.l + pw"
                  :y1="Y(v)"
                  :y2="Y(v)"
                  :stroke="GRID"
                  stroke-width="1"
                />
                <text
                  :x="M.l - 10"
                  :y="Y(v) + 4"
                  text-anchor="end"
                  class="ticklabel"
                >
                  {{ v.toFixed(2) }}
                </text>
              </g>

              <!-- axes -->
              <line
                :x1="M.l"
                :x2="M.l + pw"
                :y1="Y(0)"
                :y2="Y(0)"
                :stroke="AXIS"
                stroke-width="1.25"
              />
              <line
                :x1="M.l"
                :x2="M.l"
                :y1="Y(0)"
                :y2="Y(1)"
                :stroke="AXIS"
                stroke-width="1.25"
              />

              <!-- x ticks -->
              <g v-for="v in X_TICKS" :key="`x${v}`">
                <line
                  :x1="X(v)"
                  :x2="X(v)"
                  :y1="Y(0)"
                  :y2="Y(0) + 5"
                  :stroke="AXIS"
                  stroke-width="1.25"
                />
                <text
                  :x="X(v)"
                  :y="Y(0) + 19"
                  text-anchor="middle"
                  class="ticklabel"
                >
                  {{ v }}
                </text>
              </g>

              <!-- axis labels -->
              <text
                :x="M.l + pw / 2"
                :y="H - 12"
                text-anchor="middle"
                class="axlabel"
              >
                Stimulus strength
              </text>
              <text
                x="16"
                :y="Y_LABEL_Y"
                text-anchor="middle"
                class="axlabel"
                :transform="`rotate(-90 16 ${Y_LABEL_Y})`"
              >
                Proportion “yes”
              </text>

              <!-- baseline ghost -->
              <template v-if="showGhost">
                <path
                  :d="BASELINE_PATH"
                  fill="none"
                  :stroke="GHOST"
                  stroke-width="1.6"
                  stroke-dasharray="4 4"
                />
                <text
                  :x="X(74)"
                  :y="Y(psi(74, PRESETS.baseline)) + 18"
                  class="annot"
                >
                  baseline
                </text>
              </template>

              <!-- threshold vs. bias -->
              <template v-if="state.preset === 'compare'">
                <path
                  :d="PRESET_PATHS.threshold"
                  fill="none"
                  :stroke="TEAL"
                  stroke-width="2.6"
                  stroke-linecap="round"
                />
                <path
                  :d="PRESET_PATHS.bias"
                  fill="none"
                  :stroke="AMBER"
                  stroke-width="2.6"
                  stroke-linecap="round"
                  stroke-dasharray="7 4"
                />
                <line
                  :x1="CMP_BX"
                  :x2="CMP_BX"
                  :y1="Y(CMP_YT)"
                  :y2="Y(CMP_YB)"
                  :stroke="MUTED"
                  stroke-width="1.2"
                />
                <line
                  :x1="CMP_BX - 5"
                  :x2="CMP_BX + 5"
                  :y1="Y(CMP_YT)"
                  :y2="Y(CMP_YT)"
                  :stroke="MUTED"
                  stroke-width="1.2"
                />
                <line
                  :x1="CMP_BX - 5"
                  :x2="CMP_BX + 5"
                  :y1="Y(CMP_YB)"
                  :y2="Y(CMP_YB)"
                  :stroke="MUTED"
                  stroke-width="1.2"
                />
                <text :x="CMP_BX + 10" :y="CMP_MID_Y - 3" class="annot-strong">
                  false alarms
                </text>
                <text :x="CMP_BX + 10" :y="CMP_MID_Y + 12" class="annot">
                  the only thing separating them
                </text>

                <!-- legend -->
                <line
                  :x1="LEGEND_X"
                  :x2="LEGEND_X + 26"
                  :y1="LEGEND_Y"
                  :y2="LEGEND_Y"
                  :stroke="TEAL"
                  stroke-width="2.6"
                />
                <text :x="LEGEND_X + 33" :y="LEGEND_Y + 4" class="annot-strong">
                  more sensitive
                </text>
                <line
                  :x1="LEGEND_X"
                  :x2="LEGEND_X + 26"
                  :y1="LEGEND_Y + 20"
                  :y2="LEGEND_Y + 20"
                  :stroke="AMBER"
                  stroke-width="2.6"
                  stroke-dasharray="7 4"
                />
                <text
                  :x="LEGEND_X + 33"
                  :y="LEGEND_Y + 24"
                  class="annot-strong"
                >
                  more willing
                </text>
              </template>

              <!-- single curve + its annotation -->
              <template v-else>
                <path
                  :d="PRESET_PATHS[state.preset]"
                  fill="none"
                  :stroke="TEAL"
                  stroke-width="2.6"
                  stroke-linecap="round"
                />
                <template
                  v-if="
                    state.preset === 'threshold' || state.preset === 'baseline'
                  "
                >
                  <line
                    :x1="thresholdMark.x"
                    :x2="thresholdMark.x"
                    :y1="thresholdMark.y"
                    :y2="Y(0)"
                    :stroke="TEAL"
                    stroke-width="1"
                    stroke-dasharray="3 3"
                    opacity=".75"
                  />
                  <line
                    :x1="M.l"
                    :x2="thresholdMark.x"
                    :y1="thresholdMark.y"
                    :y2="thresholdMark.y"
                    :stroke="TEAL"
                    stroke-width="1"
                    stroke-dasharray="3 3"
                    opacity=".75"
                  />
                  <text
                    :x="thresholdMark.x + 6"
                    :y="Y(0) - 8"
                    class="annot-strong"
                  >
                    threshold
                  </text>
                </template>
                <template v-if="state.preset === 'bias'">
                  <line
                    :x1="M.l"
                    :x2="X(26)"
                    :y1="FA_Y"
                    :y2="FA_Y"
                    :stroke="AMBER"
                    stroke-width="1.2"
                    stroke-dasharray="3 3"
                  />
                  <circle :cx="X(0)" :cy="FA_Y" r="4" :fill="AMBER" />
                  <text :x="X(27)" :y="FA_Y + 4" class="annot-strong">
                    says “yes” with no stimulus
                  </text>
                </template>
                <template v-if="state.preset === 'lapse'">
                  <line
                    :x1="M.l"
                    :x2="M.l + pw"
                    :y1="LAPSE_TOP_Y"
                    :y2="LAPSE_TOP_Y"
                    :stroke="AMBER"
                    stroke-width="1.2"
                    stroke-dasharray="3 3"
                  />
                  <text
                    :x="M.l + pw - 4"
                    :y="LAPSE_TOP_Y - 8"
                    text-anchor="end"
                    class="annot-strong"
                  >
                    ceiling never reached
                  </text>
                </template>
              </template>

              <!-- scrub line -->
              <g>
                <line
                  :x1="X(state.strength)"
                  :x2="X(state.strength)"
                  :y1="Y(0)"
                  :y2="Y(1)"
                  :stroke="GLYPH"
                  stroke-width="1"
                  opacity=".28"
                />
                <circle
                  :cx="X(state.strength)"
                  :cy="Y(pYes)"
                  r="4.5"
                  fill="#fff"
                  :stroke="GLYPH"
                  stroke-width="1.6"
                />
              </g>
            </svg>
          </div>
        </div>

        <div class="pf-presets" role="group" aria-label="Presets">
          <button
            v-for="b in PRESET_BUTTONS"
            :key="b.id"
            type="button"
            :aria-pressed="String(state.preset === b.id)"
            @click="setPreset(b.id)"
          >
            {{ b.label }}
          </button>
        </div>

        <div class="pf-caption" aria-live="polite">
          <template v-for="(run, i) in CAPTIONS[state.preset]" :key="i">
            <b v-if="run[1]">{{ run[0] }}</b>
            <template v-else>{{ run[0] }}</template>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * The author's stylesheet, scoped. `body` → .pf-page, `.widget` →
 * .pf-widget; :root custom properties live on the root instead.
 */
.pf-root {
  --pf-bg: #fdfcf9;
  --pf-panel: #ffffff;
  --pf-ink: #1a1a1a;
  --pf-muted: #6f6b63;
  --pf-rule: #dcd8cf;
  --pf-btn: #f3f1ec;
  --pf-btn-on: #0d8b8b;
  --pf-sans:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  --pf-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

  container-type: inline-size;
  width: 100%;
  max-width: 100%;
}
.pf-root *,
.pf-root *::before,
.pf-root *::after {
  box-sizing: border-box;
}

.pf-page {
  margin: 0;
  background: var(--pf-bg);
  color: var(--pf-ink);
  font-family: var(--pf-sans);
  font-size: 15px;
  line-height: 1.5;
  letter-spacing: normal;
  padding: 24px;
}
.pf-widget {
  max-width: 880px;
  margin: 0 auto;
  background: var(--pf-panel);
  border: 1px solid var(--pf-rule);
  border-radius: 6px;
  padding: 26px 28px 22px;
}
.pf-widget .pf-eyebrow {
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--pf-muted);
  margin: 0 0 6px;
}
.pf-widget .pf-title {
  font-family: var(--pf-sans);
  font-size: 22px;
  font-weight: 600;
  line-height: 1.5;
  margin: 0 0 6px;
  padding: 0;
  letter-spacing: -0.01em;
  text-transform: none;
  color: var(--pf-ink);
}
.pf-lede {
  margin: 0 0 20px;
  color: var(--pf-muted);
  max-width: 64ch;
  font-size: 14px;
}
.pf-row {
  display: flex;
  gap: 22px;
  align-items: flex-start;
  flex-wrap: wrap;
}
.pf-cartoon-panel {
  flex: 0 0 212px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pf-plot-panel {
  flex: 1 1 440px;
  /* Original: min-width 340px. Capped at the row width so it wraps and
     scales instead of overflowing a phone or a narrow stage. */
  min-width: min(340px, 100%);
}
.pf-seg {
  display: inline-flex;
  border: 1px solid var(--pf-rule);
  border-radius: 4px;
  overflow: hidden;
  width: 100%;
}
.pf-seg button {
  flex: 1;
  appearance: none;
  border: 0;
  background: var(--pf-btn);
  color: var(--pf-muted);
  font: inherit;
  font-size: 13px;
  padding: 6px 4px;
  cursor: pointer;
}
.pf-seg button + button {
  border-left: 1px solid var(--pf-rule);
}
.pf-seg button[aria-pressed="true"] {
  background: var(--pf-btn-on);
  color: #fff;
}
.pf-cartoon-box {
  border: 1px solid var(--pf-rule);
  border-radius: 4px;
  background: #fff;
}
/* Inline, as in the original (Tailwind's preflight makes SVGs blocks). */
.pf-cartoon,
.pf-plot {
  display: inline;
  vertical-align: baseline;
  max-width: 100%;
  height: auto;
}
.pf-plot {
  touch-action: pan-y;
  cursor: default;
}
.pf-plot:focus {
  outline: none;
}
.pf-plot:focus-visible {
  outline: 2px solid var(--pf-btn-on);
  outline-offset: 2px;
}
.pf-readout {
  font-family: var(--pf-mono);
  font-size: 12px;
  color: var(--pf-muted);
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.pf-readout b {
  color: var(--pf-ink);
  font-weight: 600;
}
.pf-presets {
  margin-top: 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.pf-presets button {
  appearance: none;
  font: inherit;
  font-size: 13px;
  padding: 7px 13px;
  border: 1px solid var(--pf-rule);
  border-radius: 4px;
  background: var(--pf-btn);
  color: var(--pf-ink);
  cursor: pointer;
}
.pf-presets button[aria-pressed="true"] {
  background: var(--pf-btn-on);
  border-color: var(--pf-btn-on);
  color: #fff;
}
.pf-caption {
  margin-top: 14px;
  padding-top: 13px;
  border-top: 1px solid var(--pf-rule);
  font-size: 13.5px;
  color: var(--pf-muted);
  max-width: 72ch;
  min-height: 42px;
}
.pf-caption b {
  color: var(--pf-ink);
  font-weight: 600;
}

/* SVG text roles */
.pf-root text {
  font-family: var(--pf-sans);
}
.pf-root .axlabel {
  font-size: 12px;
  fill: var(--pf-muted);
}
.pf-root .ticklabel {
  font-size: 11px;
  fill: var(--pf-muted);
  font-family: var(--pf-mono);
}
.pf-root .annot {
  font-size: 11.5px;
  fill: var(--pf-muted);
}
.pf-root .annot-strong {
  font-size: 11.5px;
  fill: var(--pf-ink);
  font-weight: 600;
}
.pf-plot text {
  paint-order: stroke fill;
  stroke: #fff;
  stroke-width: 3.5px;
  stroke-linejoin: round;
}

/* Narrow containers (phones, a narrow reader stage): the original's 24px
   page and 28px card padding would leave the plot ~280px wide. */
@container (max-width: 520px) {
  .pf-page {
    padding: 12px;
  }
  .pf-widget {
    padding: 20px 16px 18px;
  }
}
</style>
