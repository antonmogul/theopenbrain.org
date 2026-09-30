-- OPENBRAIN-113: four Attention widgets rebuilt with the widget kit.
--
-- Signal detection theory, the Posner cueing task, contrast gain vs response
-- gain and feature-based attention, rebuilt to the Figma review file in the
-- kit's house style from Arjun Krishnaswamy's originals (same model, same
-- numbers; checked against his widgets in the browser). The chapter's blocks
-- now point at the uploads and all play in the page (SDT was a card that
-- opened a modal; the Figma draws it full width). His originals stay in the
-- widget library (/widgets), so a swap back is one widgetId.
--
-- The HTML is the file the kit produced, verbatim.

insert into public.widget_uploads (slug, title, description, author, ramp, html, status)
values
  ('attn-sdt', $t$Signal detection theory$t$,
   $t$Drag the criterion and change d′: hit and false-alarm rates, the ROC point, and Arjun's two observer comparisons.$t$,
   $t$Arjun Krishnaswamy · design: Malpeso Studio$t$, 'lear',
   $w$<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Signal detection theory</title>
    <!--
  The Open Brain, chapter 3 "Attention and Working Memory", box "Signal
  detection theory". Figma R7AjPuac7z7OZ7xcd2t7OR, "BOB. 01 | Signal
  Detection Theory" (21:3503), widget state 21:4030, rebuilt on the widget
  kit. The box text (four paragraphs and the two equations) stays in the
  chapter; this file is the widget only.

  Science, modes and numbers are the author's original,
  src/widgets/source/sdt_widget.html (Arjun Krishnaswamy):

  - Equal-variance Gaussian model: noise N(0, 1), signal + noise N(d', 1).
    k is the criterion's position on the evidence axis.
    H = Phi(d' - k), F = Phi(-k), so z(H) = d' - k and z(F) = -k,
    d' = z(H) - z(F) and c = -1/2 [z(H) + z(F)] = k - d'/2
    (positive c = cautious, negative = liberal).
  - Defaults: d' = 1.50, k = 0.75 (c = 0, H = 0.773, F = 0.227).
    d' slider 0 to 3 in 0.01 steps; criterion clamped to -3.8 ... 5.8.
  - Mode "Two observers, same d'": d' = 1.50; observers at k = -0.4 and
    k = 1.4, both on the one ROC curve.
  - Mode "Same H, different d'": d' = 1.80 and a second curve at d' = 0.80;
    one observer on each, both at H = 0.75.
    The design renamed this mode "two observers, different d'"; that is a
    different comparison, so the author's is kept here.
  - Moving d' leaves a mode (the author's rule); the criterion does not.
  - Normal CDF and its inverse are the author's (Abramowitz-Stegun 7.1.26
    and Acklam), copied unchanged so the numbers match.

  ADDED, not in the author's widget: the observers' criteria on the
  evidence axis (A and B), a table of their H, F, d' and c, the worked
  equations under the readouts, "cautious / liberal" beside c, keyboard
  control of the criterion, and a short slide of d' when a mode sets it.
-->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;1,400&family=IBM+Plex+Sans:wght@400;600&display=swap"
      rel="stylesheet"
    />
    <style>
      /* The book sets these; the fallbacks make the file work on its own.
         Attention is the Learning, Cognition & Memory ramp. */
      :root {
        --accent: var(--ob-accent, #ff3351);
        --accent-deep: var(--ob-accent-deep, #c1062a);
        /* text on an accent fill: dark on this red */
        --on-accent: var(--ob-on-accent, #1c1c1c);
        --plate: var(--ob-plate, #1c1c1c);
        --plate-2: var(--ob-plate-2, #2a2a2a);
        --on: var(--ob-on-plate, #ffffff);
        --mute: var(--ob-on-plate-mute, rgba(255, 255, 255, 0.62));
        --line: var(--ob-line-plate, rgba(255, 255, 255, 0.18));
        --sans: var(--ob-font-sans, "IBM Plex Sans", system-ui, sans-serif);
        --mono: var(--ob-font-mono, "IBM Plex Mono", ui-monospace, monospace);
        --radius: var(--ob-radius, 0);
        /* the noise distribution: greys mixed from the plate and its ink */
        --noise: color-mix(in srgb, var(--on) 70%, var(--plate));
        --cr: color-mix(in srgb, var(--on) 16%, var(--plate));
        --fa: color-mix(in srgb, var(--on) 58%, var(--plate));
      }
      * {
        box-sizing: border-box;
      }
      html,
      body {
        margin: 0;
        background: var(--plate);
        color: var(--on);
        font-family: var(--sans);
      }
      [hidden] {
        display: none !important;
      }
      .w {
        max-width: 1440px;
        margin: 0 auto;
        padding: 20px;
        display: grid;
        gap: 16px;
      }
      @media (min-width: 900px) {
        .w {
          padding: 32px 40px;
          gap: 20px;
        }
      }

      h1 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        line-height: 1.3;
      }
      .hint {
        margin: 4px 0 0;
        font-size: 15px;
        line-height: 1.5;
        color: var(--mute);
      }
      /* d′, c, H, F keep their case inside uppercase labels */
      .sym {
        text-transform: none;
        letter-spacing: 0;
      }
      .group-label {
        margin: 0 0 8px;
        font: 500 12px/1.3 var(--mono);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--mute);
      }

      /* ---- Layout: stacked on phones, figure pair from 720 px, legend
         column from 1100 px (as in the frame) ------------------------- */
      .grid {
        display: grid;
        gap: 20px;
        grid-template-columns: minmax(0, 1fr);
        grid-template-areas: "controls" "dist" "legend" "reads" "roc";
      }
      .controls {
        grid-area: controls;
      }
      .dist {
        grid-area: dist;
      }
      .legend {
        grid-area: legend;
      }
      .numbers {
        grid-area: reads;
      }
      .rocp {
        grid-area: roc;
      }
      @media (min-width: 720px) {
        .grid {
          column-gap: 24px;
          grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
          grid-template-areas:
            "controls controls"
            "dist roc"
            "reads roc"
            "legend legend";
        }
        .rocp {
          align-self: start;
        }
      }
      @media (min-width: 1100px) {
        .grid {
          column-gap: 32px;
          grid-template-columns: 176px minmax(0, 1.35fr) minmax(0, 1fr);
          grid-template-areas:
            "legend controls controls"
            "legend dist roc"
            "legend reads roc";
        }
      }

      /* ---- Controls -------------------------------------------------- */
      .controls {
        display: grid;
        gap: 14px;
      }
      .tabs {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: 1fr;
        border: 1px solid var(--line);
      }
      .tabs button {
        min-height: 44px;
        padding: 8px 10px;
        border: 0;
        border-left: 1px solid var(--line);
        background: transparent;
        color: var(--on);
        cursor: pointer;
        border-radius: var(--radius);
        /* sentence case, not uppercase: "d′" must not become "D′" */
        font: 500 13px/1.25 var(--mono);
        letter-spacing: 0.02em;
        text-wrap: balance;
        transition:
          background-color 0.18s ease-out,
          color 0.18s ease-out;
      }
      .tabs button:first-child {
        border-left: 0;
      }
      .tabs button:hover {
        background: var(--plate-2);
      }
      .tabs button[aria-pressed="true"] {
        background: var(--accent);
        color: var(--on-accent);
      }
      button:focus-visible,
      input:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
        position: relative;
        z-index: 1;
      }
      /* the handle stays absolutely placed when focused */
      .crit:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
        z-index: 1;
      }
      .field {
        display: grid;
        gap: 2px;
      }
      .field-head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 12px;
      }
      .field label {
        font: 500 12px/1.3 var(--mono);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--mute);
      }
      .field output {
        font: 500 15px/1.2 var(--mono);
        font-variant-numeric: tabular-nums;
      }
      input[type="range"] {
        width: 100%;
        min-height: 44px;
        margin: 0;
        accent-color: var(--accent);
        cursor: pointer;
      }

      /* ---- Figures --------------------------------------------------- */
      .panel-head {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: baseline;
        gap: 4px 12px;
        margin-bottom: 8px;
      }
      .panel-head .group-label {
        margin: 0;
      }
      .panel-note {
        font: 12px/1.3 var(--mono);
        color: var(--mute);
      }
      .plot {
        position: relative;
      }
      svg {
        display: block;
        width: 100%;
        height: auto;
      }
      #dist {
        /* horizontal drags move the criterion; vertical swipes scroll */
        touch-action: pan-y;
        cursor: ew-resize;
        user-select: none;
        -webkit-user-select: none;
      }
      .lbl {
        font: 12px var(--mono);
        fill: var(--mute);
      }
      .lbl-on {
        font: 500 12px var(--mono);
        fill: var(--on);
      }
      /* a halo in the plate colour keeps labels readable over curves */
      .halo {
        paint-order: stroke;
        stroke: var(--plate);
        stroke-width: 4px;
        stroke-linejoin: round;
      }
      .it {
        font-style: italic;
      }

      /* The criterion handle: a real focusable slider over the figure */
      .crit {
        position: absolute;
        top: 0;
        left: 0;
        width: 44px;
        height: 44px;
        margin: 0;
        border-radius: 50%;
        display: grid;
        place-items: center;
        cursor: ew-resize;
        touch-action: none;
      }
      .crit svg {
        width: 26px;
        height: 26px;
        pointer-events: none;
      }

      /* ---- Legend ------------------------------------------------------ */
      .legend ul {
        margin: 0;
        padding: 0;
        list-style: none;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px 16px;
      }
      @media (min-width: 720px) {
        .legend ul {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
      }
      @media (min-width: 1100px) {
        .legend ul {
          grid-template-columns: minmax(0, 1fr);
          gap: 14px;
        }
      }
      .legend li {
        display: flex;
        align-items: center;
        gap: 10px;
        font: 13px/1.3 var(--mono);
      }
      .legend li svg {
        flex: none;
        width: 22px;
        height: 16px;
      }

      /* ---- Readouts ---------------------------------------------------- */
      .numbers {
        display: grid;
        gap: 14px;
        align-content: start;
      }
      .reads {
        margin: 0;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        border-top: 1px solid var(--line);
      }
      .reads div {
        padding: 10px 0 10px 12px;
        min-width: 0;
        border-bottom: 1px solid var(--line);
      }
      .reads div:nth-child(odd) {
        padding-left: 0;
      }
      .reads div:nth-child(even) {
        border-left: 1px solid var(--line);
      }
      @media (min-width: 480px) {
        .reads {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
        .reads div:nth-child(n) {
          padding-left: 12px;
        }
        .reads div:first-child {
          padding-left: 0;
        }
        .reads div + div {
          border-left: 1px solid var(--line);
        }
      }
      .reads dt {
        font: 11px/1.3 var(--mono);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--mute);
      }
      .reads dd {
        margin: 4px 0 0;
        font: 500 20px/1.1 var(--mono);
        font-variant-numeric: tabular-nums;
      }
      .reads dd.hit {
        color: var(--accent);
      }
      .reads dd small {
        display: block;
        margin-top: 3px;
        font: 11px/1.2 var(--mono);
        letter-spacing: 0.04em;
        color: var(--mute);
      }
      .eq {
        margin: 0;
        font: 12px/1.7 var(--mono);
        color: var(--mute);
        font-variant-numeric: tabular-nums;
      }
      .eq .ln {
        display: block;
      }
      .eq i {
        font-style: italic;
        color: var(--on);
      }
      .half {
        font-size: 13px;
      }

      .obs {
        width: 100%;
        border-collapse: collapse;
        font: 13px/1.3 var(--mono);
        font-variant-numeric: tabular-nums;
      }
      .obs caption {
        text-align: left;
        padding-bottom: 6px;
        font: 500 12px/1.3 var(--mono);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--mute);
      }
      .obs th,
      .obs td {
        padding: 7px 8px 7px 0;
        text-align: left;
        border-bottom: 1px solid var(--line);
        vertical-align: top;
      }
      .obs thead th {
        font: 11px/1.3 var(--mono);
        color: var(--mute);
        border-top: 1px solid var(--line);
      }
      .obs td small {
        display: block;
        font-size: 11px;
        color: var(--mute);
      }
      .sr {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
      }
      .badge {
        display: inline-grid;
        place-items: center;
        width: 20px;
        height: 20px;
        border: 1.5px solid var(--on);
        border-radius: 50%;
        font: 500 11px/1 var(--mono);
      }

      /* ---- Takeaway and caption --------------------------------------- */
      .info {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 12px;
        align-items: start;
        margin: 0;
        padding: 12px 14px;
        background: var(--plate-2);
        border: 1px solid var(--line);
        font: 13px/1.55 var(--mono);
      }
      .info > svg {
        width: 20px;
        height: 20px;
        margin-top: 1px;
      }
      .info b {
        font-weight: 500;
      }
      .cap {
        margin: 0;
        font: 12px/1.55 var(--mono);
        color: var(--mute);
        max-width: 110ch;
      }

      @media (prefers-reduced-motion: reduce) {
        * {
          transition: none !important;
          animation: none !important;
        }
      }
      html[data-ob-reduce-motion] * {
        transition: none !important;
        animation: none !important;
      }
    </style>
  </head>
  <body>
    <!-- Fill patterns shared by the figure and the legend. Noise outcomes
         are hatched and signal outcomes solid, so the four regions differ
         by texture and lightness, not colour alone. -->
    <svg width="0" height="0" style="position: absolute" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="pCR" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="var(--cr)" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--on)" stroke-opacity=".22" stroke-width="1.5" />
        </pattern>
        <pattern id="pFA" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="var(--fa)" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--plate)" stroke-opacity=".45" stroke-width="1.5" />
        </pattern>
      </defs>
    </svg>

    <main class="w">
      <header>
        <h1>Signal detection theory</h1>
        <p class="hint">
          Drag the criterion along the evidence axis and change d′. Watch the
          hit and false-alarm rates, and the point on the ROC curve.
        </p>
      </header>

      <div class="grid">
        <div class="controls">
          <div>
            <p class="group-label" id="mode-label">Compare two observers</p>
            <div class="tabs" role="group" aria-labelledby="mode-label">
              <button type="button" id="p1" data-preset="1" aria-pressed="false">
                Two observers, same d′
              </button>
              <button type="button" id="p2" data-preset="2" aria-pressed="false">
                Same H, different d′
              </button>
            </div>
          </div>
          <div class="field">
            <div class="field-head">
              <label for="dp">Sensitivity <span class="sym">d′</span></label>
              <output id="dpOut" for="dp">1.50</output>
            </div>
            <input id="dp" type="range" min="0" max="3" step="0.01" value="1.5" />
          </div>
        </div>

        <section class="dist" aria-labelledby="dist-label">
          <div class="panel-head">
            <p class="group-label" id="dist-label">Evidence axis</p>
          </div>
          <div class="plot" id="distPlot">
            <svg id="dist" role="img" aria-label=""></svg>
            <div
              class="crit"
              id="crit"
              role="slider"
              tabindex="0"
              aria-label="Criterion"
              aria-orientation="horizontal"
              aria-valuemin="-3.8"
              aria-valuemax="5.8"
            >
              <svg viewBox="0 0 26 26" aria-hidden="true">
                <circle cx="13" cy="13" r="11.5" fill="var(--on)" stroke="var(--plate)" stroke-width="1.5" />
                <path d="M10.5 9 L6.5 13 L10.5 17 M15.5 9 L19.5 13 L15.5 17" fill="none" stroke="var(--plate)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
          </div>
        </section>

        <aside class="legend" aria-label="Legend">
          <p class="group-label">Legend</p>
          <ul>
            <li>
              <svg viewBox="0 0 22 16" aria-hidden="true"><path d="M1 14 C6 14 7 2 11 2 C15 2 16 14 21 14" fill="none" stroke="var(--noise)" stroke-width="2" /></svg>
              noise
            </li>
            <li>
              <svg viewBox="0 0 22 16" aria-hidden="true"><path d="M1 14 C6 14 7 2 11 2 C15 2 16 14 21 14" fill="none" stroke="var(--accent)" stroke-width="2" /></svg>
              signal + noise
            </li>
            <li>
              <svg viewBox="0 0 22 16" aria-hidden="true"><rect x="10" y="0" width="2.5" height="16" fill="var(--on)" /></svg>
              criterion
            </li>
            <li>
              <svg viewBox="0 0 22 16" aria-hidden="true"><rect x="1" y="2" width="20" height="12" fill="var(--accent)" fill-opacity=".78" /></svg>
              hit
            </li>
            <li>
              <svg viewBox="0 0 22 16" aria-hidden="true"><rect x="1" y="2" width="20" height="12" fill="var(--accent-deep)" /></svg>
              miss
            </li>
            <li>
              <svg viewBox="0 0 22 16" aria-hidden="true"><rect x="1" y="2" width="20" height="12" fill="url(#pFA)" /></svg>
              false alarm
            </li>
            <li>
              <svg viewBox="0 0 22 16" aria-hidden="true"><rect x="1" y="2" width="20" height="12" fill="url(#pCR)" stroke="var(--line)" /></svg>
              correct reject
            </li>
            <li>
              <svg viewBox="0 0 22 16" aria-hidden="true"><circle cx="11" cy="8" r="6" fill="var(--accent)" stroke="var(--plate)" stroke-width="1.5" /></svg>
              this criterion on the ROC
            </li>
          </ul>
        </aside>

        <div class="numbers">
          <dl class="reads">
            <div>
              <dt>Hit rate <span class="sym">H</span></dt>
              <dd class="hit" id="rH">0.773</dd>
            </div>
            <div>
              <dt>False alarm <span class="sym">F</span></dt>
              <dd id="rF">0.227</dd>
            </div>
            <div>
              <dt><span class="sym">d′</span></dt>
              <dd id="rD">1.50</dd>
            </div>
            <div>
              <dt>Criterion <span class="sym">c</span></dt>
              <dd><span id="rC">+0.00</span><small id="rCw">neutral</small></dd>
            </div>
          </dl>
          <p class="eq" id="eq" aria-label=""></p>
          <table class="obs" id="obs" hidden>
            <caption>The two observers</caption>
            <thead>
              <tr>
                <th scope="col">Observer</th>
                <th scope="col"><span class="sym">H</span></th>
                <th scope="col"><span class="sym">F</span></th>
                <th scope="col"><span class="sym">d′</span></th>
                <th scope="col"><span class="sym">c</span></th>
              </tr>
            </thead>
            <tbody id="obsBody"></tbody>
          </table>
        </div>

        <section class="rocp" aria-labelledby="roc-label">
          <div class="panel-head">
            <p class="group-label" id="roc-label">ROC space</p>
            <span class="panel-note" id="rocNote"></span>
          </div>
          <div class="plot" id="rocPlot">
            <svg id="roc" role="img" aria-label=""></svg>
          </div>
        </section>
      </div>

      <p class="info" aria-live="polite">
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="10" r="8.5" fill="none" stroke="var(--on)" stroke-width="1.2" />
          <line x1="10" y1="8.5" x2="10" y2="14.5" stroke="var(--on)" stroke-width="1.6" />
          <circle cx="10" cy="5.8" r="1.1" fill="var(--on)" />
        </svg>
        <span id="note"></span>
      </p>

      <p class="cap">
        Equal-variance Gaussian model: noise and signal + noise are normal
        distributions with the same spread, d′ standard deviations apart on
        the evidence axis. The observer says "yes" to evidence above the
        criterion, so H is the area of signal + noise above it and F the area
        of noise above it. d′ = z(H) − z(F) and c = −½ [z(H) + z(F)], where z
        is the inverse of the normal distribution; positive c is a cautious
        criterion, negative c a liberal one. The ROC plots H against F as the
        criterion sweeps; the dashed diagonal is chance (d′ = 0). Illustrative
        model, not recorded data. Widget after Arjun Krishnaswamy; model after
        Green &amp; Swets, 1966.
      </p>
    </main>

    <script>
      "use strict";
      // The book injects window.OB before this runs; this fallback keeps the
      // file working on its own (in Claude, or opened in a browser).
      window.OB = window.OB || {
        reducedMotion:
          matchMedia("(prefers-reduced-motion: reduce)").matches ||
          document.documentElement.hasAttribute("data-ob-reduce-motion"),
        onTheme(fn) {
          fn({ accent: null, reduceMotion: this.reducedMotion, ramp: null });
        },
        resize() {},
      };

      /* ---------- maths: the author's functions, unchanged ---------- */
      function erf(x) {
        // Abramowitz-Stegun 7.1.26
        const s = x < 0 ? -1 : 1;
        x = Math.abs(x);
        const t = 1 / (1 + 0.3275911 * x);
        const y =
          1 -
          ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
            t *
            Math.exp(-x * x);
        return s * y;
      }
      const Phi = (x) => 0.5 * (1 + erf(x / Math.SQRT2)); // normal CDF
      function Phinv(p) {
        // inverse normal (Acklam)
        if (p <= 0) return -6;
        if (p >= 1) return 6;
        const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
        const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
        const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
        const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
        const pl = 0.02425,
          ph = 1 - pl;
        let q, r;
        if (p < pl) {
          q = Math.sqrt(-2 * Math.log(p));
          return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
        }
        if (p <= ph) {
          q = p - 0.5;
          r = q * q;
          return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
        }
        q = Math.sqrt(-2 * Math.log(1 - p));
        return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
      }
      const pdf = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);

      /* ---------- state (the author's defaults) ---------- */
      let dp = 1.5; // d′: signal mean (noise mean = 0), in noise SDs
      let k = 0.75; // the criterion's position on the evidence axis
      let preset = 0; // 0 none, 1 two observers same d′, 2 same H different d′

      const EX0 = -4,
        EX1 = 6; // evidence axis range, as the author's
      const K_MIN = EX0 + 0.2,
        K_MAX = EX1 - 0.2; // the author's clamp
      const clampK = (v) => Math.max(K_MIN, Math.min(K_MAX, v));

      // The author's two comparisons.
      const MODE1 = { dp: 1.5, ks: [-0.4, 1.4] }; // two criteria, one curve
      const MODE2 = { dp: 1.8, other: 0.8, H: 0.75 }; // one H, two curves

      function observers() {
        if (preset === 1)
          return MODE1.ks.map((kk, i) => ({ id: "AB"[i], d: dp, k: kk, F: Phi(-kk), H: Phi(dp - kk) }));
        if (preset === 2)
          return [dp, MODE2.other].map((d, i) => {
            const kk = d - Phinv(MODE2.H);
            return { id: "AB"[i], d, k: kk, F: Phi(-kk), H: MODE2.H };
          });
        return [];
      }

      /* ---------- formatting ---------- */
      const MINUS = "−";
      function num(v, n, signed) {
        const z = Math.abs(v) < 0.5 * Math.pow(10, -n) ? 0 : v;
        const s = Math.abs(z).toFixed(n);
        if (z < 0) return MINUS + s;
        return (signed ? "+" : "") + s;
      }
      const paren = (v, n) => (v < 0 && num(v, n) !== num(0, n) ? "(" + num(v, n) + ")" : num(v, n));
      function bias(c) {
        const s = num(c, 2, true);
        if (s === "+0.00") return "neutral";
        return c > 0 ? "cautious" : "liberal";
      }

      /* ---------- svg helpers ---------- */
      const NS = "http://www.w3.org/2000/svg";
      const $ = (id) => document.getElementById(id);
      function el(parent, tag, attrs, text) {
        const n = document.createElementNS(NS, tag);
        for (const a in attrs) n.setAttribute(a, attrs[a]);
        if (text != null) n.textContent = text;
        parent.appendChild(n);
        return n;
      }
      const f1 = (v) => v.toFixed(1);

      /* ---------- evidence axis ---------- */
      const distSVG = $("dist");
      const crit = $("crit");
      let G = null; // current geometry of the evidence axis

      function distGeom() {
        const W = Math.max(280, $("distPlot").getBoundingClientRect().width);
        const H = Math.round(Math.max(230, Math.min(320, W * 0.56)));
        const padL = 12,
          padR = 12,
          top = 52, // below the label and marker rows
          base = H - 44;
        const x = (v) => padL + ((v - EX0) / (EX1 - EX0)) * (W - padL - padR);
        const xInv = (px) => EX0 + ((px - padL) / (W - padL - padR)) * (EX1 - EX0);
        const y = (d) => base - (d / pdf(0)) * (base - top);
        return { W, H, padL, padR, top, base, x, xInv, y };
      }
      function areaPath(g, mean, a, b) {
        const step = (b - a) / 80;
        let d = `M ${f1(g.x(a))} ${f1(g.y(0))}`;
        for (let v = a; v <= b + 1e-9; v += step) d += ` L ${f1(g.x(v))} ${f1(g.y(pdf(v - mean)))}`;
        return d + ` L ${f1(g.x(b))} ${f1(g.y(0))} Z`;
      }
      function curvePath(g, mean) {
        let d = "";
        for (let v = EX0; v <= EX1 + 1e-9; v += 0.05) d += (d ? " L " : "M ") + f1(g.x(v)) + " " + f1(g.y(pdf(v - mean)));
        return d;
      }
      /* Labels and markers never overlap. The top of the axis has fixed rows:
         the "criterion" label (row 1), then the observers' A/B markers (row
         2); the curves start below them. Curve labels sit beside their curve,
         below row 2, and each tries a list of places (one line, then two;
         at 1, 1.4 and 0.7 SD out) until one is inside the figure and clear
         of everything already placed. */
      const ROW1 = 13, // baseline of the "criterion" label
        ROW2 = 32; // centre of the A/B markers
      const hits = (a, b, pad = 2) =>
        a.x < b.x + b.width + pad && b.x < a.x + a.width + pad && a.y < b.y + b.height + pad && b.y < a.y + a.height + pad;
      function placeLabel(g, lines, mean, side, cls, avoid) {
        const t = el(distSVG, "text", { class: cls + " halo cl" });
        const variants = [[lines.join(" ")]];
        if (lines.length > 1) variants.push(lines);
        const floor = ROW2 + 12; // nothing above the marker row
        let bb = null;
        for (const v of variants)
          for (const sd of [1, 1.4, 0.7]) {
            const xx = side < 0 ? g.x(mean - sd) - 8 : g.x(mean + sd) + 8;
            const yc = g.y(pdf(sd)); // height of the curve at that point
            t.textContent = "";
            v.forEach((line, i) =>
              el(t, "tspan", { x: f1(xx), y: f1(yc + 4 + (i - (v.length - 1) / 2) * 15) }, line)
            );
            t.setAttribute("text-anchor", side < 0 ? "end" : "start");
            bb = t.getBBox();
            const inside = bb.x >= g.padL && bb.x + bb.width <= g.W - g.padR && bb.y >= floor && bb.y + bb.height <= g.base - 2;
            if (inside && !avoid.some((o) => hits(bb, o))) {
              avoid.push(bb);
              return bb;
            }
          }
        avoid.push(bb); // nothing clear: keep the last try (never seen in testing)
        return bb;
      }
      function dashedCrit(g, kk) {
        const cx = g.x(kk);
        el(distSVG, "line", { x1: f1(cx), y1: g.base, x2: f1(cx), y2: ROW2 + 9, stroke: "var(--on)", "stroke-width": 1.5, "stroke-dasharray": "4 3", "stroke-opacity": 0.8 });
      }
      // A marker at mx on row 2; a short leader joins it to its criterion
      // line at cx when the two had to be spread apart.
      function marker(g, cx, mx, id) {
        const m = el(distSVG, "g", { class: "mk" });
        if (Math.abs(mx - cx) > 0.5)
          el(distSVG, "line", { x1: f1(mx), y1: ROW2 + 9, x2: f1(cx), y2: ROW2 + 17, stroke: "var(--on)", "stroke-width": 1.2, "stroke-opacity": 0.8 });
        el(m, "circle", { cx: f1(mx), cy: ROW2, r: 9, fill: "var(--plate)", stroke: "var(--on)", "stroke-width": 1.5 });
        el(m, "text", { class: "lbl-on", x: f1(mx), y: ROW2 + 4, "text-anchor": "middle" }, id);
        return m.getBBox();
      }
      // Spread marker centres at least GAP apart, inside the figure.
      function spread(g, xs) {
        const GAP = 22,
          lo = g.padL + 10,
          hi = g.W - g.padR - 10;
        const order = xs.map((x, i) => i).sort((a, b) => xs[a] - xs[b]);
        const out = xs.slice();
        for (let pass = 0; pass < 4; pass++)
          for (let j = 1; j < order.length; j++) {
            const a = order[j - 1],
              b = order[j];
            const need = GAP - (out[b] - out[a]);
            if (need > 0) {
              out[a] -= need / 2;
              out[b] += need / 2;
            }
            out[a] = Math.max(lo, Math.min(hi, out[a]));
            out[b] = Math.max(lo, Math.min(hi, out[b]));
          }
        return out;
      }

      function drawDist() {
        const g = (G = distGeom());
        distSVG.setAttribute("viewBox", `0 0 ${g.W} ${g.H}`);
        distSVG.innerHTML = "";
        const base = g.y(0);
        // the four outcomes (the author's drawing order)
        el(distSVG, "path", { d: areaPath(g, 0, EX0, k), fill: "url(#pCR)" }); // correct reject
        el(distSVG, "path", { d: areaPath(g, 0, k, EX1), fill: "url(#pFA)" }); // false alarm
        el(distSVG, "path", { d: areaPath(g, dp, EX0, k), fill: "var(--accent-deep)", "fill-opacity": 0.95 }); // miss
        el(distSVG, "path", { d: areaPath(g, dp, k, EX1), fill: "var(--accent)", "fill-opacity": 0.78 }); // hit
        // mode 2: observer B's signal distribution (d′ = 0.80), dashed
        if (preset === 2)
          el(distSVG, "path", { d: curvePath(g, MODE2.other), fill: "none", stroke: "var(--on)", "stroke-width": 1.5, "stroke-dasharray": "5 4", "stroke-opacity": 0.85 });
        // outlines
        el(distSVG, "path", { d: curvePath(g, 0), fill: "none", stroke: "var(--noise)", "stroke-width": 2 });
        el(distSVG, "path", { d: curvePath(g, dp), fill: "none", stroke: "var(--accent)", "stroke-width": 2 });
        // baseline and the means
        el(distSVG, "line", { x1: g.x(EX0), y1: base, x2: g.x(EX1), y2: base, stroke: "var(--mute)", "stroke-width": 1 });
        [0, dp].forEach((m) => el(distSVG, "line", { x1: f1(g.x(m)), y1: base, x2: f1(g.x(m)), y2: base + 6, stroke: "var(--on)", "stroke-width": 1.5 }));
        // d′ bracket between the means
        const ay = base + 16;
        el(distSVG, "line", { x1: f1(g.x(0)), y1: ay, x2: f1(g.x(dp)), y2: ay, stroke: "var(--mute)", "stroke-width": 1 });
        [0, dp].forEach((m) => el(distSVG, "line", { x1: f1(g.x(m)), y1: ay - 4, x2: f1(g.x(m)), y2: ay + 4, stroke: "var(--mute)", "stroke-width": 1 }));
        el(distSVG, "text", { class: "lbl", x: f1(g.x(dp / 2)), y: ay + 18, "text-anchor": "middle" }, "d′ = " + dp.toFixed(2));
        el(distSVG, "text", { class: "lbl", x: g.padL, y: ay + 18 }, "evidence →");
        // the observers' criteria in a mode (dashed), then the criterion
        const obs = observers();
        obs.forEach((o) => dashedCrit(g, o.k));
        const cx = g.x(k);
        el(distSVG, "line", { x1: f1(cx), y1: base + 6, x2: f1(cx), y2: ROW1 + 6, stroke: "var(--on)", "stroke-width": 2.5 });
        // row 2: the A/B markers, drawn over the lines
        const cxs = obs.map((o) => g.x(o.k));
        const mxs = spread(g, cxs);
        const avoid = obs.map((o, i) => marker(g, cxs[i], mxs[i], o.id));
        // row 1: the "criterion" label
        const lx = Math.max(g.padL + 36, Math.min(g.W - g.padR - 36, cx));
        el(distSVG, "text", { class: "lbl-on halo", id: "critLbl", x: f1(lx), y: ROW1, "text-anchor": "middle" }, "criterion");
        // curve labels, clear of the markers and of each other
        placeLabel(g, ["noise"], 0, -1, "lbl", avoid);
        placeLabel(g, ["signal", "+ noise"], dp, 1, "lbl-on", avoid);
        // the handle sits on the line, halfway up
        const hy = (g.top + base) / 2 + 10;
        crit.style.transform = `translate(${f1(cx - 22)}px, ${f1(hy - 22)}px)`;

        const F = Phi(-k),
          H = Phi(dp - k),
          c = k - dp / 2;
        distSVG.setAttribute(
          "aria-label",
          `Noise and signal + noise distributions, d′ = ${dp.toFixed(2)} apart, with the criterion at c = ${num(c, 2, true)}. ` +
            `Hits ${H.toFixed(3)} and false alarms ${F.toFixed(3)} are the areas above the criterion.`
        );
      }

      /* ---------- ROC ---------- */
      const rocSVG = $("roc");
      function rocGeom() {
        const W = Math.max(260, $("rocPlot").getBoundingClientRect().width);
        const S = Math.min(W, 460); // square plot, capped on very wide screens
        const L = 46,
          B = 46,
          T = 12,
          R = 14;
        const side = S - L - R;
        const rx = (f) => L + f * side;
        const ry = (h) => T + (1 - h) * (S - T - B);
        return { W, S, L, B, T, R, rx, ry };
      }
      function rocCurve(g, d) {
        let s = "";
        for (let c = 6; c >= -6; c -= 0.06) {
          const F = Phi(-c),
            H = Phi(d - c);
          s += (s ? " L " : "M ") + g.rx(F).toFixed(1) + " " + g.ry(H).toFixed(1);
        }
        return s;
      }
      function drawROC() {
        const g = rocGeom();
        rocSVG.setAttribute("viewBox", `0 0 ${g.W} ${g.S}`);
        rocSVG.innerHTML = "";
        // frame, ticks and axis titles
        el(rocSVG, "rect", { x: g.rx(0), y: g.ry(1), width: g.rx(1) - g.rx(0), height: g.ry(0) - g.ry(1), fill: "none", stroke: "var(--line)" });
        [0, 0.5, 1].forEach((v) => {
          el(rocSVG, "line", { x1: g.rx(v), y1: g.ry(0), x2: g.rx(v), y2: g.ry(0) + 5, stroke: "var(--mute)" });
          el(rocSVG, "text", { class: "lbl", x: g.rx(v), y: g.ry(0) + 18, "text-anchor": v === 0 ? "start" : v === 1 ? "end" : "middle" }, v === 0.5 ? "0.5" : String(v));
          el(rocSVG, "line", { x1: g.rx(0) - 5, y1: g.ry(v), x2: g.rx(0), y2: g.ry(v), stroke: "var(--mute)" });
          el(rocSVG, "text", { class: "lbl", x: g.rx(0) - 8, y: g.ry(v) + (v === 1 ? 9 : v === 0 ? -1 : 4), "text-anchor": "end" }, v === 0.5 ? "0.5" : String(v));
        });
        el(rocSVG, "text", { class: "lbl", x: (g.rx(0) + g.rx(1)) / 2, y: g.S - 6, "text-anchor": "middle" }, "false-alarm rate F");
        const my = (g.ry(0) + g.ry(1)) / 2;
        el(rocSVG, "text", { class: "lbl", x: 12, y: my, "text-anchor": "middle", transform: `rotate(-90 12 ${my})` }, "hit rate H");
        // chance diagonal
        el(rocSVG, "line", { x1: g.rx(0), y1: g.ry(0), x2: g.rx(1), y2: g.ry(1), stroke: "var(--mute)", "stroke-dasharray": "4 4" });
        el(rocSVG, "text", { class: "lbl halo", x: g.rx(0.97), y: g.ry(0.86), "text-anchor": "end" }, "chance");
        // mode 2: observer B's curve (d′ = 0.80), dashed
        if (preset === 2)
          el(rocSVG, "path", { d: rocCurve(g, MODE2.other), fill: "none", stroke: "var(--on)", "stroke-width": 1.5, "stroke-dasharray": "5 4", "stroke-opacity": 0.85 });
        // the curve for the current d′
        el(rocSVG, "path", { d: rocCurve(g, dp), fill: "none", stroke: "var(--on)", "stroke-width": 2 });
        // the observers: circles first, then letters placed clear of the
        // circles, the "chance" label and each other
        const chance = [...rocSVG.querySelectorAll("text")].find((t) => t.textContent === "chance");
        const avoid = [chance.getBBox()];
        const pts = observers().map((o) => ({ o, px: g.rx(o.F), py: g.ry(o.H) }));
        pts.forEach(({ px, py }) => {
          const c = el(rocSVG, "circle", { class: "mk", cx: f1(px), cy: f1(py), r: 6, fill: "var(--plate)", stroke: "var(--on)", "stroke-width": 1.75 });
          avoid.push(c.getBBox());
        });
        pts.forEach(({ o, px, py }) => {
          const t = el(rocSVG, "text", { class: "lbl-on halo cl" }, o.id);
          // below-right (off the curve, toward the diagonal) first
          const spots = [
            [11, 16, "start"],
            [-11, 16, "end"],
            [11, -8, "start"],
            [-11, -8, "end"],
            [14, 4, "start"],
            [-14, 4, "end"],
          ];
          for (const [dx, dy, anchor] of spots) {
            t.setAttribute("x", f1(px + dx));
            t.setAttribute("y", f1(py + dy));
            t.setAttribute("text-anchor", anchor);
            const bb = t.getBBox();
            const inside = bb.x >= g.rx(0) + 2 && bb.x + bb.width <= g.rx(1) - 2 && bb.y >= g.ry(1) + 2 && bb.y + bb.height <= g.ry(0) - 2;
            if (inside && !avoid.some((q) => hits(bb, q))) break;
          }
          avoid.push(t.getBBox());
        });
        // this criterion
        const F = Phi(-k),
          H = Phi(dp - k);
        el(rocSVG, "circle", { cx: f1(g.rx(F)), cy: f1(g.ry(H)), r: 6.5, fill: "var(--accent)", stroke: "var(--plate)", "stroke-width": 2 });

        const obs = observers()
          .map((o) => `observer ${o.id} at F ${o.F.toFixed(3)}, H ${o.H.toFixed(3)} (d′ ${o.d.toFixed(2)})`)
          .join("; ");
        rocSVG.setAttribute(
          "aria-label",
          `ROC curve for d′ = ${dp.toFixed(2)}${preset === 2 ? " and a dashed curve for d′ = 0.80" : ""}. ` +
            `This criterion is at F ${F.toFixed(3)}, H ${H.toFixed(3)}.` +
            (obs ? " Comparison: " + obs + "." : "")
        );
        $("rocNote").textContent = preset === 2 ? "solid d′ " + dp.toFixed(2) + " · dashed d′ 0.80" : "";
      }

      /* ---------- readouts ---------- */
      function readouts() {
        const F = Phi(-k),
          H = Phi(dp - k),
          c = k - dp / 2; // = −½ [z(H) + z(F)]
        const zH = dp - k,
          zF = -k; // z(H) and z(F) in this model
        $("rH").textContent = H.toFixed(3);
        $("rF").textContent = F.toFixed(3);
        $("rD").textContent = dp.toFixed(2);
        $("rC").textContent = num(c, 2, true);
        $("rCw").textContent = bias(c);
        $("dpOut").textContent = dp.toFixed(2);
        $("eq").innerHTML =
          `<span class="ln"><i>d′</i> = <i>z</i>(<i>H</i>) − <i>z</i>(<i>F</i>) = ${num(zH, 2)} − ${paren(zF, 2)} = ${dp.toFixed(2)}</span>` +
          `<span class="ln"><i>c</i> = −<span class="half">½</span> [<i>z</i>(<i>H</i>) + <i>z</i>(<i>F</i>)] = −<span class="half">½</span> [${num(zH, 2)} + ${paren(zF, 2)}] = ${num(c, 2, true)}</span>`;
        $("eq").setAttribute(
          "aria-label",
          `d prime equals z of H minus z of F: ${num(zH, 2)} minus ${num(zF, 2)} equals ${dp.toFixed(2)}. ` +
            `c equals minus one half of z of H plus z of F: ${num(c, 2, true)}.`
        );
        crit.setAttribute("aria-valuenow", k.toFixed(2));
        crit.setAttribute("aria-valuetext", `c = ${num(c, 2, true)}, ${bias(c)}; hit rate ${H.toFixed(3)}, false-alarm rate ${F.toFixed(3)}`);

        const obs = observers();
        $("obs").hidden = !obs.length;
        $("obsBody").innerHTML = obs
          .map((o) => {
            const oc = o.k - o.d / 2;
            return `<tr><th scope="row"><span class="badge" aria-hidden="true">${o.id}</span><span class="sr">Observer ${o.id}</span></th>` +
              `<td>${o.H.toFixed(3)}</td><td>${o.F.toFixed(3)}</td><td>${o.d.toFixed(2)}</td>` +
              `<td>${num(oc, 2, true)}<small>${bias(oc)}</small></td></tr>`;
          })
          .join("");
      }

      /* ---------- the takeaway (the author's notes) ---------- */
      const NOTES = {
        0: "Drag the criterion line to sweep along one ROC curve — sensitivity holds, only bias moves. Change d′ to jump to a different curve.",
        1: "<b>Two observers, identical d′.</b> Same sensitivity, different criteria — their hit and false-alarm rates diverge, yet both sit on the <em>same</em> curve. Raw performance would call them different; d′ does not.",
        2: "<b>Same hit rate, different d′.</b> Both observers report the signal equally often, but one sits on a curve bowed further from the diagonal. Equal H, unequal sensitivity — the hit rate alone hides it.",
      };
      const WHERE = {
        0: "",
        1: " A and B mark their criteria and their points on the ROC.",
        2: " Observer B’s signal distribution and ROC curve are dashed.",
      };
      function setMode() {
        $("note").innerHTML = NOTES[preset] + WHERE[preset];
        document.querySelectorAll(".tabs button").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.preset === preset)));
      }

      function render() {
        drawDist();
        drawROC();
        readouts();
        OB.resize();
      }

      /* ---------- d′: the slider, and a short slide when a mode sets it ---------- */
      const reduced = () =>
        !!OB.reducedMotion ||
        document.documentElement.hasAttribute("data-ob-reduce-motion") ||
        matchMedia("(prefers-reduced-motion: reduce)").matches;
      let tween = 0;
      function slideDp(target) {
        cancelAnimationFrame(tween);
        const from = dp;
        const done = () => {
          dp = target;
          $("dp").value = String(target);
          render();
        };
        if (reduced() || Math.abs(target - from) < 0.005) return done();
        const t0 = performance.now(),
          DUR = 260;
        const step = (now) => {
          const t = Math.min(1, (now - t0) / DUR);
          dp = from + (target - from) * (1 - Math.pow(1 - t, 3)); // ease-out
          $("dp").value = String(dp);
          render();
          if (t < 1) tween = requestAnimationFrame(step);
          else done();
        };
        tween = requestAnimationFrame(step);
        // if frames are throttled (a hidden tab), still land on the value
        setTimeout(() => {
          if (dp !== target) {
            cancelAnimationFrame(tween);
            done();
          }
        }, DUR + 200);
      }

      $("dp").addEventListener("input", (e) => {
        cancelAnimationFrame(tween);
        dp = +e.target.value;
        if (preset) {
          preset = 0; // the author's rule: moving d′ leaves a mode
          setMode();
        }
        render();
      });
      document.querySelectorAll(".tabs button").forEach((b) =>
        b.addEventListener("click", () => {
          const p = +b.dataset.preset;
          if (preset === p) {
            preset = 0; // pressing the active mode again leaves it
            setMode();
            render();
            return;
          }
          preset = p;
          setMode();
          slideDp(p === 1 ? MODE1.dp : MODE2.dp);
        })
      );

      /* ---------- the criterion: drag anywhere on the axis, or the handle ---------- */
      // Mouse and pen: press anywhere on the axis to move the criterion
      // there and drag (the author's behaviour). Touch: the handle drags at
      // once; elsewhere on the axis a sideways drag moves the criterion and a
      // tap places it, so a vertical swipe still scrolls the page.
      let dragging = null;
      let pending = null; // a touch on the axis that has not yet moved sideways
      function kFromEvent(e) {
        const r = distSVG.getBoundingClientRect();
        const px = ((e.clientX - r.left) / r.width) * G.W;
        return clampK(G.xInv(px));
      }
      function beginDrag(e) {
        dragging = e.pointerId;
        pending = null;
        try {
          $("distPlot").setPointerCapture(e.pointerId);
        } catch (err) {}
        k = kFromEvent(e);
        render();
      }
      $("distPlot").addEventListener("pointerdown", (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        const onHandle = !!e.target.closest?.("#crit");
        if (onHandle) crit.focus({ preventScroll: true });
        if (e.pointerType === "touch" && !onHandle) {
          pending = { id: e.pointerId, x: e.clientX, y: e.clientY };
          return;
        }
        e.preventDefault();
        beginDrag(e);
      });
      $("distPlot").addEventListener("pointermove", (e) => {
        if (pending && pending.id === e.pointerId) {
          const dx = Math.abs(e.clientX - pending.x),
            dy = Math.abs(e.clientY - pending.y);
          if (dx > 8 && dx > dy) beginDrag(e);
          else if (dy > 8) pending = null;
          return;
        }
        if (dragging !== e.pointerId) return;
        k = kFromEvent(e);
        render();
      });
      $("distPlot").addEventListener("pointerup", (e) => {
        if (pending && pending.id === e.pointerId) {
          // a tap: put the criterion where the finger was
          k = kFromEvent(e);
          render();
        }
        pending = null;
        if (dragging === e.pointerId) dragging = null;
      });
      $("distPlot").addEventListener("pointercancel", (e) => {
        pending = null;
        if (dragging === e.pointerId) dragging = null;
      });

      crit.addEventListener("keydown", (e) => {
        const big = 0.5,
          small = e.shiftKey ? 0.25 : 0.05;
        let next = null;
        if (e.key === "ArrowRight" || e.key === "ArrowUp") next = k + small;
        else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = k - small;
        else if (e.key === "PageUp") next = k + big;
        else if (e.key === "PageDown") next = k - big;
        else if (e.key === "Home") next = K_MIN;
        else if (e.key === "End") next = K_MAX;
        if (next === null) return;
        e.preventDefault();
        k = clampK(Math.round(next * 100) / 100);
        render();
      });

      /* ---------- start ---------- */
      if (window.ResizeObserver) {
        let lastW = "";
        new ResizeObserver(() => {
          const w = $("distPlot").clientWidth + "x" + $("rocPlot").clientWidth;
          if (w === lastW) return;
          lastW = w;
          render();
        }).observe(document.querySelector(".grid"));
      } else {
        window.addEventListener("resize", render);
      }
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(render);
      OB.onTheme(() => render());
      setMode();
      render();
    </script>
  </body>
