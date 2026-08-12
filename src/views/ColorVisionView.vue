<script setup>
/*
 * ColorVisionView — Color vision explorer widget.
 *
 * Ported from Stuart Trenholm's color-vision-widget.html.
 * Four sections: EM spectrum (SVG), wavelength explorer (2× Canvas),
 * additive mixing (1× Canvas), and dichromacy simulation (2× Canvas).
 *
 * OPENBRAIN-14: first Stuart widget port.
 *
 * Design ownership: Sonia owns design. This is a token-swap only — the
 * widget's interaction and pedagogy are unchanged from the original.
 *
 * Design rule (Stuart's, preserved verbatim): "the interface is
 * achromatic. Every saturated color on this page is a stimulus, never
 * chrome." Saturated colours are scientific data and are NOT token-swapped.
 *
 * Colour mapping from original → brand.css tokens:
 *   --ink:#131417       → rgb(var(--color-bg))
 *   --panel:#1a1c21     → rgb(var(--color-paper))
 *   --text:#e9eaee      → rgb(var(--color-ink))
 *   --dim:#99a0ab       → rgb(var(--color-mute))
 *   --rule:#31353d      → rgb(var(--color-line))
 *   --faint:#6a717c     → kept as local --cv-faint (no brand equivalent)
 */
import { ref, computed, watch, onMounted } from "vue";
import {
  wavelengthRGB,
  hex,
  coneSens,
  CONE_PEAK,
  simulate,
  swatchAtY,
  buildEmWavePath,
} from "@/helper/colorVision";

// ── Section 1: EM spectrum (static SVG) ──────────────────────────────
const emWavePath = buildEmWavePath(218, 1180, 68, 50);

const emBands = [
  { n: "Radio", wl: "10³", sz: "Buildings" },
  { n: "Microwave", wl: "10⁻²", sz: "Humans" },
  { n: "Infrared", wl: "10⁻⁵", sz: "Needle point" },
  { n: "Visible", wl: "0.5×10⁻⁶", sz: "Protozoans" },
  { n: "Ultraviolet", wl: "10⁻⁸", sz: "Molecules" },
  { n: "X-ray", wl: "10⁻¹⁰", sz: "Atoms" },
  { n: "Gamma ray", wl: "10⁻¹²", sz: "Atomic nuclei" },
];

const emFreqs = ["10⁴", "10⁸", "10¹²", "10¹⁵", "10¹⁶", "10¹⁸", "10²⁰"];

const EM_L = 218;
const EM_W = 962;
const EM_STEP = EM_W / emBands.length;

// Visible band position on frequency bar
const visBandX = EM_L + EM_STEP * 3 + EM_STEP * 0.18;
const visBandW = EM_STEP * 0.64;

// Wedge path connecting visible band to section 2
const emWedgePath = `M${visBandX} 357 L${visBandX + visBandW} 357 L 900 440 L 336 440 Z`;

// ── Section 2: Wavelength explorer ───────────────────────────────────
const wavelength = ref(550);
const waveCvRef = ref(null);
const coneCvRef = ref(null);

const wlRgb = computed(() => wavelengthRGB(wavelength.value));
const wlHex = computed(() =>
  hex(wlRgb.value[0], wlRgb.value[1], wlRgb.value[2])
);
const wlFreq = computed(() =>
  (299792458 / (wavelength.value * 1e-9) / 1e12).toFixed(0)
);
const wlEv = computed(() => (1239.84 / wavelength.value).toFixed(2));
const coneL = computed(() => coneSens("L", wavelength.value));
const coneM = computed(() => coneSens("M", wavelength.value));
const coneS = computed(() => coneSens("S", wavelength.value));
const coneRatio = computed(() => {
  const sum = coneL.value + coneM.value + coneS.value;
  if (sum < 0.0005) return "below threshold";
  return (
    ((coneL.value / sum) * 100).toFixed(0) +
    " : " +
    ((coneM.value / sum) * 100).toFixed(0) +
    " : " +
    ((coneS.value / sum) * 100).toFixed(0)
  );
});

function drawWave(w, rgb) {
  const cv = waveCvRef.value;
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const W = cv.width,
    H = cv.height;
  ctx.clearRect(0, 0, W, H);
  const padL = 54,
    padR = 26,
    padT = 34,
    padB = 58;
  const span = 1600;
  const x0 = padL,
    x1 = W - padR,
    yc = (padT + H - padB) / 2,
    amp = (H - padT - padB) / 2 - 6;

  // baseline (Canvas can't resolve CSS vars — use literal)
  ctx.strokeStyle = "#31353d";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0, yc);
  ctx.lineTo(x1, yc);
  ctx.stroke();

  // nm ruler
  ctx.fillStyle = "#6a717c";
  ctx.font = '400 17px "IBM Plex Mono", ui-monospace, monospace';
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let nm = 0; nm <= span; nm += 400) {
    const px = x0 + (nm / span) * (x1 - x0);
    ctx.strokeStyle = "#282c33";
    ctx.beginPath();
    ctx.moveTo(px, padT);
    ctx.lineTo(px, H - padB);
    ctx.stroke();
    const last = nm === span;
    ctx.textAlign = last ? "right" : "center";
    ctx.fillText(nm + (last ? " nm" : ""), px, H - padB + 10);
  }
  ctx.textAlign = "center";

  // wave
  ctx.strokeStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (let px = x0; px <= x1; px++) {
    const nmPos = ((px - x0) / (x1 - x0)) * span;
    const y = yc - amp * Math.sin((2 * Math.PI * nmPos) / w);
    if (px === x0) ctx.moveTo(px, y);
    else ctx.lineTo(px, y);
  }
  ctx.stroke();

  // one-period bracket
  const pxPerNm = (x1 - x0) / span,
    bx0 = x0,
    bx1 = x0 + w * pxPerNm,
    by = padT + 12;
  ctx.strokeStyle = "#99a0ab";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bx0, by + 9);
  ctx.lineTo(bx0, by);
  ctx.lineTo(bx1, by);
  ctx.lineTo(bx1, by + 9);
  ctx.stroke();
  ctx.fillStyle = "#e9eaee";
  ctx.font = '400 18px "IBM Plex Mono", ui-monospace, monospace';
  ctx.textBaseline = "bottom";
  ctx.fillText("one wavelength = " + w + " nm", (bx0 + bx1) / 2, by - 6);
}

