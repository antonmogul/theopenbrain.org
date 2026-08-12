<script setup>
/*
 * V1CameraView — "What V1 sees" widget.
 *
 * Ported from Stuart Trenholm's v1-camera-widget.html.
 * Real-time WebGL2 Gabor filter bank simulating V1 complex-cell
 * orientation energy. Supports camera, demo stimulus, and image input.
 *
 * OPENBRAIN-14: fourth Stuart widget port.
 *
 * Design ownership: Sonia owns design. This is a token-swap only — the
 * widget's interaction and pedagogy are unchanged from the original.
 *
 * Design rule (Stuart's, preserved verbatim): "the interface is
 * achromatic. Every saturated colour is a stimulus, never chrome."
 * Saturated colours are scientific data and are NOT token-swapped.
 *
 * Colour mapping from original → brand.css tokens:
 *   --linen:#E6E4DE     → rgb(var(--color-bg))
 *   --linen-2:#DEDBD3   → rgb(var(--color-paper))
 *   --well:#1B1E24      → kept as local --v1-well (dark viewport)
 *   --ink:#1B1E24       → rgb(var(--color-ink))
 *   --ink-2:#5B616B     → rgb(var(--color-mute))
 *   --hair:#C6C2B8      → rgb(var(--color-line))
 *   --blue:#0072B2      → rgb(var(--color-accent))
 *
 * Canvas colours (WebGL output, viridis/HSV maps) are scientific
 * visualisation and are NOT token-swapped.
 */
