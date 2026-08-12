<script setup>
/*
 * TmtFeatureAttentionView — Feature-based Attention (Treue & Martinez-Trujillo)
 *
 * Ported from Arjun's tmt_feature_attention_widget.html.
 * Three conditions show how attending to a direction of motion outside
 * the RF modulates the response to a fixed preferred-direction stimulus
 * inside the RF. Spike raster data is hardcoded per condition.
 *
 * OPENBRAIN-13: fifth widget port (follows SDT pilot pattern).
 *
 * Design ownership: Sonia owns design. Token-swap only.
 *
 * Colour mapping from original → brand.css tokens:
 *   --bg:#1a1c20       → rgb(var(--color-bg))
 *   --panel-bg:#22252b → rgb(var(--color-paper))
 *   --magenta:#e8408c  → rgb(var(--color-accent))
 *   --text:#d8dade     → rgb(var(--color-ink))
 *   --dim-text:#8890a0 → rgb(var(--color-mute))
 *   --line:#3a3d44     → rgb(var(--color-line))
 *   --grey-blue:#6f8299 → kept as-is (RF stimulus, no token)
 *   --neutral:#9aa0aa  → rgb(var(--color-mute))
 *   --null-blue:#5b6b80 → kept as-is (anti-preferred, no token)
 */
import { ref, computed } from "vue";

// ── State ─────────────────────────────────────────────────────────────
const condition = ref("fixation"); // 'fixation' | 'preferred' | 'null'

// ── Toggle definitions ───────────────────────────────────────────────
const conditions = [
  { id: "fixation", label: "Attend fixation" },
  { id: "preferred", label: "Attend preferred direction" },
  { id: "null", label: "Attend null direction" },
];

// ── Sublabels ─────────────────────────────────────────────────────────
const sublabels = {
  fixation: "neither stimulus behaviourally relevant",
  preferred:
    "attended target is outside the RF, moving in the cell's preferred direction",
  null: "attended target is outside the RF, moving in the cell's anti-preferred direction",
};
const sublabel = computed(() => sublabels[condition.value]);

// ── Spike raster data (x positions, extracted from original) ─────────
const RASTER_DATA = {
  fixation: {
    color: "var(--tmt-neutral)",
    spikes: [
      12.3, 16.5, 19.9, 24.9, 34.7, 52.7, 60.4, 76.7, 87.0, 94.2, 97.5, 133.1,
      136.5, 140.2, 152.2, 158.1, 167.0, 174.8, 182.8, 186.9, 193.7, 204.9,
      209.0, 233.2, 237.9, 247.2, 270.5, 282.0, 286.9, 291.3,
    ],
  },
  preferred: {
    color: "var(--tmt-accent)",
    spikes: [
      8.2, 12.7, 19.0, 27.9, 32.7, 36.7, 41.5, 45.2, 51.8, 58.5, 62.2, 67.6,
      73.2, 78.0, 81.4, 84.6, 90.1, 94.4, 98.6, 102.5, 113.6, 117.8, 121.7,
      127.5, 135.1, 141.5, 145.4, 166.8, 170.5, 173.5, 178.8, 182.5, 186.8,
      190.8, 194.6, 204.3, 208.1, 212.6, 215.9, 225.6, 229.1, 234.4, 240.3,
      248.4, 254.1, 259.3, 266.5, 275.1, 280.1, 286.4,
    ],
  },
  null: {
    color: "var(--tmt-null)",
    spikes: [
      29.4, 107.9, 116.6, 126.5, 163.1, 170.7, 180.9, 185.5, 189.6, 202.6,
      207.8, 217.3, 233.3, 255.4, 263.7, 267.9, 291.8,
    ],
  },
};

const raster = computed(() => RASTER_DATA[condition.value]);

// ── Actions ───────────────────────────────────────────────────────────
function setCondition(cond) {
  condition.value = cond;
}
</script>