function drawCones(w) {
  const cv = coneCvRef.value;
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const W = cv.width,
    H = cv.height;
  ctx.clearRect(0, 0, W, H);
  const padL = 54,
    padR = 26,
    padT = 26,
    padB = 52;
  const x0 = padL,
    x1 = W - padR,
    y0 = padT,
    y1 = H - padB;
  const lo = 380,
    hi = 750;
  const X = (nm) => x0 + ((nm - lo) / (hi - lo)) * (x1 - x0);
  const Y = (v) => y1 - v * (y1 - y0);

  // spectrum strip
  for (let px = x0; px <= x1; px++) {
    const nm = lo + ((px - x0) / (x1 - x0)) * (hi - lo);
    const c = wavelengthRGB(nm);
    ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
    ctx.fillRect(px, y1 + 6, 1, 13);
  }
  ctx.strokeStyle = "#31353d";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0, y1);
  ctx.lineTo(x1, y1);
  ctx.stroke();

  ctx.fillStyle = "#6a717c";
  ctx.font = '400 17px "IBM Plex Mono", ui-monospace, monospace';
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let t = 400; t <= 750; t += 50) ctx.fillText(t, X(t), y1 + 24);

  // cone curves
  ["S", "M", "L"].forEach((k) => {
    ctx.strokeStyle = "#c8ccd3";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let nm = lo; nm <= hi; nm++) {
      const v = coneSens(k, nm),
        px = X(nm),
        py = Y(v);
      if (nm === lo) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.fillStyle = "#e9eaee";
    ctx.font = '400 19px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(k, X(CONE_PEAK[k]), Y(1) - 8);
  });

  // marker at selected wavelength
  const mx = X(w);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(mx, y0 - 6);
  ctx.lineTo(mx, y1 + 20);
  ctx.stroke();
  ctx.setLineDash([]);
  ["S", "M", "L"].forEach((k) => {
    const py = Y(coneSens(k, w));
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(mx, py, 5, 0, 7);
    ctx.fill();
    ctx.fillStyle = "#14161a";
    ctx.beginPath();
    ctx.arc(mx, py, 2, 0, 7);
    ctx.fill();
  });
}

function updateWavelength() {
  const w = wavelength.value;
  const rgb = wlRgb.value;
  drawWave(w, rgb);
  drawCones(w);
}

// ── Section 3: Additive mixing ───────────────────────────────────────
const mixCvRef = ref(null);
const sliderR = ref(180);
const sliderG = ref(180);
const sliderB = ref(180);
const mixTarget = ref([0, 0, 0]);

const mixRgbStr = computed(
  () => `rgb(${sliderR.value}, ${sliderG.value}, ${sliderB.value})`
);
const mixHexStr = computed(() =>
  hex(sliderR.value, sliderG.value, sliderB.value)
);
const mixDistance = computed(() => {
  const r = sliderR.value,
    g = sliderG.value,
    b = sliderB.value;
  const t = mixTarget.value;
  return Math.sqrt(
    Math.pow(t[0] - r, 2) + Math.pow(t[1] - g, 2) + Math.pow(t[2] - b, 2)
  );
});
const mixVerdict = computed(() => {
  const d = mixDistance.value;
  if (d < 12) return " — matched";
  if (d < 35) return " — very close";
  if (d < 80) return " — getting there";
  return "";
});

function drawBeams() {
  const cv = mixCvRef.value;
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const r = sliderR.value,
    g = sliderG.value,
    b = sliderB.value;
  const W = cv.width,
    H = cv.height;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "lighter";
  const rad = Math.min(W, H) * 0.3,
    cx = W / 2,
    cy = H / 2,
    off = rad * 0.62;
  const spots = [
    { c: [r, 0, 0], x: cx, y: cy - off },
    { c: [0, g, 0], x: cx - off * 0.87, y: cy + off * 0.5 },
    { c: [0, 0, b], x: cx + off * 0.87, y: cy + off * 0.5 },
  ];
  spots.forEach((s) => {
    const gr = ctx.createRadialGradient(s.x, s.y, rad * 0.55, s.x, s.y, rad);
    gr.addColorStop(0, `rgb(${s.c[0]},${s.c[1]},${s.c[2]})`);
    gr.addColorStop(0.82, `rgb(${s.c[0]},${s.c[1]},${s.c[2]})`);
    gr.addColorStop(1, "rgb(0,0,0)");
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(s.x, s.y, rad, 0, 7);
    ctx.fill();
  });
  ctx.globalCompositeOperation = "source-over";
}

function newTarget() {
  mixTarget.value = [0, 1, 2].map(() => Math.floor(Math.random() * 256));
  drawBeams();
}

