<script setup>
/*
 * HillyardErpView — selective attention changes the auditory ERP.
 *
 * Ported from Arjun Krishnaswamy's hillyard_attention_erp_widget.html
 * (src/widgets/source/, kept byte-for-byte). Attend to the left or right ear
 * and the N1 of the left-ear tone grows or shrinks; the widget auto-switches
 * every 4.2 s until the reader picks an ear. Based on Hillyard, Hink, Schwent
 * & Picton (1973), Science 182:177–180, Fig. 1.
 *
 * OPENBRAIN-88. A faithful port (OPENBRAIN-75): the author's layout,
 * colours, system sans stack and figure geometry are unchanged. Differences
 * are only in hosting:
 *   - every class carries an `hl-` prefix and the palette lives on the root
 *     (`--hl-*`), so global classes (.grid, .marker, .active, .label, ...)
 *     cannot reach in and nothing leaks out;
 *   - the author's <main>/<header>/<section> are divs: the reader already
 *     has a <main>, and `.chapter-reader section` would stretch the card to
 *     100vh;
 *   - the auto-switch interval only runs while the widget is on screen and
 *     the tab is visible, and is cleared on unmount;
 *   - reduced motion follows the app's rule (src/widgets/figures/shared/
 *     motion.js): data-reduce-motion="1"/"0" on <html> wins, otherwise the
 *     OS setting. As in the original it stops the sound arcs, the focus rays
 *     and the wave drawing (the wave is shown fully drawn); switching itself
 *     is unchanged.
 */
import { computed, onBeforeUnmount, onMounted, ref, useId } from "vue";
import { prefersReducedMotion } from "@/widgets/figures/shared/motion.js";

const SWITCH_MS = 4200;

// ── State ──────────────────────────────────────────────────────────────
const attended = ref("left");
const auto = ref(true);
const drawId = ref(0); // re-keys the wave so its draw animation restarts
const reducedMotion = ref(prefersReducedMotion());

const isLeft = computed(() => attended.value === "left");

const uid = useId();
const titleId = `${uid}-hl-title`;
const descId = `${uid}-hl-desc`;

/*
 * Negative voltage is plotted upward, matching the convention in Fig. 1.
 * Only N1 amplitude changes strongly; P2 remains broadly similar.
 * Verbatim from the original.
 */
function waveform(large) {
  const n1 = large ? 31 : 14;
  return `M66 67 C78 66 83 68 91 64 C102 59 110 72 121 69
      C133 67 143 ${67 - n1 * 0.68} 154 ${67 - n1}
      C166 ${67 - n1 * 0.72} 177 61 190 67
      C205 77 218 89 235 91 C251 91 266 78 282 68
      C301 62 318 65 337 68 C357 72 373 73 390 69
      C410 65 432 67 458 67`;
}
const wavePath = computed(() => waveform(isLeft.value));

// ── Behaviour (the original's render / schedule / syncAuto) ────────────
let timer = null;
let onScreen = true;
let pageHidden = typeof document !== "undefined" && document.hidden;

function render(userAction) {
  drawId.value++;
  if (userAction && auto.value) {
    auto.value = false;
    schedule();
  }
}

function schedule() {
  clearInterval(timer);
  timer = null;
  if (auto.value && onScreen && !pageHidden) {
    timer = setInterval(() => {
      attended.value = attended.value === "left" ? "right" : "left";
      render(false);
    }, SWITCH_MS);
  }
}

function attend(side) {
  attended.value = side;
  render(true);
}

function toggleAuto() {
  auto.value = !auto.value;
  schedule();
}

// ── Lifecycle: visibility, reduced motion, cleanup ─────────────────────
const root = ref(null);
let observer = null;
let motionObserver = null;
let motionQuery = null;

function onVisibilityChange() {
  pageHidden = document.hidden;
  schedule();
}
function syncMotion() {
  reducedMotion.value = prefersReducedMotion();
}

onMounted(() => {
  if (typeof IntersectionObserver !== "undefined" && root.value) {
    observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting === onScreen) return;
      onScreen = entry.isIntersecting;
      schedule();
    });
    observer.observe(root.value);
  }
  document.addEventListener("visibilitychange", onVisibilityChange);

  if (typeof MutationObserver !== "undefined") {
    motionObserver = new MutationObserver(syncMotion);
    motionObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-reduce-motion"],
    });
  }
  motionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  motionQuery?.addEventListener?.("change", syncMotion);
  syncMotion();

  schedule();
});