<template>
  <div class="tmt-wrap">
    <div class="tmt-title t-label">
      Feature-based attention modulates responses to a fixed, unattended
      stimulus
    </div>
    <div class="tmt-subtitle t-caption">
      single-unit spike train, one trial per condition &middot; differences
      exaggerated for legibility, not to scale &middot; adapted from Treue &amp;
      Martinez-Trujillo (1999), Fig.&nbsp;2
    </div>

    <!-- Toggle -->
    <div class="tmt-toggle">
      <button
        v-for="c in conditions"
        :key="c.id"
        class="tmt-toggle-btn"
        :class="{ active: condition === c.id }"
        @click="setCondition(c.id)"
      >
        {{ c.label }}
      </button>
    </div>

    <!-- Panel -->
    <div class="tmt-panel">
      <div class="tmt-sublabel t-caption">{{ sublabel }}</div>

      <!-- Schematic: fixation -->
      <svg
        v-if="condition === 'fixation'"
        class="tmt-schematic"
        viewBox="0 0 350 170"
        aria-label="Fixation condition schematic"
      >
        <defs>
          <marker
            id="arrowGrey"
            markerWidth="6"
            markerHeight="6"
            refX="3"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 z" fill="var(--tmt-grey)" />
          </marker>
        </defs>
        <!-- Fixation ring (attended) -->
        <circle
          cx="175"
          cy="85"
          r="16"
          fill="none"
          stroke="var(--tmt-accent)"
          stroke-width="2"
          opacity="0.85"
        />
        <line
          x1="169"
          y1="85"
          x2="181"
          y2="85"
          stroke="var(--tmt-ink)"
          stroke-width="2"
        />
        <line
          x1="175"
          y1="79"
          x2="175"
          y2="91"
          stroke="var(--tmt-ink)"
          stroke-width="2"
        />
        <!-- RF stimulus -->
        <circle
          cx="90"
          cy="85"
          r="42"
          fill="none"
          stroke="var(--tmt-mute)"
          stroke-width="1.5"
          stroke-dasharray="4,3"
        />
        <circle cx="90" cy="85" r="5" fill="var(--tmt-grey)" />
        <line
          x1="90"
          y1="85"
          x2="90"
          y2="55"
          stroke="var(--tmt-grey)"
          stroke-width="2.5"
          marker-end="url(#arrowGrey)"
        />
        <!-- Opposite side (dim) -->
        <circle
          cx="260"
          cy="85"
          r="5"
          fill="var(--tmt-neutral)"
          opacity="0.55"
        />
        <!-- Labels -->
        <text
          x="90"
          y="145"
          font-size="9.5"
          fill="var(--tmt-mute)"
          text-anchor="middle"
          class="tmt-svg-text"
        >
          RF stimulus
        </text>
        <text
          x="90"
          y="157"
          font-size="9.5"
          fill="var(--tmt-mute)"
          text-anchor="middle"
          class="tmt-svg-text"
        >
          (pref. direction, fixed)
        </text>
      </svg>

      <!-- Schematic: preferred -->
      <svg
        v-if="condition === 'preferred'"
        class="tmt-schematic"
        viewBox="0 0 350 170"
        aria-label="Attend preferred direction schematic"
      >
        <defs>
          <marker
            id="arrowGrey2"
            markerWidth="6"
            markerHeight="6"
            refX="3"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 z" fill="var(--tmt-grey)" />
          </marker>
          <marker
            id="arrowMag"
            markerWidth="6"
            markerHeight="6"
            refX="3"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 z" fill="var(--tmt-accent)" />
          </marker>
        </defs>
        <!-- Fixation (dim) -->
        <line
          x1="169"
          y1="85"
          x2="181"
          y2="85"
          stroke="var(--tmt-mute)"
          stroke-width="1.5"
          opacity="0.6"
        />
        <line
          x1="175"
          y1="79"
          x2="175"
          y2="91"
          stroke="var(--tmt-mute)"
          stroke-width="1.5"
          opacity="0.6"
        />
        <!-- RF stimulus -->
        <circle
          cx="90"
          cy="85"
          r="42"
          fill="none"
          stroke="var(--tmt-mute)"
          stroke-width="1.5"
          stroke-dasharray="4,3"
        />
        <circle cx="90" cy="85" r="5" fill="var(--tmt-grey)" />
        <line
          x1="90"
          y1="85"
          x2="90"
          y2="55"
          stroke="var(--tmt-grey)"
          stroke-width="2.5"
          marker-end="url(#arrowGrey2)"
        />
        <!-- Attended target (preferred dir = upward) -->
        <circle
          cx="260"
          cy="85"
          r="18"
          fill="none"
          stroke="var(--tmt-accent)"
          stroke-width="2"
          opacity="0.9"
        />
        <circle cx="260" cy="85" r="5" fill="var(--tmt-accent)" />
        <line
          x1="260"
          y1="85"
          x2="260"
          y2="55"
          stroke="var(--tmt-accent)"
          stroke-width="2.5"
          marker-end="url(#arrowMag)"
        />
        <!-- Labels -->
        <text
          x="90"
          y="145"
          font-size="9.5"
          fill="var(--tmt-mute)"
          text-anchor="middle"
          class="tmt-svg-text"
        >
          RF stimulus
        </text>
        <text
          x="90"
          y="157"
          font-size="9.5"
          fill="var(--tmt-mute)"
          text-anchor="middle"
          class="tmt-svg-text"
        >
          (pref. direction, fixed)
        </text>
        <text
          x="260"
          y="145"
          font-size="9.5"
          fill="var(--tmt-accent)"
          text-anchor="middle"
          class="tmt-svg-text"
          opacity="0.9"
        >
          attended
        </text>
        <text
          x="260"
          y="157"
          font-size="9.5"
          fill="var(--tmt-accent)"
          text-anchor="middle"
          class="tmt-svg-text"
          opacity="0.9"
        >
          (same direction)
        </text>
      </svg>

      <!-- Schematic: null -->
      <svg
        v-if="condition === 'null'"
        class="tmt-schematic"
        viewBox="0 0 350 170"
        aria-label="Attend null direction schematic"
      >
        <defs>
          <marker
            id="arrowGrey3"
            markerWidth="6"
            markerHeight="6"
            refX="3"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 z" fill="var(--tmt-grey)" />
          </marker>
          <marker
            id="arrowBlue"
            markerWidth="6"
            markerHeight="6"
            refX="3"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 z" fill="var(--tmt-null)" />
          </marker>
        </defs>
        <!-- Fixation (dim) -->
        <line
          x1="169"
          y1="85"
          x2="181"
          y2="85"
          stroke="var(--tmt-mute)"
          stroke-width="1.5"
          opacity="0.6"
        />
        <line
          x1="175"
          y1="79"
          x2="175"
          y2="91"
          stroke="var(--tmt-mute)"
          stroke-width="1.5"
          opacity="0.6"
        />
        <!-- RF stimulus -->
        <circle
          cx="90"
          cy="85"
          r="42"
          fill="none"
          stroke="var(--tmt-mute)"
          stroke-width="1.5"
          stroke-dasharray="4,3"
        />
        <circle cx="90" cy="85" r="5" fill="var(--tmt-grey)" />
        <line
          x1="90"
          y1="85"
          x2="90"
          y2="55"
          stroke="var(--tmt-grey)"
          stroke-width="2.5"
          marker-end="url(#arrowGrey3)"
        />
        <!-- Attended target (null dir = downward) -->
        <circle
          cx="260"
          cy="85"
          r="18"
          fill="none"
          stroke="var(--tmt-accent)"
          stroke-width="2"
          opacity="0.9"
        />
        <circle cx="260" cy="85" r="5" fill="var(--tmt-null)" />
        <line
          x1="260"
          y1="85"
          x2="260"
          y2="115"
          stroke="var(--tmt-null)"
          stroke-width="2.5"
          marker-end="url(#arrowBlue)"
        />
        <!-- Labels -->
        <text
          x="90"
          y="145"
          font-size="9.5"
          fill="var(--tmt-mute)"
          text-anchor="middle"
          class="tmt-svg-text"
        >
          RF stimulus
        </text>
        <text
          x="90"
          y="157"
          font-size="9.5"
          fill="var(--tmt-mute)"
          text-anchor="middle"
          class="tmt-svg-text"
        >
          (pref. direction, fixed)
        </text>
        <text
          x="260"
          y="145"
          font-size="9.5"
          fill="var(--tmt-accent)"
          text-anchor="middle"
          class="tmt-svg-text"
          opacity="0.9"
        >
          attended
        </text>
        <text
          x="260"
          y="157"
          font-size="9.5"
          fill="var(--tmt-accent)"
          text-anchor="middle"
          class="tmt-svg-text"
          opacity="0.9"
        >
          (opposite direction)
        </text>
      </svg>

      <!-- Spike raster -->
      <div class="tmt-raster-area">
        <svg
          class="tmt-raster-svg"
          viewBox="0 0 300 70"
          aria-label="Spike raster"
        >
          <line
            v-for="(x, i) in raster.spikes"
            :key="i"
            :x1="x"
            y1="2"
            :x2="x"
            y2="66"
            :stroke="raster.color"
            stroke-width="1.8"
            stroke-linecap="round"
          />
          <line x1="8" y1="70" x2="292" y2="70" class="tmt-raster-baseline" />
        </svg>
      </div>
      <div class="tmt-axis-label t-caption">response to RF stimulus</div>
    </div>
  </div>