import {
  ref,
  reactive,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";
import {
  NORI,
  defaultParams,
  FS_GRAY,
  FS_P1,
  FS_P2,
  FS_SHOW,
  FS_POP,
  linkProgram,
  makeTex,
  makeTarget,
  geom,
  measureTuningCPU,
  drawKernel,
  drawTuningCurve,
  drawWheel,
  drawDemo,
  baseRes,
} from "@/helper/v1Camera";

// ── Refs ─────────────────────────────────────────────────────────────────
const glcvRef = ref(null);
const overlayRef = ref(null);
const wellRef = ref(null);
const kcvRef = ref(null);
const tcvRef = ref(null);
const wcvRef = ref(null);
const demoCvRef = ref(null);
const anaCvRef = ref(null);
const vidRef = ref(null);
const fileImgRef = ref(null);
const panelsRef = ref(null);
const railSlotRef = ref(null);
const hudRef = ref(null);

// ── Reactive state ───────────────────────────────────────────────────────
const P = reactive(defaultParams());
const srcMode = ref("cam"); // 'cam' | 'demo' | 'img'
const showPanels = ref(true);
const showAbout = ref(false);
const showCurtain = ref(true);
const curtainMsg = ref("");
const canFlip = ref(false);
const hudMode = ref(false);
const tuningInfo = ref(null); // { osi, peakOri } from drawTuningCurve

// ── Computed labels ──────────────────────────────────────────────────────
const oriLabel = computed(() => Math.round(P.ori) + "°");
const sfLabel = computed(() => P.sf + " cyc/width");
const lenLabel = computed(() => P.len.toFixed(2) + " cyc");
const gainLabel = computed(() => P.gain.toFixed(1) + "×");
const blendLabel = computed(() => P.blend + "%");

// ── Internal (non-reactive, managed imperatively) ────────────────────────
let gl = null;
let PG = {};
let quad = null;
let HAS_FLOAT = false;
let ENC = 1.0;
let IFMT = 0;
let ITYPE = 0;

let texSrc = null;
let TGray = null;
let TA = null;
let TB = null;
let TAccA = null;
let TAccB = null;
let procW = 0;
let procH = 0;

let source = null;
let srcReady = false;
let mirror = false;
let stream = null;
let facing = "user";

let rfx = 0.5;
let rfy = 0.5;
let dragging = false;

let gratingImg = null;
let tuningData = null;

let lastT = 0;
let tStart = 0;
let fpsAcc = 0;
let fpsN = 0;
let lastAna = 0;
let targetW = 464;
let trims = 0;
let srcAspect = 4 / 3;
let rafId = null;

const COARSE =
  typeof window !== "undefined" &&
  window.matchMedia("(pointer:coarse)").matches;

// ── Tuning-curve theme (Canvas 2D — hardcoded, not token-swapped) ────────
const TUNING_THEME = {
  bg: "#12151A",
  grid: "#3A414C",
  text: "#7C838E",
  curve: "#4FC3E8",
  marker: "#E69F00",
};

// ── Panel readout computed ───────────────────────────────────────────────
const panelOri = computed(() =>
  P.mode === "single" ? Math.round(P.ori) + "°" : "8 channels"
);
const panelSf = computed(() => P.sf + " cyc/width");
const panelPer = computed(
  () => (procW ? (procW / P.sf).toFixed(1) : "–") + " px"
);
const panelAspect = computed(() => {
  const G = geom(P, procW || 464, procH || 348, COARSE);
  return (G.sv / G.su).toFixed(2) + " : 1";
});
const panelHwhm = computed(
  () =>
    (Math.atan(1.177 / (2 * Math.PI * P.len)) * (180 / Math.PI)).toFixed(1) +
    "°"
);
const panelOsi = computed(() => {
  if (!tuningInfo.value) return "–";
  return (
    tuningInfo.value.osi.toFixed(2) + " @ " + tuningInfo.value.peakOri + "°"
  );
});

// ── WebGL setup ──────────────────────────────────────────────────────────
function initWebGL() {
  const canvas = glcvRef.value;
  if (!canvas) return;
  gl = canvas.getContext("webgl2", {
    antialias: false,
    preserveDrawingBuffer: true,
    alpha: false,
  });
  if (!gl) {
    curtainMsg.value =
      "This browser has no WebGL2. Try a recent Chrome, Edge, Firefox or Safari.";
    return;
  }
  HAS_FLOAT = !!gl.getExtension("EXT_color_buffer_float");
  ENC = HAS_FLOAT ? 1.0 : 2.6;
  IFMT = HAS_FLOAT ? 0x881a : 0x8058;
  ITYPE = HAS_FLOAT ? 0x140b : gl.UNSIGNED_BYTE;

  PG.gray = linkProgram(gl, FS_GRAY);
  PG.p1 = linkProgram(gl, FS_P1);
  PG.p2 = linkProgram(gl, FS_P2);
  PG.show = linkProgram(gl, FS_SHOW);
  PG.pop = linkProgram(gl, FS_POP);

  quad = gl.createVertexArray();
  gl.bindVertexArray(quad);
  const b = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
}

function allocProc(w, h) {
  procW = w;
  procH = h;
  [TGray, TA, TB, TAccA, TAccB].forEach((t) => {
    if (t) {
      gl.deleteTexture(t.tex);
      gl.deleteFramebuffer(t.fbo);
    }
  });
  TGray = makeTarget(gl, procW, procH, gl.RGBA8, gl.UNSIGNED_BYTE, true);
  TA = makeTarget(gl, procW, procH, IFMT, ITYPE, false);
  TB = makeTarget(gl, procW, procH, IFMT, ITYPE, false);
  TAccA = makeTarget(gl, procW, procH, IFMT, ITYPE, false);
  TAccB = makeTarget(gl, procW, procH, IFMT, ITYPE, false);
  glcvRef.value.width = procW;
  glcvRef.value.height = procH;
  overlayRef.value.width = procW;
  overlayRef.value.height = procH;
  anaCvRef.value.width = procW;
  anaCvRef.value.height = procH;
}

function sizeFromSource(el) {
  const w = el.videoWidth || el.naturalWidth || el.width || 640;
  const h = el.videoHeight || el.naturalHeight || el.height || 480;
  return w / h;
}

function applySize() {
  let w = targetW;
  let h = Math.round(targetW / srcAspect);
  const CAP = Math.round(targetW * 1.5);
  if (h > CAP) {
    h = CAP;
    w = Math.round(h * srcAspect);
  }
  allocProc(Math.max(64, w), Math.max(64, h));
}

function setSource(kind, el) {
  source = { kind, el };
  srcReady = true;
  showCurtain.value = false;
  mirror = kind === "video" && facing === "user";
  srcAspect = sizeFromSource(el);
  applySize();
  refreshPanels();
}

// ── Camera ───────────────────────────────────────────────────────────────
async function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    curtainMsg.value =
      "This browser will not share a camera here. Camera access needs an HTTPS page — try the demo stimulus.";
    showCurtain.value = true;
    return;
  }
  try {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: facing,
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });
    const vid = vidRef.value;
    vid.srcObject = stream;
    vid.muted = true;
    try {
      await vid.play();
    } catch {
      /* autoplay blocked */
    }
    if (!vid.videoWidth) {
      await new Promise((r) => {
        vid.onloadedmetadata = r;
      });
    }
    curtainMsg.value = "";
    setSource("video", vid);
    navigator.mediaDevices
      .enumerateDevices()
      .then((ds) => {
        if (ds.filter((d) => d.kind === "videoinput").length > 1)
          canFlip.value = true;
      })
      .catch(() => {});
  } catch (e) {
    curtainMsg.value =
      "Camera not available (" +
      (e && e.name ? e.name : "unknown") +
      "). Use the demo stimulus or load an image.";
    showCurtain.value = true;
  }
}

// ── Demo ─────────────────────────────────────────────────────────────────
function useDemo() {
  const dctx = demoCvRef.value.getContext("2d");
  gratingImg = drawDemo(dctx, 0, gratingImg);
  facing = "user";
  setSource("canvas", demoCvRef.value);
}

// ── Image upload ─────────────────────────────────────────────────────────
function onFileChange(ev) {
  const f = ev.target.files && ev.target.files[0];
  if (!f) return;
  const img = new Image();
  img.onload = () => {
    setSource("image", img);
    URL.revokeObjectURL(img.src);
  };
  img.src = URL.createObjectURL(f);
}

// ── Source selector ──────────────────────────────────────────────────────
function selectSource(v) {
  srcMode.value = v;
  if (v === "cam") startCamera();
  else if (v === "demo") useDemo();
  else fileImgRef.value.click();
}

// ── WebGL render helpers ─────────────────────────────────────────────────
function drawTo(target, program, set) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fbo : null);
  gl.viewport(
    0,
    0,
    target ? target.w : glcvRef.value.width,
    target ? target.h : glcvRef.value.height
  );
  gl.useProgram(program.p);
  if (program.u.u_enc) gl.uniform1f(program.u.u_enc, ENC);
  set(program.u);
  gl.bindVertexArray(quad);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function bindTex(unit, tex, loc) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.uniform1i(loc, unit);
}

