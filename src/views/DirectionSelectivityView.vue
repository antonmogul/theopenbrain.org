<script setup>
import { ref, onMounted, nextTick } from "vue";
import { usePyodide } from "@/composables/usePyodide";
// eslint-disable-next-line import/no-unresolved -- Vite ?raw query suffix
import pythonSource from "@/widgets/python/directionSelectivity.py?raw";

const { status, error, runPython } = usePyodide();
const code = ref(pythonSource);
const copied = ref(false);

/* ------------------------------------------------------------------ */
/*  Editor helpers                                                     */
/* ------------------------------------------------------------------ */

const edRef = ref(null);
const hlRef = ref(null);
const errRef = ref(null);

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Same regex from the original — strings before comments so "#c1272d"
// is not mistaken for a comment start.
const RE =
  /("{3}[\s\S]*?"{3}|'{3}[\s\S]*?'{3})|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|(#[^\n]*)|\b(def|return|for|in|if|elif|else|import|from|as|None|True|False|lambda|class|while|and|or|not|with|global|pass|break|continue|try|except|finally|raise|yield)\b|\b(\d+(?:\.\d+)?)\b/g;

function paint(src) {
  if (!hlRef.value) return;
  hlRef.value.innerHTML = esc(src + "\n").replace(
    RE,
    function (m, doc, str, com, kw, num) {
      if (doc) return '<span class="tok-c">' + doc + "</span>";
      if (str) return '<span class="tok-s">' + str + "</span>";
      if (com) return '<span class="tok-c">' + com + "</span>";
      if (kw) return '<span class="tok-k">' + kw + "</span>";
      return '<span class="tok-n">' + num + "</span>";
    }
  );
}

async function run() {
  // Clear both figure mount points so a broken edit never leaves a stale picture.
  const rasters = document.getElementById("rasters");
  const tuning = document.getElementById("tuning");
  if (rasters) rasters.innerHTML = "";
  if (tuning) tuning.innerHTML = "";

  if (errRef.value) errRef.value.style.display = "none";

  await runPython(code.value);

  if (error.value && errRef.value) {
    errRef.value.textContent = error.value;
    errRef.value.style.display = "block";
  }
}

function resetCode() {
  code.value = pythonSource;
  paint(code.value);
  run();
}

function copyCode() {
  navigator.clipboard.writeText(code.value);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 1200);
}

function onInput() {
  if (edRef.value) code.value = edRef.value.value;
  paint(code.value);
}

function onScroll() {
  if (hlRef.value && edRef.value) {
    hlRef.value.scrollTop = edRef.value.scrollTop;
    hlRef.value.scrollLeft = edRef.value.scrollLeft;
  }
}

function onKeydown(e) {
  if (e.key === "Tab") {
    e.preventDefault();
    const el = edRef.value;
    const s = el.selectionStart;
    el.value = el.value.slice(0, s) + "    " + el.value.slice(el.selectionEnd);
    el.selectionStart = el.selectionEnd = s + 4;
    code.value = el.value;
    paint(code.value);
  }
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
    e.preventDefault();
    run();
  }
}

/* ------------------------------------------------------------------ */
/*  Status label                                                       */
/* ------------------------------------------------------------------ */

function statusText() {
  switch (status.value) {
    case "loading":
      return "starting Python…";
    case "running":
      return "running…";
    case "error":
      return "error";
    case "ready":
      return "ready";
    default:
      return "";
  }
}

/* ------------------------------------------------------------------ */
/*  Lifecycle                                                          */
/* ------------------------------------------------------------------ */

onMounted(async () => {
  await nextTick();
  if (edRef.value) edRef.value.value = code.value;
  paint(code.value);
  await run();
});
</script>

