/**
 * Normalization model of attention (Reynolds & Heeger 2009) — the maths of
 * Arjun Krishnaswamy's normalization_model_widget_v2.html, lifted out
 * unchanged so it can be tested. Used by NormalizationModelView.vue
 * (OPENBRAIN-88).
 *
 * The model lives on a small neural image: GW positions × GH preferred
 * orientations. Stimulus drive E is a sum of Gaussian blobs, the attention
 * field A = 1 + gain·gauss(x)·gauss(θ), the suppressive drive S is the
 * attention-weighted drive E·A pooled (separable Gaussian blur) over space
 * and orientation, and the population response is R = E·A / (S + σ) + b.
 *
 * The contrast-response panel is a separate closed-form sketch per mode
 * (it does not read the neural image), exactly as in the original.
 *
 * `state` has the original's shape:
 *   { pos, width, height, feature }   slider values, 0–100
 *   mode           'one' | 'two' | 'feature'
 *   outsideOrient  'same' | 'orthogonal' | 'diagonal'
 *   isolateNonpref boolean (two-stimulus mode only)
 */

export const GW = 60; // spatial positions
export const GH = 40; // preferred orientations
/** The recorded neuron (yellow cross-hair): right stimulus, preferred θ. */
export const RX = Math.round(GW * 0.72);
export const RT = Math.round(GH / 2);

export const DEFAULT_STATE = Object.freeze({
  pos: 70,
  width: 30,
  height: 80,
  feature: 50,
  mode: "two",
  outsideOrient: "same",
  isolateNonpref: false,
});

/** Unnormalised Gaussian. */
export function gaussF(x, c, s) {
  return Math.exp(-((x - c) * (x - c)) / (2 * s * s));
}

/** Feature slider readout: attended orientation in degrees. */
export function featureDegrees(feature) {
  return Math.round((feature / 100) * 180);
}

/** Height slider readout: orientation bandwidth of the attention field. */
export function heightDegrees(height) {
  const sigH = 1.5 + (height / 100) * 26;
  return Math.round(sigH * 4.5);
}

/** Spatial spread of each stimulus: wide RF in two-stimulus mode. */
export function stimSigmaX(mode) {
  return mode === "two" ? 16 : 3;
}

/** The stimuli on the neural image, as { cx, tp } (position, orientation). */
export function stimuli(state) {
  const thetaMain = GH / 2;
  if (state.mode === "two") {
    if (state.isolateNonpref) return [{ cx: GW * 0.28, tp: 0 }];
    return [
      { cx: GW * 0.28, tp: 0 },
      { cx: GW * 0.72, tp: thetaMain },
    ];
  }
  if (state.mode === "feature") {
    const outT =
      state.outsideOrient === "orthogonal"
        ? 0
        : state.outsideOrient === "diagonal"
          ? 10
          : thetaMain;
    return [
      { cx: GW * 0.28, tp: outT },
      { cx: GW * 0.72, tp: thetaMain },
    ];
  }
  return [{ cx: GW * 0.72, tp: thetaMain }];
}

/** Stimulus drive E[x][θ]. */
export function computeE(state) {
  const E = [];
  const sigEx = stimSigmaX(state.mode);
  const sigEtheta = 4;
  const list = stimuli(state);
  for (let x = 0; x < GW; x++) {
    E[x] = [];
    for (let t = 0; t < GH; t++) {
      let v = 0;
      for (let i = 0; i < list.length; i++) {
        v += gaussF(x, list[i].cx, sigEx) * gaussF(t, list[i].tp, sigEtheta);
      }
      E[x][t] = v;
    }
  }
  return E;
}

export const ATTN_GAIN = 2.5;
const SUPP_SIG_X = 9;
const SUPP_SIG_THETA = 13;
const SIGMA0 = 0.12;
const BASELINE_UNMOD = 0.06;

/** All four neural images: stimulus drive, attention field, suppressive
 *  drive and population response, each indexed [x][θ]. */
