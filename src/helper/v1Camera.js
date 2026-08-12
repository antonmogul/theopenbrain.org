/*
 * v1Camera.js — Pure data + shader strings for the V1 Camera widget.
 *
 * Extracted from Stuart Trenholm's v1-camera-widget.html so that the Vue
 * component stays declarative (template + reactive state) while all GPU
 * pipeline logic lives here.
 *
 * OPENBRAIN-14: fourth Stuart widget port.
 */

// ── constants ────────────────────────────────────────────────────────────
export const NORI = 8; // orientation channels in pop mode
export const BW = 1.4; // bandwidth parameter (octaves)

/** Default parameter state. */
export function defaultParams() {
  return {
    ori: 90,
    sf: 24,
    len: 0.6,
    gain: 4,
    blend: 0,
    mode: "single",
    sweep: false,
  };
}

// ── GLSL shader sources ─────────────────────────────────────────────────

const COMMON = `
precision highp float;
uniform float u_enc;
float dec(float x){ return (x-0.5)*2.0/u_enc; }
float enc(float v){ return clamp(0.5 + 0.5*v*u_enc, 0.0, 1.0); }`;

export const VS = `#version 300 es
in vec2 a_pos; out vec2 v_uv;
void main(){ v_uv = a_pos*0.5+0.5; gl_Position = vec4(a_pos,0.0,1.0); }`;

export const FS_GRAY = `#version 300 es
${COMMON}
uniform sampler2D u_tex; uniform float u_mirror;
in vec2 v_uv; out vec4 o;
void main(){
  vec2 uv = v_uv; if(u_mirror>0.5) uv.x = 1.0-uv.x;
  float g = dot(texture(u_tex, uv).rgb, vec3(0.2126,0.7152,0.0722));
  o = vec4(g,g,g,1.0);
}`;

export const FS_P1 = `#version 300 es
${COMMON}
uniform sampler2D u_src;
uniform vec2 u_texel, u_dir;
uniform float u_freq, u_sigma, u_lod;
uniform int u_radius;
in vec2 v_uv; out vec4 o;
void main(){
  float e=0.0, d=0.0, n=0.0;
  for(int i=-u_radius; i<=u_radius; i++){
    float t=float(i);
    float g=exp(-0.5*t*t/(u_sigma*u_sigma));
    float ph=6.28318530718*u_freq*t;
    float s=textureLod(u_src, v_uv + u_dir*u_texel*t, u_lod).r;
    e+=g*cos(ph)*s; d+=g*sin(ph)*s; n+=g;
  }
  o = vec4(enc(e/n), enc(d/n), 0.0, 1.0);
}`;

export const FS_P2 = `#version 300 es
${COMMON}
uniform sampler2D u_src, u_acc;
uniform vec2 u_texel, u_dir;
uniform float u_sigma, u_oriNorm;
uniform int u_radius, u_accumulate;
in vec2 v_uv; out vec4 o;
void main(){
  float e=0.0, d=0.0, n=0.0;
  for(int i=-u_radius; i<=u_radius; i++){
    float t=float(i);
    float g=exp(-0.5*t*t/(u_sigma*u_sigma));
    vec4 s=texture(u_src, v_uv + u_dir*u_texel*t);
    e+=g*dec(s.r); d+=g*dec(s.g); n+=g;
  }
  e/=n; d/=n;
  if(u_accumulate==0){ o = vec4(enc(e), enc(d), 0.0, 1.0); return; }
  float r = sqrt(e*e+d*d);
  vec4 a = texture(u_acc, v_uv);
  o = (r > a.r) ? vec4(r, u_oriNorm, 0.0, 1.0) : a;
}`;

const MAPS = `
vec3 viridis(float t){
  t=clamp(t,0.0,1.0);
  const vec3 c0=vec3(0.2777,0.0054,0.3341);
  const vec3 c1=vec3(0.1051,1.4046,1.3846);
  const vec3 c2=vec3(-0.3309,0.2148,0.0951);
  const vec3 c3=vec3(-4.6342,-5.7991,-19.3324);
  const vec3 c4=vec3(6.2283,14.1799,56.6906);
  const vec3 c5=vec3(4.7764,-13.7451,-65.3530);
  const vec3 c6=vec3(-5.4355,4.6459,26.3124);
  return c0+t*(c1+t*(c2+t*(c3+t*(c4+t*(c5+t*c6)))));
}
vec3 hsv2rgb(vec3 c){
  vec3 p = abs(fract(c.xxx+vec3(1.0,2.0/3.0,1.0/3.0))*6.0-3.0);
  return c.z*mix(vec3(1.0), clamp(p-1.0,0.0,1.0), c.y);
}`;

