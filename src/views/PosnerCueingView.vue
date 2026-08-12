<script setup>
/*
 * PosnerCueingView — Posner Spatial Cueing Task interactive widget.
 *
 * Ported from Arjun's posner_cueing_widget.html.
 * Run 50 trials of a covert-attention spatial cueing experiment.
 * The cue–target SOA is always < 180 ms, too brief for saccades —
 * any RT difference between valid and invalid cues reflects covert
 * attention, not gaze. First 20 trials are always valid; invalid
 * trials appear after that (80/20 split).
 *
 * OPENBRAIN-13: fourth widget port (follows SDT pilot pattern).
 *
 * Design ownership: Sonia owns design. Token-swap only.
 *
 * Original used Chart.js (CDN) for a 2-bar results chart. Replaced
 * with reactive SVG — two rectangles don't justify a 200KB dep.
 *
 * Colour mapping from original → brand.css tokens:
 *   --bg-page:#fafafa   → rgb(var(--color-bg))
 *   --surface:#fff      → rgb(var(--color-paper))
 *   --border:#d1d1d1    → rgb(var(--color-line))
 *   --text-primary:#1a1a1a → rgb(var(--color-ink))
 *   --text-secondary:#555  → rgb(var(--color-mute))
 *   --fixation:#d64545  → rgb(var(--color-accent))
 *   --valid:#2a78d6     → kept as-is (blue for valid cue)
 *   --invalid:#eb6834   → kept as-is (orange for invalid cue)
 */
import { ref, computed, onMounted, onUnmounted } from "vue";

// ── Constants ─────────────────────────────────────────────────────────
const NUM_TRIALS = 50;
const MIN_VALID_ONLY = 20;
const MIN_PLAUSIBLE_RT = 130;
const MISS_TIMEOUT = 1200;

const KEYS = ["tl", "tr", "bl", "br"];
const ANGLES = { tl: -135, tr: -45, bl: 135, br: 45 };

// ── State ─────────────────────────────────────────────────────────────
const phase = ref("idle"); // 'idle' | 'running' | 'done'
const trialIndex = ref(0);
const statusText = ref("Ready when you are");
const feedbackText = ref("");

// Cue/target visual state
const tailAngle = ref(0);
const tailWidth = ref(0);
const targetBox = ref(null); // 'tl' | 'tr' | 'bl' | 'br' | null

// Trial data
const trials = ref([]);

// Internal (not reactive for perf — timing-critical)
let sessionId = 0;
let currentIsValid = false;
let awaitingResponse = false;
let targetVisible = false;
let targetOnsetTime = 0;
let missTimeoutId = null;

// ── Actions ───────────────────────────────────────────────────────────
function startBlock() {
  sessionId++;
  const session = sessionId;
  trials.value = [];
  trialIndex.value = 0;
  phase.value = "running";
  feedbackText.value = "";
  statusText.value = "Get ready";
  resetVisuals();
  setTimeout(() => runTrial(0, session), 800);
}

function cancelBlock() {
  sessionId++;
  awaitingResponse = false;
  resetVisuals();
  phase.value = "idle";
  statusText.value = "Cancelled";
  feedbackText.value = "";
}

function resetVisuals() {
  tailWidth.value = 0;
  targetBox.value = null;
}

