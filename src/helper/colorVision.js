/**
 * Color vision — colour science maths extracted from Stuart Trenholm's
 * color-vision-widget.html for testability and reuse.
 *
 * All functions are pure, stateless, and dependency-free.
 *
 * OPENBRAIN-14: Do not modify the numerical algorithms — they are the
 * author's pedagogy. Only the code structure changed (named exports,
 * JSDoc, guard clauses).
 *
 * Sources cited in the original widget:
 *   - Cone fundamentals: Stockman & Sharpe (2000), Vision Research 40,
 *     1711–1737, via the CVRL database (cvrl.org).
 *   - Dichromacy simulation: Viénot, Brettel & Mollon (1999).
 *   - Wavelength-to-RGB: Bruton's approximation.
 */

/* ================================================================
   sRGB transfer functions
   ================================================================ */

/**
 * sRGB linearisation lookup — maps 0-255 byte to linear-light float.
 * @type {Float32Array}
 */
export const LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Encode linear-light value (0–1) to sRGB byte (0–255).
 * @param {number} v - linear-light value
 * @returns {number} sRGB byte
 */
export function encode(v) {
  if (v <= 0) return 0;
  if (v >= 1) return 255;
  const s = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(s * 255)));
}

/**
 * Three sRGB bytes → "#rrggbb" hex string.
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {string}
 */
export function hex(r, g, b) {
  return (
    "#" +
    [r, g, b]
      .map(function (x) {
        return ("0" + x.toString(16)).slice(-2);
      })
      .join("")
  );
}

/* ================================================================
   Bruton's wavelength → RGB approximation
   ================================================================ */

/**
 * Convert a visible wavelength (380–750 nm) to an sRGB triplet.
 * Includes the intensity roll-off at spectrum ends that the original
 * notebook declared but never applied.
 * @param {number} w - wavelength in nm
 * @returns {number[]} [r, g, b] each 0–255
 */
export function wavelengthRGB(w) {
  let R = 0,
    G = 0,
    B = 0;
  if (w >= 380 && w < 440) {
    R = -(w - 440) / 60;
    B = 1;
  } else if (w < 490) {
    G = (w - 440) / 50;
    B = 1;
  } else if (w < 510) {
    G = 1;
    B = -(w - 510) / 20;
  } else if (w < 580) {
    R = (w - 510) / 70;
    G = 1;
  } else if (w < 645) {
    R = 1;
    G = -(w - 645) / 65;
  } else if (w <= 750) {
    R = 1;
  }
  let f = 1;
  if (w >= 380 && w < 420) f = 0.3 + (0.7 * (w - 380)) / 40;
  else if (w > 700) f = 0.3 + (0.7 * (750 - w)) / 50;
  const g = 0.8;
  return [
    Math.round(255 * Math.pow(R * f, g)),
    Math.round(255 * Math.pow(G * f, g)),
    Math.round(255 * Math.pow(B * f, g)),
  ];
}

/* ================================================================
   Stockman & Sharpe (2000) 2-deg cone fundamentals
   ================================================================ */

/** First wavelength in the table (nm). */
export const CONE_LO = 380;
/** Step between table entries (nm). */
export const CONE_STEP = 2;
/** Peak sensitivity wavelengths (nm). */
export const CONE_PEAK = { L: 570, M: 543, S: 442 };

/**
 * Stockman & Sharpe 2° cone fundamentals — linear energy units, each
 * normalised to unit peak, tabulated every 2 nm from 380 to 750 nm.
 * Source: CVRL database (cvrl.org). Values below 390 nm are log-linearly
 * extrapolated from the 390-400 nm slope.
 */
