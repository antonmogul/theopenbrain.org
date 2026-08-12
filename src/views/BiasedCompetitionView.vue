<script setup>
/*
 * BiasedCompetitionView — Biased Competition interactive widget.
 *
 * Ported from Arjun's biased_competition_widget.html.
 * Two stimuli in one receptive field — attention biases which stimulus
 * the neuron reports. Toggle between stimulus configurations and
 * attention targets to see how firing rate changes.
 *
 * OPENBRAIN-13: second widget port (follows SDT pilot pattern).
 *
 * Design ownership: Sonia owns design. This is a token-swap only — the
 * widget's interaction and pedagogy are unchanged from the original.
 *
 * Colour mapping from original → brand.css tokens:
 *   --bg:#eef0f0        → rgb(var(--color-bg))
 *   --panel:#f8f8f7     → rgb(var(--color-paper))
 *   --ink:#1a1a1a       → rgb(var(--color-ink))
 *   --dim:#6b7280       → rgb(var(--color-mute))
 *   --line:#dcdedd      → rgb(var(--color-line))
 *   --teal:#1fb3a3      → rgb(var(--color-accent))
 *   --teal-soft:#cdeee9 → rgb(var(--color-accent) / 0.25)
 *   --yellow:#f5d90a    → kept as-is (attention ring, no matching token)
 *   --grey-shape:#c9cccb → rgb(var(--color-mute) / 0.55)
 */
import { ref, computed } from "vue";

// ── Layout constants (matching original SVG viewBox) ──────────────────
const FIX = { x: 225, y: 82 };
const RF = { x: 300, y: 85, rx: 58, ry: 42 };
const S1 = { x: 280, y: 70 };
const S2 = { x: 322, y: 93 };
const BRAIN = { x: 240, y: 300, rx: 135, ry: 72 };
const NEURON = { x: 335, y: 333 };
const CELL = { x: 240, y: 500, r: 58 };

// ── State ─────────────────────────────────────────────────────────────
const stimMode = ref("both"); // 'stim1only' | 'both' | 'stim2only'
const attendMode = ref("stim1"); // 'stim1' | 'stim2'

// ── Derived ───────────────────────────────────────────────────────────
const showS1 = computed(
  () => stimMode.value === "stim1only" || stimMode.value === "both"
);
const showS2 = computed(
  () => stimMode.value === "stim2only" || stimMode.value === "both"
);
const competing = computed(() => stimMode.value === "both");

const s1State = computed(() =>
  competing.value
    ? attendMode.value === "stim1"
      ? "attended"
      : "dimmed"
    : "neutral"
);
const s2State = computed(() =>
  competing.value
    ? attendMode.value === "stim2"
      ? "attended"
      : "dimmed"
    : "neutral"
);
const s1Ring = computed(() => competing.value && attendMode.value === "stim1");
const s2Ring = computed(() => competing.value && attendMode.value === "stim2");

// Which stimulus is effectively driving the response
const effectiveStim = computed(() => {
  if (stimMode.value === "stim1only") return 1;
  if (stimMode.value === "stim2only") return 2;
  return attendMode.value === "stim1" ? 1 : 2;
});
const highFiring = computed(() => effectiveStim.value === 1);

// ── Spike raster path ─────────────────────────────────────────────────
// All-or-none spikes: same height, but more ticks when the strong
// stimulus (Stim 1) is driving the cell.
const ticksPath = computed(() => {
  const n = highFiring.value ? 10 : 4;
  const h = 26;
  const totalW = 80;
  const spacing = totalW / (n - 1);
  const baseY = CELL.y + 16;
  let d = "";
  for (let i = 0; i < n; i++) {
    const x = CELL.x - totalW / 2 + i * spacing;
    d += `M ${x} ${baseY} L ${x} ${baseY - h} `;
  }
  return d;
});