<template>
  <div class="ds-wrap">
    <!-- Header -->
    <header>
      <p class="ds-rubric">How it's made</p>
      <h1>What do direction selective retinal ganglion cells respond like?</h1>
      <p class="ds-stand">
        Below are responses from 4 real retinal ganglion cells to the same
        visual stimulus moving in 8 different directions, along with the Python
        that generates the figure. You can edit the code, and press Run, to play
        around with the data.
      </p>
    </header>

    <!-- Figure 1: Spike rasters + polar plots -->
    <div class="ds-card ds-figcard">
      <h2>Same visual stimulus, different firing patterns</h2>
      <p class="ds-sub">
        Each vertical tick is one action potential, and the set of action
        potentials evoked by a visual stimulus moving across the retina in 8
        different directions is shown for 4 direction selective ganglion cells
        with different preferred firing directions.
      </p>
      <!--
        The boot spinner is a SIBLING of #rasters, never a child. Python writes
        its figures by clearing #rasters with innerHTML, which would destroy any
        Vue-owned node inside it behind Vue's back — Vue then patches against a
        detached parent and throws "insertBefore of null". Keeping the two
        owners on separate elements is what makes that unrepresentable.
      -->
      <div v-if="status === 'loading'" class="ds-boot">
        <span class="ds-dotpulse"></span>Starting Python&hellip;
      </div>
      <div id="rasters"></div>
      <p class="ds-caption">
        Rows are cells, columns are directions of motion; the tinted panel marks
        each cell&rsquo;s strongest direction. The circular plots on the right
        are polar plots &mdash; the same eight spike counts arranged around a
        compass, with distance from the centre showing how many spikes a cell
        fired for a given direction. Each polar plot is normalized to the peak
        firing rate of that cell, so the outer circle is that cell&rsquo;s best
        direction and the centre is silence. The coloured arrow points along the
        preferred direction and its length is the DSI: the vector sum of the
        response to all directions.
      </p>
    </div>

    <!-- Figure 2: Population coding / tuning curves -->
    <div class="ds-card ds-figcard">
      <h2>
        Decoding motion direction from a population of direction selective
        ganglion cells
      </h2>
      <p class="ds-sub">
        Below, the directional tuning curves for the 4 direction selective
        ganglion cells have been unrolled and plotted together. Move the slider
        to change the direction of motion, to see with how much certainty a
        downstream decoder could tell the direction of motion by reading out
        from 1&ndash;4 direction selective ganglion cells.
      </p>
      <div class="ds-tuning-row">
        <div class="ds-tuning-plot">
          <!-- Sibling, not child — see the #rasters note above. -->
          <div v-if="status === 'loading'" class="ds-boot">
            <span class="ds-dotpulse"></span>Starting Python&hellip;
          </div>
          <div id="tuning"></div>
        </div>
        <aside class="ds-readout">
          <div class="ds-ro-dial">
            <svg
              class="ds-dial"
              width="132"
              height="132"
              viewBox="0 0 132 132"
              aria-hidden="true"
            >
              <circle
                cx="66"
                cy="66"
                r="52"
                fill="none"
                stroke="var(--ds-rule)"
              />
              <circle
                cx="66"
                cy="66"
                r="25"
                fill="none"
                stroke="var(--ds-rule-soft)"
              />
              <g id="dial-arrow" transform="translate(66,66)">
                <line
                  x1="-34"
                  y1="0"
                  x2="18"
                  y2="0"
                  stroke="var(--ds-ink)"
                  stroke-width="3.2"
                  stroke-linecap="round"
                />
                <path d="M39 0 L16 -11.5 L16 11.5 Z" fill="var(--ds-ink)" />
              </g>
              <rect
                id="dial-square"
                x="100"
                y="59"
                width="14"
                height="14"
                rx="1.5"
                fill="var(--ds-ink)"
              />
            </svg>
            <p class="ds-ang" id="ang-val">45&deg;</p>
            <p class="ds-angsub">direction of motion</p>
          </div>
          <div class="ds-ro-cells">
            <p class="ds-listen">Decoder is listening to</p>
            <table class="ds-cells">
              <tbody id="readout-rows"></tbody>
            </table>
            <p class="ds-hint">
              Click a cell to switch it in or out.<br />
              Drag the dotted line left or right.
            </p>
          </div>
          <div class="ds-ro-cert">
            <div class="ds-cert">
              <p class="ds-certlabel">Decoder certainty</p>
              <p class="ds-certval" id="cert-val">&mdash;</p>
              <div class="ds-certbar"><span id="cert-fill"></span></div>
              <p class="ds-certnote" id="cert-note">&nbsp;</p>
            </div>
          </div>
        </aside>
      </div>
      <p class="ds-caption">
        Follow one cell&rsquo;s curve: on its own it is ambiguous. For example,
        Cell 1 fires exactly the same for motion at 0&deg; as it does at
        315&deg;, so nothing downstream could tell those two directions apart
        from Cell 1&rsquo;s activity alone. Each individual DS cell here has the
        same problem, because the firing of a cell decays similarly for
        directions on either side of a cell&rsquo;s preferred firing direction.
      </p>
      <p class="ds-caption">
        Now pay attention to the tuning curves of all four at once. Every
        direction of motion now produces a unique combination of four numbers,
        and a downstream cell listening to all 4 cells would be able to reliably
        decode the direction of motion. This is population coding.
      </p>
      <p class="ds-caption">
        The lower panel makes that concrete. It asks how confident a downstream
        decoder could be about the motion direction, given only the cells
        currently switched on. Switch off all but one cell and the certainty
        collapses at ambiguous points in a cell&rsquo;s tuning curve. Switch a
        second cell on and it mostly recovers. But it matters which second cell:
        Cells 1 and 3 code for opposite directions, and together they barely
        improve decoder performance. In contrast, selecting a pair of DS cells
        with a 90 degree separation in preferred firing directions increases
        decoder performance.
      </p>
    </div>

    <!-- Code editor -->
    <div class="ds-card ds-codecard">
      <div class="ds-codehead">
        <h2>The code and the data</h2>
        <p class="ds-sub">
          Here&rsquo;s the code and data that generated the figures above. Feel
          free to play around with the data. If you make changes to the code,
          you can replot by clicking the &lsquo;Run&rsquo; button.
        </p>
      </div>
      <div class="ds-bar">
        <span class="ds-bar-title">figure.py</span>
        <span class="ds-bar-status">{{ statusText() }}</span>
        <button
          :disabled="status === 'loading' || status === 'running'"
          @click="resetCode"
        >
          Reset
        </button>
        <button @click="copyCode">{{ copied ? "Copied" : "Copy" }}</button>
        <button
          class="ds-primary"
          :disabled="status === 'loading' || status === 'running'"
          @click="run"
        >
          Run
        </button>
      </div>
      <div class="ds-editor">
        <pre ref="hlRef" id="hl" aria-hidden="true"></pre>
        <textarea
          ref="edRef"
          id="ed"
          spellcheck="false"
          aria-label="Figure source code"
          @input="onInput"
          @scroll="onScroll"
          @keydown="onKeydown"
        ></textarea>
      </div>
      <div ref="errRef" class="ds-err" id="err"></div>
    </div>

    <!-- Explanatory note -->
    <div class="ds-card ds-notecard">
      <h3>A note on how the decoder works</h3>
      <p>
        Spike counts are noisy: a cell that averages 20 spikes will fire 17 on
        one sweep and 24 on the next. The decoder assumes that noise is Poisson,
        the usual first guess for spike counts, because its spread is fixed by
        the average and so there is nothing extra to fit.
      </p>
      <p>
        For a given direction of motion, the decoder takes the spike counts the
        switched-on cells would be expected to produce, and then asks of every
        other direction: how likely was
        <i>that</i> direction to have produced these counts? The answer is a
        spread of belief around the compass. Certainty is how tightly that
        belief clusters &mdash; 1 if it sits on a single direction, 0 if it is
        smeared out or split between two directions that look identical. The
        calculation is the <code>certainty_curve</code> function in the code
        above, and it runs again each time you switch a cell in or out.
      </p>
      <p>
        Two things to keep in mind. The decoder is handed the exact tuning curve
        of every cell it listens to, and it is fed each cell&rsquo;s average
        response rather than one noisy sweep, so the numbers are closer to the
        best any decoder could manage than to what a real downstream neuron
        achieves. This decoder treats each cell&rsquo;s noise as independent,
        but in reality, neighbouring ganglion cells share some of theirs, which
        would blunt the gain from adding more cells.
      </p>
    </div>
  </div>
