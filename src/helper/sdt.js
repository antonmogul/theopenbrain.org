/**
 * Signal Detection Theory — statistical maths extracted from Arjun's
 * sdt_widget.html for testability and reuse across the SDT Vue widget.
 *
 * All functions are pure, stateless, and dependency-free.
 *
 * OPENBRAIN-13: Do not modify the numerical algorithms — they are the
 * author's pedagogy. Only the code structure changed (named exports,
 * JSDoc, guard clauses).
 */

/**
 * Error function (Abramowitz–Stegun approximation 7.1.26).
 * Maximum error |ε| < 1.5 × 10⁻⁷.
 * @param {number} x
 * @returns {number}
 */
export function erf(x) {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

/**
 * Standard normal CDF: Φ(x) = P(Z ≤ x).
 * @param {number} x
 * @returns {number}
 */
export function Phi(x) {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

/**
 * Inverse standard normal CDF (Acklam's algorithm).
 * Returns z such that Φ(z) = p.
 * Clamped to [−6, 6] at the boundaries.
 * @param {number} p — probability in (0, 1)
 * @returns {number}
 */
export function Phinv(p) {
  if (p <= 0) return -6;
  if (p >= 1) return 6;

  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];

  const pl = 0.02425;
  const ph = 1 - pl;

  if (p < pl) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }

  if (p <= ph) {
    const q = p - 0.5;
    const r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) *
        q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }

  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(
    (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}

/**
 * Standard normal PDF: φ(x) = (1/√2π) e^(−x²/2).
 * @param {number} x
 * @returns {number}
 */
export function pdf(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Compute SDT outcome rates given d′ and criterion k.
 * @param {number} dp — d-prime (sensitivity)
 * @param {number} k  — criterion position on the evidence axis
 * @returns {{ hitRate: number, falseAlarmRate: number, dPrime: number, criterion: number }}
 */
export function sdtRates(dp, k) {
  const falseAlarmRate = Phi(-k);
  const hitRate = Phi(dp - k);
  const criterion = k - dp / 2; // bias: +ve = conservative
  return { hitRate, falseAlarmRate, dPrime: dp, criterion };
}
