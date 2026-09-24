<script setup>
/*
 * NormalizationModelView — the normalization model of attention
 * (Reynolds & Heeger 2009), interactive.
 *
 * Ported from Arjun Krishnaswamy's normalization_model_widget_v2.html
 * (src/widgets/source/, untouched). OPENBRAIN-88. The chapter manuscript
 * flags this box as "not done yet, big changes coming", so this is a
 * faithful port of v2 as it stands: same maths (src/helper/normalizationModel,
 * lifted verbatim), same three stimulus modes, same sliders, same schematic,
 * neural-image panels and contrast-response chart.
 *
 * Looks like the author's original (OPENBRAIN-75): its own white page, warm
 * greys, #D85A30 attention orange and #378ADD blue, system sans at the
 * original's sizes. Not re-skinned to the site palette.
 *
 * Differences from the original, all invisible at desktop widths:
 *   - SVG ids (arrow marker, clip paths) are made unique per instance, so
 *     two copies on one page (reader stage + modal) cannot collide.
 *   - Below a 560px container the two control columns stack, and the
 *     button rows wrap, so nothing overflows at 390px. Sizing is by
 *     container query, so it follows the reader stage / modal, not the
 *     viewport.
 *   - Labels are tied to their sliders, and mode buttons carry
 *     aria-pressed. Nothing animates, so there is no motion to reduce.
 *
 * The neural images are drawn the original's way: a 60×40 greyscale
 * ImageData upscaled (smoothed) to 260×180 on an off-DOM canvas, then
 * handed to an SVG <image> as a data URL.
 */
import { computed, reactive, useId } from "vue";
import {
  DEFAULT_STATE,
  GW,
  GH,
  computeGrids,
  crfCurves,
  featureDegrees,
  heightDegrees,
  markedResponse,
  panelPixels,
  panelSpecs,
  schematic as schematicFor,
  toPath,
} from "@/helper/normalizationModel";