</template>

<style scoped>
/* ------------------------------------------------------------------ */
/*  Local design tokens — mapped from Stuart's achromatic chrome       */
/*  to the Open Brain brand token layer                                */
/* ------------------------------------------------------------------ */
.ds-wrap {
  --ds-ink: rgb(var(--color-ink));
  --ds-ink-soft: rgb(var(--color-ink) / 0.62);
  --ds-muted: rgb(var(--color-mute));
  --ds-rule: rgb(var(--color-line));
  --ds-rule-soft: rgb(var(--color-line) / 0.55);
  --ds-paper: rgb(var(--color-paper));
  --ds-ground: rgb(var(--color-bg));
  --ds-panel: rgb(var(--color-bg));
  --ds-signal: #c1272d;

  --ds-sans: var(--font-body);
  --ds-mono: var(--font-mono);
}

/* ------------------------------------------------------------------ */
/*  Layout                                                             */
/* ------------------------------------------------------------------ */
.ds-wrap {
  max-width: 1560px;
  margin: 0 auto;
  padding: 34px 22px 64px;
  font-family: var(--ds-sans);
  color: var(--ds-ink);
  -webkit-font-smoothing: antialiased;
}

/* ------------------------------------------------------------------ */
/*  Header                                                             */
/* ------------------------------------------------------------------ */
header {
  margin-bottom: 26px;
}