export const FS_SHOW = `#version 300 es
${COMMON}
${MAPS}
uniform sampler2D u_eo, u_gray;
uniform float u_gain, u_blend;
in vec2 v_uv; out vec4 o;
void main(){
  vec4 t = texture(u_eo, v_uv);
  float e=dec(t.r), d=dec(t.g);
  vec3 col = viridis(clamp(sqrt(e*e+d*d)*u_gain, 0.0, 1.0));
  o = vec4(mix(col, vec3(texture(u_gray, v_uv).r), u_blend), 1.0);
}`;

export const FS_POP = `#version 300 es
${COMMON}
${MAPS}
uniform sampler2D u_acc, u_gray;
uniform float u_gain, u_blend;
in vec2 v_uv; out vec4 o;
void main(){
  vec4 t = texture(u_acc, v_uv);
  vec3 col = hsv2rgb(vec3(t.g, 0.85, clamp(t.r*u_gain, 0.0, 1.0)));
  o = vec4(mix(col, vec3(texture(u_gray, v_uv).r), u_blend), 1.0);
}`;

// ── WebGL helpers ────────────────────────────────────────────────────────

/** Compile a shader, log errors. */
export function compileShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(s));
  }
  return s;
}

/** Link a program and return `{ p, u }` (program + uniform map). */
export function linkProgram(gl, fsSrc) {
  const p = gl.createProgram();
  gl.attachShader(p, compileShader(gl, gl.VERTEX_SHADER, VS));
  gl.attachShader(p, compileShader(gl, gl.FRAGMENT_SHADER, fsSrc));
  gl.bindAttribLocation(p, 0, "a_pos");
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(p));
  }
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const inf = gl.getActiveUniform(p, i);
    u[inf.name] = gl.getUniformLocation(p, inf.name);
  }
  return { p, u };
}

/** Create a texture. */
export function makeTex(gl, w, h, ifmt, type, mip) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, gl.RGBA, type, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return t;
}

/** Create a texture + framebuffer pair (render target). */
export function makeTarget(gl, w, h, ifmt, type, mip) {
  const tex = makeTex(gl, w, h, ifmt, type, mip);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    tex,
    0
  );
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { tex, fbo, w, h };
}

// ── Receptive-field geometry ─────────────────────────────────────────────

/**
 * Compute RF geometry from current parameters + processing dimensions.
 * @param {object} P – parameter object (ori, sf, len, …)
 * @param {number} procW – processing width
 * @param {number} procH – processing height
 * @param {boolean} coarse – true for touch devices
 * @returns {object} { eW, eH, period, freq, su, sv, ru, rv, lod }
 */
export function geom(P, procW, procH, coarse) {
  const eW = Math.max(96, Math.min(procW, Math.round(8 * P.sf)));
  const eH = Math.max(72, Math.round((eW * procH) / procW));
  const period = eW / P.sf;
  const freq = 1 / period;
  const delta = (Math.pow(2, BW) - 1) / (Math.pow(2, BW) + 1);
  const su = (1.177 / (2 * Math.PI * delta)) * period;
  const sv = P.len * period;
  return {
    eW,
    eH,
    period,
    freq,
    su,
    sv,
    ru: Math.min(44, Math.max(2, Math.ceil(2.6 * su))),
    rv: Math.min(coarse ? 48 : 60, Math.max(1, Math.ceil(2.6 * sv))),
    lod: Math.max(0, Math.log2(procW / eW)),
  };
}

/**
 * CPU-side orientation tuning measurement at a point (rfx, rfy).
 * Reproduces the quadrature Gabor filtering used on the GPU but in JS
 * for a single RF centred at the crosshair.
 *
 * @param {CanvasRenderingContext2D} actx – analysis canvas context
 * @param {HTMLElement} srcEl – source element (video/canvas/image)
 * @param {boolean} mirror – flip horizontally?
 * @param {number} rfx – normalised RF x position [0,1]
 * @param {number} rfy – normalised RF y position [0,1]
 * @param {object} P – parameter object
 * @param {number} procW – processing width
 * @param {number} procH – processing height
 * @param {boolean} coarse – touch device?
 * @returns {{ tuning: Float32Array, peak: number } | null}
 */