// ── Section 4: Deficiency simulation ─────────────────────────────────
const origCvRef = ref(null);
const simCvRef = ref(null);
const activeScene = ref("plate");
const activeMode = ref("protan");
const severity = ref(100);
let srcData = null;
let simPending = false;

const SCENES = [
  { id: "plate", label: "Ishihara plate", plate: true },
  { id: "fruit", label: "Fruit in leaves" },
  { id: "wheel", label: "Hue circle" },
  { id: "spectrum", label: "Spectrum" },
];

const MODES = [
  { id: "protan", label: "Protanopia", cap: "Protanopia — no L cones" },
  { id: "deutan", label: "Deuteranopia", cap: "Deuteranopia — no M cones" },
  { id: "tritan", label: "Tritanopia", cap: "Tritanopia — no S cones" },
  {
    id: "achroma",
    label: "Achromatopsia",
    cap: "Achromatopsia — no functioning cones",
  },
];

const simCaption = computed(
  () => MODES.find((m) => m.id === activeMode.value)?.cap ?? ""
);
const showReshuffle = computed(() => activeScene.value === "plate");

function rnd(a, b) {
  return a + Math.random() * (b - a);
}

function sceneSpectrum(ctx, N) {
  ctx.fillStyle = "#0d0e11";
  ctx.fillRect(0, 0, N, N);
  const m = 34,
    w = N - 2 * m,
    top = 52,
    h = N - top - 64;
  for (let i = 0; i < w; i++) {
    const nm = 380 + (i / w) * 370,
      c = wavelengthRGB(nm);
    ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
    ctx.fillRect(m + i, top, 1, h);
  }
  ctx.fillStyle = "#99a0ab";
  ctx.font = '400 13px "IBM Plex Mono", ui-monospace, monospace';
  ctx.textAlign = "center";
  ctx.fillText("380 nm", m + 30, N - 30);
  ctx.fillText("750 nm", N - m - 30, N - 30);
  ctx.fillText("THE VISIBLE SPECTRUM", N / 2, 32);
}

function sceneWheel(ctx, N) {
  ctx.fillStyle = "#0d0e11";
  ctx.fillRect(0, 0, N, N);
  const cx = N / 2,
    cy = N * 0.44,
    R = N * 0.33;
  for (let a = 0; a < 360; a += 0.5) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(
      cx,
      cy,
      R,
      ((a - 0.6) * Math.PI) / 180,
      ((a + 0.6) * Math.PI) / 180
    );
    ctx.closePath();
    ctx.fillStyle = `hsl(${a},95%,52%)`;
    ctx.fill();
  }
  ctx.fillStyle = "#0d0e11";
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.42, 0, 7);
  ctx.fill();
  const names = [0, 40, 60, 120, 180, 210, 275, 320];
  const sw = (N - 60) / names.length;
  names.forEach((h, i) => {
    ctx.fillStyle = `hsl(${h},95%,52%)`;
    ctx.fillRect(30 + i * sw + 2, N - 96, sw - 4, 54);
  });
  ctx.fillStyle = "#99a0ab";
  ctx.font = '400 13px "IBM Plex Mono", ui-monospace, monospace';
  ctx.textAlign = "center";
  ctx.fillText("WHICH HUES STAY DISTINCT?", N / 2, N - 22);
}

function sceneFruit(ctx, N) {
  ctx.fillStyle = "#1b2a12";
  ctx.fillRect(0, 0, N, N);
  for (let i = 0; i < 340; i++) {
    const x = rnd(-20, N + 20),
      y = rnd(-20, N + 20),
      rx = rnd(24, 64),
      ry = rnd(10, 26),
      rot = rnd(0, Math.PI);
    const g = rnd(70, 140),
      r = rnd(28, 74),
      b = rnd(20, 52);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, 7);
    ctx.fill();
    ctx.restore();
  }
  for (let i = 0; i < 26; i++) {
    const fx = rnd(40, N - 40),
      fy = rnd(40, N - 40),
      fr = rnd(11, 19);
    const fr_r = rnd(178, 232),
      fg = rnd(28, 86),
      fb = rnd(24, 54);
    ctx.fillStyle = `rgb(${fr_r | 0},${fg | 0},${fb | 0})`;
    ctx.beginPath();
    ctx.arc(fx, fy, fr, 0, 7);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.beginPath();
    ctx.arc(fx - fr * 0.3, fy - fr * 0.34, fr * 0.28, 0, 7);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, N - 38, N, 38);
  ctx.fillStyle = "#c8ccd3";
  ctx.font = '400 13px "IBM Plex Mono", ui-monospace, monospace';
  ctx.textAlign = "center";
  ctx.fillText("COUNT THE RIPE FRUIT", N / 2, N - 14);
}