.ds-rubric {
  display: flex;
  align-items: center;
  gap: 22px;
  margin: 0 0 18px;
  font-family: var(--ds-mono);
  font-weight: 500;
  font-size: clamp(22px, 2.5vw, 34px);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ds-signal);
  line-height: 1;
}
.ds-rubric::after {
  content: "";
  flex: 1;
  height: 2px;
  background: var(--ds-signal);
  opacity: 0.28;
}

h1 {
  font-family: var(--ds-sans);
  font-weight: 600;
  font-size: clamp(28px, 3.3vw, 42px);
  letter-spacing: -0.012em;
  line-height: 1.08;
  margin: 0 0 14px;
}

.ds-stand {
  margin: 0;
  font-size: 18px;
  line-height: 1.6;
  color: var(--ds-ink-soft);
}

/* ------------------------------------------------------------------ */
/*  Cards                                                              */
/* ------------------------------------------------------------------ */
.ds-card {
  background: var(--ds-paper);
  border: 1px solid var(--ds-rule);
  border-radius: 5px;
  margin-bottom: 22px;
}
.ds-figcard {
  padding: 24px 26px 20px;
}

h2 {
  font-family: var(--ds-sans);
  font-weight: 600;
  font-size: 24px;
  margin: 0 0 5px;
  letter-spacing: -0.005em;
}
.ds-sub {
  margin: 0 0 18px;
  font-size: 16px;
  line-height: 1.55;
  color: var(--ds-muted);
}

/* ------------------------------------------------------------------ */
/*  Figures (Python-rendered SVG)                                      */
/* ------------------------------------------------------------------ */

/* These class names are set by the Python code inside the SVG it builds.
   They must NOT be scoped — we use :deep() so Vue's scoped attribute
   does not block them.                                                */
:deep(.fig) {
  width: 100%;
  height: auto;
  display: block;
}