function runTrial(i, session) {
  if (session !== sessionId) return;
  if (i >= NUM_TRIALS) {
    finishBlock(session);
    return;
  }
  trialIndex.value = i;
  statusText.value = `Trial ${i + 1} of ${NUM_TRIALS}`;
  resetVisuals();
  targetVisible = false;
  awaitingResponse = true;

  const cueKey = KEYS[Math.floor(Math.random() * 4)];
  currentIsValid = i < MIN_VALID_ONLY ? true : Math.random() < 0.8;

  let tgtKey;
  if (currentIsValid) {
    tgtKey = cueKey;
  } else {
    const others = KEYS.filter((k) => k !== cueKey);
    tgtKey = others[Math.floor(Math.random() * others.length)];
  }

  const fixationDelay = 500 + Math.random() * 500;
  const soa = 70 + Math.random() * 110;

  setTimeout(() => {
    if (session !== sessionId) return;
    // Show cue (tail pointing toward cue location)
    tailAngle.value = ANGLES[cueKey];
    tailWidth.value = 20;

    setTimeout(() => {
      if (session !== sessionId) return;
      // Hide cue, show target
      tailWidth.value = 0;
      targetBox.value = tgtKey;
      targetVisible = true;
      targetOnsetTime = performance.now();

      missTimeoutId = setTimeout(() => {
        if (session !== sessionId) return;
        if (awaitingResponse) {
          awaitingResponse = false;
          trials.value.push({ valid: currentIsValid, rt: null });
          feedbackText.value = "Missed that one — moving on.";
          setTimeout(() => runTrial(i + 1, session), 400);
        }
      }, MISS_TIMEOUT);
    }, soa);
  }, fixationDelay);
}

function handleResponse() {
  if (!awaitingResponse || !targetVisible) return;
  const session = sessionId;
  const rt = Math.round(performance.now() - targetOnsetTime);
  if (rt < MIN_PLAUSIBLE_RT) {
    feedbackText.value =
      "Too fast to be a real response — wait until you actually see it.";
    return;
  }
  clearTimeout(missTimeoutId);
  awaitingResponse = false;
  const idx = trials.value.length;
  trials.value.push({ valid: currentIsValid, rt });
  feedbackText.value =
    (currentIsValid ? "Valid" : "Invalid") + " — " + rt + "ms";
  resetVisuals();
  setTimeout(() => runTrial(idx + 1, session), 400);
}

function finishBlock(session) {
  if (session !== sessionId) return;
  phase.value = "done";
  statusText.value = "Block complete";
}

// ── Keyboard listener ─────────────────────────────────────────────────
function onKeydown(e) {
  if (e.code === "Space") {
    e.preventDefault();
    handleResponse();
  }
}
onMounted(() => document.addEventListener("keydown", onKeydown));
onUnmounted(() => {
  sessionId++;
  clearTimeout(missTimeoutId);
  document.removeEventListener("keydown", onKeydown);
});