function scenePlate(ctx, N) {
  const digits = "2468357";
  const d = digits[Math.floor(Math.random() * digits.length)];
  const mask = document.createElement("canvas");
  mask.width = mask.height = N;
  const mc = mask.getContext("2d", { willReadFrequently: true });
  mc.fillStyle = "#000";
  mc.fillRect(0, 0, N, N);
  mc.fillStyle = "#fff";
  mc.font =
    "700 " +
    Math.round(N * 0.64) +
    "px ui-sans-serif, Helvetica, Arial, sans-serif";
  mc.textAlign = "center";
  mc.textBaseline = "middle";
  mc.fillText(d, N / 2, N / 2 + N * 0.02);
  const md = mc.getImageData(0, 0, N, N).data;
  ctx.fillStyle = "#0d0e11";
  ctx.fillRect(0, 0, N, N);

  const R = N / 2 - 6,
    RMAX = 17,
    cell = Math.ceil(RMAX * 2) + 2,
    grid = {},
    dots = [];
  const PASSES = [
    1, 0.84, 0.7, 0.59, 0.49, 0.41, 0.34, 0.29, 0.24, 0.2, 0.17, 0.14,
  ];
  PASSES.forEach((f) => {
    const rlo = RMAX * f * 0.78,
      rhi = RMAX * f;
    for (let t = 0; t < 10000; t++) {
      const r = rlo + Math.random() * (rhi - rlo);
      const ang = Math.random() * Math.PI * 2,
        rad = Math.sqrt(Math.random()) * (R - r);
      const x = N / 2 + Math.cos(ang) * rad,
        y = N / 2 + Math.sin(ang) * rad;
      let ok = true;
      const gx = (x / cell) | 0,
        gy = (y / cell) | 0;
      for (let a = -2; a <= 2 && ok; a++) {
        for (let b = -2; b <= 2 && ok; b++) {
          const bucket = grid[gx + a + ":" + (gy + b)];
          if (!bucket) continue;
          for (let i = 0; i < bucket.length; i++) {
            const o = bucket[i],
              dx = o.x - x,
              dy = o.y - y,
              mm = o.r + r + 0.45;
            if (dx * dx + dy * dy < mm * mm) {
              ok = false;
              break;
            }
          }
        }
      }
      if (!ok) continue;
      const idx = ((y | 0) * N + (x | 0)) * 4;
      const kk = gx + ":" + gy;
      grid[kk] = grid[kk] || [];
      grid[kk].push({ x, y, r });
      dots.push({ x, y, r, fig: md[idx] > 128 });
    }
  });

  dots.forEach((o) => {
    const tY = rnd(0.11, 0.3);
    const h = o.fig ? rnd(30, 46) : rnd(98, 116);
    const s = o.fig ? rnd(0.4, 0.55) : rnd(0.34, 0.48);
    ctx.fillStyle = swatchAtY(h, s, tY);
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r, 0, 7);
    ctx.fill();
  });
}

const scenePainters = {
  plate: scenePlate,
  fruit: sceneFruit,
  wheel: sceneWheel,
  spectrum: sceneSpectrum,
};

function redrawScene() {
  const cv = origCvRef.value;
  if (!cv) return;
  const N = cv.width;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  scenePainters[activeScene.value](ctx, N);
  srcData = ctx.getImageData(0, 0, N, N);
  applySim();
}

function applySim() {
  if (!srcData || simPending) return;
  simPending = true;
  requestAnimationFrame(() => {
    simPending = false;
    const cv = simCvRef.value;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const N = cv.width;
    const out = simulate(srcData, N, N, activeMode.value, severity.value / 100);
    ctx.putImageData(out, 0, 0);
  });
}

function setScene(id) {
  activeScene.value = id;
  redrawScene();
}

function setMode(id) {
  activeMode.value = id;
  applySim();
}

// ── Lifecycle ────────────────────────────────────────────────────────
onMounted(() => {
  updateWavelength();
  newTarget();
  redrawScene();
});

watch(wavelength, updateWavelength);
watch([sliderR, sliderG, sliderB], drawBeams);
watch(severity, applySim);
</script>