// ── Feed line (neuron → response readout) ─────────────────────────────
const feedLinePath = computed(() => {
  const x1 = NEURON.x;
  const y1 = NEURON.y + 7;
  const x2 = CELL.x;
  const y2 = CELL.y - CELL.r - 6;
  const my = (y1 + y2) / 2;
  return `M ${x1} ${y1} Q ${x1} ${my} ${x2} ${y2}`;
});

// ── Stim 1 shape path (triangle) ─────────────────────────────────────
const s1Path = computed(() => {
  const s = 15;
  const cx = S1.x;
  const cy = S1.y;
  return `M ${cx} ${cy - s} L ${cx + s} ${cy + s * 0.85} L ${cx - s} ${cy + s * 0.85} Z`;
});

// ── Actions ───────────────────────────────────────────────────────────
function setStimMode(mode) {
  stimMode.value = mode;
}
function setAttendMode(mode) {
  attendMode.value = mode;
}

// Toggle button definitions
const stimButtons = [
  { mode: "stim1only", label: "Stim 1 Alone" },
  { mode: "both", label: "Both Stimuli" },
  { mode: "stim2only", label: "Stim 2 Alone" },
];
const attendButtons = [
  { mode: "stim1", label: "Attend Stim 1" },
  { mode: "stim2", label: "Attend Stim 2" },
];
</script>