const uid = `nm-${String(useId()).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
const ids = {
  arrow: `${uid}-arrow`,
  clipStim: `${uid}-clip-stimdrive`,
  clipAttn: `${uid}-clip-attnfield`,
  clipSupp: `${uid}-clip-suppdrive`,
  clipPop: `${uid}-clip-popresp`,
  pos: `${uid}-pos`,
  width: `${uid}-width`,
  height: `${uid}-height`,
  feature: `${uid}-feature`,
};
const arrowRef = `url(#${ids.arrow})`;

// ── State ─────────────────────────────────────────────────────────────
const state = reactive({ ...DEFAULT_STATE });

const grids = computed(() => computeGrids(state));
const readout = computed(
  () =>
    "Response at marked neuron: R = " + markedResponse(grids.value).toFixed(3)
);
const schem = computed(() => schematicFor(state));

const curves = computed(() => {
  const { att, ign, maxVal } = crfCurves(state);
  return { att: toPath(att, maxVal), ign: toPath(ign, maxVal) };
});

// ── Neural-image panels ───────────────────────────────────────────────
let smallCanvas = null;
let bigCanvas = null;

function panelUrl(spec) {
  if (typeof document === "undefined") return "";
  try {
    smallCanvas ||= document.createElement("canvas");
    bigCanvas ||= document.createElement("canvas");
    smallCanvas.width = GW;
    smallCanvas.height = GH;
    bigCanvas.width = 260;
    bigCanvas.height = 180;
    const sctx = smallCanvas.getContext("2d");
    const bctx = bigCanvas.getContext("2d");
    if (!sctx || !bctx) return "";
    const img = sctx.createImageData(GW, GH);
    img.data.set(panelPixels(spec.fn, spec.lo, spec.hi));
    sctx.putImageData(img, 0, 0);
    bctx.imageSmoothingEnabled = true;
    bctx.drawImage(smallCanvas, 0, 0, 260, 180);
    return bigCanvas.toDataURL();
  } catch {
    return ""; // no 2D canvas (tests); the panels stay empty
  }
}

const panels = computed(() => {
  const specs = panelSpecs(grids.value);
  return {
    stimdrive: panelUrl(specs.stimdrive),
    attnfield: panelUrl(specs.attnfield),
    suppdrive: panelUrl(specs.suppdrive),
    popresp: panelUrl(specs.popresp),
  };
});

// ── Actions (as the original's listeners) ────────────────────────────
function setMode(mode) {
  state.mode = mode;
  if (mode !== "two") state.isolateNonpref = false;
}
function setWidth(v) {
  state.width = v;
}
const ORIENT_FEATURE = { same: 50, orthogonal: 0, diagonal: 25 };
function setOrient(o) {
  state.outsideOrient = o;
  state.feature = ORIENT_FEATURE[o];
}
function onRange(key, e) {
  state[key] = +e.target.value;
}

const modes = [
  { id: "one", label: "One stimulus" },
  { id: "two", label: "Two in receptive field" },
  { id: "feature", label: "One in, one outside RF" },
];
const orients = [
  { id: "same", label: "Same" },
  { id: "orthogonal", label: "Orthogonal" },
  { id: "diagonal", label: "Diagonal" },
];
</script>

<template>
  <div class="widget-root nm-root">
    <div class="nm-page">
      <h1 class="nm-title">The Normalization Model of Attention</h1>
      <p class="nm-subtitle">
        Interactive companion to Reynolds &amp; Heeger (2009) — adjust the
        attention field and stimulus configuration below.
      </p>

      <div class="nm-body">
        <h2 class="nm-sr-only">Interactive normalization model widget.</h2>

        <svg class="nm-svg" viewBox="0 0 680 460" role="img">
          <title>Normalization model, interactive</title>
          <desc>
            Live-updating neural image panels for stimulus drive, attention
            field, suppressive drive, and population response, with a marker on
            the recorded neuron.
          </desc>
          <defs>
            <marker
              :id="ids.arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path
                d="M2 1L8 5L2 9"
                fill="none"
                stroke="context-stroke"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </marker>
            <clipPath :id="ids.clipStim">
              <rect x="126" y="185" width="130" height="90" rx="4" />
            </clipPath>
            <clipPath :id="ids.clipAttn">
              <rect x="286" y="42" width="130" height="90" rx="4" />
            </clipPath>
            <clipPath :id="ids.clipSupp">
              <rect x="286" y="300" width="130" height="90" rx="4" />
            </clipPath>
            <clipPath :id="ids.clipPop">
              <rect x="487" y="185" width="130" height="90" rx="4" />
            </clipPath>
          </defs>

          <!-- Stimulus schematic -->
          <text class="th" x="191" y="32" text-anchor="middle">Stimulus</text>
          <rect
            x="126"
            y="42"
            width="130"
            height="90"
            rx="4"
            fill="var(--nm-surface-2)"
            stroke="var(--nm-border-strong)"
            stroke-width="0.5"
          />
          <circle cx="191" cy="87" r="2" fill="var(--nm-text-primary)" />
          <g v-show="schem.showLeftGrating">
            <g :transform="`rotate(${schem.rotAngle} 162 87)`">
              <line
                x1="156"
                y1="79"
                x2="156"
                y2="95"
                stroke="var(--nm-text-primary)"
                stroke-width="1.5"
              />
              <line
                x1="162"
                y1="79"
                x2="162"
                y2="95"
                stroke="var(--nm-text-primary)"
                stroke-width="1.5"
              />
              <line
                x1="168"
                y1="79"
                x2="168"
                y2="95"
                stroke="var(--nm-text-primary)"
                stroke-width="1.5"
              />
            </g>
          </g>
          <line
            x1="214"
            y1="79"
            x2="214"
            y2="95"
            stroke="var(--nm-text-primary)"
            stroke-width="1.5"
          />
          <line
            x1="220"
            y1="79"
            x2="220"
            y2="95"
            stroke="var(--nm-text-primary)"
            stroke-width="1.5"
          />
          <line
            x1="226"
            y1="79"
            x2="226"
            y2="95"
            stroke="var(--nm-text-primary)"
            stroke-width="1.5"
          />
          <circle
            :cx="schem.rfCx"
            cy="87"
            :r="schem.rfR"
            fill="none"
            stroke="var(--nm-text-primary)"
            stroke-width="1"
          />
          <circle
            :cx="schem.attnX"
            cy="87"
            :r="schem.attnR"
            fill="none"
            stroke="#D85A30"
            stroke-width="1"
            stroke-dasharray="3 2"
          />

          <line
            x1="191"
            y1="132"
            x2="191"
            y2="183"
            :marker-end="arrowRef"
            stroke="var(--nm-text-primary)"
            stroke-width="1"
          />

          <!-- Stimulus drive -->
          <text class="th" x="191" y="175" text-anchor="middle">
            Stimulus drive
          </text>
          <image
            x="126"
            y="185"
            width="130"
            height="90"
            :clip-path="`url(#${ids.clipStim})`"
            preserveAspectRatio="none"
            :href="panels.stimdrive"
          />
          <g>
            <circle
              cx="219.6"
              cy="230"
              r="5"
              fill="none"
              stroke="#F5D033"
              stroke-width="1"
            />
            <line
              x1="213"
              y1="230"
              x2="225.6"
              y2="230"
              stroke="#F5D033"
              stroke-width="1"
            />
            <line
              x1="219.6"
              y1="223.5"
              x2="219.6"
              y2="236.5"
              stroke="#F5D033"
              stroke-width="1"
            />
          </g>

          <line
            x1="256"
            y1="230"
            x2="333"
            y2="230"
            :marker-end="arrowRef"
            stroke="var(--nm-text-primary)"
            stroke-width="1"
          />

          <!-- Attention field -->
          <text class="th" x="351" y="32" text-anchor="middle">
            Attention field
          </text>
          <image
            x="286"
            y="42"
            width="130"
            height="90"
            :clip-path="`url(#${ids.clipAttn})`"
            preserveAspectRatio="none"
            :href="panels.attnfield"
          />
          <line
            x1="351"
            y1="132"
            x2="351"
            y2="212"
            :marker-end="arrowRef"
            stroke="var(--nm-text-primary)"
            stroke-width="1"
          />

          <circle
            cx="351"
            cy="230"
            r="16"
            fill="var(--nm-surface-2)"
            stroke="var(--nm-border-strong)"
            stroke-width="1"
          />
          <text
            class="th"
            x="351"
            y="231"
            text-anchor="middle"
            dominant-baseline="central"
          >
            &#215;
          </text>

          <line
            x1="367"
            y1="230"
            x2="428"
            y2="230"
            :marker-end="arrowRef"
            stroke="var(--nm-text-primary)"
            stroke-width="1"
          />

          <line
            x1="351"
            y1="246"
            x2="351"
            y2="298"
            :marker-end="arrowRef"
            stroke="var(--nm-text-primary)"
            stroke-width="1"
          />
          <text class="ts" x="376" y="265">pool over space</text>
          <text class="ts" x="376" y="279">and orientation</text>

          <!-- Suppressive drive -->
          <image
            x="286"
            y="300"
            width="130"
            height="90"
            :clip-path="`url(#${ids.clipSupp})`"
            preserveAspectRatio="none"
            :href="panels.suppdrive"
          />
          <text class="th" x="351" y="406" text-anchor="middle">
            Suppressive drive
          </text>

          <path
            d="M416,345 L446,345 L446,246"
            fill="none"
            stroke="var(--nm-text-primary)"
            stroke-width="1"
            :marker-end="arrowRef"
          />

          <circle
            cx="446"
            cy="230"
            r="16"
            fill="var(--nm-surface-2)"
            stroke="var(--nm-border-strong)"
            stroke-width="1"
          />
          <text
            class="th"
            x="446"
            y="231"
            text-anchor="middle"
            dominant-baseline="central"
          >
            &#247;
          </text>

          <line
            x1="462"
            y1="230"
            x2="485"
            y2="230"
            :marker-end="arrowRef"
            stroke="var(--nm-text-primary)"
            stroke-width="1"
          />

          <!-- Population response -->
          <text class="th" x="552" y="175" text-anchor="middle">
            Population response
          </text>
          <image
            x="487"
            y="185"
            width="130"
            height="90"
            :clip-path="`url(#${ids.clipPop})`"
            preserveAspectRatio="none"
            :href="panels.popresp"
          />
          <g>
            <circle
              cx="580.6"
              cy="230"
              r="5"
              fill="none"
              stroke="#F5D033"
              stroke-width="1"
            />
            <line
              x1="574"
              y1="230"
              x2="586.6"
              y2="230"
              stroke="#F5D033"
              stroke-width="1"
            />
            <line
              x1="580.6"
              y1="223.5"
              x2="580.6"
              y2="236.5"
              stroke="#F5D033"
              stroke-width="1"
            />
          </g>
        </svg>

        <p class="ts nm-readout">{{ readout }}</p>

        <div class="nm-controls">
          <div class="nm-col">
            <p class="th nm-head">Attention field</p>
            <div class="nm-row">
              <label class="ts nm-label" :for="ids.pos">Position</label>
              <input
                :id="ids.pos"
                type="range"
                min="0"
                max="100"
                :value="state.pos"
                class="nm-range"
                @input="onRange('pos', $event)"
              />
              <span class="ts nm-out">{{ state.pos }}</span>
            </div>
            <div class="nm-row">
              <label class="ts nm-label" :for="ids.width">Width</label>
              <input
                :id="ids.width"
                type="range"
                min="0"
                max="100"
                :value="state.width"
                class="nm-range"
                @input="onRange('width', $event)"
              />
              <span class="ts nm-out">{{ state.width }}</span>
            </div>
            <div class="nm-row">
              <label class="ts nm-label" :for="ids.height">Height</label>
              <input
                :id="ids.height"
                type="range"
                min="0"
                max="100"
                :value="state.height"
                class="nm-range"
                @input="onRange('height', $event)"
              />
              <span class="ts nm-out"
                >{{ heightDegrees(state.height) }}&#176;</span
              >
            </div>
            <div class="nm-row nm-row--last">
              <label class="ts nm-label" :for="ids.feature">Feature</label>
              <input
                :id="ids.feature"
                type="range"
                min="0"
                max="100"
                :value="state.feature"
                class="nm-range"
                @input="onRange('feature', $event)"
              />
              <span class="ts nm-out"
                >{{ featureDegrees(state.feature) }}&#176;</span
              >
            </div>

            <p class="th nm-head">Stimulus</p>
            <div class="nm-btns nm-btns--modes">
              <button
                v-for="m in modes"
                :key="m.id"
                type="button"
                class="nm-btn"
                :class="{ 'is-active': state.mode === m.id }"
                :aria-pressed="state.mode === m.id"
                @click="setMode(m.id)"
              >
                {{ m.label }}
              </button>
            </div>

            <div v-show="state.mode === 'one'" class="nm-group">
              <p class="ts nm-group-label">Presets</p>
              <div class="nm-btns">
                <button type="button" class="nm-btn" @click="setWidth(0)">
                  Response gain
                </button>
                <button type="button" class="nm-btn" @click="setWidth(100)">
                  Contrast gain
                </button>
              </div>
            </div>

            <div v-show="state.mode === 'feature'" class="nm-group">
              <p class="ts nm-group-label">Outside stimulus orientation</p>
              <div class="nm-btns">
                <button
                  v-for="o in orients"
                  :key="o.id"
                  type="button"
                  class="nm-btn"
                  :class="{ 'is-active': state.outsideOrient === o.id }"
                  :aria-pressed="state.outsideOrient === o.id"
                  @click="setOrient(o.id)"
                >
                  {{ o.label }}
                </button>
              </div>
            </div>

            <div v-show="state.mode === 'two'">
              <label class="ts nm-check">
                <input v-model="state.isolateNonpref" type="checkbox" />
                Isolate non-preferred stimulus (hide the preferred one)
              </label>
            </div>
          </div>

          <div class="nm-chart-box">
            <p class="ts nm-chart-title">Contrast-response function</p>
            <svg class="nm-svg" viewBox="0 0 320 300" role="img">
              <title>Contrast-response curve, live, log contrast axis</title>
              <line
                x1="30"
                y1="260"
                x2="300"
                y2="260"
                stroke="var(--nm-border-strong)"
                stroke-width="0.5"
              />
              <line
                x1="30"
                y1="20"
                x2="30"
                y2="260"
                stroke="var(--nm-border-strong)"
                stroke-width="0.5"
              />
              <path
                :d="curves.att"
                fill="none"
                stroke="#D85A30"
                stroke-width="2"
              />
              <path
                :d="curves.ign"
                fill="none"
                stroke="#378ADD"
                stroke-width="2"
              />
              <text class="ts" x="245" y="32">attended</text>
              <text class="ts" x="245" y="150">ignored</text>
              <text class="ts" x="165" y="282" text-anchor="middle">
                log contrast
              </text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * The original's own palette and metrics (normalization_model_widget_v2.html
 * :root and <style>), scoped to this widget. The book's globals are reset
 * by .widget-root and Tailwind preflight, so every margin the original got
 * from browser defaults is written out here.
 */