</html>
$w$, 'published'),
  ('attn-posner-cueing', $t$Posner cueing task$t$,
   $t$Fifty trials of the Posner task: respond to a faint dot after a valid or invalid cue and see your own reaction times.$t$,
   $t$Arjun Krishnaswamy · design: Malpeso Studio$t$, 'lear',
   $w$<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Posner cueing task</title>
    <!--
  The Open Brain, chapter 3 "Attention and Working Memory", Wid. 04
  "Posner Invalid Cueing task". Figma R7AjPuac7z7OZ7xcd2t7OR, section
  21:4371, component set attn/posner type=01 ... 04 (21:5433-21:5436).
  Task logic, trial counts, timings, cue validity and the results come from
  the author's original, src/widgets/source/posner_cueing_widget.html
  (Arjun Krishnaswamy). Every constant marked AUTHOR is his value.

  Kept from the author, against the design:
  - The target is his FAINT grey dot (#888780 at 30 % opacity, 6 px), not
    the frames' bright white one: brightness changes detection time and the
    size of the effect. On this darker stage it has a Weber contrast of
    about +0.4 (the author's, on white: about -0.3). Authors to confirm.
  - The cue tail points at the box it cues, computed from the layout, so a
    "Valid" trial always has the dot in the box the tail points to (the
    frames draw an upper-left tail with an upper-right target, labelled
    "Valid").

  Added, not in the author's widget (defaults to confirm):
  - A count of missed trials, and the invalid - valid difference.
  - A condition with no answered trials shows "no trials", not a 0 ms bar.
  - Held-down keys (auto-repeat) do not count as responses.
  - The block pauses if the widget is hidden, scrolled off screen or loses
    focus; the interrupted trial is discarded and rerun.
  - OFFER_NEW_BLOCK: a "New block" button on the results. The design drops
    "Run again"; without it the only way to retry is to reload the page.

  Timing. Reaction times use performance.now(). The target is drawn in a
  requestAnimationFrame callback and its onset is stamped there; the
  response uses the key or touch event's own timestamp (same clock), so a
  busy main thread does not add to it. The cue-target gap is counted in
  screen frames. See the caption for how precise this is.
-->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
      rel="stylesheet"
    />
    <style>
      /* The book sets these; the fallbacks make the file work on its own.
         Attention is the Learning, Cognition & Memory ramp. */
      :root {
        --accent: var(--ob-accent, #ff3351);
        --accent-pale: var(--ob-accent-pale, #ffc7d2);
        /* text on an accent fill: dark on this red */
        --on-accent: var(--ob-on-accent, #1c1c1c);
        --plate: var(--ob-plate, #1c1c1c);
        --plate-2: var(--ob-plate-2, #2a2a2a);
        --on: var(--ob-on-plate, #ffffff);
        --mute: var(--ob-on-plate-mute, rgba(255, 255, 255, 0.62));
        --line: var(--ob-line-plate, rgba(255, 255, 255, 0.18));
        --sans: var(--ob-font-sans, "IBM Plex Sans", system-ui, sans-serif);
        --mono: var(--ob-font-mono, "IBM Plex Mono", ui-monospace, monospace);
        --radius: var(--ob-radius, 0);
        /* The display: a mid grey mixed from the plate and its ink (the
           frames' grey stage), so it follows the book's tokens. */
        --screen: color-mix(in srgb, var(--on) 26%, var(--plate));
        --box: 60px;
        --inset: 12px;
      }
      @media (min-width: 720px) {
        :root {
          --box: 76px;
          --inset: 18px;
        }
      }
      * {
        box-sizing: border-box;
      }
      [hidden] {
        display: none !important;
      }
      html,
      body {
        margin: 0;
        background: var(--plate);
        color: var(--on);
        font-family: var(--sans);
      }
      .w {
        max-width: 1440px;
        margin: 0 auto;
        padding: 20px;
        display: grid;
        gap: 16px;
      }
      @media (min-width: 900px) {
        .w {
          padding: 32px 40px;
          gap: 20px;
        }
      }

      h1 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        line-height: 1.3;
      }
      .hint {
        margin: 4px 0 0;
        font-size: 15px;
        line-height: 1.5;
        color: var(--mute);
      }

      button {
        font: inherit;
        color: inherit;
        border-radius: var(--radius);
        cursor: pointer;
      }
      button:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 3px;
      }
      /* Kit buttons: mono uppercase, square, 1 px border; primary is white */
      .btn {
        min-height: 44px;
        padding: 10px 18px;
        border: 1px solid var(--on);
        background: transparent;
        color: var(--on);
        font: 500 12px/1.2 var(--mono);
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .btn.primary {
        background: var(--on);
        color: var(--plate);
      }
      /* hover only where there is a real pointer, so a tap does not leave
         the response button grey */
      @media (hover: hover) {
        .btn.primary:hover:not([disabled]) {
          background: color-mix(in srgb, var(--on) 86%, var(--plate));
        }
        .btn:not(.primary):hover {
          background: var(--plate-2);
        }
      }
      .btn[disabled] {
        opacity: 0.35;
        cursor: default;
      }

      /* ---- Task area: instruction panel over the room ----------------- */
      .stage {
        display: grid;
        gap: 16px;
      }
      .stage:focus {
        outline: none;
      }
      .room {
        display: grid;
        justify-items: center;
        align-content: center;
        gap: 12px;
        border: 1px solid var(--line);
        padding: 16px 12px 20px;
        min-width: 0;
      }
      @media (min-width: 720px) {
        .room {
          padding: 32px 24px;
        }
      }
      .trialbox,
      .results {
        width: 100%;
        max-width: 760px;
        display: grid;
        gap: 12px;
        justify-items: center;
      }
      .counter {
        justify-self: start;
        margin: 0;
        font: 12px/1.3 var(--mono);
        color: var(--mute);
        font-variant-numeric: tabular-nums;
      }

      /* The display: four boxes in the corners, a fixation dot at center */
      .screen {
        position: relative;
        width: 100%;
        height: 300px; /* AUTHOR: a 300 px tall display */
        background: var(--screen);
        border: 1px solid var(--line);
        overflow: hidden;
      }
      @media (min-width: 720px) {
        .screen {
          height: auto;
          aspect-ratio: 2 / 1;
        }
      }
      .bx {
        position: absolute;
        width: var(--box);
        height: var(--box);
        border: 1.5px solid var(--on);
        display: grid;
        place-items: center;
      }
      .bx[data-k="tl"] {
        top: var(--inset);
        left: var(--inset);
      }
      .bx[data-k="tr"] {
        top: var(--inset);
        right: var(--inset);
      }
      .bx[data-k="bl"] {
        bottom: var(--inset);
        left: var(--inset);
      }
      .bx[data-k="br"] {
        bottom: var(--inset);
        right: var(--inset);
      }
      /* AUTHOR: the target is a faint grey dot, 6 px, #888780 at 30 % */
      .target {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #888780;
        opacity: 0.3;
        visibility: hidden;
      }
      .target[data-on] {
        visibility: visible;
      }
      .fix {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 0;
        height: 0;
      }
      .dot {
        position: absolute;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--accent);
        transform: translate(-50%, -50%);
      }
      /* AUTHOR: the cue is a 3 x 20 px tail that grows from the dot */
      .tail {
        position: absolute;
        left: 0;
        top: -1.5px;
        height: 3px;
        width: 20px;
        background: var(--accent);
        transform-origin: 0 50%;
        transform: rotate(var(--a, 0deg)) scaleX(0);
      }
      /* grows over 40 ms (AUTHOR); goes at once when the target appears */
      .tail[data-on] {
        transform: rotate(var(--a, 0deg)) scaleX(1);
        transition: transform 40ms linear;
      }

      .respond {
        width: 100%;
        min-height: 56px;
        touch-action: manipulation;
        -webkit-user-select: none;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      }
      @media (min-width: 720px) {
        .respond {
          width: auto;
          min-width: 320px;
        }
      }
      .respond .k {
        display: none;
        margin-left: 10px;
        padding: 2px 6px;
        border: 1px solid currentColor;
        font-size: 11px;
        opacity: 0.7;
      }
      @media (hover: hover) and (pointer: fine) {
        .respond .k {
          display: inline-block;
        }
      }
      .respond:active:not([disabled]) {
        background: color-mix(in srgb, var(--on) 78%, var(--plate));
      }
      .fb {
        margin: 0;
        min-height: 20px;
        font: 13px/1.5 var(--mono);
        color: var(--on);
        text-align: center;
      }

      /* ---- Results: bar chart and takeaway ---------------------------- */
      .chart {
        width: 100%;
      }
      .chart svg {
        display: block;
        width: 100%;
        height: auto;
        overflow: visible;
      }
      .tick {
        font: 11px var(--mono);
        fill: var(--mute);
      }
      .axis {
        font: 12px var(--mono);
        fill: var(--mute);
      }
      .cat {
        font: 12px var(--mono);
        fill: var(--on);
      }
      .val {
        font: 500 14px var(--mono);
        fill: var(--on);
      }
      .bar.grow {
        transform-box: fill-box;
        transform-origin: 50% 100%;
        animation: grow 300ms ease-out both;
      }
      @keyframes grow {
        from {
          transform: scaleY(0);
        }
      }
      .note {
        width: 100%;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 12px;
        align-items: start;
        padding: 14px 16px;
        background: var(--plate-2);
        border: 1px solid var(--line);
      }
      .note svg {
        margin-top: 2px;
      }
      .note p {
        margin: 0;
        font: 13px/1.55 var(--mono);
      }
      .note p + p {
        margin-top: 8px;
        color: var(--mute);
      }
      .note strong {
        font-weight: 600;
        color: var(--on);
      }

      /* ---- Instruction panel (as in the Helmholtz widget) --------------- */
      .panel {
        display: none;
        background: var(--plate-2);
        border: 1px solid var(--line);
        padding: 20px;
      }
      .panel[data-open] {
        display: grid;
        gap: 12px;
        align-content: start;
        animation: rise 200ms ease-out;
      }
      @keyframes rise {
        from {
          opacity: 0;
        }
      }
      .panel-head {
        display: flex;
        justify-content: space-between;
        align-items: start;
        gap: 12px;
      }
      .panel h2 {
        margin: 0;
        padding-top: 10px;
        font-size: 18px;
        font-weight: 600;
        line-height: 1.3;
      }
      .panel .eyebrow {
        display: block;
        margin-bottom: 4px;
        font: 500 12px/1.3 var(--mono);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--mute);
      }
      .panel p {
        margin: 0;
        font-size: 15px;
        line-height: 1.5;
      }
      .close {
        flex: none;
        width: 44px;
        height: 44px;
        margin: -8px -10px 0 0;
        border: 0;
        background: transparent;
        display: grid;
        place-items: center;
      }
      .close:hover {
        background: var(--plate);
      }
      .panel .actions {
        display: flex;
        justify-content: end;
        margin-top: 8px;
      }
      /* Wide screens: the panel covers the left half of the task, as in the
         frames. It shares the room's grid cell, so the room grows to fit a
         long text instead of cutting it off. Narrower: it stacks above. */
      @media (min-width: 900px) {
        .stage {
          gap: 0;
        }
        .stage > .panel,
        .stage > .room {
          grid-area: 1 / 1;
        }
        .panel {
          z-index: 1;
          width: 50%;
          justify-self: start;
          padding: 32px;
          background: color-mix(in srgb, var(--plate-2) 92%, transparent);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }
      }
      @media (min-width: 1100px) {
        .panel {
          padding: 40px;
        }
        .panel p {
          font-size: 16px;
          max-width: 34em;
        }
      }

      /* ---- Readouts and caption --------------------------------------- */
      .reads {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin: 0;
        border-top: 1px solid var(--line);
        border-bottom: 1px solid var(--line);
      }
      .reads div {
        padding: 10px 0 10px 12px;
        min-width: 0;
        border-left: 1px solid var(--line);
      }
      .reads div:nth-child(odd) {
        border-left: 0;
        padding-left: 0;
      }
      .reads div:nth-child(n + 3) {
        border-top: 1px solid var(--line);
      }
      @media (min-width: 720px) {
        .reads {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
        .reads div:nth-child(odd) {
          border-left: 1px solid var(--line);
          padding-left: 12px;
        }
        .reads div:first-child {
          border-left: 0;
          padding-left: 0;
        }
        .reads div:nth-child(n + 3) {
          border-top: 0;
        }
      }
      .reads dt {
        font: 11px/1.3 var(--mono);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--mute);
      }
      .reads dd {
        margin: 4px 0 0;
        font: 500 16px/1.2 var(--mono);
        font-variant-numeric: tabular-nums;
      }
      @media (min-width: 720px) {
        .reads dd {
          font-size: 18px;
        }
      }
      .cap {
        margin: 0;
        font: 12px/1.5 var(--mono);
        color: var(--mute);
        max-width: 90ch;
      }
      .sr {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
      }

      /* Reduced motion: the tail appears at full length, no fades, bars
         drawn at their height. The trial timings stay: they are the
         experiment, not decoration. */
      @media (prefers-reduced-motion: reduce) {
        * {
          transition: none !important;
          animation: none !important;
        }
      }
      html[data-ob-reduce-motion] * {
        transition: none !important;
        animation: none !important;
      }
    </style>
  </head>
  <body>
    <main class="w">
      <header>
        <h1>Posner cueing task</h1>
        <p class="hint">
          Keep your eyes on the center dot and respond the moment a faint dot
          appears in any of the four boxes.
        </p>
      </header>

      <section class="stage" id="stage" tabindex="-1" aria-label="Task">
        <div class="panel" id="panel" role="region" aria-labelledby="p-title">
          <div class="panel-head">
            <h2 id="p-title">
              <span class="eyebrow" id="p-eyebrow"></span>
              <span id="p-heading"></span>
            </h2>
            <button
              type="button"
              class="close"
              id="p-close"
              aria-label="Close the instructions and start"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path
                  d="M3 3l12 12M15 3L3 15"
                  stroke="currentColor"
                  stroke-width="1.75"
                />
              </svg>
            </button>
          </div>
          <div id="p-body"></div>
          <div class="actions">
            <button type="button" class="btn primary" id="p-ready">
              Ready
            </button>
          </div>
        </div>

        <div class="room" id="room" data-phase="panel">
          <div class="trialbox" id="trialbox">
            <p class="counter" id="counter" aria-live="off">0/50</p>
            <div
              class="screen"
              id="screen"
              role="img"
              aria-label="Four empty boxes in the corners of a grey display, with a red fixation dot at its center"
            >
              <div class="bx" data-k="tl"><div class="target"></div></div>
              <div class="bx" data-k="tr"><div class="target"></div></div>
              <div class="bx" data-k="bl"><div class="target"></div></div>
              <div class="bx" data-k="br"><div class="target"></div></div>
              <div class="fix">
                <div class="tail" id="tail"></div>
                <div class="dot"></div>
              </div>
            </div>
            <button
              type="button"
              class="btn primary respond"
              id="respond"
              disabled
            >
              Tap when you see the dot<span class="k" aria-hidden="true"
                >Space</span
              >
            </button>
            <p class="fb" id="fb"></p>
          </div>

          <div class="results" id="results" hidden>
            <div class="chart" id="chart"></div>
            <div class="note">
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                <circle
                  cx="10"
                  cy="10"
                  r="8.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                />
                <path d="M10 8.6v5.6" stroke="currentColor" stroke-width="1.6" />
                <circle cx="10" cy="5.9" r="1" fill="currentColor" />
              </svg>
              <div>
                <p id="yours"></p>
                <p>
                  Faster responses to valid cues than invalid ones show that
                  attention shifted covertly to the cued location before the
                  target appeared, so detection was quicker there and slower
                  when attention had to be redirected.
                </p>
              </div>
            </div>
            <button type="button" class="btn" id="again" hidden>
              New block
            </button>
          </div>
        </div>
      </section>

      <dl class="reads">
        <div>
          <dt>Valid cue</dt>
          <dd id="r-valid">–</dd>
        </div>
        <div>
          <dt>Invalid cue</dt>
          <dd id="r-invalid">–</dd>
        </div>
        <div>
          <dt>Invalid − valid</dt>
          <dd id="r-diff">–</dd>
        </div>
        <div>
          <dt>Missed</dt>
          <dd id="r-miss">–</dd>
        </div>
      </dl>

      <p class="cap" id="cap"></p>
      <p class="sr" id="live" aria-live="polite"></p>
    </main>

    <script>
      // The book injects window.OB before this runs; this fallback keeps the
      // file working on its own (in Claude, or opened in a browser).
      window.OB = window.OB || {
        reducedMotion:
          matchMedia("(prefers-reduced-motion: reduce)").matches ||
          document.documentElement.hasAttribute("data-ob-reduce-motion"),
        onTheme(fn) {
          fn({ accent: null, reduceMotion: this.reducedMotion, ramp: null });
        },
        resize() {},
      };

      // ---- Task parameters ----------------------------------------------
      // AUTHOR = Arjun's values in posner_cueing_widget.html. With reduced
      // motion they stay the same: they are the experiment.
      const NUM_TRIALS = 50; // AUTHOR
      const VALID_ONLY_FIRST = 20; // AUTHOR: trials 1-20 are always valid
      const P_VALID = 0.8; // AUTHOR: after that, 80 % valid
      const FIX_MIN = 500, FIX_RANGE = 500; // AUTHOR: fixation 500-1000 ms
      const SOA_MIN = 70, SOA_RANGE = 110; // AUTHOR: cue-target gap 70-180 ms
      const MISS_MS = 1200; // AUTHOR: no response within 1.2 s = missed
      const MIN_RT = 130; // AUTHOR: faster = "too fast", trial continues
      const ITI_MS = 400; // AUTHOR: pause after a response or a miss
      const GET_READY_MS = 800; // AUTHOR: "Get ready" before trial 1
      // DEFAULT, to confirm: a New block button on the results
      const OFFER_NEW_BLOCK = true;
      // A frame is shown when at least the gap minus half a 60 Hz frame
      // has passed since the cue's frame, so the gap is the nearest frame.
      const HALF_FRAME = 8;

      const KEYS = ["tl", "tr", "bl", "br"];
      const NAMES = {
        tl: "upper left",
        tr: "upper right",
        bl: "lower left",
        br: "lower right",
      };

      const $ = (id) => document.getElementById(id);
      const room = $("room");
      const screenEl = $("screen");
      const tail = $("tail");
      const respondBtn = $("respond");
      const fb = $("fb");
      const live = $("live");
      const box = (k) => screenEl.querySelector(`.bx[data-k="${k}"]`);

      const st = {
        phase: "panel", // panel | ready | running | paused | done
        trials: [], // { valid, cue, target, soa, rt } ; rt null = missed
        run: 0, // increments to cancel everything scheduled
        timers: [],
        awaiting: false,
        targetOn: false,
        onset: 0,
        cur: null,
        lastKey: -1e9,
        lastPointer: -1e9,
      };

      function later(ms, fn) {
        const id = st.run;
        const t = setTimeout(() => {
          if (id === st.run) fn();
        }, ms);
        st.timers.push(t);
        return t;
      }
      function cancelAll() {
        st.run++;
        st.timers.forEach(clearTimeout);
        st.timers = [];
        st.awaiting = false;
        st.targetOn = false;
      }
      // The next screen frame. If none comes (the widget is hidden or
      // scrolled off screen, where browsers stop drawing it), pause.
      function nextFrame(fn) {
        const id = st.run;
        let fired = false;
        const wd = setTimeout(() => {
          if (!fired && id === st.run && st.phase === "running")
            pause("offscreen");
        }, 300);
        st.timers.push(wd);
        requestAnimationFrame((ts) => {
          fired = true;
          clearTimeout(wd);
          if (id === st.run) fn(ts);
        });
      }

      function say(msg) {
        live.textContent = "";
        setTimeout(() => (live.textContent = msg), 30);
      }
      function setPhase(p) {
        st.phase = p;
        room.dataset.phase = p;
        OB.resize();
      }
      function resetScreen() {
        screenEl
          .querySelectorAll(".target")
          .forEach((t) => t.removeAttribute("data-on"));
        tail.removeAttribute("data-on");
        st.targetOn = false;
      }
      function counter(n) {
        $("counter").textContent = `${n}/${NUM_TRIALS}`;
        $("counter").setAttribute(
          "aria-label",
          `Trial ${n} of ${NUM_TRIALS}`
        );
      }

      // The tail points from the fixation dot to the center of the cued box
      function aim(k) {
        const s = screenEl.getBoundingClientRect();
        const b = box(k).getBoundingClientRect();
        const dx = b.left + b.width / 2 - (s.left + s.width / 2);
        const dy = b.top + b.height / 2 - (s.top + s.height / 2);
        tail.style.setProperty("--a", `${(Math.atan2(dy, dx) * 180) / Math.PI}deg`);
      }

      // ---- The instruction panel ---------------------------------------
      const PANELS = {
        intro: {
          eyebrow: `${NUM_TRIALS} trials · about 2 minutes`,
          heading: "Before you start",
          body: [
            "Watch the dot at the center. It will briefly grow a small tail pointing toward one of the four boxes: that’s the cue. Shortly after, a faint gray dot will appear in one of the four boxes.",
            "Press Space (or tap the button below the boxes) the instant you see it, no matter which box it’s in. The gap between cue and target varies from trial to trial, so don’t try to anticipate it: wait until you actually see the dot.",
            `The first ${VALID_ONLY_FIRST} trials are always valid; invalid trials can appear after that. ${NUM_TRIALS} trials in all, run automatically.`,
          ],
        },
        paused: () => ({
          eyebrow: `Paused · trial ${st.trials.length + 1} of ${NUM_TRIALS}`,
          heading: "The task paused",
          body: [
            "The task left the screen or lost focus, so that trial did not count. Keep your eyes on the center dot and press Ready to carry on.",
          ],
        }),
      };

      function showPanel(kind) {
        const p = typeof PANELS[kind] === "function" ? PANELS[kind]() : PANELS[kind];
        $("p-eyebrow").textContent = p.eyebrow;
        $("p-heading").textContent = p.heading;
        $("p-body").innerHTML = p.body
          .map((t) => `<p>${t}</p>`)
          .join('<div style="height:10px"></div>');
        $("panel").setAttribute("data-open", "");
        $("panel").dataset.kind = kind;
      }

      function closePanelAndGo() {
        if (!$("panel").hasAttribute("data-open")) return;
        $("panel").removeAttribute("data-open");
        // keep keyboard focus inside the widget, so Space reaches it
        $("stage").focus({ preventScroll: true });
        if (st.phase === "panel") st.trials = [];
        startRunning();
      }

      // ---- The block -----------------------------------------------------
      function startRunning() {
        cancelAll();
        $("trialbox").hidden = false;
        $("results").hidden = true;
        resetScreen();
        respondBtn.disabled = false;
        setPhase("ready");
        fb.textContent = "Get ready";
        counter(st.trials.length);
        readouts();
        say("Get ready. Keep your eyes on the center dot.");
        later(GET_READY_MS, () => {
          fb.textContent = "";
          setPhase("running");
          runTrial();
        });
      }

      function runTrial() {
        const i = st.trials.length;
        if (i >= NUM_TRIALS) return finish();
        counter(i + 1);
        resetScreen();
        st.awaiting = true;

        // AUTHOR: random cued box; valid for the first 20, then 80 % valid;
        // an invalid target goes to one of the three other boxes at random
        const cue = KEYS[Math.floor(Math.random() * 4)];
        const valid = i < VALID_ONLY_FIRST ? true : Math.random() < P_VALID;
        const others = KEYS.filter((k) => k !== cue);
        const target = valid ? cue : others[Math.floor(Math.random() * 3)];
        const fix = FIX_MIN + Math.random() * FIX_RANGE;
        const soa = SOA_MIN + Math.random() * SOA_RANGE;
        st.cur = { valid, cue, target, soa: null };
        aim(cue); // while the tail is hidden, so it does not swing round
        screenEl.setAttribute(
          "aria-label",
          "Four boxes and the fixation dot. Keep your eyes on the dot."
        );

        later(fix, () => {
          nextFrame((cueTs) => {
            tail.setAttribute("data-on", "");
            const wait = () =>
              nextFrame((ts) => {
                if (ts - cueTs < soa - HALF_FRAME) return wait();
                // AUTHOR: the tail goes as the target appears
                tail.removeAttribute("data-on");
                box(target).querySelector(".target").setAttribute("data-on", "");
                st.onset = performance.now();
                st.targetOn = true;
                st.cur.soa = Math.round(ts - cueTs);
                later(MISS_MS, miss);
              });
            wait();
          });
        });
      }

      function miss() {
        if (!st.awaiting) return;
        st.awaiting = false;
        st.trials.push({ ...st.cur, rt: null });
        resetScreen();
        fb.textContent = "Missed that one, moving on.";
        readouts();
        later(ITI_MS, runTrial);
      }

      // t: when the response happened, on the performance.now() clock
      function respond(t) {
        if (st.phase !== "running" || !st.awaiting || !st.targetOn) return;
        const rt = Math.round(t - st.onset);
        if (rt < MIN_RT) {
          fb.textContent =
            "Too fast to be a real response. Wait until you actually see it.";
          return;
        }
        st.awaiting = false;
        st.timers.forEach(clearTimeout);
        st.timers = [];
        st.trials.push({ ...st.cur, rt });
        resetScreen();
        fb.textContent = `${st.cur.valid ? "Valid" : "Invalid"} — ${rt} ms`;
        readouts();
        later(ITI_MS, runTrial);
      }

      // Use the event's own timestamp (same clock as performance.now()) when
      // it is one; it is taken when the key or finger went down, before any
      // wait for the page's script to run.
      function eventTime(e) {
        const now = performance.now();
        const t = e && e.timeStamp;
        return typeof t === "number" && t > now - 2000 && t <= now + 1 ? t : now;
      }

      function pause(why) {
        if (st.phase !== "running" && st.phase !== "ready") return;
        cancelAll();
        resetScreen();
        respondBtn.disabled = true;
        setPhase("paused");
        fb.textContent = "";
        counter(st.trials.length);
        showPanel("paused");
        say(
          `Paused at trial ${st.trials.length + 1} of ${NUM_TRIALS}. Press Ready to carry on.`
        );
      }

      // ---- Results -------------------------------------------------------
      const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
      function summary() {
        const done = st.trials;
        const v = done.filter((t) => t.valid && t.rt !== null).map((t) => t.rt);
        const inv = done.filter((t) => !t.valid && t.rt !== null).map((t) => t.rt);
        return {
          v,
          inv,
          vMean: v.length ? Math.round(mean(v)) : null, // AUTHOR: rounded mean
          iMean: inv.length ? Math.round(mean(inv)) : null,
          diff: v.length && inv.length ? Math.round(mean(inv) - mean(v)) : null,
          missed: done.filter((t) => t.rt === null).length,
          n: done.length,
        };
      }

      function readouts() {
        const s = summary();
        const final = st.phase === "done";
        $("r-valid").textContent = final && s.vMean !== null ? `${s.vMean} ms` : "–";
        $("r-invalid").textContent = final && s.iMean !== null ? `${s.iMean} ms` : "–";
        $("r-diff").textContent =
          final && s.diff !== null ? `${s.diff > 0 ? "+" : s.diff < 0 ? "−" : ""}${Math.abs(s.diff)} ms` : "–";
        $("r-miss").textContent = s.n ? `${s.missed} of ${s.n}` : "–";
      }

      function finish() {
        cancelAll();
        resetScreen();
        respondBtn.disabled = true;
        setPhase("done");
        $("trialbox").hidden = true;
        $("results").hidden = false;
        $("again").hidden = !OFFER_NEW_BLOCK;
        const s = summary();
        const yours = $("yours");
        if (s.diff === null) {
          yours.innerHTML = `<strong>Block complete.</strong> There were no answered ${
            s.inv.length ? "valid" : "invalid"
          }-cue trials this time, so the two can’t be compared.`;
        } else if (s.diff > 0) {
          yours.innerHTML = `<strong>Block complete.</strong> Your invalid-cue responses were ${s.diff} ms slower on average than your valid-cue ones.`;
        } else {
          yours.innerHTML = `<strong>Block complete.</strong> This time your invalid-cue responses were not slower (${
            s.diff === 0 ? "no difference" : `${Math.abs(s.diff)} ms faster`
          }). With only ${s.inv.length} invalid trial${s.inv.length === 1 ? "" : "s"}, one block is noisy.`;
        }
        readouts();
        drawChart(true);
        say(
          `Block complete. ${yours.textContent} Valid cue: ${
            s.vMean ?? "no"
          } ms from ${s.v.length} trials. Invalid cue: ${s.iMean ?? "no"} ms from ${
            s.inv.length
          } trials. Missed ${s.missed}.`
        );
        OB.resize();
      }

      // Bar chart, redrawn at its real width so the labels stay readable
      let lastW = 0;
      function drawChart(grow = false) {
        if (st.phase !== "done") return;
        const s = summary();
        const wrap = $("chart");
        lastW = Math.round(wrap.clientWidth);
        const W = Math.max(280, lastW);
        const narrow = W < 520;
        const H = narrow ? 280 : 360;
        const m = { l: 58, r: 8, t: 26, b: narrow ? 44 : 34 };
        const pw = W - m.l - m.r, ph = H - m.t - m.b;
        const top = Math.max(s.vMean || 0, s.iMean || 0);
        const step = top <= 300 ? 50 : top <= 800 ? 100 : 200;
        const yMax = Math.max(300, Math.ceil((top * 1.12) / step) * step);
        const y = (v) => m.t + ph - (v / yMax) * ph;
        let g = "";
        for (let v = 0; v <= yMax; v += step) {
          g += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/>`;
          g += `<text class="tick" x="${m.l - 8}" y="${y(v)}" text-anchor="end" dominant-baseline="central">${v}</text>`;
        }
        g += `<text class="axis" transform="translate(14 ${m.t + ph / 2}) rotate(-90)" text-anchor="middle" dominant-baseline="central">Your average reaction time (ms)</text>`;
        const bw = Math.min(110, pw * 0.3);
        const bars = [
          { label: "Valid cue", n: s.v.length, v: s.vMean, fill: "var(--accent)", cx: m.l + pw * 0.28 },
          { label: "Invalid cue", n: s.inv.length, v: s.iMean, fill: "var(--accent-pale)", cx: m.l + pw * 0.72 },
        ];
        bars.forEach((b) => {
          if (b.v !== null) {
            g += `<rect class="bar${grow && !OB.reducedMotion ? " grow" : ""}" x="${b.cx - bw / 2}" y="${y(b.v)}" width="${bw}" height="${y(0) - y(b.v)}" fill="${b.fill}"/>`;
            g += `<text class="val" x="${b.cx}" y="${y(b.v) - 8}" text-anchor="middle">${b.v} ms</text>`;
          } else {
            g += `<text class="tick" x="${b.cx}" y="${y(0) - 10}" text-anchor="middle">no trials</text>`;
          }
          const n = `(n=${b.n})`;
          if (narrow) {
            g += `<text class="cat" x="${b.cx}" y="${H - m.b + 18}" text-anchor="middle">${b.label}</text>`;
            g += `<text class="tick" x="${b.cx}" y="${H - m.b + 34}" text-anchor="middle">${n}</text>`;
          } else {
            g += `<text class="cat" x="${b.cx}" y="${H - m.b + 22}" text-anchor="middle">${b.label} ${n}</text>`;
          }
        });
        g += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(0)}" y2="${y(0)}" stroke="var(--mute)" stroke-width="1"/>`;
        wrap.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Bar chart of your average reaction time: valid cue ${
          s.vMean ?? "no trials"
        }${s.vMean !== null ? " ms" : ""} (${s.v.length} trials), invalid cue ${s.iMean ?? "no trials"}${
          s.iMean !== null ? " ms" : ""
        } (${s.inv.length} trials)">${g}</svg>`;
      }
      // redraw at the new width (next frame, outside the observer's own
      // callback), without replaying the bars' growth
      let redraw = 0;
      new ResizeObserver(() => {
        cancelAnimationFrame(redraw);
        redraw = requestAnimationFrame(() => {
          const w = Math.round($("chart").clientWidth);
          if (w && w !== lastW) drawChart();
        });
      }).observe($("chart"));

      // ---- Input ---------------------------------------------------------
      $("p-ready").addEventListener("click", closePanelAndGo);
      // As in the Helmholtz widget, the frames' × closes the panel and
      // starts, the same as Ready
      $("p-close").addEventListener("click", closePanelAndGo);
      $("panel").addEventListener("keydown", (e) => {
        if (e.key === "Escape") closePanelAndGo();
      });
      $("again").addEventListener("click", () => {
        st.trials = [];
        cancelAll();
        $("results").hidden = true;
        $("trialbox").hidden = false;
        resetScreen();
        fb.textContent = "";
        counter(0);
        setPhase("panel");
        readouts();
        showPanel("intro");
        $("p-ready").focus({ preventScroll: true });
      });

      // AUTHOR: Space responds. Enter does too (a keyboard user on the
      // button). Held-down keys repeat and are ignored.
      document.addEventListener("keydown", (e) => {
        if (st.phase !== "running" && st.phase !== "ready") return;
        if (e.code !== "Space" && e.key !== " " && e.key !== "Enter") return;
        e.preventDefault();
        st.lastKey = performance.now();
        if (e.repeat) return;
        respond(eventTime(e));
      });
      // Touch, pen and mouse: count the moment the finger goes down, not
      // when it lifts (a click would add the whole press to the time)
      respondBtn.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        st.lastPointer = performance.now();
        respond(eventTime(e));
      });
      // Assistive tech can press a button without a key or a pointer event
      respondBtn.addEventListener("click", (e) => {
        const now = performance.now();
        if (now - st.lastKey < 1000 || now - st.lastPointer < 1000) return;
        respond(now);
      });

      // A trial the reader could not see is not a trial: pause and rerun it
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) pause("hidden");
      });
      window.addEventListener("blur", () => pause("blur"));

      $("cap").textContent =
        `After Posner (1980). Each trial: the dot at center, 500–1000 ms; a cue (the tail) toward one box; ${SOA_MIN}–${SOA_MIN + SOA_RANGE} ms later a faint target in one box. ` +
        `Trials 1–${VALID_ONLY_FIRST} are always valid, then ${Math.round(P_VALID * 100)}\u00a0% are. The cue–target gap is too brief for your eyes to move there, so a speed difference reflects covert attention, not gaze. ` +
        `Reaction times are timed in your browser with performance.now(): each is good to about one screen frame (≈17 ms at 60 Hz) plus your keyboard's or touchscreen's own delay (≈10–50 ms), a lag that is the same for valid and invalid trials, so their difference is not affected. ` +
        `Missed = no response within ${MISS_MS / 1000} s. Your times stay on this page and are not saved. Task: Arjun Krishnaswamy.`;

      OB.onTheme(() => {
        drawChart();
        OB.resize();
      });
      counter(0);
      showPanel("intro");
    </script>
  </body>
</html>
$w$, 'published'),
  ('attn-contrast-response-gain', $t$Contrast gain or response gain$t$,
   $t$A V4 neuron's contrast-response curve with attention as contrast gain or response gain, and where the effect peaks.$t$,
   $t$Arjun Krishnaswamy · design: Malpeso Studio$t$, 'lear',
   $w$<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Contrast gain or response gain</title>
    <!--
  The Open Brain, chapter 3 "Attention and Working Memory", Figure 4.
  Figma "Wid. 05 | Contrast gain vs. Response Gain" (R7AjPuac7z7OZ7xcd2t7OR,
  21:13323, attn/control-gain), rebuilt on the widget kit. The model is the
  author's original, src/widgets/source/contrast_response_gain_widget.html
  (Arjun Krishnaswamy), after Reynolds, Pasternak & Desimone (2000), Fig. 1:

  - A hypothetical V4 neuron's contrast-response function, Naka-Rushton:
      R(c) = BASE + (RMAX - BASE) * c^N / (c^N + C50^N)
    with RMAX 40 spikes/s, BASE 3 spikes/s, C50 20 % contrast, N 2.2.
  - Contrast gain:  R_att(c) = R(s * c)                  (curve shifts left)
    Response gain:  R_att(c) = BASE + s * (R(c) - BASE)   (curve stretches up)
    s = attention strength, 1.00-2.20, default 1.51 (the author's values).
  - % increase = (R_att - R) / R * 100, on the right axis.
  - Dynamic range band: contrasts where the unattended response is 10 % to
    90 % of the way from BASE to RMAX (7.4 % to 54.3 %).
  - The peak is found on the author's grid (161 log-spaced contrasts,
    1-100 %), so the peak readouts match the author's widget exactly.

  Differences from the author, for the author to confirm:
  - Axes are fixed per model (spikes/s 0-50 and % 0-160 for contrast gain;
    0-100 and 0-120 for response gain) so the curves visibly move as the
    slider moves; the author rescales both axes on every change.
  - At strength 1.00 (no attention) the readouts say "no effect"; the
    author's reads "high contrast (no interior peak)".
-->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;600&display=swap"
      rel="stylesheet"
    />
    <style>
      /* The book sets these; the fallbacks make the file work on its own.
         Attention and Working Memory = Learning, Cognition & Memory ramp. */
      :root {
        --accent: var(--ob-accent, #ff3351);
        /* text on an accent fill: dark on this red */
        --on-accent: var(--ob-on-accent, #1c1c1c);
        --plate: var(--ob-plate, #1c1c1c);
        --plate-2: var(--ob-plate-2, #2a2a2a);
        --on: var(--ob-on-plate, #ffffff);
        --mute: var(--ob-on-plate-mute, rgba(255, 255, 255, 0.62));
        --line: var(--ob-line-plate, rgba(255, 255, 255, 0.18));
        --sans: var(--ob-font-sans, "IBM Plex Sans", system-ui, sans-serif);
        --mono: var(--ob-font-mono, "IBM Plex Mono", ui-monospace, monospace);
        --radius: var(--ob-radius, 0);
        /* the unattended curve: a light grey, so the attended red leads */
        --unatt: color-mix(in srgb, var(--on) 70%, var(--plate));
      }
      * {
        box-sizing: border-box;
      }
      html,
      body {
        margin: 0;
        background: var(--plate);
        color: var(--on);
        font-family: var(--sans);
      }
      .w {
        max-width: 1280px;
        margin: 0 auto;
        padding: 20px;
        display: grid;
        gap: 16px;
      }
      @media (min-width: 900px) {
        .w {
          padding: 32px 40px;
          gap: 20px;
        }
      }

      h1 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        line-height: 1.3;
      }
      .hint {
        margin: 4px 0 0;
        font-size: 15px;
        line-height: 1.5;
        color: var(--mute);
      }

      /* Phones and the figure pane: one column, controls above the chart.
         Wide screens: the chart on the left, controls beside it. */
      .lay {
        display: grid;
        gap: 16px;
        grid-template-areas: "tabs" "slider" "fig" "reads" "info";
      }
      @media (min-width: 1000px) {
        .lay {
          grid-template-columns: minmax(0, 1.75fr) minmax(0, 1fr);
          grid-template-rows: auto auto auto 1fr;
          grid-template-areas: "fig tabs" "fig slider" "fig reads" "fig info";
          column-gap: 32px;
          align-items: start;
        }
      }
      .a-tabs {
        grid-area: tabs;
      }
      .a-slider {
        grid-area: slider;
      }
      .a-fig {
        grid-area: fig;
        margin: 0;
        min-width: 0;
      }
      .a-reads {
        grid-area: reads;
      }
      .a-info {
        grid-area: info;
      }

      .group-label {
        margin: 0 0 6px;
        font: 500 11px/1.3 var(--mono);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--mute);
      }

      /* Tabs: equal cells, hairline dividers, the active one in the accent */
      .tabs {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: 1fr;
        border: 1px solid var(--line);
      }
      .tabs button {
        min-height: 44px;
        padding: 8px 6px;
        border: 0;
        border-left: 1px solid var(--line);
        background: transparent;
        color: var(--on);
        cursor: pointer;
        border-radius: var(--radius);
        font: 500 12px/1.25 var(--mono);
        letter-spacing: 0.06em;
        text-transform: uppercase;
        transition: background-color 0.18s ease-out, color 0.18s ease-out;
      }
      .tabs button:first-child {
        border-left: 0;
      }
      .tabs button:hover {
        background: var(--plate-2);
      }
      .tabs button[aria-pressed="true"] {
        background: var(--accent);
        color: var(--on-accent);
      }
      .tabs .sub {
        display: block;
        text-transform: none;
        letter-spacing: 0.02em;
        font-weight: 400;
      }
      button:focus-visible,
      input:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
        position: relative;
        z-index: 1;
      }

      /* Slider: a thin track and a round thumb, 44 px tall to touch */
      .slider-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 14px;
      }
      .slider-head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
      }
      output#sVal {
        font: 500 20px/1 var(--mono);
        font-variant-numeric: tabular-nums;
        color: var(--accent);
        min-width: 4.2ch;
        text-align: right;
      }
      input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        min-height: 44px;
        margin: 0;
        background: transparent;
        cursor: pointer;
        accent-color: var(--accent);
      }
      input[type="range"]::-webkit-slider-runnable-track {
        height: 2px;
        background: var(--on);
        opacity: 0.9;
      }
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 22px;
        height: 22px;
        margin-top: -10px;
        border-radius: 50%;
        background: var(--accent);
        border: 2px solid var(--plate);
        box-shadow: 0 0 0 1px var(--accent);
      }
      input[type="range"]::-moz-range-track {
        height: 2px;
        background: var(--on);
      }
      input[type="range"]::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--accent);
        border: 2px solid var(--plate);
        box-shadow: 0 0 0 1px var(--accent);
      }
      .ends {
        display: flex;
        justify-content: space-between;
        font: 11px/1.2 var(--mono);
        color: var(--mute);
        margin-top: -4px;
      }

      /* Chart: redrawn at its real pixel width, so text stays 11 px+ */
      #chartBox {
        width: 100%;
        min-width: 0;
      }
      svg {
        display: block;
      }
      #chart {
        width: 100%;
        height: auto;
        overflow: visible;
      }
      .tick {
        font: 11px var(--mono);
        fill: var(--mute);
      }
      .ax-title {
        font: 500 11px var(--mono);
        fill: var(--mute);
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .grid {
        stroke: var(--line);
        stroke-width: 1;
      }
      .band {
        fill: var(--on);
        fill-opacity: 0.07;
      }
      .band-mark {
        stroke: var(--mute);
        stroke-width: 1;
        fill: none;
      }
      .c-unatt {
        fill: none;
        stroke: var(--unatt);
        stroke-width: 2;
      }
      .c-att {
        fill: none;
        stroke: var(--accent);
        stroke-width: 3;
      }
      .c-pct {
        fill: none;
        stroke: var(--accent);
        stroke-width: 1.5;
        stroke-dasharray: 6 4;
      }
      .peak-line {
        stroke: var(--on);
        stroke-width: 1;
        stroke-dasharray: 3 3;
        opacity: 0.7;
      }
      .peak-dot {
        fill: var(--accent);
        stroke: var(--plate);
        stroke-width: 2;
      }
      .halo {
        paint-order: stroke;
        stroke: var(--plate);
        stroke-width: 4px;
        stroke-linejoin: round;
      }
      .lab {
        font: 500 12px var(--mono);
        fill: var(--on);
      }
      .lab-mute {
        font: 12px var(--mono);
        fill: var(--mute);
      }

      .legend {
        display: flex;
        flex-wrap: wrap;
        gap: 6px 18px;
        margin: 10px 0 0;
        padding: 0;
        list-style: none;
        font: 12px/1.3 var(--mono);
        color: var(--mute);
      }
      .legend li {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .legend svg {
        width: 24px;
        height: 12px;
        flex: none;
      }

      .reads {
        margin: 0;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        border-top: 1px solid var(--line);
        border-bottom: 1px solid var(--line);
      }
      .reads div {
        padding: 10px 0;
        min-width: 0;
      }
      .reads div + div {
        border-left: 1px solid var(--line);
        padding-left: 12px;
      }
      .reads dt {
        font: 11px/1.3 var(--mono);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--mute);
      }
      .reads dd {
        margin: 4px 0 0;
        font: 500 20px/1.1 var(--mono);
        font-variant-numeric: tabular-nums;
      }
      .reads dd small {
        display: block;
        margin-top: 4px;
        font: 12px/1.35 var(--mono);
        color: var(--mute);
      }

      .info {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 12px;
        align-items: start;
        margin: 0;
        padding: 12px 14px;
        background: var(--plate-2);
        border: 1px solid var(--line);
        font: 13px/1.55 var(--mono);
      }
      .info svg {
        width: 20px;
        height: 20px;
        margin-top: 1px;
      }
      .info strong {
        font-weight: 600;
      }

      .cap {
        margin: 0;
        font: 12px/1.55 var(--mono);
        color: var(--mute);
      }

      @media (prefers-reduced-motion: reduce) {
        * {
          transition: none !important;
          animation: none !important;
        }
      }
      html[data-ob-reduce-motion] * {
        transition: none !important;
        animation: none !important;
      }
    </style>
  </head>
  <body>
    <main class="w">
      <header>
        <h1>Contrast gain or response gain</h1>
        <p class="hint">
          Pick a model of attention, then drag the attention strength and
          watch at which contrast attention helps the neuron most.
        </p>
      </header>

      <div class="lay">
        <div class="a-tabs">
          <p class="group-label" id="model-label">Model</p>
          <div class="tabs" id="modelTabs" role="group" aria-labelledby="model-label">
            <button type="button" data-mode="shift" aria-pressed="true">
              Contrast gain <span class="sub">(shift)</span>
            </button>
            <button type="button" data-mode="scale" aria-pressed="false">
              Response gain <span class="sub">(scale)</span>
            </button>
          </div>
        </div>

        <div class="a-slider">
          <div class="slider-head">
            <label class="group-label" for="strength">Attention strength</label>
          </div>
          <div class="slider-row">
            <input
              id="strength"
              type="range"
              min="1"
              max="2.2"
              step="0.01"
              value="1.51"
              aria-valuetext="1.51 times"
            />
            <output id="sVal" for="strength">1.51×</output>
          </div>
          <div class="ends" aria-hidden="true">
            <span>1.00× no attention</span><span>2.20×</span>
          </div>
        </div>

        <figure class="a-fig">
          <p class="group-label">Contrast-response function</p>
          <div id="chartBox">
            <svg id="chart" role="img" aria-label=""></svg>
          </div>
          <ul class="legend" aria-hidden="true">
            <li>
              <svg viewBox="0 0 24 12"><line x1="1" y1="6" x2="23" y2="6" stroke="var(--unatt)" stroke-width="2" /></svg>
              Unattended
            </li>
            <li>
              <svg viewBox="0 0 24 12"><line x1="1" y1="6" x2="23" y2="6" stroke="var(--accent)" stroke-width="3" /></svg>
              Attended
            </li>
            <li>
              <svg viewBox="0 0 24 12"><line x1="0" y1="6" x2="24" y2="6" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="6 4" /></svg>
              % increase (right axis)
            </li>
            <li>
              <svg viewBox="0 0 24 12"><rect x="1" y="1" width="22" height="10" fill="var(--on)" fill-opacity=".14" stroke="var(--mute)" stroke-width="1" /></svg>
              Dynamic range
            </li>
          </ul>
        </figure>

        <dl class="reads a-reads" aria-live="polite">
          <div>
            <dt>Peak effect location</dt>
            <dd><span id="peakLoc">9%</span><small id="peakLocNote">contrast</small></dd>
          </div>
          <div>
            <dt>Peak % increase</dt>
            <dd><span id="peakVal">+67%</span><small id="peakValNote">over unattended</small></dd>
          </div>
        </dl>

        <p class="info a-info">
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="10" cy="10" r="8.5" fill="none" stroke="var(--on)" stroke-width="1.2" />
            <line x1="10" y1="8.5" x2="10" y2="14.5" stroke="var(--on)" stroke-width="1.6" />
            <circle cx="10" cy="5.8" r="1.1" fill="var(--on)" />
          </svg>
          <span id="info"></span>
        </p>
      </div>

      <p class="cap">
        A hypothetical V4 neuron's firing (spikes/s) against stimulus contrast
        (%, log axis), with attention outside (unattended) or inside
        (attended) its receptive field. Contrast gain multiplies the effective
        contrast by the attention strength; response gain multiplies the
        response above baseline. The dashed curve is the attended response's
        % increase over the unattended one (right axis). The shaded band is
        the dynamic range, where the unattended response climbs from 10% to
        90% of its range (7–54% contrast). Naka–Rushton function: maximum
        40 spikes/s, baseline 3 spikes/s, half-maximum at 20% contrast,
        exponent 2.2. Model after Reynolds, Pasternak &amp; Desimone (2000),
        Fig. 1 · illustrative, not recorded data.
      </p>
    </main>

    <script>
      // The book injects window.OB before this runs; this fallback keeps the
      // file working on its own (in Claude, or opened in a browser).
      window.OB = window.OB || {
        reducedMotion:
          matchMedia("(prefers-reduced-motion: reduce)").matches ||
          document.documentElement.hasAttribute("data-ob-reduce-motion"),
        onTheme(fn) {
          fn({ accent: null, reduceMotion: this.reducedMotion, ramp: null });
        },
        resize() {},
      };

      const $ = (id) => document.getElementById(id);

      // ---- The author's model (contrast_response_gain_widget.html) ----
      // Naka-Rushton contrast-response function, hypothetical V4 neuron.
      const RMAX = 40, // spikes/s
        BASE = 3, // spikes/s
        C50 = 20, // % contrast
        N = 2.2;
      function naka(c) {
        const cn = Math.pow(c, N),
          c50n = Math.pow(C50, N);
        return BASE + ((RMAX - BASE) * cn) / (cn + c50n);
      }
      // contrast at which the response is fraction p of the way BASE -> RMAX
      const invNaka = (p) => C50 * Math.pow(p / (1 - p), 1 / N);
      const BAND_LO = invNaka(0.1), // 7.4 %
        BAND_HI = invNaka(0.9); // 54.3 %

      const N_PTS = 160; // the author's grid: 161 points, log10 c from 0 to 2
      const X_MIN = 0,
        X_MAX = 2;

      function attended(c, s, mode) {
        return mode === "shift" ? naka(c * s) : BASE + s * (naka(c) - BASE);
      }

      function compute(mode, s) {
        const cs = [],
          base = [],
          att = [],
          pct = [];
        for (let i = 0; i <= N_PTS; i++) {
          const c = Math.pow(10, X_MIN + ((X_MAX - X_MIN) * i) / N_PTS);
          const b = naka(c),
            a = attended(c, s, mode);
          cs.push(c);
          base.push(b);
          att.push(a);
          pct.push(((a - b) / b) * 100);
        }
        let peakI = 0;
        for (let i = 1; i < pct.length; i++) if (pct[i] > pct[peakI]) peakI = i;
        return {
          cs,
          base,
          att,
          pct,
          peakI,
          peakC: cs[peakI],
          peakP: pct[peakI],
          interior: peakI > 3 && peakI < N_PTS - 3, // the author's test
          none: pct[peakI] < 0.5,
        };
      }

      // Fixed axes per model, sized to the slider's maximum (2.20x):
      // contrast gain peaks at +158 %, response gain reaches 82 spikes/s
      // and +111 %.
      const AXES = {
        shift: { r: 50, rStep: 10, p: 160, pStep: 40 },
        scale: { r: 100, rStep: 20, p: 120, pStep: 30 },
      };

      const INFO = {
        shift: (s) =>
          `<strong>Contrast gain:</strong> attention multiplies effective contrast by <strong>${s}×</strong>, shifting the curve leftward. The % increase is largest for stimuli near the low-to-mid end of the dynamic range and falls off at high contrast, where both curves have already saturated.`,
        scale: (s) =>
          `<strong>Response gain:</strong> attention multiplies the response above baseline by <strong>${s}×</strong>, stretching the curve vertically. The % increase grows monotonically with contrast and is largest for the strongest stimuli — the opposite diagnostic signature from contrast gain.`,
      };

      let mode = "shift";
      let strength = 1.51;
      let width = 0;
      let last = null; // last drawn pixel geometry, for the tab tween
      let tween = 0;

      function geom(W) {
        const H = Math.round(Math.min(440, Math.max(290, W * 0.62)));
        const ML = 46,
          MR = 50,
          MT = 34,
          MB = 46;
        return { W, H, ML, MR, MT, MB, PW: W - ML - MR, PH: H - MT - MB };
      }
      const xPix = (g, logc) => g.ML + ((logc - X_MIN) / (X_MAX - X_MIN)) * g.PW;
      const yPix = (g, v, max) => g.MT + g.PH - (Math.min(v, max * 1.02) / max) * g.PH;

      // Everything that moves, in pixels
      function layout(d, g) {
        const ax = AXES[mode];
        const xs = d.cs.map((c) => xPix(g, Math.log10(c)));
        return {
          xs,
          base: d.base.map((v) => yPix(g, v, ax.r)),
          att: d.att.map((v) => yPix(g, v, ax.r)),
          pct: d.pct.map((v) => yPix(g, v, ax.p)),
          px: xs[d.peakI],
          py: yPix(g, d.peakP, ax.p),
        };
      }
      const lerp = (a, b, t) => a + (b - a) * t;
      function mix(A, B, t) {
        const m = (k) => A[k].map((v, i) => lerp(v, B[k][i], t));
        return {
          xs: B.xs,
          base: m("base"),
          att: m("att"),
          pct: m("pct"),
          px: lerp(A.px, B.px, t),
          py: lerp(A.py, B.py, t),
        };
      }

      const f1 = (v) => v.toFixed(1);
      const pathOf = (xs, ys) =>
        ys.map((y, i) => (i ? "L" : "M") + f1(xs[i]) + " " + f1(y)).join(" ");

      function svgChart(g, P, d) {
        const ax = AXES[mode];
        const top = g.MT,
          bot = g.MT + g.PH,
          left = g.ML,
          right = g.ML + g.PW;
        let s = "";

        // dynamic-range band, with a bracket and label above the plot
        const bl = xPix(g, Math.log10(BAND_LO)),
          bh = xPix(g, Math.log10(BAND_HI));
        s += `<rect class="band" x="${f1(bl)}" y="${top}" width="${f1(bh - bl)}" height="${g.PH}"/>`;
        s += `<path class="band-mark" d="M${f1(bl)} ${top - 4} V${top - 10} H${f1(bh)} V${top - 4}"/>`;
        s += `<text class="tick" x="${f1((bl + bh) / 2)}" y="${top - 15}" text-anchor="middle">dynamic range</text>`;

        // x: contrast, log axis
        [1, 3, 10, 30, 100].forEach((c) => {
          const x = xPix(g, Math.log10(c));
          s += `<line class="grid" x1="${f1(x)}" y1="${top}" x2="${f1(x)}" y2="${bot}" opacity=".6"/>`;
          s += `<text class="tick" x="${f1(x)}" y="${bot + 17}" text-anchor="middle">${c}</text>`;
        });
        s += `<text class="ax-title" x="${f1(left + g.PW / 2)}" y="${g.H - 6}" text-anchor="middle">Contrast (%)</text>`;

        // left y: spikes/s
        for (let v = 0; v <= ax.r; v += ax.rStep) {
          const y = yPix(g, v, ax.r);
          s += `<line class="grid" x1="${left}" y1="${f1(y)}" x2="${right}" y2="${f1(y)}" opacity="${v === 0 ? 1 : 0.45}"/>`;
          s += `<text class="tick" x="${left - 8}" y="${f1(y + 4)}" text-anchor="end">${v}</text>`;
        }
        s += `<text class="ax-title" transform="translate(12 ${f1(top + g.PH / 2)}) rotate(-90)" text-anchor="middle">Spikes/s</text>`;

        // right y: % increase
        for (let v = 0; v <= ax.p; v += ax.pStep) {
          const y = yPix(g, v, ax.p);
          s += `<text class="tick" x="${right + 8}" y="${f1(y + 4)}" text-anchor="start">${v}</text>`;
        }
        s += `<text class="ax-title" transform="translate(${g.W - 10} ${f1(top + g.PH / 2)}) rotate(90)" text-anchor="middle">% increase</text>`;

        // curves: % increase behind, unattended, attended on top
        s += `<path class="c-pct" d="${pathOf(P.xs, P.pct)}"/>`;
        s += `<path class="c-unatt" d="${pathOf(P.xs, P.base)}"/>`;
        s += `<path class="c-att" d="${pathOf(P.xs, P.att)}"/>`;

        // Labels are placed where they cover the fewest curve points and
        // stay inside the plot: the peak first, then the curve names (direct
        // labels, so attended and unattended differ by more than colour).
        const placed = [];
        const box = (t, x, y, anchor) => {
          const w = t.length * 7.3; // 12 px IBM Plex Mono
          const x0 = anchor === "end" ? x - w : anchor === "middle" ? x - w / 2 : x;
          return { x0: x0 - 2, x1: x0 + w + 2, y0: y - 11, y1: y + 4 };
        };
        const cost = (b) => {
          let c = 0;
          if (b.x0 < left + 2 || b.x1 > right - 2 || b.y0 < top + 1 || b.y1 > bot - 2) c += 1000;
          for (let i = 0; i <= N_PTS; i++) {
            const x = P.xs[i];
            if (x < b.x0 || x > b.x1) continue;
            if (P.att[i] > b.y0 - 2 && P.att[i] < b.y1 + 2) c += 6;
            if (P.base[i] > b.y0 - 2 && P.base[i] < b.y1 + 2) c += 6;
            if (P.pct[i] > b.y0 - 1 && P.pct[i] < b.y1 + 1) c += 3;
          }
          if (!d.none && P.px > b.x0 && P.px < b.x1) c += 1; // the peak line
          placed.forEach((o) => {
            const ox = Math.min(b.x1, o.x1) - Math.max(b.x0, o.x0),
              oy = Math.min(b.y1, o.y1) - Math.max(b.y0, o.y0);
            if (ox > 0 && oy > 0) c += 500;
          });
          return c;
        };
        const place = (t, cands, cls) => {
          let best = null;
          cands.forEach(([x, y, a, bias = 0]) => {
            const b = box(t, x, y, a);
            const c = cost(b) + bias;
            if (!best || c < best.c) best = { x, y, a, b, c };
          });
          placed.push(best.b);
          return `<text class="${cls} halo" x="${f1(best.x)}" y="${f1(best.y)}" text-anchor="${best.a}">${t}</text>`;
        };

        // the peak of the % increase
        if (!d.none) {
          s += `<line class="peak-line" x1="${f1(P.px)}" y1="${top}" x2="${f1(P.px)}" y2="${bot}"/>`;
          s += `<circle class="peak-dot" cx="${f1(P.px)}" cy="${f1(P.py)}" r="5.5"/>`;
          placed.push({ x0: P.px - 7, x1: P.px + 7, y0: P.py - 7, y1: P.py + 7 });
          const txt = `+${d.peakP.toFixed(0)}% at ${d.peakC.toFixed(0)}%`;
          const { px, py } = P;
          s += place(
            txt,
            [
              [px + 10, py - 8, "start"],
              [px - 10, py - 8, "end"],
              [px, py - 14, "middle"],
              [px + 10, py + 18, "start", 0.5],
              [px - 10, py + 18, "end", 0.5],
              [px - 12, py + 4, "end", 0.5],
              [px + 12, py + 4, "start", 0.5],
              [px - 10, py - 22, "end", 1],
              [px - 10, py + 30, "end", 1],
            ],
            "lab"
          );
        }

        // the curve names, near the widest gap between the curves
        let gi = 40;
        for (let i = 40; i <= 130; i++)
          if (P.base[i] - P.att[i] > P.base[gi] - P.att[gi]) gi = i;
        const near = (i) => Math.abs(i - gi) * 0.04;
        const idx = [];
        for (let i = 30; i <= 150; i += 4) idx.push(i);
        if (P.base[gi] - P.att[gi] < 4) {
          s += place(
            "attended = unattended",
            idx.flatMap((i) => [
              [P.xs[i] - 8, P.base[i] - 10, "end", Math.abs(i - 118) * 0.04],
              [P.xs[i] + 8, P.base[i] + 18, "start", Math.abs(i - 118) * 0.04],
            ]),
            "lab"
          );
        } else {
          s += place(
            "attended",
            idx.flatMap((i) => [
              [P.xs[i] - 8, P.att[i] - 8, "end", near(i)],
              [P.xs[i], P.att[i] - 12, "middle", near(i) + 0.3],
            ]),
            "lab"
          );
          s += place(
            "unattended",
            idx.flatMap((i) => [
              [P.xs[i] + 8, P.base[i] + 18, "start", near(i)],
              [P.xs[i], P.base[i] + 20, "middle", near(i) + 0.3],
            ]),
            "lab-mute"
          );
        }
        return s;
      }

      function readouts(d) {
        const s = strength.toFixed(2);
        if (d.none) {
          $("peakLoc").textContent = "—";
          $("peakLocNote").textContent = "no attention effect";
          $("peakVal").textContent = "+0%";
          $("peakValNote").textContent = "attended = unattended";
        } else if (d.interior) {
          $("peakLoc").textContent = d.peakC.toFixed(0) + "%";
          $("peakLocNote").textContent = "contrast";
          $("peakVal").textContent = "+" + d.peakP.toFixed(0) + "%";
          $("peakValNote").textContent = "over unattended";
        } else {
          $("peakLoc").textContent = d.peakC.toFixed(0) + "%";
          $("peakLocNote").textContent = "high contrast, no interior peak";
          $("peakVal").textContent = "+" + d.peakP.toFixed(0) + "%";
          $("peakValNote").textContent = "and still rising";
        }
        $("sVal").textContent = s + "×";
        $("strength").setAttribute("aria-valuetext", s + " times");
        $("info").innerHTML = INFO[mode](s);

        const what =
          mode === "shift"
            ? `Contrast gain at ${s}×: the attended curve is the unattended one shifted left along the contrast axis.`
            : `Response gain at ${s}×: the attended curve is the unattended one stretched upward.`;
        const peak = d.none
          ? "The two curves coincide; there is no attention effect."
          : d.interior
            ? `The % increase peaks at +${d.peakP.toFixed(0)}% at ${d.peakC.toFixed(0)}% contrast, then falls at high contrast.`
            : `The % increase grows with contrast, reaching +${d.peakP.toFixed(0)}% at 100% contrast.`;
        $("chart").setAttribute(
          "aria-label",
          `Contrast-response function of a model V4 neuron: spikes per second against contrast, 1 to 100 percent on a log axis. The unattended response rises from 3 to about 39 spikes/s, most steeply between 7 and 54% contrast (the dynamic range). ${what} ${peak}`
        );
      }

      const reduced = () =>
        !!OB.reducedMotion ||
        document.documentElement.hasAttribute("data-ob-reduce-motion") ||
        matchMedia("(prefers-reduced-motion: reduce)").matches;

      function paint(g, P, d) {
        const svg = $("chart");
        svg.setAttribute("viewBox", `0 0 ${g.W} ${g.H}`);
        svg.setAttribute("width", g.W);
        svg.setAttribute("height", g.H);
        svg.innerHTML = svgChart(g, P, d);
      }

      // animate: true only when the model changes (a 250 ms glide)
      function render(animate) {
        width = Math.floor($("chartBox").clientWidth) || 320;
        const g = geom(width);
        const d = compute(mode, strength);
        const P = layout(d, g);
        readouts(d);
        cancelAnimationFrame(tween);
        const from = last && last.W === g.W ? last.P : null;
        last = { W: g.W, P };
        if (!animate || !from || reduced()) {
          paint(g, P, d);
          OB.resize();
          return;
        }
        const DUR = 250,
          t0 = performance.now();
        const step = (now) => {
          const t = Math.min(1, (now - t0) / DUR);
          const e = 1 - Math.pow(1 - t, 3); // ease-out
          paint(g, t < 1 ? mix(from, P, e) : P, d);
          if (t < 1) tween = requestAnimationFrame(step);
        };
        tween = requestAnimationFrame(step);
        // if frames are not delivered (a hidden tab), land on the end state
        setTimeout(() => {
          if (last && last.P === P) paint(g, P, d);
        }, DUR + 120);
        OB.resize();
      }

      $("modelTabs").addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b || b.dataset.mode === mode) return;
        mode = b.dataset.mode;
        document
          .querySelectorAll("#modelTabs button")
          .forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
        render(true);
      });
      $("strength").addEventListener("input", (e) => {
        strength = parseFloat(e.target.value);
        render(false);
      });
      if (window.ResizeObserver) {
        new ResizeObserver(() => {
          if (Math.floor($("chartBox").clientWidth) !== width) render(false);
        }).observe($("chartBox"));
      } else {
        window.addEventListener("resize", () => render(false));
      }

      OB.onTheme(() => render(false));
      render(false);
    </script>
  </body>