export const CONE_TAB = {
  L: [
    0.0001, 0.0001, 0.0001, 0.0002, 0.0003, 0.0004, 0.0006, 0.0009, 0.0013,
    0.0018, 0.0024, 0.0032, 0.0042, 0.0055, 0.007, 0.0087, 0.0105, 0.0124,
    0.0144, 0.0164, 0.0184, 0.0203, 0.022, 0.0239, 0.026, 0.0282, 0.0305,
    0.0329, 0.0354, 0.0379, 0.0403, 0.0423, 0.044, 0.0459, 0.0478, 0.0499,
    0.0519, 0.0541, 0.0568, 0.0602, 0.0647, 0.0704, 0.0771, 0.0844, 0.0919,
    0.0995, 0.1071, 0.1148, 0.1229, 0.1313, 0.1401, 0.1494, 0.159, 0.1689,
    0.1795, 0.1916, 0.2062, 0.2234, 0.243, 0.2648, 0.289, 0.3155, 0.3444,
    0.3755, 0.4087, 0.4437, 0.4801, 0.5175, 0.5555, 0.593, 0.6286, 0.6609,
    0.6905, 0.7187, 0.7456, 0.7706, 0.7933, 0.8148, 0.8369, 0.8597, 0.881,
    0.8991, 0.9133, 0.9239, 0.932, 0.9402, 0.9504, 0.961, 0.9697, 0.9761,
    0.9814, 0.987, 0.9922, 0.9964, 0.999, 1, 0.9991, 0.9955, 0.9881, 0.9783,
    0.9694, 0.9636, 0.9587, 0.9516, 0.941, 0.9277, 0.9124, 0.8952, 0.8762,
    0.8557, 0.834, 0.8115, 0.7877, 0.762, 0.7345, 0.7057, 0.6762, 0.6461,
    0.6153, 0.5845, 0.5542, 0.5248, 0.4952, 0.4643, 0.4323, 0.4007, 0.3704,
    0.3416, 0.3145, 0.2892, 0.2658, 0.2441, 0.2234, 0.2033, 0.1837, 0.1651,
    0.1479, 0.1321, 0.1177, 0.1047, 0.093, 0.0824, 0.0729, 0.0644, 0.0567,
    0.0499, 0.0438, 0.0383, 0.0335, 0.0292, 0.0254, 0.022, 0.0191, 0.0164,
    0.0141, 0.0122, 0.0105, 0.0091, 0.0079, 0.0068, 0.0059, 0.0051, 0.0044,
    0.0038, 0.0033, 0.0028, 0.0024, 0.0021, 0.0018, 0.0015, 0.0013, 0.0011,
    0.001, 0.0009, 0.0007, 0.0006, 0.0006, 0.0005, 0.0004, 0.0004, 0.0003,
    0.0003, 0.0002, 0.0002, 0.0002, 0.0002,
  ],
  M: [
    0.0001, 0.0001, 0.0001, 0.0002, 0.0003, 0.0004, 0.0005, 0.0008, 0.0012,
    0.0016, 0.0023, 0.0031, 0.0041, 0.0054, 0.0069, 0.0088, 0.0109, 0.0133,
    0.0159, 0.0187, 0.0217, 0.0247, 0.0279, 0.0313, 0.0352, 0.0395, 0.0442,
    0.0492, 0.0545, 0.0597, 0.0648, 0.0694, 0.0737, 0.0781, 0.0826, 0.0871,
    0.0913, 0.0957, 0.101, 0.1078, 0.1163, 0.1266, 0.1383, 0.1508, 0.1635,
    0.1759, 0.1879, 0.1996, 0.2113, 0.2233, 0.2358, 0.2485, 0.2616, 0.2746,
    0.2881, 0.3036, 0.3226, 0.3448, 0.3699, 0.3975, 0.4278, 0.4609, 0.4968,
    0.5349, 0.5746, 0.6155, 0.6569, 0.6984, 0.7398, 0.78, 0.8166, 0.8476,
    0.8737, 0.8969, 0.9178, 0.9357, 0.9503, 0.9628, 0.9749, 0.9864, 0.9952,
    0.9996, 0.9992, 0.9941, 0.9859, 0.9772, 0.9699, 0.9618, 0.9502, 0.9347,
    0.9177, 0.9009, 0.883, 0.8626, 0.8391, 0.8135, 0.7862, 0.7564, 0.7234,
    0.6882, 0.6533, 0.6202, 0.5884, 0.5568, 0.5249, 0.4926, 0.4599, 0.4273,
    0.3954, 0.3644, 0.3344, 0.3056, 0.2781, 0.2521, 0.2278, 0.2053, 0.1844,
    0.1653, 0.1476, 0.1314, 0.1166, 0.1032, 0.0911, 0.0803, 0.0707, 0.0621,
    0.0544, 0.0476, 0.0416, 0.0362, 0.0314, 0.0271, 0.0234, 0.0203, 0.0177,
    0.0154, 0.0134, 0.0115, 0.0099, 0.0085, 0.0073, 0.0063, 0.0054, 0.0046,
    0.004, 0.0034, 0.003, 0.0026, 0.0022, 0.0019, 0.0016, 0.0014, 0.0012, 0.001,
    0.0009, 0.0008, 0.0007, 0.0006, 0.0005, 0.0004, 0.0004, 0.0003, 0.0003,
    0.0002, 0.0002, 0.0002, 0.0002, 0.0001, 0.0001, 0.0001, 0.0001, 0.0001,
    0.0001, 0.0001, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ],
  S: [
    0.0016, 0.0023, 0.0033, 0.0047, 0.0067, 0.0095, 0.0138, 0.0199, 0.0285,
    0.0404, 0.0566, 0.0781, 0.1059, 0.1408, 0.1833, 0.233, 0.2887, 0.3494,
    0.4141, 0.4804, 0.5436, 0.5993, 0.6496, 0.7002, 0.7527, 0.8026, 0.8454,
    0.8841, 0.9238, 0.9629, 0.991, 1, 0.9956, 0.9874, 0.9763, 0.9554, 0.9208,
    0.88, 0.842, 0.8109, 0.7867, 0.7684, 0.7498, 0.7244, 0.6896, 0.6464, 0.5966,
    0.5434, 0.4896, 0.438, 0.3903, 0.3476, 0.3087, 0.2726, 0.2399, 0.2119,
    0.1887, 0.1692, 0.1524, 0.1372, 0.1228, 0.1089, 0.0954, 0.0825, 0.0708,
    0.0608, 0.0528, 0.0459, 0.0398, 0.0342, 0.0292, 0.0249, 0.0211, 0.0178,
    0.015, 0.0126, 0.0106, 0.0089, 0.0074, 0.0061, 0.0051, 0.0042, 0.0035,
    0.0029, 0.0024, 0.002, 0.0016, 0.0013, 0.0011, 0.0009, 0.0007, 0.0006,
    0.0005, 0.0004, 0.0003, 0.0003, 0.0002, 0.0002, 0.0002, 0.0001, 0.0001,
    0.0001, 0.0001, 0.0001, 0.0001, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ],
};