onBeforeUnmount(() => {
  clearInterval(timer);
  timer = null;
  observer?.disconnect();
  motionObserver?.disconnect();
  motionQuery?.removeEventListener?.("change", syncMotion);
  document.removeEventListener("visibilitychange", onVisibilityChange);
});
</script>

<template>
  <div
    ref="root"
    class="widget-root hl-page"
    :class="{ 'hl-rm': reducedMotion }"
  >
    <div class="hl-wrap">
      <div class="hl-head">
        <h1 class="hl-heading">Selective attention changes the auditory ERP</h1>
        <div class="hl-sub">
          The same left-ear tone evokes a larger early response when the
          listener attends left.
        </div>
      </div>

      <div
        class="hl-card"
        role="region"
        aria-label="Interactive explanation of Hillyard and colleagues' 1973 auditory attention experiment"
      >
        <svg
          class="hl-svg"
          viewBox="0 0 620 455"
          role="img"
          :aria-labelledby="`${titleId} ${descId}`"
        >
          <title :id="titleId">
            Auditory selective attention and the N1 event-related potential
          </title>
          <desc :id="descId">
            Tone streams enter both ears. A vertex electrode and mastoid
            reference record an ERP to left-ear tones. Switching attention
            changes the N1 amplitude.
          </desc>

          <!-- sources -->
          <g aria-hidden="true">
            <rect
              class="hl-source"
              x="18"
              y="124"
              width="28"
              height="44"
              rx="4"
            />
            <path
              class="hl-source-cone"
              d="M46 132 L67 120 L67 172 L46 160 Z"
            />
            <text class="hl-label hl-coral" x="42" y="105" text-anchor="middle">
              800 Hz
            </text>
            <text class="hl-small" x="42" y="116" text-anchor="middle">
              left-ear stream
            </text>
            <path class="hl-sound-arc hl-on" d="M77 130 Q91 146 77 162" />
            <path
              class="hl-sound-arc hl-on hl-delay"
              d="M86 121 Q108 146 86 171"
            />

            <rect
              class="hl-source"
              x="574"
              y="124"
              width="28"
              height="44"
              rx="4"
            />
            <path
              class="hl-source-cone"
              d="M574 132 L553 120 L553 172 L574 160 Z"
            />
            <text
              class="hl-label hl-coral"
              x="578"
              y="105"
              text-anchor="middle"
            >
              1500 Hz
            </text>
            <text class="hl-small" x="578" y="116" text-anchor="middle">
              right-ear stream
            </text>
            <path class="hl-sound-arc hl-on" d="M543 130 Q529 146 543 162" />
            <path
              class="hl-sound-arc hl-on hl-delay"
              d="M534 121 Q512 146 534 171"
            />
          </g>

          <!-- head -->
          <g aria-hidden="true">
            <path
              class="hl-neck"
              d="M278 248 Q279 276 259 291 M342 248 Q341 276 361 291"
            />
            <path
              class="hl-head-shape"
              d="M310 36 C245 36 230 91 237 151 C241 197 265 247 310 260 C355 247 379 197 383 151 C390 91 375 36 310 36 Z"
            />
            <ellipse class="hl-ear" cx="236" cy="148" rx="15" ry="28" />
            <ellipse class="hl-ear" cx="384" cy="148" rx="15" ry="28" />
            <path
              class="hl-brain"
              d="M267 113 C274 77 348 77 355 113 C365 145 345 168 310 169 C275 168 255 145 267 113 Z"
            />
            <circle class="hl-eye" cx="285" cy="151" r="2.8" />
            <circle class="hl-eye" cx="335" cy="151" r="2.8" />
            <path class="hl-nose" d="M310 151 L305 179 L314 180" />
            <path class="hl-nose" d="M293 205 Q310 214 327 205" />

            <ellipse
              class="hl-attention-halo"
              :class="{ 'hl-on': isLeft }"
              cx="226"
              cy="148"
              rx="30"
              ry="43"
            />
            <ellipse
              class="hl-attention-halo"
              :class="{ 'hl-on': !isLeft }"
              cx="394"
              cy="148"
              rx="30"
              ry="43"
            />
            <path
              class="hl-focus-ray"
              :class="{ 'hl-on': isLeft }"
              d="M271 123 Q248 130 230 143"
            />
            <path
              class="hl-focus-ray"
              :class="{ 'hl-on': !isLeft }"
              d="M349 123 Q372 130 390 143"
            />

            <!-- vertex + mastoid reference -->
            <circle class="hl-electrode" cx="310" cy="41" r="8" />
            <circle cx="310" cy="41" r="3" fill="var(--hl-teal)" />
            <path
              class="hl-lead"
              d="M310 33 C310 13 402 17 438 49 C462 71 459 244 476 282"
            />
            <text class="hl-small hl-teal" x="322" y="25">
              vertex electrode
            </text>
            <circle class="hl-ref" cx="389" cy="171" r="6" />
            <path class="hl-reflead" d="M394 174 C422 184 439 232 462 283" />
            <text class="hl-tiny" x="404" y="174">mastoid reference</text>
          </g>

          <text
            class="hl-state-copy"
            x="310"
            y="306"
            text-anchor="middle"
            data-test="attention-label"
          >
            Attention: {{ isLeft ? "left" : "right" }} ear
          </text>

          <!-- ERP plot -->
          <g transform="translate(72 326)">
            <rect
              class="hl-plot-bg"
              x="0"
              y="0"
              width="476"
              height="112"
              rx="5"
            />
            <text class="hl-label" x="14" y="18">ERP to the left-ear tone</text>
            <text
              class="hl-small"
              :class="isLeft ? 'hl-teal' : 'hl-coral'"
              x="462"
              y="18"
              text-anchor="end"
              data-test="condition-label"
            >
              {{ isLeft ? "left ear attended" : "left ear ignored" }}
            </text>
            <line class="hl-grid" x1="66" y1="37" x2="458" y2="37" />
            <line class="hl-axis" x1="66" y1="67" x2="458" y2="67" />
            <line class="hl-axis" x1="66" y1="31" x2="66" y2="100" />
            <line class="hl-tick" x1="66" y1="67" x2="66" y2="72" />
            <line class="hl-tick" x1="164" y1="67" x2="164" y2="72" />
            <line class="hl-tick" x1="262" y1="67" x2="262" y2="72" />
            <line class="hl-tick" x1="360" y1="67" x2="360" y2="72" />
            <line class="hl-tick" x1="458" y1="67" x2="458" y2="72" />
            <text class="hl-tiny" x="66" y="84" text-anchor="middle">0</text>
            <text class="hl-tiny" x="164" y="84" text-anchor="middle">100</text>
            <text class="hl-tiny" x="262" y="84" text-anchor="middle">200</text>
            <text class="hl-tiny" x="360" y="84" text-anchor="middle">300</text>
            <text class="hl-tiny" x="458" y="84" text-anchor="middle">
              400 ms
            </text>
            <text class="hl-tiny" x="57" y="42" text-anchor="end">−</text>
            <text class="hl-tiny" x="57" y="96" text-anchor="end">+</text>
            <text
              class="hl-tiny"
              x="18"
              y="70"
              transform="rotate(-90 18 70)"
              text-anchor="middle"
            >
              voltage (negative up)
            </text>
            <line class="hl-marker" x1="154" y1="31" x2="154" y2="100" />
            <rect
              class="hl-n1-tag"
              x="142"
              y="23"
              width="24"
              height="14"
              rx="7"
            />
            <text class="hl-n1-text" x="154" y="33">N1</text>
            <path class="hl-wave-shadow" :d="wavePath" opacity=".65" />
            <path
              :key="drawId"
              class="hl-wave"
              :d="wavePath"
              data-test="wave"
            />
          </g>
        </svg>

        <div
          class="hl-controls"
          role="group"
          aria-label="Choose which ear is attended"
        >
          <button
            type="button"
            class="hl-btn"
            :class="{ 'hl-active': isLeft }"
            :aria-pressed="String(isLeft)"
            data-test="attend-left"
            @click="attend('left')"
          >
            Attend left
          </button>
          <button
            type="button"
            class="hl-btn"
            :class="{ 'hl-active': !isLeft }"
            :aria-pressed="String(!isLeft)"
            data-test="attend-right"
            @click="attend('right')"
          >
            Attend right
          </button>
          <button
            type="button"
            class="hl-btn hl-secondary"
            :class="{ 'hl-active': auto }"
            :aria-pressed="String(auto)"
            data-test="auto-switch"
            @click="toggleAuto"
          >
            {{ auto ? "Pause switching" : "Auto switch" }}
          </button>
        </div>
        <p class="hl-takeaway" data-test="takeaway">
          <template v-if="isLeft">
            <strong>Larger N1:</strong> attending the tone's ear enhances the
            early sensory response, about 80–110 ms after onset.
          </template>
          <template v-else>
            <strong>Smaller N1:</strong> the identical left-ear tone evokes less
            activity when attention is directed to the other ear.
          </template>
        </p>
        <p class="hl-source-note">
          Concept and waveform based on Hillyard, Hink, Schwent &amp; Picton
          (1973), <em>Science</em> 182:177–180, Fig. 1. Amplitudes are
          exaggerated for clarity.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * The author's stylesheet, one-to-one. `:root` → .hl-page, `body` →
 * .hl-page (background, padding, font), element selectors → hl- classes.
 */