<template>
  <div class="bc-wrap">
    <div class="bc-head">
      <h1 class="t-label">Biased Competition</h1>
      <span class="bc-sub t-caption">
        Two stimuli, one receptive field &mdash; attention decides which one the
        neuron reports
      </span>
    </div>

    <div class="bc-card">
      <svg
        viewBox="0 0 480 640"
        aria-label="Biased competition diagram"
        class="bc-svg"
      >
        <!-- Monitor bezel + stand -->
        <rect
          class="bc-screen-bezel"
          x="95"
          y="10"
          width="270"
          height="150"
          rx="8"
        />
        <rect class="bc-screen-stand" x="215" y="160" width="30" height="16" />
        <rect
          class="bc-screen-stand"
          x="190"
          y="176"
          width="80"
          height="7"
          rx="2"
        />

        <!-- Fixation dot -->
        <circle class="bc-fix-dot" :cx="FIX.x" :cy="FIX.y" r="3" />

        <!-- Receptive field ellipse -->
        <ellipse
          class="bc-rf-ellipse"
          :cx="RF.x"
          :cy="RF.y"
          :rx="RF.rx"
          :ry="RF.ry"
        />
        <text
          class="bc-tag bc-tag-accent"
          :x="RF.x"
          :y="RF.y - RF.ry - 8"
          text-anchor="middle"
        >
          receptive field
        </text>

        <!-- Stim 1 (triangle) -->
        <template v-if="showS1">
          <circle
            class="bc-stim-ring"
            :class="{ on: s1Ring }"
            :cx="S1.x"
            :cy="S1.y"
            r="20"
          />
          <path class="bc-stim-shape" :class="s1State" :d="s1Path" />
        </template>

        <!-- Stim 2 (square) -->
        <template v-if="showS2">
          <circle
            class="bc-stim-ring"
            :class="{ on: s2Ring }"
            :cx="S2.x"
            :cy="S2.y"
            r="18"
          />
          <rect
            class="bc-stim-shape"
            :class="s2State"
            :x="S2.x - 12"
            :y="S2.y - 12"
            width="24"
            height="24"
            rx="3"
          />
        </template>

        <!-- Brain: dorsal view -->
        <text
          class="bc-tag"
          :x="BRAIN.x"
          :y="BRAIN.y - BRAIN.ry - 14"
          text-anchor="middle"
        >
          macaque cortex, dorsal view
        </text>
        <ellipse
          class="bc-brain-outline"
          :cx="BRAIN.x"
          :cy="BRAIN.y"
          :rx="BRAIN.rx"
          :ry="BRAIN.ry"
        />
        <line
          class="bc-fissure"
          :x1="BRAIN.x"
          :y1="BRAIN.y - BRAIN.ry + 4"
          :x2="BRAIN.x"
          :y2="BRAIN.y + BRAIN.ry - 4"
        />

        <!-- Neuron marker (V4) -->
        <path
          class="bc-neuron-marker"
          :d="`M ${NEURON.x} ${NEURON.y - 7} L ${NEURON.x + 7} ${NEURON.y + 6} L ${NEURON.x - 7} ${NEURON.y + 6} Z`"
        />
        <text class="bc-tag bc-tag-accent" :x="NEURON.x + 12" :y="NEURON.y + 4">
          V4
        </text>

        <!-- Feed line: neuron → response -->
        <path class="bc-feed-line" :d="feedLinePath" />

        <!-- Response readout: cell circle + spikes -->
        <circle
          class="bc-cell-glow"
          :cx="CELL.x"
          :cy="CELL.y"
          :r="CELL.r + 10"
          :opacity="highFiring ? 1 : 0"
        />
        <circle class="bc-cell-circle" :cx="CELL.x" :cy="CELL.y" :r="CELL.r" />
        <line
          class="bc-baseline"
          :x1="CELL.x - 40"
          :y1="CELL.y + 16"
          :x2="CELL.x + 40"
          :y2="CELL.y + 16"
        />
        <path class="bc-tick" :d="ticksPath" />
      </svg>

      <!-- Stimulus toggle -->
      <div class="bc-toggle">
        <button
          v-for="btn in stimButtons"
          :key="btn.mode"
          class="bc-btn"
          :class="{ active: stimMode === btn.mode }"
          @click="setStimMode(btn.mode)"
        >
          {{ btn.label }}
        </button>
      </div>

      <!-- Attention toggle (only visible when both stimuli shown) -->
      <div v-if="competing" class="bc-toggle bc-toggle-sub">
        <button
          v-for="btn in attendButtons"
          :key="btn.mode"
          class="bc-btn"
          :class="{ active: attendMode === btn.mode }"
          @click="setAttendMode(btn.mode)"
        >
          {{ btn.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * Biased Competition — token-swapped from the original hardcoded hex.
 *
 * Colour mapping from original → brand.css tokens:
 *   --bg:#eef0f0        → rgb(var(--color-bg))
 *   --panel:#f8f8f7     → rgb(var(--color-paper))
 *   --ink:#1a1a1a       → rgb(var(--color-ink))
 *   --dim:#6b7280       → rgb(var(--color-mute))
 *   --line:#dcdedd      → rgb(var(--color-line))
 *   --teal:#1fb3a3      → rgb(var(--color-accent))
 *   --teal-soft:#cdeee9 → rgb(var(--color-accent) / 0.25)
 *   --yellow:#f5d90a    → kept as-is (attention highlight, no token match)
 *   --grey-shape:#c9cccb → rgb(var(--color-mute) / 0.55)
 */

/* ── Local vars ─────────────────────────────────────────────────────── */
.bc-wrap {
  --bc-ink: rgb(var(--color-ink));
  --bc-mute: rgb(var(--color-mute));
  --bc-line: rgb(var(--color-line));
  --bc-accent: rgb(var(--color-accent));
  --bc-accent-soft: rgb(var(--color-accent) / 0.25);
  --bc-yellow: #f5d90a;
  --bc-yellow-soft: rgba(245, 217, 10, 0.3);
  --bc-grey-shape: rgb(var(--color-mute) / 0.55);
  --bc-brain-fill: rgb(var(--color-paper));

  max-width: 600px;
  margin: 0 auto;
  padding: 22px;
}

/* ── Header ─────────────────────────────────────────────────────────── */
.bc-head {
  margin-bottom: 14px;
}
.bc-head h1 {
  margin: 0 0 3px;
}
.bc-sub {
  color: var(--bc-mute);
}

/* ── Card ───────────────────────────────────────────────────────────── */
.bc-card {
  background: rgb(var(--color-paper));
  border: 1px solid var(--bc-line);
  border-radius: 6px;
  padding: 20px 18px 18px;
}

/* ── SVG ────────────────────────────────────────────────────────────── */
.bc-svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}
.bc-svg text {
  font-family: var(--font-body, -apple-system, BlinkMacSystemFont, sans-serif);
}

/* Tags / labels */
.bc-tag {
  fill: var(--bc-mute);
  font-size: 10px;
  letter-spacing: 0.04em;
}
.bc-tag-accent {
  fill: var(--bc-accent);
  font-weight: 600;
}

/* Monitor */
.bc-screen-bezel {
  fill: rgb(var(--color-paper));
  stroke: var(--bc-ink);
  stroke-width: 2;
}
.bc-screen-stand {
  fill: rgb(var(--color-line));
}
.bc-fix-dot {
  fill: var(--bc-ink);
}

/* Receptive field */
.bc-rf-ellipse {
  fill: none;
  stroke: var(--bc-accent);
  stroke-width: 1.75;
  stroke-dasharray: 4 3;
}

/* Stimulus shapes */
.bc-stim-shape {
  transition: fill 0.35s ease;
}
.bc-stim-shape.neutral {
  fill: var(--bc-ink);
}
.bc-stim-shape.attended {
  fill: var(--bc-ink);
}
.bc-stim-shape.dimmed {
  fill: var(--bc-grey-shape);
}

/* Attention ring */
.bc-stim-ring {
  fill: none;
  stroke: var(--bc-yellow);
  stroke-width: 2.5;
  opacity: 0;
  transition: opacity 0.35s ease;
}
.bc-stim-ring.on {
  opacity: 1;
}

/* Brain */
.bc-brain-outline {
  fill: var(--bc-brain-fill);
  stroke: var(--bc-ink);
  stroke-width: 2;
}
.bc-fissure {
  stroke: var(--bc-ink);
  stroke-width: 1.25;
  opacity: 0.55;
}
.bc-neuron-marker {
  fill: var(--bc-accent);
}

/* Feed line */
.bc-feed-line {
  fill: none;
  stroke: var(--bc-accent);
  stroke-width: 2;
  stroke-dasharray: 5 6;
  animation: bc-dashmove 1.4s linear infinite;
  opacity: 0.8;
}
@keyframes bc-dashmove {
  to {
    stroke-dashoffset: -22;
  }
}

/* Response readout */
.bc-cell-circle {
  fill: rgb(var(--color-paper));
  stroke: var(--bc-ink);
  stroke-width: 2.5;
}
.bc-cell-glow {
  fill: var(--bc-yellow-soft);
  transition: opacity 0.35s ease;
}
.bc-baseline {
  stroke: var(--bc-ink);
  stroke-width: 1.5;
  opacity: 0.5;
}
.bc-tick {
  fill: none;
  stroke: var(--bc-ink);
  stroke-width: 2.25;
  stroke-linecap: round;
  transition: d 0.4s ease;
}

/* ── Toggle buttons ─────────────────────────────────────────────────── */
.bc-toggle {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  justify-content: center;
  flex-wrap: wrap;
}
.bc-toggle-sub {
  margin-top: 8px;
}
.bc-btn {
  font-family: var(--font-body, -apple-system, BlinkMacSystemFont, sans-serif);
  font-size: 12px;
  font-weight: 600;
  background: rgb(var(--color-paper));
  border: 1.5px solid var(--bc-line);
  color: var(--bc-ink);
  border-radius: 5px;
  padding: 8px 14px;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
}
.bc-btn:hover:not(.active) {
  border-color: var(--bc-accent);
}
.bc-btn.active {
  background: var(--bc-accent);
  border-color: var(--bc-accent);
  color: rgb(var(--color-bg));
}
.bc-btn:focus-visible {
  outline: 2px solid var(--bc-accent);
  outline-offset: 2px;
}

/* ── Reduced motion ─────────────────────────────────────────────────── */
[data-reduce-motion="1"] .bc-stim-shape,
[data-reduce-motion="1"] .bc-stim-ring,
[data-reduce-motion="1"] .bc-cell-glow,
[data-reduce-motion="1"] .bc-btn {
  transition: none;
}
[data-reduce-motion="1"] .bc-feed-line {
  animation: none;
}
</style>