// ── Results (SVG bar chart) ───────────────────────────────────────────
function avg(arr) {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

const validRts = computed(() =>
  trials.value.filter((t) => t.valid && t.rt !== null).map((t) => t.rt)
);
const invalidRts = computed(() =>
  trials.value.filter((t) => !t.valid && t.rt !== null).map((t) => t.rt)
);
const validAvg = computed(() => avg(validRts.value));
const invalidAvg = computed(() => avg(invalidRts.value));

// Bar chart geometry
const BAR_W = 60;
const CHART_W = 300;
const CHART_H = 200;
const CHART_PAD_B = 30; // bottom padding for labels
const CHART_PAD_T = 24; // top padding for value labels

const barMax = computed(
  () => Math.max(validAvg.value, invalidAvg.value, 100) * 1.2
);
function barH(val) {
  return (val / barMax.value) * (CHART_H - CHART_PAD_B - CHART_PAD_T);
}
const validBarH = computed(() => barH(validAvg.value));
const invalidBarH = computed(() => barH(invalidAvg.value));
const validBarY = computed(() => CHART_H - CHART_PAD_B - validBarH.value);
const invalidBarY = computed(() => CHART_H - CHART_PAD_B - invalidBarH.value);

// Bar x positions (centered)
const validBarX = CHART_W / 2 - BAR_W - 16;
const invalidBarX = CHART_W / 2 + 16;
</script>

<template>
  <div class="pn-wrap">
    <div class="pn-card">
      <p class="pn-intro t-caption">
        Watch the dot at center. It will briefly grow a small tail pointing
        toward one of the four corners — that's the cue. Shortly after, a faint
        gray dot will appear in one of the four boxes. Press
        <strong>spacebar</strong> (or tap the button below) the instant you see
        it, no matter which box it's in. The gap between cue and target varies
        from trial to trial, so don't try to anticipate it — wait until you
        actually see the dot. The first 20 trials are always valid; invalid
        trials can appear after that. 50 trials total, run automatically.
      </p>
      <p class="pn-fine t-caption">
        The cue–target gap is always under 180 milliseconds — too brief for your
        eyes to move there. Any speed difference you feel reflects covert
        attention, not gaze.
      </p>

      <!-- Arena -->
      <div class="pn-arena">
        <!-- Four corner boxes -->
        <div class="pn-box pn-box-tl">
          <div v-if="targetBox === 'tl'" class="pn-target-dot" />
        </div>
        <div class="pn-box pn-box-tr">
          <div v-if="targetBox === 'tr'" class="pn-target-dot" />
        </div>
        <div class="pn-box pn-box-bl">
          <div v-if="targetBox === 'bl'" class="pn-target-dot" />
        </div>
        <div class="pn-box pn-box-br">
          <div v-if="targetBox === 'br'" class="pn-target-dot" />
        </div>

        <!-- Fixation + cue tail -->
        <div class="pn-fixation-wrap">
          <div class="pn-fixation" />
          <div
            class="pn-tail"
            :style="{
              width: tailWidth + 'px',
              transform: 'rotate(' + tailAngle + 'deg)',
            }"
          />
        </div>
      </div>

      <!-- Status & feedback -->
      <p class="pn-status t-caption">{{ statusText }}</p>
      <p class="pn-feedback t-caption">{{ feedbackText }}</p>

      <!-- Controls -->
      <div class="pn-controls">
        <button v-if="phase === 'idle'" class="pn-btn" @click="startBlock">
          Start block (50 trials)
        </button>
        <template v-if="phase === 'running'">
          <button class="pn-btn" @click="handleResponse">
            Tap when you see the dot
          </button>
          <button class="pn-btn pn-btn-ghost" @click="cancelBlock">
            Cancel
          </button>
        </template>
        <button v-if="phase === 'done'" class="pn-btn" @click="startBlock">
          Run again
        </button>
      </div>

      <!-- Results bar chart (SVG, replaces Chart.js) -->
      <div v-if="phase === 'done'" class="pn-results">
        <svg
          :viewBox="`0 0 ${CHART_W} ${CHART_H}`"
          class="pn-chart"
          aria-label="Bar chart of your average reaction time for valid versus invalid cue trials"
        >
          <!-- Baseline -->
          <line
            class="pn-chart-baseline"
            x1="0"
            :y1="CHART_H - CHART_PAD_B"
            :x2="CHART_W"
            :y2="CHART_H - CHART_PAD_B"
          />

          <!-- Valid bar -->
          <rect
            class="pn-bar-valid"
            :x="validBarX"
            :y="validBarY"
            :width="BAR_W"
            :height="validBarH"
            rx="4"
          />
          <text
            class="pn-bar-value"
            :x="validBarX + BAR_W / 2"
            :y="validBarY - 6"
            text-anchor="middle"
          >
            {{ validAvg }}ms
          </text>
          <text
            class="pn-bar-label"
            :x="validBarX + BAR_W / 2"
            :y="CHART_H - 10"
            text-anchor="middle"
          >
            Valid (n={{ validRts.length }})
          </text>

          <!-- Invalid bar -->
          <rect
            class="pn-bar-invalid"
            :x="invalidBarX"
            :y="invalidBarY"
            :width="BAR_W"
            :height="invalidBarH"
            rx="4"
          />
          <text
            class="pn-bar-value"
            :x="invalidBarX + BAR_W / 2"
            :y="invalidBarY - 6"
            text-anchor="middle"
          >
            {{ invalidAvg }}ms
          </text>
          <text
            class="pn-bar-label"
            :x="invalidBarX + BAR_W / 2"
            :y="CHART_H - 10"
            text-anchor="middle"
          >
            Invalid (n={{ invalidRts.length }})
          </text>

          <!-- Y-axis label -->
          <text
            class="pn-axis-label"
            x="4"
            :y="CHART_PAD_T"
            text-anchor="start"
          >
            Avg RT (ms)
          </text>
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * Posner Cueing — token-swapped from the original hardcoded hex.
 */