.hl-page {
  --hl-bg: #eef0f0;
  --hl-panel: #f8f8f7;
  --hl-ink: #1a1a1a;
  --hl-dim: #6b7280;
  --hl-line: #dcdedd;
  --hl-teal: #1fb3a3;
  --hl-teal-soft: #cdeee9;
  --hl-yellow: #f5d90a;
  --hl-yellow-soft: rgba(245, 217, 10, 0.28);
  --hl-coral: #e76f51;
  --hl-coral-soft: #f6d9d1;
  --hl-sans:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial,
    sans-serif;

  box-sizing: border-box;
  margin: 0;
  padding: 22px;
  background: var(--hl-bg);
  color: var(--hl-ink);
  font-family: var(--hl-sans);
  font-size: 16px;
  line-height: normal;
  letter-spacing: normal;
  text-align: left;
}
.hl-page *,
.hl-page *::before,
.hl-page *::after {
  box-sizing: border-box;
}

.hl-wrap {
  max-width: 680px;
  margin: 0 auto;
}
.hl-head {
  margin-bottom: 14px;
}
.hl-head .hl-heading {
  font-family: var(--hl-sans);
  font-size: 15px;
  font-weight: 700;
  line-height: normal;
  letter-spacing: normal;
  margin: 0 0 4px;
  padding: 0;
  color: var(--hl-ink);
}
.hl-head .hl-sub {
  font-size: 12px;
  color: var(--hl-dim);
  line-height: 1.45;
}
.hl-card {
  background: var(--hl-panel);
  border: 1px solid var(--hl-line);
  border-radius: 7px;
  padding: 18px;
}
.hl-svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}
.hl-svg text {
  font-family: var(--hl-sans);
}
.hl-label {
  fill: var(--hl-ink);
  font-size: 11px;
  font-weight: 650;
}
.hl-small {
  fill: var(--hl-dim);
  font-size: 9.5px;
}
.hl-tiny {
  fill: var(--hl-dim);
  font-size: 8.5px;
}
.hl-teal {
  fill: var(--hl-teal);
}
.hl-coral {
  fill: var(--hl-coral);
}