</template>

<style scoped>
/*
 * TMT Feature Attention — token-swapped from the original hardcoded hex.
 */

/* ── Local vars ─────────────────────────────────────────────────────── */
.tmt-wrap {
  --tmt-ink: rgb(var(--color-ink));
  --tmt-mute: rgb(var(--color-mute));
  --tmt-line: rgb(var(--color-line));
  --tmt-accent: rgb(var(--color-accent));
  --tmt-grey: #6f8299;
  --tmt-neutral: #9aa0aa;
  --tmt-null: #5b6b80;

  max-width: 560px;
  margin: 0 auto;
  padding: 36px 40px;
}

/* ── Header ─────────────────────────────────────────────────────────── */
.tmt-title {
  margin-bottom: 4px;
}
.tmt-subtitle {
  color: var(--tmt-mute);
  margin-bottom: 24px;
  line-height: 1.5;
}

/* ── Toggle ─────────────────────────────────────────────────────────── */
.tmt-toggle {
  display: flex;
  border: 1px solid var(--tmt-line);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 22px;
}
.tmt-toggle-btn {
  flex: 1;
  background: rgb(var(--color-paper));
  color: var(--tmt-mute);
  border: none;
  border-right: 1px solid var(--tmt-line);
  font-family: var(--font-body, -apple-system, BlinkMacSystemFont, sans-serif);
  font-size: 12px;
  padding: 11px 6px;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}