:deep(.deg) {
  font-family: var(--ds-mono);
  font-size: 15px;
  fill: var(--ds-ink-soft);
}
:deep(.glyph-shaft) {
  stroke: var(--ds-ink-soft);
  stroke-width: 2.2;
  stroke-linecap: round;
  fill: none;
}
:deep(.glyph-head) {
  fill: var(--ds-ink-soft);
}
:deep(.hdr) {
  font-family: var(--ds-mono);
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  fill: var(--ds-muted);
}
:deep(.cell-name) {
  font-family: var(--ds-sans);
  font-weight: 600;
  font-size: 26px;
}
:deep(.spike) {
  stroke: var(--ds-ink);
  stroke-width: 1.15;
}
:deep(.rule) {
  stroke: var(--ds-rule-soft);
  stroke-width: 1;
}
:deep(.rule-strong) {
  stroke: var(--ds-rule);
  stroke-width: 1;
}
:deep(.ring) {
  fill: none;
  stroke: var(--ds-rule-soft);
  stroke-width: 1;
}
:deep(.ring-out) {
  fill: none;
  stroke: var(--ds-rule);
  stroke-width: 1;
}
:deep(.spoke) {
  stroke: var(--ds-rule-soft);
  stroke-width: 0.9;
}
:deep(.polar-ax) {
  font-family: var(--ds-mono);
  font-size: 11px;
  fill: var(--ds-muted);
}
:deep(.polar-scale) {
  font-family: var(--ds-mono);
  font-size: 13px;
  fill: var(--ds-muted);
}
:deep(.stat) {
  font-family: var(--ds-mono);
  font-size: 16px;
  fill: var(--ds-ink);
}
:deep(.scale) {
  stroke: var(--ds-ink-soft);
  stroke-width: 2;
}
:deep(.scale-label) {
  font-family: var(--ds-mono);
  font-size: 13px;
  fill: var(--ds-muted);
}
:deep(.grid) {
  stroke: var(--ds-rule-soft);
  stroke-width: 1;
}
:deep(.grid-v) {
  stroke: var(--ds-rule-soft);
  stroke-width: 1;
  stroke-dasharray: 2 4;
}
:deep(.tick) {
  font-family: var(--ds-mono);
  font-size: 14px;
  fill: var(--ds-muted);
}
:deep(.axis-title) {
  font-family: var(--ds-sans);
  font-size: 16px;
  fill: var(--ds-ink-soft);
}
:deep(.tuning) {
  cursor: ew-resize;
  touch-action: none;
}
:deep(.tuning:focus) {
  outline: 2px solid var(--ds-signal);
  outline-offset: 3px;
}
:deep(.cursor-line) {
  stroke: var(--ds-ink);
  stroke-width: 2.4;
  stroke-dasharray: 4 4;
}
:deep(.cursor-knob) {
  fill: var(--ds-ink);
}

/* ------------------------------------------------------------------ */
/*  Captions                                                           */
/* ------------------------------------------------------------------ */
.ds-caption {
  margin: 16px 2px 2px;
  font-size: 16px;
  line-height: 1.6;
  color: var(--ds-muted);
}
.ds-caption + .ds-caption {
  margin-top: 10px;
}

/* ------------------------------------------------------------------ */
/*  Tuning row: graph + readout sidebar                                */
/* ------------------------------------------------------------------ */
.ds-tuning-row {
  display: flex;
  gap: 30px;
  align-items: flex-start;
}
.ds-tuning-plot {
  flex: 1 1 auto;
  min-width: 0;
}

.ds-readout {
  flex: 0 0 262px;
  border-left: 1px solid var(--ds-rule-soft);
  padding-left: 24px;
}
.ds-readout .ds-dial {
  display: block;
  margin: 0 auto 10px;
}

.ds-ang {
  font-family: var(--ds-mono);
  font-size: 30px;
  text-align: center;
  margin: 0 0 3px;
}
.ds-angsub {
  font-family: var(--ds-mono);
  font-size: 11.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ds-muted);
  text-align: center;
  margin: 0 0 18px;
}

.ds-readout table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--ds-mono);
  font-size: 15px;
}
.ds-readout :deep(td) {
  padding: 7px 0;
  border-bottom: 1px solid var(--ds-rule-soft);
}
.ds-readout :deep(tr:last-child td) {
  border-bottom: 0;
}
.ds-readout :deep(.sw) {
  display: inline-block;
  width: 11px;
  height: 11px;
  border-radius: 2px;
  margin-right: 8px;
}

.ds-listen {
  font-family: var(--ds-mono);
  font-size: 11.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ds-muted);
  margin: 0 0 6px;
}

