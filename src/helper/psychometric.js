/**
 * Psychometric function — the model from Arjun Krishnaswamy's
 * psychometric_function_widget.html (Attention & Working Memory chapter),
 * extracted so the Vue port and its tests share one copy.
 *
 *   psi(x) = gamma + (1 − gamma − lambda) · logistic((x − alpha) / beta)
 *
 * alpha = threshold (the logistic's midpoint), beta = slope scale,
 * gamma = guess rate (the floor: "yes" with no stimulus), lambda = lapse
 * rate (the gap below the ceiling).
 *
 * OPENBRAIN-88: the preset values and the formula are the author's; do not
 * tune them. Only the code structure changed (named exports, JSDoc).
 */

/**
 * @typedef {Object} PsychometricParams
 * @property {number} alpha  Threshold (stimulus strength at the logistic midpoint)
 * @property {number} beta   Slope scale (smaller = steeper)
 * @property {number} gamma  Guess rate (lower asymptote)
 * @property {number} lambda Lapse rate (1 − upper asymptote)
 */

/** @type {Record<"baseline"|"threshold"|"bias"|"lapse", PsychometricParams>} */
export const PRESETS = Object.freeze({
  baseline: Object.freeze({ alpha: 50, beta: 6, gamma: 0.02, lambda: 0.02 }),
  threshold: Object.freeze({ alpha: 32, beta: 6, gamma: 0.02, lambda: 0.02 }),
  bias: Object.freeze({ alpha: 35.2, beta: 4.85, gamma: 0.25, lambda: 0.02 }),
  lapse: Object.freeze({ alpha: 50, beta: 6, gamma: 0.02, lambda: 0.22 }),
});

/**
 * Probability of a "yes" response at stimulus strength x.
 * @param {number} x Stimulus strength (0–100 in the widget)
 * @param {PsychometricParams} p
 * @returns {number}
 */
export function psi(x, p) {
  const f = 1 / (1 + Math.exp(-(x - p.alpha) / p.beta));
  return p.gamma + (1 - p.gamma - p.lambda) * f;
}

/**
 * The curve's value at its threshold — halfway between floor and ceiling,
 * where the widget draws the dashed threshold marker.
 * @param {PsychometricParams} p
 * @returns {number}
 */
export function halfPoint(p) {
  return p.gamma + (1 - p.gamma - p.lambda) * 0.5;
}