<template>
  <div class="cv-root">
    <!-- Masthead -->
    <header class="cv-mast">
      <p class="cv-kicker">Chapter — The Retina</p>
      <h1 class="cv-title">Color vision starts in the retina</h1>
      <p class="cv-standfirst">
        Light carries wavelength. Color is what a nervous system with three
        pigment classes makes of it. Work down this page and the gap between
        those two statements should become concrete.
      </p>
    </header>

    <!-- ============ 1 · EM SPECTRUM ============ -->
    <section class="cv-sec">
      <div class="cv-sechead">
        <span class="cv-num">01</span>
        <h2 class="cv-h2">The sliver we can see</h2>
      </div>
      <p class="cv-lede">
        Visible light occupies roughly one part in 10<sup>15</sup> of the
        electromagnetic spectrum — a band narrower than the width of the line
        drawn under it here.
      </p>

      <div class="cv-panel">
        <svg
          class="cv-em"
          viewBox="0 0 1200 474"
          role="img"
          aria-label="The electromagnetic spectrum from radio to gamma rays, with the narrow visible band highlighted."
        >
          <defs>
            <linearGradient id="visgrad" x1="0" x2="1">
              <stop offset="0" stop-color="#6a00b0" />
              <stop offset="0.16" stop-color="#2000ff" />
              <stop offset="0.34" stop-color="#00b0ff" />
              <stop offset="0.5" stop-color="#00ff40" />
              <stop offset="0.68" stop-color="#e8ff00" />
              <stop offset="0.84" stop-color="#ff9000" />
              <stop offset="1" stop-color="#ff0000" />
            </linearGradient>
            <linearGradient id="barfade" x1="0" x2="1">
              <stop offset="0" stop-color="#0d0e11" />
              <stop offset="0.42" stop-color="#1d1f24" />
              <stop offset="0.58" stop-color="#1d1f24" />
              <stop offset="1" stop-color="#0d0e11" />
            </linearGradient>
          </defs>

          <!-- compressing sine wave -->
          <path
            :d="emWavePath"
            fill="none"
            stroke="#e9eaee"
            stroke-width="2.6"
            stroke-linejoin="round"
          />

          <!-- row labels -->
          <text class="em-ax" x="200" y="168" text-anchor="end">Radiation</text>
          <text class="em-ax" x="200" y="198" text-anchor="end">
            Wavelength (m)
          </text>
          <text class="em-ax" x="200" y="254" text-anchor="end">
            Size scale
          </text>
          <text class="em-ax" x="200" y="337" text-anchor="end">
            Frequency (Hz)
          </text>

          <!-- band columns -->
          <template v-for="(band, i) in emBands" :key="band.n">
            <text
              :x="EM_L + EM_STEP * (i + 0.5)"
              y="168"
              text-anchor="middle"
              :class="['em-hd', band.n === 'Visible' ? 'em-vis' : '']"
            >
              {{ band.n }}
            </text>
            <text
              :x="EM_L + EM_STEP * (i + 0.5)"
              y="198"
              text-anchor="middle"
              class="em-sm"
            >
              {{ band.wl }}
            </text>
            <text
              :x="EM_L + EM_STEP * (i + 0.5)"
              y="254"
              text-anchor="middle"
              class="em-sz"
            >
              {{ band.sz }}
            </text>
            <line
              v-if="i > 0"
              :x1="EM_L + EM_STEP * i"
              :x2="EM_L + EM_STEP * i"
              y1="144"
              y2="272"
              stroke="#31353d"
            />
          </template>

          <!-- frequency bar -->
          <rect
            x="218"
            y="306"
            width="962"
            height="50"
            fill="url(#barfade)"
            stroke="#31353d"
          />
          <rect
            :x="visBandX"
            y="306"
            :width="visBandW"
            height="50"
            fill="url(#visgrad)"
            stroke="#e9eaee"
            stroke-width="1.2"
          />

          <!-- zoom wedge -->
          <path
            :d="emWedgePath"
            fill="#212429"
            stroke="#31353d"
            stroke-width="1"
          />

          <!-- frequency ticks -->
          <template v-for="(freq, i) in emFreqs" :key="freq">
            <text
              :x="EM_L + EM_STEP * (i + 0.5)"
              y="392"
              text-anchor="middle"
              class="em-sm"
            >
              {{ freq }}
            </text>
            <line
              :x1="EM_L + EM_STEP * (i + 0.5)"
              :x2="EM_L + EM_STEP * (i + 0.5)"
              y1="356"
              y2="366"
              stroke="#6a717c"
            />
          </template>

          <text class="em-hd em-vis" x="618" y="462" text-anchor="middle">
            380 – 750 nm
          </text>
        </svg>
      </div>
    </section>

    <!-- ============ 2 · WAVELENGTH ============ -->
    <section class="cv-sec">
      <div class="cv-sechead">
        <span class="cv-num">02</span>
        <h2 class="cv-h2">One wavelength, three numbers</h2>
      </div>
      <p class="cv-lede">
        Drag through the visible band. The wave is drawn to scale in nanometres,
        so you can see the period physically shorten. Watch the three bars at
        the right: whatever the wavelength, the retina reports only how strongly
        each cone class was excited.
      </p>

      <div class="cv-panel">
        <div class="cv-ctl">
          <div class="cv-lab">
            <span>Wavelength</span>
            <span class="cv-val">{{ wavelength }} nm</span>
          </div>
          <input
            v-model.number="wavelength"
            type="range"
            class="cv-spectrum"
            min="380"
            max="750"
            step="1"
            aria-label="Wavelength in nanometres"
          />
        </div>

        <div class="cv-wl">
          <div>
            <canvas
              ref="waveCvRef"
              width="1400"
              height="300"
              class="cv-well"
              style="width: 100%; height: auto"
              aria-label="Sine wave at the selected wavelength"
            />
            <canvas
              ref="coneCvRef"
              width="1400"
              height="360"
              class="cv-well"
              style="width: 100%; height: auto; margin-top: 12px"
              aria-label="Cone sensitivity curves with a marker at the selected wavelength"
            />
          </div>

          <div>
            <div
              class="cv-swatch"
              :style="{
                background: `rgb(${wlRgb[0]},${wlRgb[1]},${wlRgb[2]})`,
              }"
            >
              <span>{{ wlHex }}</span>
            </div>
            <dl class="cv-readout" style="margin: 12px 0 16px">
              <div class="cv-cell">
                <dt>Frequency</dt>
                <dd>{{ wlFreq }} <small>THz</small></dd>
              </div>
              <div class="cv-cell">
                <dt>Photon energy</dt>
                <dd>{{ wlEv }} <small>eV</small></dd>
              </div>
            </dl>

            <div class="cv-lab" style="margin-bottom: 10px">
              <span>Cone excitation</span>
              <span class="cv-val">{{ coneRatio }}</span>
            </div>
            <div class="cv-cones">
              <div class="cv-cone">
                <i>L</i>
                <div class="cv-bar">
                  <div :style="{ width: (coneL * 100).toFixed(1) + '%' }" />
                </div>
                <b>{{ coneL.toFixed(2) }}</b>
              </div>
              <div class="cv-cone">
                <i>M</i>
                <div class="cv-bar">
                  <div :style="{ width: (coneM * 100).toFixed(1) + '%' }" />
                </div>
                <b>{{ coneM.toFixed(2) }}</b>
              </div>
              <div class="cv-cone">
                <i>S</i>
                <div class="cv-bar">
                  <div :style="{ width: (coneS * 100).toFixed(1) + '%' }" />
                </div>
                <b>{{ coneS.toFixed(2) }}</b>
              </div>
            </div>
            <p class="cv-note" style="margin-top: 14px">
              Whatever reaches the retina — a single wavelength or a whole
              broadband spectrum — leaves it as just these three numbers. Every
              color you have ever seen was reconstructed from a triplet like
              this one.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 3 · MIXING ============ -->
    <section class="cv-sec">
      <div class="cv-sechead">
        <span class="cv-num">03</span>
        <h2 class="cv-h2">Three lights are enough</h2>
      </div>
      <p class="cv-lede">
        Three overlapping projector beams. Because the eye only ever reports an
        L/M/S triplet, three independent primaries are sufficient to cover the
        spectrum of color a trichromat can experience — which is why screens
        have exactly three kinds of subpixel, and why the number three is a fact
        about your retina rather than about light.
      </p>

      <div class="cv-panel">
        <div class="cv-mix">
          <div>
            <canvas
              ref="mixCvRef"
              width="900"
              height="640"
              class="cv-well"
              style="width: 100%; height: auto"
              aria-label="Three overlapping red, green and blue light beams"
            />
          </div>
          <div>
            <div
              class="cv-mixout"
              :style="{ background: `rgb(${sliderR},${sliderG},${sliderB})` }"
            >
              <span>{{ mixRgbStr }} {{ mixHexStr }}</span>
            </div>

            <div class="cv-ctl">
              <div class="cv-lab">
                <span>Long / red beam</span>
                <span class="cv-val">{{ sliderR }}</span>
              </div>
              <input
                v-model.number="sliderR"
                type="range"
                min="0"
                max="255"
                aria-label="Red beam intensity"
              />
            </div>
            <div class="cv-ctl">
              <div class="cv-lab">
                <span>Medium / green beam</span>
                <span class="cv-val">{{ sliderG }}</span>
              </div>
              <input
                v-model.number="sliderG"
                type="range"
                min="0"
                max="255"
                aria-label="Green beam intensity"
              />
            </div>
            <div class="cv-ctl">
              <div class="cv-lab">
                <span>Short / blue beam</span>
                <span class="cv-val">{{ sliderB }}</span>
              </div>
              <input
                v-model.number="sliderB"
                type="range"
                min="0"
                max="255"
                aria-label="Blue beam intensity"
              />
            </div>

            <div class="cv-lab" style="margin-top: 20px">
              <span>Matching task</span>
            </div>
            <div class="cv-match">
              <div
                class="cv-chip"
                :style="{
                  background: `rgb(${mixTarget[0]},${mixTarget[1]},${mixTarget[2]})`,
                }"
              >
                <em>Target</em>
              </div>
              <div
                class="cv-chip"
                :style="{
                  background: `rgb(${sliderR},${sliderG},${sliderB})`,
                }"
              >
                <em>Yours</em>
              </div>
            </div>
            <p class="cv-score">
              Distance to target: {{ mixDistance.toFixed(1) }}{{ mixVerdict }}
            </p>
            <div class="cv-btnrow" style="margin-top: 10px">
              <button class="cv-btn" @click="newTarget">New target</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 4 · DEFICIENCY ============ -->
    <section class="cv-sec">
      <div class="cv-sechead">
        <span class="cv-num">04</span>
        <h2 class="cv-h2">Losing a channel</h2>
      </div>
      <p class="cv-lede">
        Remove one cone class and the three-dimensional color space collapses to
        a plane. Wavelengths a trichromat tells apart now fall on only two types
        of cones, and some wavelengths become perceptually indistinguishable.
      </p>

      <div class="cv-panel">
        <div class="cv-toolbar">
          <div class="cv-toolgrp">
            <div class="cv-lab"><span>Scene</span></div>
            <div class="cv-btnrow">
              <button
                v-for="s in SCENES"
                :key="s.id"
                class="cv-btn"
                :aria-pressed="activeScene === s.id"
                :class="{ on: activeScene === s.id }"
                @click="setScene(s.id)"
              >
                {{ s.label }}
              </button>
            </div>
          </div>
          <div class="cv-toolgrp">
            <div class="cv-lab"><span>Condition</span></div>
            <div class="cv-btnrow">
              <button
                v-for="m in MODES"
                :key="m.id"
                class="cv-btn"
                :aria-pressed="activeMode === m.id"
                :class="{ on: activeMode === m.id }"
                @click="setMode(m.id)"
              >
                {{ m.label }}
              </button>
            </div>
          </div>
          <div class="cv-toolgrp" style="flex: 1 1 220px">
            <div class="cv-lab">
              <span>Severity</span>
              <span class="cv-val">{{ severity }}%</span>
            </div>
            <input
              v-model.number="severity"
              type="range"
              min="0"
              max="100"
              aria-label="Severity of the simulated deficiency"
            />
          </div>
        </div>

        <div class="cv-cmp">
          <figure class="cv-fig" style="margin: 0">
            <canvas ref="origCvRef" width="560" height="560" />
            <figcaption>Normal trichromat</figcaption>
          </figure>
          <figure class="cv-fig" style="margin: 0">
            <canvas ref="simCvRef" width="560" height="560" />
            <figcaption>{{ simCaption }}</figcaption>
          </figure>
        </div>

        <div class="cv-btnrow" style="margin-top: 14px">
          <button v-show="showReshuffle" class="cv-btn" @click="redrawScene">
            New plate
          </button>
        </div>
      </div>
    </section>

    <!-- Notes -->
    <section class="cv-sec">
      <div class="cv-sechead">
        <h2 class="cv-h2">Notes</h2>
      </div>
      <p class="cv-note">
        <b>Section 02.</b> Cone curves are the Stockman &amp; Sharpe 2°
        fundamentals in linear energy units, each normalised to unit peak and
        tabulated every 2 nm. Peaks fall at 570, 543 and 442 nm for L, M and S.
      </p>
      <p class="cv-note">
        <b>Section 04.</b> This is a pedagogical example only. Do not use it as
        a replacement for a proper clinical test.
      </p>
    </section>

    <footer class="cv-foot">
      <p>
        This color vision explorer was adapted for The Open Brain from a
        teaching notebook designed by Erica Cianfarano.
      </p>
      <p>
        Cone fundamentals: Stockman &amp; Sharpe (2000), <i>Vision Research</i>
        40, 1711–1737, via the CVRL database. Dichromacy simulated after Viénot,
        Brettel &amp; Mollon (1999). Wavelength-to-RGB after Bruton's
        approximation.
      </p>
    </footer>
  </div>