// ── rAF loop ─────────────────────────────────────────────────────────────
function frame(now) {
  rafId = requestAnimationFrame(frame);
  if (!gl || !srcReady) return;

  const dt = Math.min(0.1, (now - lastT) / 1000);
  lastT = now;

  if (P.sweep && P.mode === "single") {
    P.ori = (P.ori + 22 * dt) % 180;
  }

  if (source.kind === "canvas") {
    const dctx = demoCvRef.value.getContext("2d");
    gratingImg = drawDemo(dctx, (now - tStart) / 1000, gratingImg);
  }

  const el = source.el;
  if (source.kind === "video" && el.readyState < 2) return;

  // Upload source to texture
  gl.bindTexture(gl.TEXTURE_2D, texSrc);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, el);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  // Grayscale + mipmap
  drawTo(TGray, PG.gray, (u) => {
    bindTex(0, texSrc, u.u_tex);
    gl.uniform1f(u.u_mirror, mirror ? 1 : 0);
  });
  gl.bindTexture(gl.TEXTURE_2D, TGray.tex);
  gl.generateMipmap(gl.TEXTURE_2D);

  const G = geom(P, procW, procH, COARSE);

  function filterAt(oriDeg, t1, t2, accSrc, accumulate) {
    const th = (oriDeg * Math.PI) / 180;
    const bar = [Math.cos(th), Math.sin(th)];
    const grad = [-Math.sin(th), Math.cos(th)];

    gl.bindFramebuffer(gl.FRAMEBUFFER, t1.fbo);
    gl.viewport(0, 0, t1.w, t1.h);
    gl.useProgram(PG.p1.p);
    const u1 = PG.p1.u;
    gl.uniform1f(u1.u_enc, ENC);
    bindTex(0, TGray.tex, u1.u_src);
    gl.uniform2f(u1.u_texel, 1 / G.eW, 1 / G.eH);
    gl.uniform2f(u1.u_dir, grad[0], grad[1]);
    gl.uniform1f(u1.u_freq, G.freq);
    gl.uniform1f(u1.u_sigma, G.su);
    gl.uniform1f(u1.u_lod, G.lod);
    gl.uniform1i(u1.u_radius, G.ru);
    gl.bindVertexArray(quad);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindFramebuffer(gl.FRAMEBUFFER, t2.fbo);
    gl.viewport(0, 0, t2.w, t2.h);
    gl.useProgram(PG.p2.p);
    const u2 = PG.p2.u;
    gl.uniform1f(u2.u_enc, ENC);
    bindTex(0, t1.tex, u2.u_src);
    bindTex(1, accSrc ? accSrc.tex : t1.tex, u2.u_acc);
    gl.uniform2f(u2.u_texel, 1 / G.eW, 1 / G.eH);
    gl.uniform2f(u2.u_dir, bar[0], bar[1]);
    gl.uniform1f(u2.u_sigma, G.sv);
    gl.uniform1i(u2.u_radius, G.rv);
    gl.uniform1i(u2.u_accumulate, accumulate ? 1 : 0);
    gl.uniform1f(u2.u_oriNorm, (oriDeg % 180) / 180);
    gl.bindVertexArray(quad);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  if (P.mode === "single") {
    filterAt(P.ori, TA, TB, null, false);
    drawTo(null, PG.show, (u) => {
      bindTex(0, TB.tex, u.u_eo);
      bindTex(1, TGray.tex, u.u_gray);
      gl.uniform1f(u.u_gain, P.gain);
      gl.uniform1f(u.u_blend, P.blend / 100);
    });
  } else {
    // 8-orientation population mode
    gl.bindFramebuffer(gl.FRAMEBUFFER, TAccA.fbo);
    gl.viewport(0, 0, TAccA.w, TAccA.h);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    let src = TAccA;
    let dst = TAccB;
    for (let k = 0; k < NORI; k++) {
      filterAt((k * 180) / NORI, TA, dst, src, true);
      const tmp = src;
      src = dst;
      dst = tmp;
    }
    drawTo(null, PG.pop, (u) => {
      bindTex(0, src.tex, u.u_acc);
      bindTex(1, TGray.tex, u.u_gray);
      gl.uniform1f(u.u_gain, P.gain);
      gl.uniform1f(u.u_blend, P.blend / 100);
    });
  }

  // Adaptive quality: drop resolution if framerate dips
  fpsAcc += 1 / Math.max(dt, 1e-4);
  fpsN++;
  if (fpsN >= 60) {
    const fps = fpsAcc / fpsN;
    fpsAcc = 0;
    fpsN = 0;
    if (fps < 22 && trims < 3 && targetW > 260) {
      trims++;
      targetW = Math.round(targetW * 0.78);
      applySize();
    }
  }

  // Measure tuning periodically
  if (showPanels.value && now - lastAna > 150) {
    lastAna = now;
    const actx = anaCvRef.value.getContext("2d", { willReadFrequently: true });
    tuningData = measureTuningCPU(
      actx,
      source.el,
      mirror,
      rfx,
      rfy,
      P,
      procW,
      procH,
      COARSE
    );
  }

  // Draw tuning + overlay
  if (showPanels.value && tcvRef.value) {
    const info = drawTuningCurve(tcvRef.value, tuningData, P, TUNING_THEME);
    tuningInfo.value = info;
  }
  drawOverlayCanvas();
}