.ds-readout :deep(table.ds-cells tr),
.ds-readout :deep(table.cells tr) {
  cursor: pointer;
}
.ds-readout :deep(table.ds-cells tr:hover td),
.ds-readout :deep(table.cells tr:hover td) {
  color: var(--ds-ink);
}
.ds-readout :deep(.chk) {
  display: inline-block;
  width: 15px;
  color: var(--ds-ink);
  font-size: 13px;
}
.ds-readout :deep(tr.off) {
  opacity: 0.42;
}
.ds-readout :deep(tr.off .sw) {
  opacity: 0.35;
}
.ds-readout :deep(.val) {
  text-align: right;
  color: var(--ds-ink);
}
.ds-readout :deep(.spk) {
  text-align: right;
  color: var(--ds-muted);
  width: 82px;
}

.ds-hint {
  margin: 18px 0 0;
  font-size: 14px;
  color: var(--ds-muted);
  text-align: center;
  line-height: 1.5;
}

/* Certainty meter */
.ds-cert {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--ds-rule);
}
.ds-certlabel {
  font-family: var(--ds-mono);
  font-size: 11.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ds-muted);
  margin: 0 0 4px;
}
.ds-certval {
  font-family: var(--ds-mono);
  font-size: 34px;
  line-height: 1;
  margin: 0 0 10px;
}
.ds-certbar {
  height: 9px;
  border-radius: 5px;
  background: var(--ds-rule-soft);
  overflow: hidden;
}
.ds-certbar :deep(span) {
  display: block;
  height: 100%;
  width: 0;
  background: var(--ds-ink);
  border-radius: 5px;
  transition:
    width 0.18s ease,
    background 0.18s ease;
}
.ds-certnote {
  font-family: var(--ds-sans);
  font-size: 13px;
  color: var(--ds-muted);
  margin: 9px 0 0;
  line-height: 1.4;
}

/* ------------------------------------------------------------------ */
/*  Loading indicator                                                  */
/* ------------------------------------------------------------------ */
.ds-boot {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 26px;
  font-family: var(--ds-mono);
  font-size: 15px;
  color: var(--ds-muted);
}
.ds-dotpulse {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--ds-signal);
  animation: ds-pulse 1.1s ease-in-out infinite;
}
@keyframes ds-pulse {
  0%,
  100% {
    opacity: 0.25;
  }
  50% {
    opacity: 1;
  }
}

/* ------------------------------------------------------------------ */
/*  Code editor card                                                   */
/* ------------------------------------------------------------------ */
.ds-codecard {
  overflow: hidden;
}
.ds-codehead {
  padding: 24px 26px 20px;
}
.ds-codehead .ds-sub {
  margin-bottom: 0;
}

.ds-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 16px;
  border-bottom: 1px solid var(--ds-rule);
  background: var(--ds-panel);
}
.ds-bar-title {
  font-family: var(--ds-mono);
  font-size: 13px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--ds-muted);
  margin-right: auto;
}
.ds-bar-status {
  font-family: var(--ds-mono);
  font-size: 12.5px;
  color: var(--ds-muted);
}

.ds-bar button {
  font-family: var(--ds-mono);
  font-size: 13.5px;
  letter-spacing: 0.05em;
  padding: 7px 16px;
  border-radius: 3px;
  cursor: pointer;
  border: 1px solid var(--ds-rule);
  background: var(--ds-paper);
  color: var(--ds-ink-soft);
}
.ds-bar button:hover:not(:disabled) {
  border-color: var(--ds-ink-soft);
  color: var(--ds-ink);
}
.ds-bar button:disabled {
  opacity: 0.45;
  cursor: default;
}
.ds-bar button.ds-primary {
  background: var(--ds-ink);
  border-color: var(--ds-ink);
  color: var(--ds-paper);
}
.ds-bar button.ds-primary:hover:not(:disabled) {
  background: rgb(var(--color-ink) / 0.85);
}
.ds-bar button:focus-visible {
  outline: 2px solid var(--ds-signal);
  outline-offset: 2px;
}