</template>

<style scoped>
.cv-root {
  --cv-faint: #6a717c;

  background: rgb(var(--color-bg));
  color: rgb(var(--color-ink));
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  padding: clamp(20px, 4vw, 52px) clamp(16px, 4vw, 44px) 40px;
  max-width: 1180px;
  margin: 0 auto;
  container-type: inline-size;
}
.cv-root :focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
  border-radius: 2px;
}

/* ---------- masthead ---------- */
.cv-mast {
  border-bottom: 1px solid rgb(var(--color-line));
  padding-bottom: 22px;
  margin-bottom: 8px;
}
.cv-kicker {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--cv-faint);
  margin: 0 0 10px;
}
.cv-title {
  font-size: clamp(30px, 5.2vw, 50px);
  line-height: 1.04;
  letter-spacing: -0.025em;
  font-weight: 640;
  margin: 0 0 12px;
}
.cv-standfirst {
  color: rgb(var(--color-mute));
  margin: 0;
  font-size: clamp(15px, 1.7vw, 18px);
}

/* ---------- section shell ---------- */
.cv-sec {
  border-top: 1px solid rgb(var(--color-line));
  padding-top: 26px;
  margin-top: var(--cv-gap, clamp(18px, 3vw, 34px));
}
.cv-sec:first-of-type {
  border-top: none;
}
.cv-sechead {
  display: flex;
  gap: 14px;
  align-items: baseline;
  margin-bottom: 6px;
  flex-wrap: wrap;
}
.cv-num {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  color: var(--cv-faint);
  border: 1px solid rgb(var(--color-line));
  border-radius: 2px;
  padding: 3px 7px;
  flex: none;
}
.cv-h2 {
  font-size: clamp(20px, 2.6vw, 26px);
  letter-spacing: -0.015em;
  font-weight: 620;
  margin: 0;
}
.cv-lede {
  color: rgb(var(--color-mute));
  margin: 0 0 20px;
  font-size: 16px;
}
.cv-note {
  color: var(--cv-faint);
  font-size: 14px;
  margin: 14px 0 0;
  line-height: 1.6;
}
.cv-note b {
  color: rgb(var(--color-mute));
  font-weight: 600;
}