export function measureTuningCPU(
  actx,
  srcEl,
  mirror,
  rfx,
  rfy,
  P,
  procW,
  procH,
  coarse
) {
  const cv = actx.canvas;
  const w = cv.width;
  const h = cv.height;
  if (!w || !h) return null;

  actx.save();
  if (mirror) {
    actx.translate(w, 0);
    actx.scale(-1, 1);
  }
  try {
    actx.drawImage(srcEl, 0, 0, w, h);
  } catch {
    actx.restore();
    return null;
  }
  actx.restore();

  const G = geom(P, procW, procH, coarse);
  const s = G.eW / procW;
  const su = G.su / s;
  const sv = G.sv / s;
  const freq = G.freq * s;
  const Ru = Math.min(coarse ? 22 : 28, Math.ceil(2.2 * su));
  const Rv = Math.min(coarse ? 34 : 44, Math.ceil(2.2 * sv));
  const cx = Math.round(rfx * w);
  const cy = Math.round(rfy * h);
  const x0 = Math.max(0, cx - Ru - Rv);
  const x1 = Math.min(w, cx + Ru + Rv + 1);
  const y0 = Math.max(0, cy - Ru - Rv);
  const y1 = Math.min(h, cy + Ru + Rv + 1);
  if (x1 - x0 < 4 || y1 - y0 < 4) return null;

  const img = actx.getImageData(x0, y0, x1 - x0, y1 - y0);
  const D = img.data;
  const IW = x1 - x0;
  const IH = y1 - y0;
  const K = coarse ? 18 : 24;
  const out = new Float32Array(K);

  // Pre-compute Gaussian + Gabor weights along the cross-bar axis
  const gu = new Float32Array(2 * Ru + 1);
  const ce = new Float32Array(2 * Ru + 1);
  const co = new Float32Array(2 * Ru + 1);
  for (let i = -Ru; i <= Ru; i++) {
    const g = Math.exp((-0.5 * i * i) / (su * su));
    gu[i + Ru] = g;
    ce[i + Ru] = g * Math.cos(2 * Math.PI * freq * i);
    co[i + Ru] = g * Math.sin(2 * Math.PI * freq * i);
  }
  const gv = new Float32Array(2 * Rv + 1);
  for (let j = -Rv; j <= Rv; j++) {
    gv[j + Rv] = Math.exp((-0.5 * j * j) / (sv * sv));
  }

  for (let k = 0; k < K; k++) {
    const th = (k * Math.PI) / K;
    const bx = Math.cos(th);
    const by = -Math.sin(th);
    const gx = -Math.sin(th);
    const gy = -Math.cos(th);
    let e = 0;
    let o = 0;
    let n = 0;
    for (let j = -Rv; j <= Rv; j++) {
      const wv = gv[j + Rv];
      const px = cx + bx * j;
      const py = cy + by * j;
      for (let i = -Ru; i <= Ru; i++) {
        const sx = Math.round(px + gx * i) - x0;
        const sy = Math.round(py + gy * i) - y0;
        if (sx < 0 || sy < 0 || sx >= IW || sy >= IH) continue;
        const idx = (sy * IW + sx) * 4;
        const lum =
          (0.2126 * D[idx] + 0.7152 * D[idx + 1] + 0.0722 * D[idx + 2]) / 255;
        e += wv * ce[i + Ru] * lum;
        o += wv * co[i + Ru] * lum;
        n += wv * gu[i + Ru];
      }
    }
    if (n > 0) {
      e /= n;
      o /= n;
    }
    out[k] = Math.sqrt(e * e + o * o);
  }

  let mx = 0;
  for (let k = 0; k < K; k++) {
    if (out[k] > mx) mx = out[k];
  }

  return { tuning: out, peak: Math.max(1e-6, mx) };
}

/**
 * Draw a Gabor kernel onto a canvas.
 * @param {HTMLCanvasElement} cv – target canvas
 * @param {object} P – parameter object (ori, sf, len)
 * @param {number} procW – processing width
 * @param {number} procH – processing height
 * @param {boolean} coarse – touch device?
 */