// ── Overlay (crosshair + RF ellipse) ─────────────────────────────────────
function drawOverlayCanvas() {
  const ov = overlayRef.value;
  if (!ov) return;
  const x = ov.getContext("2d");
  x.clearRect(0, 0, ov.width, ov.height);
  const G = geom(P, procW, procH, COARSE);
  const s = procW / G.eW;
  const su = G.su * s;
  const sv = G.sv * s;
  const cx = rfx * ov.width;
  const cy = rfy * ov.height;

  if (P.mode === "single") {
    x.save();
    x.translate(cx, cy);
    x.rotate((-P.ori * Math.PI) / 180);
    x.strokeStyle = "rgba(255,255,255,.85)";
    x.lineWidth = 1.4;
    x.beginPath();
    x.ellipse(0, 0, 2 * sv, 2 * su, 0, 0, 6.284);
    x.stroke();
    x.restore();
  }

  x.strokeStyle = "rgba(255,255,255,.9)";
  x.lineWidth = 1.2;
  x.beginPath();
  x.moveTo(cx - 7, cy);
  x.lineTo(cx + 7, cy);
  x.moveTo(cx, cy - 7);
  x.lineTo(cx, cy + 7);
  x.stroke();
}

// ── Pointer handling for crosshair ───────────────────────────────────────
function movePt(ev) {
  const r = glcvRef.value.getBoundingClientRect();
  const sc = Math.min(r.width / procW, r.height / procH);
  const dw = procW * sc;
  const dh = procH * sc;
  const ox = r.left + (r.width - dw) / 2;
  const oy = r.top + (r.height - dh) / 2;
  rfx = Math.min(1, Math.max(0, (ev.clientX - ox) / dw));
  rfy = Math.min(1, Math.max(0, (ev.clientY - oy) / dh));
}

function onPointerDown(e) {
  dragging = true;
  overlayRef.value.setPointerCapture(e.pointerId);
  movePt(e);
  e.preventDefault();
}
function onPointerMove(e) {
  if (dragging) movePt(e);
}
function onPointerUp() {
  dragging = false;
}

// ── Panel refresh ────────────────────────────────────────────────────────
function refreshPanels() {
  if (kcvRef.value) drawKernel(kcvRef.value, P, procW, procH, COARSE);
  if (tcvRef.value) {
    const info = drawTuningCurve(tcvRef.value, tuningData, P, TUNING_THEME);
    tuningInfo.value = info;
  }
  if (P.mode === "pop" && wcvRef.value) drawWheel(wcvRef.value);
}

// ── Panel placement (HUD mode for short viewports) ───────────────────────
function placePanels() {
  const mq = window.matchMedia("(max-height: 460px)");
  hudMode.value = mq.matches;
  nextTick(refreshPanels);
}

// ── Save PNG ─────────────────────────────────────────────────────────────
function savePng() {
  const out = document.createElement("canvas");
  out.width = glcvRef.value.width;
  out.height = glcvRef.value.height;
  const c = out.getContext("2d");
  c.drawImage(glcvRef.value, 0, 0);
  c.drawImage(overlayRef.value, 0, 0);
  const a = document.createElement("a");
  a.download =
    "v1-bank_" +
    (P.mode === "pop" ? "8ori" : "ori" + Math.round(P.ori)) +
    "_sf" +
    P.sf +
    ".png";
  a.href = out.toDataURL("image/png");
  a.click();
}

// ── Flip camera ──────────────────────────────────────────────────────────
function flipCamera() {
  facing = facing === "user" ? "environment" : "user";
  startCamera();
}

// ── Watchers ─────────────────────────────────────────────────────────────
watch(
  () => [P.ori, P.sf, P.len, P.gain, P.blend, P.mode],
  () => refreshPanels()
);

// ── Lifecycle ────────────────────────────────────────────────────────────
onMounted(() => {
  initWebGL();
  targetW = baseRes(COARSE);
  srcAspect = 4 / 3;
  applySize();
  placePanels();
  refreshPanels();

  if (!texSrc && gl)
    texSrc = makeTex(gl, 4, 4, gl.RGBA8, gl.UNSIGNED_BYTE, false);

  lastT = performance.now();
  tStart = lastT;
  if (gl) rafId = requestAnimationFrame(frame);

  // Media query listener for panel placement
  const mq = window.matchMedia("(max-height: 460px)");
  const mqHandler = () => placePanels();
  if (mq.addEventListener) mq.addEventListener("change", mqHandler);
  else mq.addListener(mqHandler);

  // Resize observer for canvas sizing
  if (window.ResizeObserver) {
    let pending = false;
    const ro = new ResizeObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        refreshPanels();
      });
    });
    if (wellRef.value) ro.observe(wellRef.value);
  }

  // Video resize (aspect change)
  if (vidRef.value) {
    vidRef.value.addEventListener("resize", () => {
      if (!source || source.kind !== "video" || !vidRef.value.videoWidth)
        return;
      const a = sizeFromSource(vidRef.value);
      if (Math.abs(a - srcAspect) > 0.02) {
        srcAspect = a;
        applySize();
        refreshPanels();
      }
    });
  }
});

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId);
  if (stream) stream.getTracks().forEach((t) => t.stop());
});
</script>