export function computeGrids(state) {
  const E = computeE(state);
  const posX = (state.pos / 100) * GW;
  const thetaC = (state.feature / 100) * GH;
  const sigW = 2 + (state.width / 100) * 40;
  const sigH = 1.5 + (state.height / 100) * 26;
  const A = [];
  const Eexc = [];
  for (let x = 0; x < GW; x++) {
    A[x] = [];
    Eexc[x] = [];
    const ax = gaussF(x, posX, sigW);
    for (let t = 0; t < GH; t++) {
      const a = 1 + ATTN_GAIN * ax * gaussF(t, thetaC, sigH);
      A[x][t] = a;
      Eexc[x][t] = E[x][t] * a;
    }
  }

  // Suppressive pool: separable Gaussian blur, orientation then space,
  // renormalised at the edges.
  const kx = Math.ceil(SUPP_SIG_X * 2);
  const kt = Math.ceil(SUPP_SIG_THETA * 2);
  const wx = [];
  for (let i = -kx; i <= kx; i++) {
    wx.push(Math.exp(-(i * i) / (2 * SUPP_SIG_X * SUPP_SIG_X)));
  }
  const wt = [];
  for (let j = -kt; j <= kt; j++) {
    wt.push(Math.exp(-(j * j) / (2 * SUPP_SIG_THETA * SUPP_SIG_THETA)));
  }
  const tmp = [];
  for (let x = 0; x < GW; x++) {
    tmp[x] = [];
    for (let t = 0; t < GH; t++) {
      let sum = 0;
      let wsum = 0;
      for (let j = -kt; j <= kt; j++) {
        const tt = t + j;
        if (tt < 0 || tt >= GH) continue;
        const wv = wt[j + kt];
        sum += Eexc[x][tt] * wv;
        wsum += wv;
      }
      tmp[x][t] = sum / wsum;
    }
  }
  const S = [];
  for (let x = 0; x < GW; x++) S[x] = [];
  for (let t = 0; t < GH; t++) {
    for (let x = 0; x < GW; x++) {
      let sum = 0;
      let wsum = 0;
      for (let i = -kx; i <= kx; i++) {
        const xx = x + i;
        if (xx < 0 || xx >= GW) continue;
        const wv = wx[i + kx];
        sum += tmp[xx][t] * wv;
        wsum += wv;
      }
      S[x][t] = sum / wsum;
    }
  }

  const R = [];
  for (let x = 0; x < GW; x++) {
    R[x] = [];
    for (let t = 0; t < GH; t++) {
      R[x][t] = Eexc[x][t] / (S[x][t] + SIGMA0) + BASELINE_UNMOD;
    }
  }
  return { E, A, S, R };
}

/** Largest value of a grid, or 1 if it is all zero (the original's
 *  normalize2D). */
export function gridMax(grid) {
  let max = 0;
  for (let x = 0; x < grid.length; x++) {
    for (let t = 0; t < grid[x].length; t++) {
      if (grid[x][t] > max) max = grid[x][t];
    }
  }
  return max || 1;
}

/** Response of the marked neuron. */
export function markedResponse(grids) {
  return grids.R[RX][RT];
}

/**
 * Greyscale RGBA pixels for one panel: row-major (θ rows, x columns),
 * grey = lo + v·(hi − lo), clamped to 0–255. `valueFn(x, t)` is the
 * normalised value. A Uint8ClampedArray, so it rounds exactly like the
 * original's ImageData writes.
 */
export function panelPixels(valueFn, lo, hi, gw = GW, gh = GH) {
  const data = new Uint8ClampedArray(gw * gh * 4);
  for (let t = 0; t < gh; t++) {
    for (let x = 0; x < gw; x++) {
      const v = valueFn(x, t);
      const g = Math.max(0, Math.min(255, lo + v * (hi - lo)));
      const i = (t * gw + x) * 4;
      data[i] = g;
      data[i + 1] = g;
      data[i + 2] = g;
      data[i + 3] = 255;
    }
  }
  return data;
}