.nm-root {
  --nm-surface-2: #f2f1ee;
  --nm-border: #ddd9d2;
  --nm-border-strong: #b8b3aa;
  --nm-border-accent: #d85a30;
  --nm-text-primary: #1c1b1a;
  --nm-radius: 8px;

  container-type: inline-size;
  background: #ffffff;
  color: var(--nm-text-primary);
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  line-height: normal;
}
.nm-root *,
.nm-root *::before,
.nm-root *::after {
  box-sizing: border-box;
}

.nm-page {
  max-width: 760px;
  margin: 0 auto;
  padding: 24px 20px 60px;
}

.th {
  font-size: 14px;
  font-weight: 600;
  color: var(--nm-text-primary);
}
.ts {
  font-size: 12px;
  color: var(--nm-text-primary);
  opacity: 0.72;
}
/* SVG text: the original's fill is the initial black. */
.nm-svg text {
  fill: #000;
}

.nm-title {
  font-size: 18px;
  line-height: normal;
  font-weight: 600;
  margin: 0 0 4px;
}
.nm-subtitle {
  font-size: 13px;
  opacity: 0.65;
  margin: 0 0 24px;
}

.nm-body {
  position: relative;
  padding: 1rem 0;
}
.nm-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  margin: 0;
}

/* Inline, as in the original (preflight makes SVGs blocks). */
.nm-svg {
  display: inline;
  vertical-align: baseline;
  width: 100%;
  height: auto;
}