/**
 * Interpolated cone sensitivity for class k at wavelength w.
 * @param {'L'|'M'|'S'} k - cone class
 * @param {number} w - wavelength in nm
 * @returns {number} sensitivity (0–1)
 */
export function coneSens(k, w) {
  const a = CONE_TAB[k];
  const t = (w - CONE_LO) / CONE_STEP;
  if (t <= 0) return a[0];
  if (t >= a.length - 1) return a[a.length - 1];
  const i = Math.floor(t);
  return a[i] + (a[i + 1] - a[i]) * (t - i);
}

/* ================================================================
   Viénot, Brettel & Mollon (1999) dichromacy simulation
   ================================================================ */

/** sRGB → LMS transformation matrix (flat row-major 3×3). */
export const RGB2LMS = [
  17.8824, 43.5161, 4.11935, 3.45565, 27.1554, 3.86714, 0.0299566, 0.184309,
  1.46709,
];

/** LMS → sRGB transformation matrix (flat row-major 3×3). */
export const LMS2RGB = [
  0.080944, -0.130504, 0.116721, -0.010248, 0.054019, -0.113614, -0.000365,
  -0.00412, 0.693513,
];

/**
 * Simulate a colour vision deficiency on raw pixel data.
 *
 * @param {ImageData} srcData - source image data
 * @param {number} width - image width
 * @param {number} height - image height
 * @param {'protan'|'deutan'|'tritan'|'achroma'} mode - deficiency type
 * @param {number} amount - severity 0–1
 * @returns {ImageData} new ImageData with simulated deficiency
 */