<template>
  <div class="v1-camera">
    <header class="v1-header">
      <h1 class="v1-title">What V1 sees</h1>
      <div class="v1-spacer" />
      <div class="v1-btns">
        <button class="v1-btn v1-ghost" @click="showAbout = !showAbout">
          About
        </button>
        <button
          class="v1-btn v1-ghost"
          :aria-pressed="showPanels ? 'true' : 'false'"
          @click="
            showPanels = !showPanels;
            if (showPanels) refreshPanels();
          "
        >
          <span class="v1-lg">Panels</span><span class="v1-sm">RF</span>
        </button>
        <button v-if="canFlip" class="v1-btn v1-ghost" @click="flipCamera">
          Flip
        </button>
        <button class="v1-btn v1-ghost" @click="savePng">
          <span class="v1-lg">Save PNG</span><span class="v1-sm">PNG</span>
        </button>
      </div>
    </header>

    <div class="v1-grid">
      <!-- Image well -->
      <div ref="wellRef" class="v1-well">
        <canvas ref="glcvRef" />
        <canvas
          ref="overlayRef"
          class="v1-overlay"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        />
        <div
          v-if="hudMode && showPanels && !showCurtain"
          ref="hudRef"
          class="v1-hud"
        >
          <div class="v1-pgrid">
            <div>
              <div class="v1-pl">Profile</div>
              <canvas ref="kcvRef" class="v1-kcv" />
            </div>
            <div>
              <div class="v1-pl">Orientation energy in RF</div>
              <canvas ref="tcvRef" class="v1-tcv" />
            </div>
          </div>
        </div>

        <!-- Curtain -->
        <div v-if="showCurtain" class="v1-curtain">
          <div class="v1-big">Point a camera at the world</div>
          <p class="v1-curtain-sub">
            Video is filtered on this device only. Nothing is uploaded, recorded
            or sent anywhere.
          </p>
          <div style="display: flex; gap: 6px">
            <button class="v1-btn v1-dark" @click="selectSource('cam')">
              Start camera
            </button>
            <button class="v1-btn v1-dark" @click="selectSource('demo')">
              Demo stimulus
            </button>
          </div>
          <p v-if="curtainMsg" class="v1-warn">{{ curtainMsg }}</p>
        </div>

        <!-- About overlay -->
        <div v-if="showAbout" class="v1-about">
          <button class="v1-btn v1-dark v1-close" @click="showAbout = false">
            Close
          </button>
          <h3>What you are looking at</h3>
          <div class="v1-body">
            <p>
              Every pixel of this image is one model V1 neuron, and all of them
              share the receptive field drawn in the profile panel. So the
              picture is no longer an image — it is a
              <b>population response map</b>. Bright means "this neuron fired";
              dark means "this neuron stayed silent".
            </p>
            <p>
              Because the whole bank is tuned alike, only scene structure
              matching the preferred orientation, bar width and length survives.
              Hold a pen up and rotate it: it appears and vanishes as it passes
              through the bank's preferred orientation. That vanishing
              <em>is</em> orientation selectivity.
            </p>
            <p>
              Each unit computes the local energy in a quadrature pair of
              oriented filters, so it signals <em>where</em> an oriented feature
              lies without caring which side is light and which is dark — the
              defining behaviour of a complex cell.
            </p>
            <p>
              <b>8 orientations</b> runs eight such banks in parallel and paints
              each pixel with the colour of whichever bank drives it best, the
              same convention used for orientation preference maps in imaging
              experiments.
            </p>
            <p>
              The crosshair marks one recorded neuron. Tap or drag on the image
              to move the electrode; its orientation tuning curve is measured
              live from the current frame.
            </p>
          </div>
        </div>
      </div>

      <!-- Control rail -->
      <div class="v1-rail" :class="{ 'v1-nopanels': !showPanels }">
        <!-- Source selector -->
        <div class="v1-sec">
          <div class="v1-seg">
            <button
              v-for="s in ['cam', 'demo', 'img']"
              :key="s"
              :aria-pressed="srcMode === s ? 'true' : 'false'"
              @click="selectSource(s)"
            >
              {{ s === "cam" ? "Camera" : s === "demo" ? "Demo" : "Image" }}
            </button>
          </div>
          <input
            ref="fileImgRef"
            type="file"
            accept="image/*"
            class="v1-hidden"
            @change="onFileChange"
          />
        </div>

        <!-- RF panels (rail slot, visible when not in HUD mode) -->
        <div v-if="!hudMode && showPanels" ref="railSlotRef" class="v1-sec">
          <p class="v1-eyebrow">Receptive field</p>
          <div ref="panelsRef">
            <div class="v1-pgrid">
              <div>
                <div class="v1-pl">Profile</div>
                <canvas ref="kcvRef" class="v1-kcv" />
              </div>
              <div>
                <div class="v1-pl">Orientation energy in RF</div>
                <canvas ref="tcvRef" class="v1-tcv" />
              </div>
            </div>
            <dl class="v1-nums">
              <dt>orientation</dt>
              <dd>{{ panelOri }}</dd>
              <dt>spatial freq</dt>
              <dd>{{ panelSf }}</dd>
              <dt>bar period</dt>
              <dd>{{ panelPer }}</dd>
              <dt>aspect</dt>
              <dd>{{ panelAspect }}</dd>
              <dt>HWHM</dt>
              <dd>{{ panelHwhm }}</dd>
              <dt>OSI</dt>
              <dd>{{ panelOsi }}</dd>
            </dl>
          </div>
        </div>

        <!-- Tuning controls -->
        <div class="v1-sec">
          <p class="v1-eyebrow">Tuning</p>
          <div class="v1-row">
            <div class="v1-seg">
              <button
                :aria-pressed="P.mode === 'single' ? 'true' : 'false'"
                @click="P.mode = 'single'"
              >
                One orientation
              </button>
              <button
                :aria-pressed="P.mode === 'pop' ? 'true' : 'false'"
                @click="P.mode = 'pop'"
              >
                8 orientations
              </button>
            </div>
            <canvas v-if="P.mode === 'pop'" ref="wcvRef" class="v1-wcv" />
          </div>

          <div v-if="P.mode === 'single'" class="v1-row">
            <div class="v1-lab">
              <span class="v1-name">Orientation</span>
              <span class="v1-right">
                <svg class="v1-glyph" viewBox="0 0 24 24" aria-hidden="true">
                  <circle class="v1-ring" cx="12" cy="12" r="10" />
                  <line
                    class="v1-tick"
                    x1="12"
                    y1="3.4"
                    x2="12"
                    y2="20.6"
                    :transform="`rotate(${90 - P.ori} 12 12)`"
                  />
                </svg>
                <button
                  class="v1-chip"
                  :aria-pressed="P.sweep ? 'true' : 'false'"
                  @click="P.sweep = !P.sweep"
                >
                  Sweep
                </button>
                <span class="v1-val">{{ oriLabel }}</span>
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="179"
              step="1"
              :value="Math.round(P.ori)"
              aria-label="Orientation"
              @input="P.ori = parseInt($event.target.value, 10)"
            />
          </div>

          <div class="v1-row">
            <div class="v1-lab">
              <span class="v1-name">Spatial frequency</span>
              <span class="v1-val">{{ sfLabel }}</span>
            </div>
            <input
              type="range"
              min="6"
              max="70"
              step="1"
              :value="P.sf"
              aria-label="Spatial frequency"
              @input="P.sf = parseInt($event.target.value, 10)"
            />
          </div>

          <div class="v1-row">
            <div class="v1-lab">
              <span class="v1-name">RF length</span>
              <span class="v1-val">{{ lenLabel }}</span>
            </div>
            <input
              type="range"
              min="0.25"
              max="3"
              step="0.05"
              :value="P.len"
              aria-label="Receptive field length"
              @input="P.len = parseFloat($event.target.value)"
            />
          </div>
        </div>

        <!-- Display controls -->
        <div class="v1-sec">
          <p class="v1-eyebrow">Display</p>
          <div class="v1-row">
            <div class="v1-lab">
              <span class="v1-name">Response gain</span>
              <span class="v1-val">{{ gainLabel }}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="16"
              step="0.1"
              :value="P.gain"
              aria-label="Response gain"
              @input="P.gain = parseFloat($event.target.value)"
            />
          </div>
          <div class="v1-row">
            <div class="v1-lab">
              <span class="v1-name">Blend original</span>
              <span class="v1-val">{{ blendLabel }}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              :value="P.blend"
              aria-label="Blend original image"
              @input="P.blend = parseInt($event.target.value, 10)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Hidden elements -->
    <video
      ref="vidRef"
      playsinline
      webkit-playsinline
      muted
      autoplay
      class="v1-hidden"
    />
    <canvas ref="demoCvRef" width="640" height="480" class="v1-hidden" />
    <canvas ref="anaCvRef" class="v1-hidden" />
  </div>
