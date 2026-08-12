/**
 * Naka–Rushton contrast-response function and helpers.
 *
 * Extracted from contrast_response_gain_widget.html for testability.
 * Used by ContrastResponseGainView.vue (OPENBRAIN-13).
 *
 * The Naka-Rushton function models a V4 neuron's contrast-response:
 *   R(c) = BASE + (RMAX - BASE) × c^n / (c^n + C50^n)
 *
 * Parameters are schematic (hypothetical V4 neuron from Reynolds,
 * Pasternak & Desimone 2000, Fig 1).
 */

export const RMAX = 40;
export const BASE = 3;
export const C50 = 20;
export const N = 2.2;

/** Naka-Rushton contrast-response function. */
export function naka(c) {
  const cn = Math.pow(c, N);
  const c50n = Math.pow(C50, N);
  return BASE + ((RMAX - BASE) * cn) / (cn + c50n);
}

/**
 * Inverse Naka-Rushton: contrast at which response fraction = p
 * (where p is the fraction of the way from BASE to RMAX).
 */
export function invNaka(p) {
  return C50 * Math.pow(p / (1 - p), 1 / N);
}

/** Dynamic-range band edges (10% and 90% of response range). */
export const bandLo = invNaka(0.1);
export const bandHi = invNaka(0.9);

/**
 * Compute attended response under either model.
 * @param {number} c - contrast
 * @param {'shift'|'scale'} mode - attention model
 * @param {number} strength - attention multiplier (typically 1.0–2.2)
 */
export function computeAttended(c, mode, strength) {
  if (mode === "shift") {
    return naka(c * strength);
  }
  return BASE + strength * (naka(c) - BASE);
}

/** Ceiling utility: round up to nearest step, minimum one step. */
export function niceCeil(v, step) {
  return Math.max(step, Math.ceil(v / step) * step);
}