/* ---------- panels ---------- */
.cv-panel {
  background: rgb(var(--color-paper));
  border: 1px solid rgb(var(--color-line));
  border-radius: 5px;
  padding: clamp(14px, 2.2vw, 22px);
}
.cv-well {
  background: rgb(var(--color-bg));
  border: 1px solid rgb(var(--color-line));
  border-radius: 4px;
}

/* ---------- controls ---------- */
.cv-ctl {
  margin: 0 0 14px;
}
.cv-ctl:last-child {
  margin-bottom: 0;
}
.cv-lab {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--color-mute));
  margin-bottom: 7px;
}
.cv-val {
  color: rgb(var(--color-ink));
  letter-spacing: 0.04em;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  background: transparent;
  margin: 0;
  height: 22px;
  cursor: pointer;
  display: block;
}
input[type="range"]::-webkit-slider-runnable-track {
  height: 6px;
  border-radius: 3px;
  background: rgb(var(--color-line));
}
input[type="range"]::-moz-range-track {
  height: 6px;
  border-radius: 3px;
  background: rgb(var(--color-line));
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: #f2f3f5;
  border: 2px solid rgb(var(--color-bg));
  margin-top: -5.5px;
  box-shadow: 0 0 0 1px rgb(var(--color-line));
}
input[type="range"]::-moz-range-thumb {
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: #f2f3f5;
  border: 2px solid rgb(var(--color-bg));
  box-shadow: 0 0 0 1px rgb(var(--color-line));
}
input[type="range"].cv-spectrum::-webkit-slider-runnable-track {
  height: 22px;
  border-radius: 3px;
  border: 1px solid rgb(var(--color-line));
  background: linear-gradient(
    90deg,
    #4a00a0,
    #3000ff,
    #0080ff,
    #00ffd0,
    #00ff2a,
    #b6ff00,
    #ffe000,
    #ff8000,
    #ff0000,
    #7a0000
  );
}
input[type="range"].cv-spectrum::-moz-range-track {
  height: 22px;
  border-radius: 3px;
  border: 1px solid rgb(var(--color-line));
  background: linear-gradient(
    90deg,
    #4a00a0,
    #3000ff,
    #0080ff,
    #00ffd0,
    #00ff2a,
    #b6ff00,
    #ffe000,
    #ff8000,
    #ff0000,
    #7a0000
  );
}
input[type="range"].cv-spectrum::-webkit-slider-thumb {
  width: 8px;
  height: 34px;
  border-radius: 2px;
  background: #fff;
  border: 1.5px solid #111;
  margin-top: -7px;
}
input[type="range"].cv-spectrum::-moz-range-thumb {
  width: 8px;
  height: 34px;
  border-radius: 2px;
  background: #fff;
  border: 1.5px solid #111;
}