/** The four panels as { values, lo, hi } in the original's grey ranges. */
export function panelSpecs(grids) {
  const maxA = ATTN_GAIN;
  const maxS = gridMax(grids.S);
  const maxR = gridMax(grids.R);
  const maxE = gridMax(grids.E);
  return {
    stimdrive: { fn: (x, t) => grids.E[x][t] / maxE, lo: 20, hi: 235 },
    attnfield: { fn: (x, t) => (grids.A[x][t] - 1) / maxA, lo: 140, hi: 245 },
    suppdrive: { fn: (x, t) => grids.S[x][t] / maxS, lo: 20, hi: 200 },
    popresp: { fn: (x, t) => grids.R[x][t] / maxR, lo: 16, hi: 240 },
  };
}

export const CRF_PTS = 51;

/**
 * Contrast-response curves (attended, ignored) over log contrast
 * 0.001–1, per mode:
 *   one      attended = αγc / (γcp + c(1−p) + σ), p = attention width
 *            (0 → response gain, 1 → contrast gain)
 *   two      a non-preferred stimulus (contrast cn) adds βcn to the
 *            denominator; attention scales the preferred one by γ
 *   feature  γ_eff = 1 + (γ − 1)·gauss(feature, 50, 20): the gain falls off
 *            as the attended orientation leaves the preferred one
 * `maxVal` is the shared y scale (peak × 1.05).
 */
export function crfCurves(state) {
  const alpha = 1;
  const sigma = 0.04;
  const gamma = 2.5;
  const pts = CRF_PTS;
  const att = [];
  const ign = [];
  let maxVal = 0;
  const logMin = Math.log(0.001);
  const logMax = Math.log(1);
  const cs = [];
  for (let i = 0; i < pts; i++) {
    cs.push(Math.exp(logMin + (i / (pts - 1)) * (logMax - logMin)));
  }

  let attAt;
  let ignAt;
  if (state.mode === "one") {
    const p = state.width / 100;
    ignAt = (c) => (alpha * c) / (c + sigma);
    attAt = (c) => (alpha * gamma * c) / (gamma * c * p + c * (1 - p) + sigma);
  } else if (state.mode === "two") {
    const beta = 0.5;
    const cn = 0.4;
    ignAt = (c) => (alpha * c) / (c + beta * cn + sigma);
    attAt = (c) => (alpha * gamma * c) / (gamma * c + beta * cn + sigma);
  } else {
    const effGamma = effectiveGamma(state.feature, gamma);
    ignAt = (c) => (alpha * c) / (c + sigma);
    attAt = (c) => (alpha * effGamma * c) / (c + sigma);
  }
  for (let i = 0; i < pts; i++) {
    const a = attAt(cs[i]);
    const g = ignAt(cs[i]);
    att.push(a);
    ign.push(g);
    if (a > maxVal) maxVal = a;
    if (g > maxVal) maxVal = g;
  }
  maxVal *= 1.05;
  return { att, ign, maxVal, cs };
}

/** γ_eff for the one-in / one-outside mode (feature-similarity gain). */
export function effectiveGamma(feature, gamma = 2.5) {
  return 1 + (gamma - 1) * gaussF(feature, 50, 20);
}

/** SVG path for a curve in the 320×300 chart (plot box x 30–300, y 20–260). */
export function toPath(vals, maxVal, pts = CRF_PTS) {
  let d = "";
  for (let k = 0; k < vals.length; k++) {
    const svgX = 30 + (k / (pts - 1)) * 270;
    const svgY = 260 - (vals[k] / maxVal) * 240;
    d += (k === 0 ? "M" : "L") + svgX + "," + svgY + " ";
  }
  return d;
}

/** Stimulus schematic geometry: the dashed attention circle, the RF circle
 *  and the rotation of the left grating. */
export function schematic(state) {
  const attnX = 140 + (state.pos / 100) * 100;
  const attnR = 10 + (state.width / 100) * 38;
  const rf = state.mode === "two" ? { cx: 191, r: 42 } : { cx: 220, r: 18 };
  let rotAngle = 0;
  if (state.mode === "two") rotAngle = 90;
  else if (state.mode === "feature") {
    rotAngle =
      state.outsideOrient === "orthogonal"
        ? 90
        : state.outsideOrient === "diagonal"
          ? 45
          : 0;
  }
  return {
    attnX,
    attnR,
    rfCx: rf.cx,
    rfR: rf.r,
    rotAngle,
    showLeftGrating: state.mode === "two" || state.mode === "feature",
  };
}