.ds-editor {
  position: relative;
  height: 560px;
  background: var(--ds-paper);
}
.ds-editor pre,
.ds-editor textarea {
  margin: 0;
  position: absolute;
  inset: 0;
  overflow: auto;
  padding: 18px 20px;
  border: 0;
  font-family: var(--ds-mono);
  font-size: 14.5px;
  line-height: 1.62;
  white-space: pre;
  tab-size: 4;
}
.ds-editor pre {
  color: var(--ds-ink);
  pointer-events: none;
}
.ds-editor textarea {
  background: transparent;
  color: transparent;
  caret-color: var(--ds-signal);
  resize: none;
  outline: none;
}
.ds-editor textarea::selection {
  background: rgba(193, 39, 45, 0.18);
}

/* Syntax tokens */
:deep(.tok-c) {
  color: var(--ds-muted);
  font-style: italic;
}
:deep(.tok-s) {
  color: #1c6b52;
}
:deep(.tok-k) {
  color: var(--ds-signal);
}
:deep(.tok-n) {
  color: #2b5fa8;
}

.ds-err {
  padding: 12px 20px;
  font-family: var(--ds-mono);
  font-size: 13.5px;
  white-space: pre-wrap;
  color: var(--ds-signal);
  border-top: 1px solid var(--ds-rule);
  background: #fdf3f3;
  display: none;
}

/* ------------------------------------------------------------------ */
/*  Note card                                                          */
/* ------------------------------------------------------------------ */
.ds-notecard {
  padding: 24px 26px 20px;
}
.ds-notecard h3 {
  font-family: var(--ds-sans);
  font-weight: 600;
  font-size: 20px;
  margin: 0 0 10px;
  letter-spacing: -0.005em;
}
.ds-notecard p {
  font-size: 15.5px;
  line-height: 1.62;
  color: var(--ds-muted);
  margin: 0 0 12px;
}
.ds-notecard p:last-child {
  margin-bottom: 0;
}
.ds-notecard code {
  font-family: var(--ds-mono);
  font-size: 14px;
  color: var(--ds-ink-soft);
}

/* ------------------------------------------------------------------ */
/*  Responsive                                                         */
/* ------------------------------------------------------------------ */

/* Tablets: stack tuning row, make rasters horizontally scrollable */
@media (max-width: 1100px) {
  .ds-tuning-row {
    flex-direction: column;
    align-items: stretch;
    gap: 20px;
  }
  .ds-tuning-plot {
    width: 100%;
  }
  .ds-readout {
    flex: 1 1 auto;
    width: 100%;
    border-left: 0;
    border-top: 1px solid var(--ds-rule-soft);
    padding-left: 0;
    padding-top: 18px;
  }
  #rasters {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 8px;
  }
  #rasters :deep(.fig) {
    min-width: 1080px;
  }
}

/* Landscape tablets: dial, cells and cert side by side */
@media (max-width: 1100px) and (min-width: 640px) {
  .ds-readout {
    display: flex;
    gap: 32px;
    align-items: flex-start;
  }
  .ds-ro-dial {
    flex: 0 0 136px;
  }
  .ds-ro-cells {
    flex: 1 1 250px;
    min-width: 0;
  }
  .ds-ro-cert {
    flex: 1 1 210px;
    min-width: 0;
  }
  .ds-ro-cells .ds-hint {
    text-align: left;
  }
  .ds-cert {
    margin-top: 0;
    padding-top: 0;
    border-top: 0;
  }
}

/* Small phones */
@media (max-width: 520px) {
  .ds-wrap {
    padding-left: 14px;
    padding-right: 14px;
  }
  .ds-figcard,
  .ds-codehead {
    padding-left: 16px;
    padding-right: 16px;
  }
  .ds-editor {
    height: 420px;
  }
}

/* ------------------------------------------------------------------ */
/*  Reduced motion                                                     */
/* ------------------------------------------------------------------ */
@media (prefers-reduced-motion: reduce) {
  .ds-dotpulse {
    animation: none;
    opacity: 0.7;
  }
  .ds-certbar :deep(span) {
    transition: none;
  }
}
</style>