.hl-head-shape {
  fill: #f1f2f0;
  stroke: var(--hl-ink);
  stroke-width: 2;
}
.hl-ear {
  fill: #fff;
  stroke: var(--hl-ink);
  stroke-width: 1.6;
}
.hl-neck {
  fill: none;
  stroke: var(--hl-ink);
  stroke-width: 2;
  stroke-linecap: round;
}
.hl-nose {
  fill: none;
  stroke: var(--hl-ink);
  stroke-width: 1.6;
  stroke-linecap: round;
}
.hl-eye {
  fill: var(--hl-ink);
}
.hl-brain {
  fill: none;
  stroke: #a9adab;
  stroke-width: 1.2;
  stroke-dasharray: 3 3;
}
.hl-electrode {
  fill: #fff;
  stroke: var(--hl-teal);
  stroke-width: 2;
}
.hl-lead {
  fill: none;
  stroke: var(--hl-teal);
  stroke-width: 2;
}
.hl-ref {
  fill: #fff;
  stroke: #8a8d8c;
  stroke-width: 1.8;
}
.hl-reflead {
  fill: none;
  stroke: #8a8d8c;
  stroke-width: 1.7;
}

.hl-source {
  fill: #fff;
  stroke: var(--hl-ink);
  stroke-width: 1.6;
}
.hl-source-cone {
  fill: #d7d9d8;
  stroke: var(--hl-ink);
  stroke-width: 1.4;
}
.hl-sound-arc {
  fill: none;
  stroke: var(--hl-coral);
  stroke-width: 2;
  stroke-linecap: round;
  opacity: 0.25;
}
.hl-sound-arc.hl-on {
  animation: hlSoundPulse 1.45s ease-out infinite;
}
.hl-sound-arc.hl-delay {
  animation-delay: 0.48s;
}
@keyframes hlSoundPulse {
  0% {
    opacity: 0.12;
    stroke-width: 1.5;
  }
  35% {
    opacity: 1;
    stroke-width: 2.5;
  }
  75%,
  100% {
    opacity: 0.12;
    stroke-width: 1.5;
  }
}