.tmt-toggle-btn:last-child {
  border-right: none;
}
.tmt-toggle-btn:hover:not(.active) {
  background: rgb(var(--color-line) / 0.4);
}
.tmt-toggle-btn.active {
  background: var(--tmt-accent);
  color: rgb(var(--color-bg));
  font-weight: 700;
}
.tmt-toggle-btn:focus-visible {
  outline: 2px solid var(--tmt-accent);
  outline-offset: -2px;
}

/* ── Panel ──────────────────────────────────────────────────────────── */
.tmt-panel {
  background: rgb(var(--color-paper));
  border: 1px solid var(--tmt-line);
  border-radius: 6px;
  padding: 20px 22px 24px;
}
.tmt-sublabel {
  color: var(--tmt-mute);
  text-align: center;
  margin-bottom: 6px;
  min-height: 32px;
  line-height: 1.4;
}

/* ── Schematic SVG ──────────────────────────────────────────────────── */
.tmt-schematic {
  width: 100%;
  height: 170px;
  display: block;
}
.tmt-svg-text {
  font-family: var(--font-mono, "JetBrains Mono", monospace);
}

/* ── Raster ─────────────────────────────────────────────────────────── */
.tmt-raster-area {
  margin-top: 24px;
  background: rgb(var(--color-bg));
  border: 1px solid var(--tmt-line);
  border-radius: 4px;
  padding: 10px 8px 6px;
}
.tmt-raster-svg {
  display: block;
  width: 100%;
}
.tmt-raster-baseline {
  stroke: var(--tmt-line);
  stroke-width: 1;
}
.tmt-axis-label {
  color: var(--tmt-mute);
  text-align: center;
  margin-top: 8px;
}

/* ── Reduced motion ─────────────────────────────────────────────────── */
[data-reduce-motion="1"] .tmt-toggle-btn {
  transition: none;
}
</style>