.nm-readout {
  margin: 0.5rem 0 1rem;
}

.nm-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}
.nm-head {
  margin: 0 0 10px;
}
.nm-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.nm-row--last {
  margin-bottom: 20px;
}
.nm-label {
  width: 56px;
  flex: none;
}
.nm-range {
  flex: 1;
  min-width: 0;
  margin: 2px; /* Chromium's default, reset by Tailwind preflight */
  accent-color: var(--nm-border-accent);
}
.nm-out {
  width: 36px;
  flex: none;
  text-align: right;
}

.nm-btns {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.nm-btns--modes {
  margin-bottom: 12px;
}
.nm-group {
  margin-bottom: 12px;
}
.nm-group-label {
  margin: 0 0 8px;
}
.nm-btn {
  font-family: inherit;
  font-size: 12px;
  line-height: normal;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1.5px solid var(--nm-border-strong);
  background: #ffffff;
  color: var(--nm-text-primary);
  cursor: pointer;
}
.nm-btn.is-active {
  border-color: var(--nm-border-accent);
}
.nm-btn:hover {
  background: var(--nm-surface-2);
}
.nm-btn:focus-visible,
.nm-range:focus-visible,
.nm-check input:focus-visible {
  outline: 2px solid var(--nm-border-accent);
  outline-offset: 2px;
}

.nm-check {
  display: flex;
  align-items: center;
  gap: 6px;
}
.nm-check input {
  margin: 3px 3px 3px 4px;
  accent-color: var(--nm-border-accent);
}

.nm-chart-box {
  border: 0.5px solid var(--nm-border);
  border-radius: var(--nm-radius);
  padding: 12px 16px;
}
.nm-chart-title {
  margin: 0 0 8px;
}

/* Narrow containers (phone, prose column): stack the two columns. */
@container (max-width: 560px) {
  .nm-controls {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