</html>
$w$, 'published'),
  ('attn-feature-attention', $t$Feature-based attention$t$,
   $t$Attend the fixation cross, the preferred or the null direction and watch an MT neuron's response change (after Treue & Martinez-Trujillo, 1999).$t$,
   $t$Arjun Krishnaswamy · design: Malpeso Studio$t$, 'lear',
   $w$<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Feature-based attention</title>
    <!--
  The Open Brain, chapter 3 "Attention and Working Memory", Figure 6.
  Figma "Wid. 06 | Feature-based attention" (R7AjPuac7z7OZ7xcd2t7OR,
  section 21:14156; component set 14:2188, mistitled "Contrast vs Response
  gain"; instances 21:14527-21:14529), rebuilt on the widget kit.

  Science from the author's original (Arjun Krishnaswamy),
  src/widgets/source/tmt_feature_attention_widget.html, "adapted from
  Treue & Martinez-Trujillo (1999), Fig. 2":

  - The receptive-field (RF) stimulus is fixed: a patch moving in the MT
    neuron's preferred direction (drawn upward, as the author's arrow).
  - Three conditions: attend fixation; attend a patch outside the RF moving
    in the same (preferred) direction; attend one moving in the opposite
    (null) direction.
  - One trial per condition. Spike counts and spike times are the author's,
    unchanged (x positions in the author's 300-unit raster): fixation 30,
    preferred 50, null 17. The author's note: "differences exaggerated for
    legibility, not to scale". No time scale in the author's widget, so the
    readouts are spikes per trial, not spikes/s.
  - The gain readout (spikes / fixation spikes) is ours, to tie the result
    to the chapter's "gain factor". It inherits the exaggeration.

  Ours, following the brief (ch3-widget-specs.md, section 7):
  - Both patches are present in every condition; only the attention ring
    moves. In "attend fixation" the outside patch moves in the preferred
    direction, like the RF patch (the author drew a plain dot there).
  - The red ring marks what is attended in every state; the raster stays
    white and its rate carries the result.
  - Dot counts, speed and patch sizes are illustrative (DEFAULT, below).
-->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;600&display=swap"
      rel="stylesheet"
    />
    <style>
      /* The book sets these; the fallbacks make the file work on its own.
         Attention and Working Memory = Learning, Cognition & Memory ramp. */
      :root {
        --accent: var(--ob-accent, #ff3351);
        /* text on an accent fill: dark on this red */
        --on-accent: var(--ob-on-accent, #1c1c1c);
        --plate: var(--ob-plate, #1c1c1c);
        --plate-2: var(--ob-plate-2, #2a2a2a);
        --on: var(--ob-on-plate, #ffffff);
        --mute: var(--ob-on-plate-mute, rgba(255, 255, 255, 0.62));
        --line: var(--ob-line-plate, rgba(255, 255, 255, 0.18));
        /* the dot patches: a near-black disc, as in the Figma frames */
        --patch: var(--ob-ink, #0a0a0a);
        --sans: var(--ob-font-sans, "IBM Plex Sans", system-ui, sans-serif);
        --mono: var(--ob-font-mono, "IBM Plex Mono", ui-monospace, monospace);
        --radius: var(--ob-radius, 0);
      }
      * {
        box-sizing: border-box;
      }
      html,
      body {
        margin: 0;
        background: var(--plate);
        color: var(--on);
        font-family: var(--sans);
      }
      [hidden] {
        display: none !important;
      }
      .w {
        max-width: 1120px;
        margin: 0 auto;
        padding: 20px;
        display: grid;
        gap: 16px;
      }
      @media (min-width: 900px) {
        .w {
          padding: 32px 40px;
          gap: 20px;
        }
      }

      h1 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        line-height: 1.3;
      }
      .hint {
        margin: 4px 0 0;
        font-size: 15px;
        line-height: 1.5;
        color: var(--mute);
      }

      .group-label {
        margin: 0 0 6px;
        font: 500 11px/1.3 var(--mono);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--mute);
      }
      /* Tabs: equal cells, hairline dividers, the active one in the accent */
      .tabs {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: 1fr;
        border: 1px solid var(--line);
      }
      .tabs button {
        min-height: 44px;
        padding: 8px 6px;
        border: 0;
        border-left: 1px solid var(--line);
        background: transparent;
        color: var(--on);
        cursor: pointer;
        border-radius: var(--radius);
        font: 500 12px/1.25 var(--mono);
        letter-spacing: 0.06em;
        text-transform: uppercase;
        transition: background-color 0.18s ease-out, color 0.18s ease-out;
      }
      .tabs button:first-child {
        border-left: 0;
      }
      .tabs button:hover {
        background: var(--plate-2);
      }
      .tabs button[aria-pressed="true"] {
        background: var(--accent);
        color: var(--on-accent);
      }
      button:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
        position: relative;
        z-index: 1;
      }

      /* Stimulus left, response right from 760 px; stacked on phones */
      .body {
        display: grid;
        gap: 16px;
      }
      @media (min-width: 760px) {
        .body {
          grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
          gap: 24px;
          align-items: center;
        }
      }
      .side {
        display: grid;
        gap: 14px;
        align-content: start;
      }
      svg {
        display: block;
        width: 100%;
        height: auto;
      }
      .label {
        font: 13px var(--mono);
        fill: var(--mute);
      }
      .label-on {
        font: 500 13px var(--mono);
        fill: var(--on);
      }
      .tick {
        font: 12px var(--mono);
        fill: var(--mute);
      }
      .ring {
        fill: none;
        stroke: var(--accent);
        stroke-width: 2.2;
        transition: opacity 0.2s ease-out;
      }
      .patch {
        fill: var(--patch);
        stroke: var(--on);
        stroke-width: 1.5;
      }
      .dot {
        fill: var(--on);
      }
      .arrow {
        stroke: var(--on);
        stroke-width: 2;
        stroke-linecap: round;
        fill: none;
      }
      .arrow-head {
        fill: var(--on);
      }
      .spike {
        stroke: var(--on);
        stroke-width: 1.6;
        stroke-linecap: round;
      }

      .raster-box {
        border: 1px solid var(--line);
        background: var(--plate-2);
        padding: 8px 8px 6px;
      }
      .raster-title {
        margin: 2px 0 2px;
        text-align: center;
        font: 12px/1.3 var(--mono);
        color: var(--mute);
      }

      .reads {
        margin: 0;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        border-top: 1px solid var(--line);
        border-bottom: 1px solid var(--line);
      }
      .reads div {
        padding: 10px 0;
        min-width: 0;
      }
      .reads div + div {
        border-left: 1px solid var(--line);
        padding-left: 12px;
      }
      .reads dt {
        font: 11px/1.3 var(--mono);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--mute);
      }
      .reads dd {
        margin: 4px 0 0;
        font: 500 20px/1.1 var(--mono);
        font-variant-numeric: tabular-nums;
      }
      .reads dd small {
        font: 11px var(--mono);
        color: var(--mute);
        letter-spacing: 0.04em;
      }
      .btn {
        justify-self: start;
        min-height: 44px;
        min-width: 44px;
        padding: 8px 16px;
        border: 1px solid var(--line);
        border-radius: var(--radius);
        background: transparent;
        color: var(--on);
        cursor: pointer;
        font: 500 12px/1.2 var(--mono);
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .btn:hover {
        border-color: var(--on);
      }

      .info {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 12px;
        align-items: start;
        margin: 0;
        padding: 12px 14px;
        background: var(--plate-2);
        border: 1px solid var(--line);
        font: 13px/1.5 var(--mono);
      }
      .info svg {
        width: 20px;
        height: 20px;
        margin-top: 1px;
      }

      .cap {
        margin: 0;
        font: 12px/1.55 var(--mono);
        color: var(--mute);
      }

      @media (prefers-reduced-motion: reduce) {
        * {
          transition: none !important;
          animation: none !important;
        }
      }
      html[data-ob-reduce-motion] * {
        transition: none !important;
        animation: none !important;
      }
    </style>
  </head>
  <body>
    <main class="w">
      <header>
        <h1>Feature-based attention</h1>
        <p class="hint">
          The neuron's receptive field always holds the same dots, moving in
          its preferred direction. Choose what the monkey attends and watch the
          MT neuron's response change.
        </p>
      </header>

      <div>
        <p class="group-label" id="attend-label">The monkey attends</p>
        <div class="tabs" id="tabs" role="group" aria-labelledby="attend-label">
          <button type="button" data-cond="fixation" aria-pressed="true">
            Attend fixation
          </button>
          <button type="button" data-cond="preferred" aria-pressed="false">
            Attend preferred direction
          </button>
          <button type="button" data-cond="null" aria-pressed="false">
            Attend null direction
          </button>
        </div>
      </div>

      <div class="body">
        <!-- The screen: RF patch, fixation cross, patch outside the RF -->
        <svg id="stage" viewBox="0 0 360 206" role="img" aria-label="">
          <defs>
            <clipPath id="clipRF"><circle cx="0" cy="0" r="39" /></clipPath>
            <clipPath id="clipOut"><circle cx="0" cy="0" r="39" /></clipPath>
          </defs>

          <!-- receptive field of the recorded MT neuron -->
          <circle cx="80" cy="96" r="54" fill="none" stroke="var(--on)" stroke-opacity=".7" stroke-width="1.2" stroke-dasharray="4 3" />
          <text class="label" x="80" y="36" text-anchor="middle" id="rfTag">receptive field</text>

          <!-- RF patch: preferred direction, fixed -->
          <g transform="translate(80 96)">
            <circle class="patch" r="40" />
            <g clip-path="url(#clipRF)" id="dotsRF"></g>
          </g>
          <!-- direction arrow beside the patch (reads without motion) -->
          <g id="arrowRF"></g>

          <!-- fixation cross -->
          <circle class="ring" id="ringFix" cx="180" cy="96" r="17" />
          <g stroke="var(--on)" stroke-width="1.8">
            <line x1="172" y1="96" x2="188" y2="96" />
            <line x1="180" y1="88" x2="180" y2="104" />
          </g>
          <text class="label" id="fixLabel" x="180" y="134" text-anchor="middle">fixation</text>
          <text class="label-on" id="fixL2" x="180" y="153" text-anchor="middle">attended</text>

          <!-- patch outside the RF, in the opposite hemifield -->
          <circle class="ring" id="ringOut" cx="280" cy="96" r="47" />
          <g transform="translate(280 96)">
            <circle class="patch" r="40" />
            <g clip-path="url(#clipOut)" id="dotsOut"></g>
          </g>
          <g id="arrowOut"></g>

          <!-- labels under the patches -->
          <text class="label-on" x="80" y="174" text-anchor="middle">RF stimulus</text>
          <text class="label" x="80" y="192" text-anchor="middle">preferred, fixed</text>
          <text id="outL1" class="label" x="280" y="174" text-anchor="middle">unattended</text>
          <text id="outL2" class="label" x="280" y="192" text-anchor="middle">same direction</text>
        </svg>

        <div class="side">
          <div class="raster-box">
            <svg id="raster" viewBox="0 0 300 96" role="img" aria-label="">
              <line x1="4" y1="42" x2="296" y2="42" stroke="var(--mute)" stroke-width="1" />
              <g id="spikes"></g>
              <line id="cursor" x1="8" y1="8" x2="8" y2="76" stroke="var(--accent)" stroke-width="1.2" opacity="0" />
              <text class="tick" x="4" y="92">time →</text>
              <text class="tick" x="296" y="92" text-anchor="end">one trial</text>
            </svg>
            <p class="raster-title" aria-hidden="true">Response to RF stimulus</p>
          </div>

          <dl class="reads">
            <div>
              <dt>This trial</dt>
              <dd><span id="rNow">30</span> <small>spikes</small></dd>
            </div>
            <div>
              <dt>Attend fixation</dt>
              <dd><span id="rFix">30</span> <small>spikes</small></dd>
            </div>
            <div>
              <dt>Gain</dt>
              <dd>×<span id="rGain">1.00</span></dd>
            </div>
          </dl>
          <button type="button" class="btn" id="play" aria-pressed="false">Pause motion</button>
        </div>
      </div>

      <p class="info" aria-live="polite">
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="10" r="8.5" fill="none" stroke="var(--on)" stroke-width="1.2" />
          <line x1="10" y1="8.5" x2="10" y2="14.5" stroke="var(--on)" stroke-width="1.6" />
          <circle cx="10" cy="5.8" r="1.1" fill="var(--on)" />
        </svg>
        <span id="info"></span>
      </p>

      <p class="cap">
        An MT neuron's receptive field (dashed) holds a patch of dots moving
        in the neuron's preferred direction (up). The monkey keeps its eyes on
        the cross and attends either the cross or a second patch in the
        opposite hemifield, outside the receptive field; the red ring marks
        what it attends. Attending the preferred direction out there raises
        the response to the unchanged stimulus in the receptive field;
        attending the null (opposite) direction lowers it. Gain is spikes
        relative to attend fixation. Single-unit spike train, one trial per
        condition; differences exaggerated for legibility, not to scale.
        Illustrative, not recorded data. Adapted from Treue &amp;
        Martinez-Trujillo (1999), Fig. 2.
      </p>
    </main>

    <script>
      // The book injects window.OB before this runs; this fallback keeps the
      // file working on its own (in Claude, or opened in a browser).
      window.OB = window.OB || {
        reducedMotion:
          matchMedia("(prefers-reduced-motion: reduce)").matches ||
          document.documentElement.hasAttribute("data-ob-reduce-motion"),
        onTheme(fn) {
          fn({ accent: null, reduceMotion: this.reducedMotion, ramp: null });
        },
        resize() {},
      };

      const $ = (id) => document.getElementById(id);
      const NS = "http://www.w3.org/2000/svg";

      // ---- The author's data (tmt_feature_attention_widget.html) ----------
      // Spike times: x positions in the author's 300-unit raster (8-292),
      // copied unchanged. Counts: fixation 30, preferred 50, null 17.
      const SPIKES = {
        fixation: [12.3, 16.5, 19.9, 24.9, 34.7, 52.7, 60.4, 76.7, 87, 94.2, 97.5, 133.1, 136.5, 140.2, 152.2, 158.1, 167, 174.8, 182.8, 186.9, 193.7, 204.9, 209, 233.2, 237.9, 247.2, 270.5, 282, 286.9, 291.3],
        preferred: [8.2, 12.7, 19, 27.9, 32.7, 36.7, 41.5, 45.2, 51.8, 58.5, 62.2, 67.6, 73.2, 78, 81.4, 84.6, 90.1, 94.4, 98.6, 102.5, 113.6, 117.8, 121.7, 127.5, 135.1, 141.5, 145.4, 166.8, 170.5, 173.5, 178.8, 182.5, 186.8, 190.8, 194.6, 204.3, 208.1, 212.6, 215.9, 225.6, 229.1, 234.4, 240.3, 248.4, 254.1, 259.3, 266.5, 275.1, 280.1, 286.4],
        null: [29.4, 107.9, 116.6, 126.5, 163.1, 170.7, 180.9, 185.5, 189.6, 202.6, 207.8, 217.3, 233.3, 255.4, 263.7, 267.9, 291.8],
      };
      // Direction of the patch outside the RF (+1 = preferred/up, -1 = null/down).
      // The RF patch is always +1. In "fixation" the author drew no
      // direction; the brief keeps the patch, moving like the RF patch.
      const OUT_DIR = { fixation: 1, preferred: 1, null: -1 };

      const INFO = {
        fixation: "Neither stimulus behaviorally relevant. This is the baseline response to the RF stimulus.",
        preferred: "Attended target is outside the RF, moving in the cell's preferred direction. The response rises above baseline.",
        null: "Attended target is outside the RF, moving in the cell's anti-preferred direction. The response falls below baseline.",
      };

      // ---- Dots (illustrative; DEFAULT) -----------------------------------
      const R = 39; // patch radius for dots (the disc is 40)
      const N_DOTS = 64; // per patch
      const SPEED = 22; // units per second (about 3.5 s across the patch)

      // Seeded PRNG so every load (and every screenshot) starts the same.
      function mulberry32(a) {
        return function () {
          a |= 0;
          a = (a + 0x6d2b79f5) | 0;
          let t = Math.imul(a ^ (a >>> 15), 1 | a);
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      }
      function makeDots(seed) {
        const rnd = mulberry32(seed);
        return Array.from({ length: N_DOTS }, () => {
          const r = R * Math.sqrt(rnd());
          const a = rnd() * Math.PI * 2;
          return { x: r * Math.cos(a), y: r * Math.sin(a), s: 1.1 + rnd() * 0.9 };
        });
      }
      function mountDots(g, dots) {
        g.textContent = "";
        return dots.map((d) => {
          const c = document.createElementNS(NS, "circle");
          c.setAttribute("class", "dot");
          c.setAttribute("r", d.s.toFixed(2));
          c.setAttribute("cx", d.x.toFixed(2));
          c.setAttribute("cy", d.y.toFixed(2));
          g.appendChild(c);
          return c;
        });
      }
      const patches = [
        { dots: makeDots(7), g: $("dotsRF"), dir: () => 1 },
        { dots: makeDots(19), g: $("dotsOut"), dir: () => OUT_DIR[cond] },
      ];
      patches.forEach((p) => (p.els = mountDots(p.g, p.dots)));

      // Coherent motion along y; a dot leaving the disc re-enters on the
      // opposite edge of its own chord, so the density stays even.
      function stepDots(dt) {
        patches.forEach((p) => {
          const dir = p.dir(); // +1 up, -1 down
          p.dots.forEach((d, i) => {
            d.y -= dir * SPEED * dt;
            const h = Math.sqrt(Math.max(0, R * R - d.x * d.x));
            if (dir > 0 && d.y < -h) d.y += 2 * h;
            if (dir < 0 && d.y > h) d.y -= 2 * h;
            p.els[i].setAttribute("cy", d.y.toFixed(2));
          });
        });
      }

      // Direction arrows on the outer side of each patch, so the direction
      // reads when the dots are still (reduced motion, paused, no rAF).
      function drawArrow(gId, x, dir) {
        const
          y0 = 96 + dir * 26,
          y1 = 96 - dir * 26;
        const head = dir > 0 ? `${x - 5},${y1 + 8} ${x + 5},${y1 + 8} ${x},${y1}` : `${x - 5},${y1 - 8} ${x + 5},${y1 - 8} ${x},${y1}`;
        $(gId).innerHTML =
          `<line class="arrow" x1="${x}" y1="${y0}" x2="${x}" y2="${y1 + (dir > 0 ? 6 : -6)}"/>` +
          `<polygon class="arrow-head" points="${head}"/>`;
      }

      // ---- Raster ----------------------------------------------------------
      const Y_TOP = 12,
        Y_BOT = 72;
      const X0 = 4,
        X1 = 296;
      const SWEEP = 2400, // ms to draw one trial
        HOLD = 900; // ms the full trial stays before the next sweep
      function drawSpikes(upToX) {
        $("spikes").innerHTML = SPIKES[cond]
          .filter((x) => x <= upToX)
          .map((x) => `<line class="spike" x1="${x}" x2="${x}" y1="${Y_TOP}" y2="${Y_BOT}"/>`)
          .join("");
      }

      // ---- Motion ----------------------------------------------------------
      const reduced = () =>
        !!OB.reducedMotion ||
        document.documentElement.hasAttribute("data-ob-reduce-motion") ||
        matchMedia("(prefers-reduced-motion: reduce)").matches;

      let cond = "fixation";
      let playing = true;
      let raf = 0,
        tSweep = 0,
        tLast = 0;

      function stopAnim() {
        cancelAnimationFrame(raf);
        raf = 0;
        tLast = 0;
        $("cursor").setAttribute("opacity", "0");
      }
      function frame(now) {
        if (!tSweep) tSweep = now;
        const dt = tLast ? Math.min(0.1, (now - tLast) / 1000) : 0;
        tLast = now;
        stepDots(dt);
        const e = (now - tSweep) % (SWEEP + HOLD);
        if (e < SWEEP) {
          const x = X0 + (e / SWEEP) * (X1 - X0);
          drawSpikes(x);
          $("cursor").setAttribute("x1", x);
          $("cursor").setAttribute("x2", x);
          $("cursor").setAttribute("opacity", "1");
        } else {
          drawSpikes(Infinity);
          $("cursor").setAttribute("opacity", "0");
        }
        raf = requestAnimationFrame(frame);
      }
      // The still state is drawn first and is complete on its own: dots in
      // place, arrows, the whole trial. Motion only starts if rAF fires.
      function start(restartSweep) {
        stopAnim();
        const rm = reduced();
        $("play").hidden = rm;
        drawSpikes(Infinity);
        if (rm || !playing || document.hidden) return;
        if (restartSweep) tSweep = 0;
        raf = requestAnimationFrame(frame);
      }

      // ---- Render ----------------------------------------------------------
      function render() {
        document
          .querySelectorAll("#tabs button")
          .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cond === cond)));

        const onFix = cond === "fixation";
        $("ringFix").style.opacity = onFix ? 1 : 0;
        $("ringOut").style.opacity = onFix ? 0 : 1;
        $("fixL2").style.display = onFix ? "" : "none";
        $("outL1").textContent = onFix ? "unattended" : "attended";
        $("outL1").setAttribute("class", onFix ? "label" : "label-on");
        $("outL2").textContent = OUT_DIR[cond] > 0 ? "same direction" : "opposite direction";

        drawArrow("arrowRF", 14, 1);
        drawArrow("arrowOut", 342, OUT_DIR[cond]);

        const n = SPIKES[cond].length,
          base = SPIKES.fixation.length;
        $("rNow").textContent = n;
        $("rFix").textContent = base;
        $("rGain").textContent = (n / base).toFixed(2);
        $("info").textContent = INFO[cond];

        const att = onFix
          ? "The monkey attends the fixation cross (red ring)."
          : `The monkey attends the patch outside the receptive field (red ring), moving ${OUT_DIR[cond] > 0 ? "in the same, preferred direction" : "in the opposite, null direction"}.`;
        $("stage").setAttribute(
          "aria-label",
          `Left: the MT neuron's receptive field holds a patch of dots moving up, the preferred direction. Centre: a fixation cross. Right: a second patch outside the receptive field, moving ${OUT_DIR[cond] > 0 ? "up" : "down"}. ${att}`
        );
        $("raster").setAttribute(
          "aria-label",
          `Spike train of the MT neuron for one trial: ${n} spikes, against ${base} when attending fixation (gain ${(n / base).toFixed(2)}).`
        );
        start(true);
        OB.resize();
      }

      $("tabs").addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        cond = b.dataset.cond;
        render();
      });
      $("play").addEventListener("click", () => {
        playing = !playing;
        $("play").textContent = playing ? "Pause motion" : "Play motion";
        $("play").setAttribute("aria-pressed", String(!playing));
        start(false);
      });
      document.addEventListener("visibilitychange", () => (document.hidden ? stopAnim() : start(false)));
      matchMedia("(prefers-reduced-motion: reduce)").addEventListener?.("change", () => start(false));

      OB.onTheme(() => start(false));
      render();
    </script>
  </body>
</html>
$w$, 'published')
on conflict (slug) do update
  set title = excluded.title, description = excluded.description, author = excluded.author,
      ramp = excluded.ramp, html = excluded.html, status = excluded.status, updated_at = now();