</template>

<style scoped>
/* ── local vars ─────────────────────────────────────────────────────── */
.v1-camera {
  --v1-bg: rgb(var(--color-bg));
  --v1-paper: rgb(var(--color-paper));
  --v1-ink: rgb(var(--color-ink));
  --v1-mute: rgb(var(--color-mute));
  --v1-line: rgb(var(--color-line));
  --v1-accent: rgb(var(--color-accent));
  --v1-well: #1b1e24;
  --v1-pad: 10px;
  --v1-gap: 10px;
  --v1-edge: 12px;
  --v1-rail: clamp(242px, 32%, 306px);

  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100vh;
  height: 100dvh;
  background: var(--v1-bg);
  color: var(--v1-ink);
  font-family: var(
    --font-mono,
    ui-monospace,
    "SF Mono",
    "JetBrains Mono",
    Menlo,
    Consolas,
    monospace
  );
  font-size: 12.5px;
  line-height: 1.4;
  -webkit-font-smoothing: antialiased;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
}

/* ── header ─────────────────────────────────────────────────────────── */
.v1-header {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 6px var(--v1-edge);
  border-bottom: 1.5px solid var(--v1-ink);
}
.v1-title {
  font-family: var(
    --font-body,
    "Iowan Old Style",
    "Palatino Linotype",
    Palatino,
    Georgia,
    serif
  );
  font-weight: 600;
  font-size: 18px;
  line-height: 1.25;
  margin: 0;
  letter-spacing: -0.01em;
  white-space: nowrap;
}
.v1-spacer {
  flex: 1;
}
.v1-btns {
  display: flex;
  gap: 5px;
  flex: 0 0 auto;
}