.hl-attention-halo {
  fill: var(--hl-yellow-soft);
  stroke: var(--hl-yellow);
  stroke-width: 2;
  opacity: 0;
  transition: opacity 0.35s ease;
}
.hl-attention-halo.hl-on {
  opacity: 1;
}
.hl-focus-ray {
  fill: none;
  stroke: var(--hl-yellow);
  stroke-width: 2;
  stroke-dasharray: 4 5;
  opacity: 0;
  transition: opacity 0.35s ease;
  animation: hlDash 1.1s linear infinite;
}
.hl-focus-ray.hl-on {
  opacity: 0.9;
}
@keyframes hlDash {
  to {
    stroke-dashoffset: -18;
  }
}

.hl-plot-bg {
  fill: #fff;
  stroke: var(--hl-line);
  stroke-width: 1.2;
}
.hl-axis {
  stroke: #9ca09e;
  stroke-width: 1;
}
.hl-tick {
  stroke: #b9bcba;
  stroke-width: 1;
}
.hl-grid {
  stroke: #e8e9e8;
  stroke-width: 1;
}
.hl-wave-shadow {
  fill: none;
  stroke: var(--hl-teal-soft);
  stroke-width: 7;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.hl-wave {
  fill: none;
  stroke: var(--hl-teal);
  stroke-width: 2.6;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 520;
  stroke-dashoffset: 520;
  animation: hlDrawWave 2.7s ease-in-out infinite;
}
@keyframes hlDrawWave {
  0%,
  12% {
    stroke-dashoffset: 520;
  }
  65%,
  100% {
    stroke-dashoffset: 0;
  }
}
.hl-marker {
  stroke: var(--hl-yellow);
  stroke-width: 1.5;
  stroke-dasharray: 3 3;
}
.hl-n1-tag {
  fill: var(--hl-yellow);
  stroke: #d3b900;
  stroke-width: 0.7;
}
.hl-n1-text {
  fill: var(--hl-ink);
  font-size: 9px;
  font-weight: 750;
  text-anchor: middle;
}
.hl-state-copy {
  fill: var(--hl-ink);
  font-size: 11px;
  font-weight: 650;
}

.hl-controls {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 12px;
}
.hl-btn {
  background: #fff;
  border: 1.5px solid var(--hl-line);
  color: var(--hl-ink);
  font: 600 12px var(--hl-sans);
  letter-spacing: normal;
  text-transform: none;
  border-radius: 5px;
  padding: 8px 13px;
  margin: 0;
  cursor: pointer;
  transition: all 0.15s;
}
.hl-btn:hover:not(.hl-active) {
  border-color: var(--hl-teal);
}
.hl-btn.hl-active {
  background: var(--hl-teal);
  border-color: var(--hl-teal);
  color: #fff;
}
/* After .hl-active, as in the original: an active "Pause switching" keeps
   the dim label on teal. */
.hl-btn.hl-secondary {
  color: var(--hl-dim);
  min-width: 92px;
}
.hl-takeaway {
  margin: 14px 2px 0;
  padding-top: 12px;
  border-top: 1px solid var(--hl-line);
  font-size: 11px;
  line-height: 1.5;
  color: var(--hl-dim);
}
.hl-takeaway strong {
  color: var(--hl-ink);
  font-weight: 700;
}
.hl-source-note {
  margin: 8px 2px 0;
  font-size: 9.5px;
  color: #858987;
}

/* Reduced motion (the original's @media rule, driven by the app's setting). */
.hl-rm .hl-sound-arc,
.hl-rm .hl-sound-arc.hl-on,
.hl-rm .hl-focus-ray,
.hl-rm .hl-wave {
  animation: none;
}
.hl-rm .hl-wave {
  stroke-dashoffset: 0;
}
</style>