/* ── Local vars ─────────────────────────────────────────────────────── */
.pn-wrap {
  --pn-ink: rgb(var(--color-ink));
  --pn-mute: rgb(var(--color-mute));
  --pn-line: rgb(var(--color-line));
  --pn-accent: rgb(var(--color-accent));
  --pn-valid: #2a78d6;
  --pn-invalid: #eb6834;

  max-width: 680px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

/* ── Card ───────────────────────────────────────────────────────────── */
.pn-card {
  background: rgb(var(--color-paper));
  border: 1px solid var(--pn-line);
  border-radius: 12px;
  padding: 1.5rem;
}

.pn-intro {
  color: var(--pn-mute);
  line-height: 1.6;
  margin-bottom: 1rem;
}
.pn-intro strong {
  color: var(--pn-ink);
  font-weight: 500;
}
.pn-fine {
  color: var(--pn-mute);
  font-size: 12px;
  margin-bottom: 1.25rem;
  opacity: 0.75;
}

/* ── Arena ──────────────────────────────────────────────────────────── */
.pn-arena {
  position: relative;
  width: 100%;
  height: 300px;
  margin-bottom: 0.5rem;
}
.pn-box {
  position: absolute;
  width: 64px;
  height: 64px;
  border: 2px solid var(--pn-line);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pn-box-tl {
  top: 0;
  left: 0;
}
.pn-box-tr {
  top: 0;
  right: 0;
}
.pn-box-bl {
  bottom: 0;
  left: 0;
}
.pn-box-br {
  bottom: 0;
  right: 0;
}

.pn-target-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--pn-mute);
  opacity: 0.3;
}

/* Fixation + cue */
.pn-fixation-wrap {
  position: absolute;
  left: 50%;
  top: 50%;
}
.pn-fixation {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--pn-accent);
  position: absolute;
  left: 0;
  top: 0;
  transform: translate(-50%, -50%);
}
.pn-tail {
  height: 3px;
  background: var(--pn-accent);
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: left center;
  transition: width 0.04s linear;
}

/* ── Status / feedback ──────────────────────────────────────────────── */
.pn-status {
  text-align: center;
  color: var(--pn-mute);
  min-height: 20px;
  margin: 0.75rem 0;
}
.pn-feedback {
  text-align: center;
  color: var(--pn-ink);
  min-height: 20px;
  margin: 0 0 1rem;
}

/* ── Controls ───────────────────────────────────────────────────────── */
.pn-controls {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 1.5rem;
}
.pn-btn {
  font-family: var(--font-body, -apple-system, BlinkMacSystemFont, sans-serif);
  font-size: 14px;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--pn-line);
  background: rgb(var(--color-paper));
  color: var(--pn-ink);
  cursor: pointer;
  transition:
    background 0.12s,
    border-color 0.12s;
}
.pn-btn:hover {
  background: rgb(var(--color-line) / 0.3);
}
.pn-btn:focus-visible {
  outline: 2px solid var(--pn-accent);
  outline-offset: 2px;
}
.pn-btn-ghost {
  color: var(--pn-mute);
}

/* ── Results chart ──────────────────────────────────────────────────── */
.pn-results {
  max-width: 320px;
  margin: 0 auto;
}
.pn-chart {
  display: block;
  width: 100%;
  height: auto;
}
.pn-chart text {
  font-family: var(--font-mono, "JetBrains Mono", monospace);
}
.pn-chart-baseline {
  stroke: var(--pn-line);
  stroke-width: 1;
}
.pn-bar-valid {
  fill: var(--pn-valid);
}
.pn-bar-invalid {
  fill: var(--pn-invalid);
}
.pn-bar-value {
  fill: var(--pn-ink);
  font-size: 12px;
  font-weight: 600;
}
.pn-bar-label {
  fill: var(--pn-mute);
  font-size: 10px;
}
.pn-axis-label {
  fill: var(--pn-mute);
  font-size: 9px;
}

/* ── Reduced motion ─────────────────────────────────────────────────── */
[data-reduce-motion="1"] .pn-tail {
  transition: none;
}
[data-reduce-motion="1"] .pn-btn {
  transition: none;
}
</style>