export function simulate(srcData, width, height, mode, amount) {
  const s = srcData.data;
  const out = new ImageData(width, height);
  const o = out.data;
  for (let i = 0; i < s.length; i += 4) {
    const r = LIN[s[i]],
      g = LIN[s[i + 1]],
      b = LIN[s[i + 2]];
    let nr, ng, nb;
    if (mode === "achroma") {
      const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      nr = ng = nb = y;
    } else {
      let L = RGB2LMS[0] * r + RGB2LMS[1] * g + RGB2LMS[2] * b;
      let M = RGB2LMS[3] * r + RGB2LMS[4] * g + RGB2LMS[5] * b;
      let S = RGB2LMS[6] * r + RGB2LMS[7] * g + RGB2LMS[8] * b;
      if (mode === "protan") L = 2.02344 * M - 2.52581 * S;
      else if (mode === "deutan") M = 0.494207 * L + 1.24827 * S;
      else S = -0.395913 * L + 0.801109 * M;
      nr = LMS2RGB[0] * L + LMS2RGB[1] * M + LMS2RGB[2] * S;
      ng = LMS2RGB[3] * L + LMS2RGB[4] * M + LMS2RGB[5] * S;
      nb = LMS2RGB[6] * L + LMS2RGB[7] * M + LMS2RGB[8] * S;
    }
    // blend in linear light so partial severity stays photometrically sane
    o[i] = encode(r + (nr - r) * amount);
    o[i + 1] = encode(g + (ng - g) * amount);
    o[i + 2] = encode(b + (nb - b) * amount);
    o[i + 3] = s[i + 3];
  }
  return out;
}

/* ================================================================
   Luminance-matched swatch generation (Ishihara plate)
   ================================================================ */

/**
 * HSL → linear RGB (not sRGB-encoded).
 * @param {number} h - hue 0–360
 * @param {number} s - saturation 0–1
 * @param {number} l - lightness 0–1
 * @returns {number[]} [r, g, b] in linear light (0–1)
 */
export function hsl2lin(h, s, l) {
  h /= 360;
  function f(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [f(p, q, h + 1 / 3), f(p, q, h), f(p, q, h - 1 / 3)].map(function (c) {
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
}

/**
 * Generate an sRGB CSS colour string at a specific relative luminance Y.
 * Used to ensure figure vs. ground in pseudoisochromatic plates is
 * equiluminant, so the only separating cue is chromatic.
 * @param {number} h - hue 0–360
 * @param {number} s - saturation 0–1
 * @param {number} targetY - desired relative luminance
 * @returns {string} "rgb(r, g, b)" CSS string
 */
export function swatchAtY(h, s, targetY) {
  let c = hsl2lin(h, s, 0.5);
  const y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const k = targetY / y;
  c = [c[0] * k, c[1] * k, c[2] * k];
  const peak = Math.max(c[0], c[1], c[2]);
  if (peak > 1) {
    c = [c[0] / peak, c[1] / peak, c[2] / peak];
  }
  return "rgb(" + encode(c[0]) + "," + encode(c[1]) + "," + encode(c[2]) + ")";
}

/* ================================================================
   EM spectrum sine-wave SVG path builder
   ================================================================ */

/**
 * Build the SVG `d` attribute for a compressing sine wave representing
 * the electromagnetic spectrum (low-frequency radio on the left,
 * high-frequency gamma on the right).
 * @param {number} x0 - left edge x
 * @param {number} x1 - right edge x
 * @param {number} yc - vertical centre
 * @param {number} amp - maximum amplitude
 * @returns {string} SVG path d-string
 */
export function buildEmWavePath(x0, x1, yc, amp) {
  const d = [];
  for (let x = x0; x <= x1; x += 1.6) {
    const t = (x - x0) / (x1 - x0);
    const phase = 2 * Math.PI * (1.1 * t + 13 * Math.pow(t, 2.35));
    const a = amp * (0.42 + 0.58 * Math.pow(1 - t, 0.35));
    d.push(
      (x === x0 ? "M" : "L") +
        x.toFixed(1) +
        " " +
        (yc - a * Math.sin(phase)).toFixed(1)
    );
  }
  return d.join(" ");
}