export function drawKernel(cv, P, procW, procH, coarse) {
  if (!cv.clientWidth) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(24, Math.round(cv.clientWidth));
  const h = Math.max(20, Math.round(cv.clientHeight));
  const N = Math.round(w * dpr);
  const M = Math.round(h * dpr);
  if (cv.width !== N || cv.height !== M) {
    cv.width = N;
    cv.height = M;
  }

  const ctx = cv.getContext("2d");
  const img = ctx.createImageData(N, M);
  const G = geom(P, procW, procH, coarse);
  const half = Math.max(G.su * 2.6, G.sv * 2.6);
  const sc = half / (Math.min(N, M) / 2);
  const th = (P.ori * Math.PI) / 180;
  const ca = Math.cos(th);
  const sa = Math.sin(th);

  for (let py = 0; py < M; py++) {
    for (let px = 0; px < N; px++) {
      const X = (px - N / 2) * sc;
      const Y = -(py - M / 2) * sc;
      const v = X * ca + Y * sa;
      const u = -X * sa + Y * ca;
      const env = Math.exp(
        -0.5 * ((u * u) / (G.su * G.su) + (v * v) / (G.sv * G.sv))
      );
      const t = Math.max(
        -1,
        Math.min(1, env * Math.cos(2 * Math.PI * G.freq * u) * 1.15)
      );
      const tt = t * 0.5 + 0.5;
      let r, g, b;
      if (tt < 0.5) {
        const a = tt * 2;
        r = (0.031 + (0.086 - 0.031) * a) * 255;
        g = (0.318 + (0.094 - 0.318) * a) * 255;
        b = (0.612 + (0.11 - 0.612) * a) * 255;
      } else {
        const a = (tt - 0.5) * 2;
        r = (0.086 + (0.902 - 0.086) * a) * 255;
        g = (0.094 + (0.475 - 0.094) * a) * 255;
        b = (0.11 + (0.078 - 0.11) * a) * 255;
      }
      const i = (py * N + px) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * Draw the orientation tuning curve on a canvas.
 * @param {HTMLCanvasElement} cv – target canvas
 * @param {{ tuning: Float32Array, peak: number } | null} data – from measureTuningCPU
 * @param {object} P – parameter object
 * @param {object} theme – { bg, grid, text, curve, marker }
 */
export function drawTuningCurve(cv, data, P, theme) {
  if (!cv.clientWidth) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(24, Math.round(cv.clientWidth));
  const h = Math.max(20, Math.round(cv.clientHeight));
  const W = Math.round(w * dpr);
  const H = Math.round(h * dpr);
  if (cv.width !== W || cv.height !== H) {
    cv.width = W;
    cv.height = H;
  }

  const x = cv.getContext("2d");
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  x.fillStyle = theme.bg;
  x.fillRect(0, 0, w, h);

  const roomy = w >= 108;
  const L = roomy ? 16 : 6;
  const R = w - 5;
  const T = 6;
  const B = h - 12;

  x.strokeStyle = theme.grid;
  x.lineWidth = 1;
  x.beginPath();
  if (roomy) {
    x.moveTo(L, T);
    x.lineTo(L, B);
  }
  x.moveTo(L, B);
  x.lineTo(R, B);
  x.stroke();

  x.fillStyle = theme.text;
  x.font = "7.5px ui-monospace, monospace";
  [0, 90, 180].forEach((d) => {
    const px = L + ((R - L) * d) / 180;
    x.beginPath();
    x.moveTo(px, B);
    x.lineTo(px, B + 2);
    x.stroke();
    x.fillText(
      String(d),
      Math.min(w - 13, Math.max(0, px - (d === 0 ? 1 : d === 180 ? 9 : 5))),
      B + 9
    );
  });
  if (roomy) {
    x.save();
    x.translate(8, (T + B) / 2);
    x.rotate(-Math.PI / 2);
    x.fillText("response", -19, 0);
    x.restore();
  }

  if (P.mode === "single") {
    const mx = L + ((R - L) * (P.ori % 180)) / 180;
    x.strokeStyle = theme.marker;
    x.setLineDash([3, 3]);
    x.beginPath();
    x.moveTo(mx, T);
    x.lineTo(mx, B);
    x.stroke();
    x.setLineDash([]);
  }

  if (!data) {
    x.fillStyle = theme.grid;
    x.fillText("no signal", L + 4, (T + B) / 2);
    return null;
  }

  const tuning = data.tuning;
  const tuningPeak = data.peak;
  const K = tuning.length;

  x.strokeStyle = theme.curve;
  x.lineWidth = 1.5;
  x.beginPath();
  for (let k = 0; k < K; k++) {
    const px = L + ((R - L) * k) / K;
    const py = B - (B - T) * (tuning[k] / tuningPeak) * 0.9;
    k ? x.lineTo(px, py) : x.moveTo(px, py);
  }
  x.lineTo(R, B - (B - T) * (tuning[0] / tuningPeak) * 0.9);
  x.stroke();

  let pk = 0;
  for (let k = 1; k < K; k++) {
    if (tuning[k] > tuning[pk]) pk = k;
  }
  x.fillStyle = theme.curve;
  x.beginPath();
  x.arc(L + ((R - L) * pk) / K, B - (B - T) * 0.9, 2.4, 0, 6.284);
  x.fill();

  const orth = tuning[(pk + Math.round(K / 2)) % K];
  const osi = (tuning[pk] - orth) / Math.max(1e-9, tuning[pk] + orth);
  return { osi, peakOri: Math.round((pk * 180) / K) };
}

/**
 * Draw the HSV orientation colour wheel.
 * @param {HTMLCanvasElement} cv – target canvas
 */
export function drawWheel(cv) {
  if (!cv.clientWidth) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(24, Math.round(cv.clientWidth));
  const h = Math.max(20, Math.round(cv.clientHeight));
  const W = Math.round(w * dpr);
  const H = Math.round(h * dpr);
  if (cv.width !== W || cv.height !== H) {
    cv.width = W;
    cv.height = H;
  }

  const x = cv.getContext("2d");
  x.setTransform(1, 0, 0, 1, 0, 0);
  const img = x.createImageData(W, H);
  for (let px = 0; px < W; px++) {
    const [r, g, b] = hsvToRgb(px / W, 0.85, 1);
    for (let py = 0; py < H; py++) {
      const i = (py * W + px) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  x.fillStyle = "rgba(20,23,28,.62)";
  x.fillRect(0, h - 9, w, 9);
  x.fillStyle = "#EFECE4";
  x.font = "7.5px ui-monospace, monospace";
  x.fillText("0°", 2, h - 2);
  x.fillText("90°", w * 0.5 - 6, h - 2);
  x.fillText("180°", w - 19, h - 2);
}

/** HSV → RGB (returns [r,g,b] in 0-255). */
export function hsvToRgb(h, s, v) {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r, g, b;
  switch (i % 6) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    default:
      r = v;
      g = p;
      b = q;
  }
  return [(r * 255) | 0, (g * 255) | 0, (b * 255) | 0];
}

/**
 * Draw the demo stimulus (bars, grating circle, concentric circles).
 * @param {CanvasRenderingContext2D} dctx – demo canvas context
 * @param {number} t – time in seconds
 * @param {ImageData|null} gratingImg – reusable ImageData (created if null)
 * @returns {ImageData} the gratingImg for reuse
 */
export function drawDemo(dctx, t, gratingImg) {
  const W = dctx.canvas.width;
  const H = dctx.canvas.height;
  dctx.fillStyle = "#7c7c7c";
  dctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 14; i++) {
    const a = (i * 37.7) % 180;
    const x = (i * 97) % W;
    const y = (i * 61) % H;
    dctx.save();
    dctx.translate(x, y);
    dctx.rotate((-a * Math.PI) / 180);
    dctx.fillStyle = i % 2 ? "#e9e9e9" : "#1d1d1d";
    dctx.fillRect(-45, -3.5, 90, 7);
    dctx.restore();
  }

  dctx.save();
  dctx.translate(W * 0.3, H * 0.52);
  dctx.rotate(-t * 0.35);
  dctx.fillStyle = "#f4f4f4";
  dctx.fillRect(-130, -8, 260, 16);
  dctx.restore();

  const R = 92;
  const cx = W * 0.72;
  const cy = H * 0.32;
  const per = 26;
  if (!gratingImg) gratingImg = dctx.createImageData(2 * R, 2 * R);
  const d = gratingImg.data;
  const ang = 0.6;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const ph = t * 3.2;
  for (let yy = 0; yy < 2 * R; yy++) {
    for (let xx = 0; xx < 2 * R; xx++) {
      const i = (yy * 2 * R + xx) * 4;
      const dx = xx - R;
      const dy = yy - R;
      const inside = dx * dx + dy * dy < R * R;
      const v = inside
        ? 128 + 118 * Math.cos((2 * Math.PI * (dx * ca + dy * sa)) / per + ph)
        : 124;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = inside ? 255 : 0;
    }
  }
  dctx.putImageData(gratingImg, cx - R, cy - R);

  dctx.save();
  dctx.strokeStyle = "#101010";
  dctx.lineWidth = 5;
  for (let r = 10; r < 95; r += 18) {
    dctx.beginPath();
    dctx.arc(W * 0.76, H * 0.78, r, 0, 6.284);
    dctx.stroke();
  }
  dctx.restore();
  dctx.fillStyle = "#111";
  dctx.font = "600 32px Georgia, serif";
  dctx.fillText("V1", 24, H - 24);

  return gratingImg;
}

/**
 * Choose a base processing resolution.
 * @param {boolean} coarse – touch device?
 * @returns {number}
 */
export function baseRes(coarse) {
  if (coarse) return 336;
  const px =
    Math.max(screen.width, screen.height) * (window.devicePixelRatio || 1);
  return px >= 1800 ? 560 : 464;
}