.cv-btn {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background: rgb(var(--color-paper));
  color: rgb(var(--color-mute));
  border: 1px solid rgb(var(--color-line));
  border-radius: 3px;
  padding: 8px 13px;
  cursor: pointer;
  transition: 0.13s;
}
.cv-btn:hover {
  border-color: rgb(var(--color-ink) / 0.3);
  color: rgb(var(--color-ink));
}
.cv-btn[aria-pressed="true"],
.cv-btn.on {
  background: #eceef1;
  color: #14161a;
  border-color: #eceef1;
}
.cv-btnrow {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

canvas {
  display: block;
  max-width: 100%;
}

/* ---------- 1 · EM spectrum ---------- */
.cv-em {
  width: 100%;
  height: auto;
  display: block;
}
.cv-em text {
  font-family: var(--font-body);
  fill: rgb(var(--color-mute));
}
.cv-em .em-hd {
  font-size: 20px;
  fill: rgb(var(--color-ink));
  font-weight: 600;
  letter-spacing: 0.01em;
}
.cv-em .em-sm {
  font-size: 18px;
  font-family: var(--font-mono);
}
.cv-em .em-sz {
  font-size: 18px;
}
.cv-em .em-ax {
  font-size: 18px;
  fill: var(--cv-faint);
}
.cv-em .em-vis {
  fill: rgb(var(--color-ink));
  font-weight: 600;
}

/* ---------- 2 · wavelength ---------- */
.cv-wl {
  display: grid;
  grid-template-columns: 1fr 260px;
  gap: 18px;
}
.cv-swatch {
  border: 1px solid rgb(var(--color-line));
  border-radius: 4px;
  height: 96px;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 9px;
}
.cv-swatch span {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.1em;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  padding: 3px 6px;
  border-radius: 2px;
}
.cv-readout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: rgb(var(--color-line));
  border: 1px solid rgb(var(--color-line));
  border-radius: 4px;
  overflow: hidden;
}
.cv-cell {
  background: rgb(var(--color-paper));
  padding: 10px 12px;
}
.cv-cell dt {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--cv-faint);
  margin: 0 0 3px;
}
.cv-cell dd {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 16px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
.cv-cell dd small {
  font-size: 11px;
  color: rgb(var(--color-mute));
  letter-spacing: 0.06em;
}

.cv-cones {
  display: grid;
  gap: 9px;
  margin-top: 2px;
}
.cv-cone {
  display: grid;
  grid-template-columns: 26px 1fr 48px;
  align-items: center;
  gap: 10px;
}
.cv-cone i {
  font-family: var(--font-mono);
  font-style: normal;
  font-size: 12px;
  color: rgb(var(--color-mute));
  letter-spacing: 0.08em;
}
.cv-cone b {
  font-family: var(--font-mono);
  font-size: 11.5px;
  font-weight: 400;
  color: rgb(var(--color-mute));
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.cv-bar {
  height: 9px;
  background: rgb(var(--color-bg));
  border: 1px solid rgb(var(--color-line));
  border-radius: 2px;
  overflow: hidden;
}
.cv-bar div {
  height: 100%;
  background: #e9eaee;
  width: 0;
  transition: width 0.05s linear;
}
@media (prefers-reduced-motion: reduce) {
  .cv-bar div {
    transition: none;
  }
}

/* ---------- 3 · mixing ---------- */
.cv-mix {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 18px;
  align-items: start;
}
.cv-mixout {
  border: 1px solid rgb(var(--color-line));
  border-radius: 4px;
  height: 120px;
  margin-bottom: 14px;
  display: flex;
  align-items: flex-end;
  padding: 10px;
}
.cv-mixout span {
  font-family: var(--font-mono);
  font-size: 11px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  padding: 4px 7px;
  border-radius: 2px;
  letter-spacing: 0.06em;
}
.cv-match {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
  margin-top: 6px;
}
.cv-chip {
  border: 1px solid rgb(var(--color-line));
  border-radius: 4px;
  height: 62px;
  position: relative;
}
.cv-chip em {
  position: absolute;
  left: 6px;
  bottom: 5px;
  font-style: normal;
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 2px 5px;
  border-radius: 2px;
}
.cv-score {
  font-family: var(--font-mono);
  font-size: 12px;
  color: rgb(var(--color-mute));
  margin: 10px 0 0;
  font-variant-numeric: tabular-nums;
}

/* ---------- 4 · deficiency ---------- */
.cv-cmp {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.cv-fig figcaption {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--cv-faint);
  margin-top: 8px;
}
.cv-fig canvas {
  width: 100%;
  height: auto;
  border: 1px solid rgb(var(--color-line));
  border-radius: 4px;
  background: rgb(var(--color-bg));
}
.cv-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  align-items: flex-end;
  margin-bottom: 16px;
}
.cv-toolgrp {
  flex: 1 1 240px;
  min-width: 200px;
}
.cv-toolgrp > .cv-lab {
  margin-bottom: 8px;
}

/* ---------- footer ---------- */
.cv-foot {
  border-top: 1px solid rgb(var(--color-line));
  margin-top: var(--cv-gap, clamp(18px, 3vw, 34px));
  padding-top: 18px;
  color: var(--cv-faint);
  font-size: 12.5px;
}
.cv-foot p {
  margin: 0 0 6px;
}

/* ---------- responsive ---------- */
@container (max-width: 820px) {
  .cv-wl,
  .cv-mix {
    grid-template-columns: 1fr;
  }
  .cv-cmp {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 820px) {
  .cv-wl,
  .cv-mix {
    grid-template-columns: 1fr;
  }
  .cv-cmp {
    grid-template-columns: 1fr;
  }
}
</style>