.v1-btn {
  font-family: inherit;
  font-size: 11px;
  padding: 5px 9px;
  min-height: 30px;
  border: 1.5px solid var(--v1-ink);
  border-radius: 2px;
  background: var(--v1-bg);
  color: var(--v1-ink);
  cursor: pointer;
  white-space: nowrap;
}
.v1-ghost {
  background: transparent;
}
.v1-btn:hover {
  background: var(--v1-ink);
  color: var(--v1-bg);
}
.v1-btn:focus-visible {
  outline: 2px solid var(--v1-accent);
  outline-offset: 2px;
}
.v1-btn[aria-pressed="false"] {
  opacity: 0.55;
}
.v1-sm {
  display: none;
}
@media (max-width: 600px) {
  .v1-lg {
    display: none;
  }
  .v1-sm {
    display: inline;
  }
}

/* ── layout ─────────────────────────────────────────────────────────── */
.v1-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--v1-rail);
  gap: var(--v1-gap);
  padding: var(--v1-gap) var(--v1-edge) var(--v1-edge);
}
@media (orientation: portrait) and (max-width: 760px) {
  .v1-grid {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(130px, 38%) minmax(0, 1fr);
  }
}

/* ── image well ─────────────────────────────────────────────────────── */
.v1-well {
  position: relative;
  min-height: 0;
  min-width: 0;
  background: var(--v1-well);
  border: 1.5px solid var(--v1-ink);
  border-radius: 3px;
  overflow: hidden;
}
.v1-well > canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
.v1-overlay {
  touch-action: none;
  cursor: crosshair;
  z-index: 1;
}

.v1-curtain {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 11px;
  text-align: center;
  padding: 16px;
  color: #cfccc4;
  background: linear-gradient(160deg, #1b1e24, #2a2f38);
}
.v1-big {
  font-family: var(--font-body, "Iowan Old Style", Palatino, Georgia, serif);
  font-size: 18px;
  color: #e7e4dc;
}
.v1-curtain-sub {
  max-width: 36ch;
  font-size: 11.5px;
  color: #99a0aa;
  margin: 0;
}
.v1-dark {
  background: #333a45;
  border-color: #5a626e;
  color: #e7e4dc;
}
.v1-dark:hover {
  background: #e7e4dc;
  color: #1b1e24;
}
.v1-warn {
  color: #f0a868;
  margin-top: 6px;
  max-width: 40ch;
  font-size: 11.5px;
}

.v1-about {
  position: absolute;
  inset: 0;
  z-index: 5;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  padding: 14px 16px 18px;
  background: rgba(20, 23, 28, 0.965);
  color: #dfdcd4;
  user-select: text;
  -webkit-user-select: text;
}
.v1-about h3 {
  font-family: var(--font-body, "Iowan Old Style", Palatino, Georgia, serif);
  font-size: 16px;
  margin: 0 0 8px;
  font-weight: 600;
  color: #f1eee6;
}
.v1-body {
  font-family: var(--font-body, "Iowan Old Style", Palatino, Georgia, serif);
  font-size: 14px;
  line-height: 1.55;
  max-width: 62ch;
}
.v1-body p {
  margin: 0.5em 0;
}
.v1-body b {
  font-weight: 600;
  color: #f1eee6;
}
.v1-close {
  position: sticky;
  top: 0;
  float: right;
  margin-left: 12px;
}

/* ── control rail ───────────────────────────────────────────────────── */
.v1-rail {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  border: 1.5px solid var(--v1-ink);
  border-radius: 3px;
  background: var(--v1-paper);
}
.v1-sec {
  border-bottom: 1.5px solid var(--v1-ink);
  padding: var(--v1-pad);
}
.v1-sec:last-child {
  border-bottom: 0;
}
.v1-eyebrow {
  font-size: 10.5px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--v1-mute);
  margin: 0 0 8px;
}

.v1-seg {
  display: flex;
  border: 1.5px solid var(--v1-ink);
  border-radius: 2px;
  overflow: hidden;
}
.v1-seg button {
  flex: 1;
  border: 0;
  background: var(--v1-paper);
  color: var(--v1-ink);
  font-family: inherit;
  font-size: 12.5px;
  line-height: 1.18;
  padding: 6px 4px;
  min-height: 36px;
  cursor: pointer;
  border-right: 1px solid var(--v1-line);
  white-space: normal;
}
.v1-seg button:last-child {
  border-right: 0;
}
.v1-seg button[aria-pressed="true"] {
  background: var(--v1-ink);
  color: var(--v1-bg);
}
.v1-seg button:focus-visible {
  outline: 2px solid var(--v1-accent);
  outline-offset: -3px;
}