update public.paragraphs p
   set content = jsonb_set(p.content, '{blocks,0}',
         (p.content -> 'blocks' -> 0)
         || jsonb_build_object(
              'widgetId', v.new_id,
              'kind', 'inline',
              'title', v.title,
              'credit', $t$Arjun Krishnaswamy · design: Malpeso Studio$t$))
  from (values
    ('sdt', 'upload:attn-sdt', $t$Signal detection theory$t$),
    ('posner-cueing', 'upload:attn-posner-cueing', $t$Posner cueing task$t$),
    ('contrast-response-gain', 'upload:attn-contrast-response-gain', $t$Contrast gain or response gain$t$),
    ('tmt-feature-attention', 'upload:attn-feature-attention', $t$Feature-based attention$t$)
  ) as v(old_id, new_id, title),
       public.sections s
  join public.modules m on m.id = s.module_id
 where p.section_id = s.id
   and m.slug = 'attention-and-working-memory'
   and p.content -> 'blocks' -> 0 ->> 'type' = 'widget'
   and p.content -> 'blocks' -> 0 ->> 'widgetId' = v.old_id;

-- The Posner blurb promised neutral cues; the task has valid and invalid
-- cues only (the author's widget has no neutral trials).
update public.paragraphs p
   set content = jsonb_set(p.content, '{blocks,0,blurb}', to_jsonb(
         $t$Valid and invalid cues, your own reaction times: see why a cue at the target's location speeds detection and an invalid one slows it.$t$::text))
  from public.sections s
  join public.modules m on m.id = s.module_id
 where p.section_id = s.id
   and m.slug = 'attention-and-working-memory'
   and p.content -> 'blocks' -> 0 ->> 'widgetId' = 'upload:attn-posner-cueing';