.v1-row {
  margin-bottom: 8px;
}
.v1-row:last-child {
  margin-bottom: 0;
}
.v1-lab {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
}
.v1-name {
  font-size: 12.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.v1-right {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: 0 0 auto;
}
.v1-val {
  font-size: 12.5px;
  color: var(--v1-accent);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  min-width: 40px;
  text-align: right;
}

.v1-glyph {
  width: 24px;
  height: 24px;
  display: block;
  flex: 0 0 auto;
}
.v1-ring {
  fill: none;
  stroke: var(--v1-line);
  stroke-width: 1.4;
}
.v1-tick {
  stroke: var(--v1-ink);
  stroke-width: 2.4;
  stroke-linecap: round;
}

.v1-chip {
  font-family: inherit;
  font-size: 11px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 3px 7px;
  min-height: 25px;
  border: 1px solid var(--v1-mute);
  border-radius: 2px;
  background: transparent;
  color: var(--v1-mute);
  cursor: pointer;
}
.v1-chip[aria-pressed="true"] {
  background: var(--v1-ink);
  border-color: var(--v1-ink);
  color: var(--v1-bg);
}
.v1-chip:focus-visible {
  outline: 2px solid var(--v1-accent);
  outline-offset: 1px;
}

input[type="range"] {
  width: 100%;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  height: 24px;
  margin: 0;
  display: block;
}
input[type="range"]::-webkit-slider-runnable-track {
  height: 2px;
  background: var(--v1-line);
}
input[type="range"]::-moz-range-track {
  height: 2px;
  background: var(--v1-line);
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: var(--v1-bg);
  border: 1.5px solid var(--v1-ink);
  margin-top: -7.5px;
}
input[type="range"]::-moz-range-thumb {
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: var(--v1-bg);
  border: 1.5px solid var(--v1-ink);
}
input[type="range"]:focus-visible {
  outline: 2px solid var(--v1-accent);
  outline-offset: 2px;
}

.v1-wcv {
  width: 100%;
  height: 20px;
  display: block;
  margin-top: 6px;
  border: 1px solid var(--v1-line);
}

/* ── RF panels ──────────────────────────────────────────────────────── */
.v1-pgrid {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 9px;
  align-items: end;
}
.v1-pgrid > div {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.v1-pl {
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--v1-mute);
  margin-bottom: 5px;
  line-height: 1.28;
}
.v1-kcv {
  width: 100%;
  aspect-ratio: 1 / 1;
  border: 1px solid var(--v1-line);
  display: block;
  background: #12151a;
}
.v1-tcv {
  width: 100%;
  aspect-ratio: 1.4 / 1;
  border: 1px solid var(--v1-line);
  display: block;
  background: #12151a;
}
.v1-nums {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2px 10px;
  margin: 11px 0 0;
  font-size: 12px;
}
.v1-nums dt {
  white-space: nowrap;
  color: var(--v1-mute);
}
.v1-nums dd {
  margin: 0;
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* ── HUD (on-image panels for short screens) ────────────────────────── */
.v1-hud {
  position: absolute;
  left: 8px;
  bottom: 8px;
  z-index: 3;
  pointer-events: none;
  max-width: calc(100% - 16px);
  padding: 6px 8px 7px;
  background: rgba(17, 20, 25, 0.8);
  border: 1px solid rgba(190, 195, 203, 0.3);
  border-radius: 3px;
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
}
.v1-hud .v1-pgrid {
  display: flex;
  gap: 8px;
}
.v1-hud .v1-pl {
  font-size: 7px;
  letter-spacing: 0.03em;
  color: #868d98;
  margin-bottom: 3px;
  line-height: 1.2;
}
.v1-hud .v1-kcv {
  width: 60px;
  height: 60px;
  aspect-ratio: auto;
  border: 1px solid rgba(150, 157, 168, 0.35);
}
.v1-hud .v1-tcv {
  width: 96px;
  height: 60px;
  aspect-ratio: auto;
  border: 1px solid rgba(150, 157, 168, 0.35);
}

.v1-hidden {
  display: none !important;
}
.v1-nopanels .v1-hud {
  display: none;
}

/* ── short viewports ────────────────────────────────────────────────── */
@media (max-height: 520px) {
  .v1-camera {
    --v1-pad: 7px;
    --v1-gap: 7px;
    --v1-edge: 9px;
    --v1-rail: clamp(224px, 33%, 300px);
  }
  .v1-header {
    padding-top: 4px;
    padding-bottom: 4px;
  }
  .v1-title {
    font-size: 16px;
  }
  .v1-btn {
    min-height: 28px;
    padding: 4px 8px;
  }
  .v1-eyebrow {
    font-size: 9.5px;
    margin-bottom: 5px;
  }
  .v1-row {
    margin-bottom: 5px;
  }
  .v1-seg button {
    min-height: 32px;
    font-size: 11.5px;
  }
  .v1-name,
  .v1-val {
    font-size: 11.5px;
  }
  .v1-chip {
    font-size: 10px;
    min-height: 23px;
  }
  .v1-nums {
    font-size: 11px;
    margin-top: 8px;
  }
  input[type="range"] {
    height: 22px;
  }
}
@media (max-height: 380px) {
  .v1-eyebrow {
    display: none;
  }
  .v1-name,
  .v1-val {
    font-size: 11px;
  }
}
@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
  }
}
</style>
