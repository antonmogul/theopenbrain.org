/**
 * tailwind-rebase.cjs — Phase 2 of the `font-size: 62.5%` removal.
 *
 * BACKGROUND
 * ----------
 * Phase 1 (scripts/convert-rem.mjs) divided every *authored* rem literal in
 * `src/` + tailwind.config.js by 1.6, so that after the 62.5% root hack is
 * removed (10px base → 16px base) those values render the SAME pixels as before.
 *
 * But Tailwind's *default* utility scale (spacing/fontSize/lineHeight/
 * borderRadius/…) lives in Tailwind CORE, not in `src/`, so the Phase-1 codemod
 * never touched it. At the old 10px base, `p-4` = 1rem = 10px; at the new 16px
 * base the same `p-4` = 1rem = 16px = 1.6× too big. ~730 elements on Chapter 1
 * regressed for exactly this reason (see docs/font-refactor/SESSION-REPORT.md).
 *
 * THE FIX (this file)
 * -------------------
 * Rebase Tailwind's default rem-based scales by ÷1.6, so each utility resolves
 * to the SAME PIXEL value at the new 16px base as it did at the old 10px base.
 * Proof of invariance, identical to Phase 1: a utility sized `X rem` renders at
 * `X * base_px`. Before: `X * 10`. After ÷1.6 at the new base:
 * `(X/1.6) * 16 = X * 10`. Identical. ∎
 *
 * This is applied as a programmatic, hard OVERRIDE of the affected default
 * scales in tailwind.config.js — NOT `theme.extend` (extend would merge and the
 * original rem values would survive). It is derived, not hand-typed, so it is
 * complete and auditable: we import Tailwind's own default theme and divide
 * every rem literal we find.
 *
 * SCOPE — only scales that carry their own rem literals are rebased:
 *   - spacing      → the MASTER scale. padding, margin, gap, inset, width,
 *                    height, size, translate, space, scroll-margin/padding,
 *                    basis, etc. are defined in core as
 *                    `theme => theme('spacing')`, so overriding spacing
 *                    cascades to all of them automatically.
 *   - fontSize     → own rem literals, incl. the lineHeight sub-value in each
 *                    [size, {lineHeight, ...}] tuple.
 *   - lineHeight   → own rem literals (keys 3–10).
 *   - borderRadius → own rem literals.
 *   - maxWidth     → spacing keys (cascade) PLUS its own xs–7xl rem keys.
 *   - columns      → own 3xs–7xl rem keys (0 uses today, rebased for safety).
 * Non-rem values (px, %, vw, ch, calc without rem, keywords) pass through
 * untouched. rem inside a calc() is divided in place.
 *
 * The ÷1.6 arithmetic reuses the exact-decimal approach proven in Phase 1:
 * ×0.625 (= 5/8, exactly representable) then Number.toString() (shortest
 * round-tripping decimal), with a per-token round-trip assertion.
 */

const resolveConfig = require("tailwindcss/resolveConfig");

// Fully-resolved DEFAULT theme: every `theme => …` closure (maxWidth, gap,
// padding, …) is already evaluated to a flat scale object here, so we never
// have to emulate Tailwind's `theme()` resolver ourselves. We resolve an EMPTY
// config so these are the pristine Tailwind-core defaults, independent of this
// project's own tailwind.config.js (which we're about to rewrite).
const DEFAULT_THEME = resolveConfig({ content: [] }).theme;

const FACTOR = 1.6;

/** Divide a single rem literal string "Nrem" by 1.6, exactly. Returns "Mrem". */
function convertRemLiteral(remStr) {
  const m = /^(-?\d*\.?\d+)rem$/.exec(remStr);
  if (!m) throw new Error(`convertRemLiteral: not a bare rem literal: ${remStr}`);
  const value = parseFloat(m[1]);
  // ×0.625 is exact in IEEE-754 (0.625 = 5/8 = 5 / 2^3); avoids /1.6 rounding.
  const converted = value * 0.625;
  const out = converted.toString();
  if (/e/i.test(out)) throw new Error(`convertRemLiteral: exponential form for ${remStr} → ${out}`);
  // Round-trip proof: converted * 1.6 must equal the original within float noise,
  // magnitude-relative so large values aren't falsely rejected.
  const back = parseFloat(out) * FACTOR;
  const tol = 1e-9 * Math.max(1, Math.abs(value));
  if (Math.abs(back - value) > tol) {
    throw new Error(`convertRemLiteral: round-trip failed for ${remStr}: ${out}rem → ${back} != ${value}`);
  }
  return `${out}rem`;
}

/**
 * Divide every rem token inside an arbitrary CSS value string by 1.6.
 * Handles bare literals ("1.5rem"), rem inside calc()/min()/max()
 * ("calc(780px + 6.875rem)"), and leaves non-rem tokens (px, vw, %, ch, keywords,
 * numbers) untouched. The negative-lookbehind mirrors Phase 1's regex so we never
 * match the tail of an exponent or a rem glued to an identifier.
 */
const REM_TOKEN = /(?<![\w.])(-?\d*\.?\d+)rem\b/gi;
function convertValue(value) {
  if (typeof value !== "string") return value;
  if (!/rem/i.test(value)) return value; // fast path: nothing to convert
  return value.replace(REM_TOKEN, (tok) => convertRemLiteral(tok));
}

/** Rebase a flat scale object { key: cssValue } — every value ÷1.6 (rem only). */
function rebaseFlatScale(scale) {
  const out = {};
  for (const [k, v] of Object.entries(scale)) out[k] = convertValue(v);
  return out;
}

/**
 * Rebase fontSize. Each entry is either "1rem" or a tuple
 * ["1rem", { lineHeight: "1.5rem", letterSpacing: "…" }]. Both the size and any
 * rem-valued options (lineHeight/letterSpacing) are converted; unitless
 * lineHeights ("1") and em letter-spacings pass through untouched.
 */
function rebaseFontSize(scale) {
  const out = {};
  for (const [k, v] of Object.entries(scale)) {
    if (Array.isArray(v)) {
      const [size, opts] = v;
      const newOpts = {};
      for (const [ok, ov] of Object.entries(opts || {})) newOpts[ok] = convertValue(ov);
      out[k] = [convertValue(size), newOpts];
    } else {
      out[k] = convertValue(v);
    }
  }
  return out;
}

/**
 * Return a fully-resolved default-theme scale (already a flat object, since we
 * resolved an empty config above). `maxWidth` etc. already have their
 * spacing-derived keys inlined, so we rebase each resolved value exactly once.
 */
function resolveDefaultScale(name) {
  const scale = DEFAULT_THEME[name];
  if (!scale || typeof scale !== "object") {
    throw new Error(`resolveDefaultScale: no resolved default scale for "${name}"`);
  }
  return scale;
}

/** Build the full set of hard-override scales for tailwind.config.js. */
function buildRebasedScales() {
  return {
    spacing: rebaseFlatScale(resolveDefaultScale("spacing")),
    fontSize: rebaseFontSize(resolveDefaultScale("fontSize")),
    lineHeight: rebaseFlatScale(resolveDefaultScale("lineHeight")),
    borderRadius: rebaseFlatScale(resolveDefaultScale("borderRadius")),
    maxWidth: rebaseFlatScale(resolveDefaultScale("maxWidth")),
    columns: rebaseFlatScale(resolveDefaultScale("columns")),
  };
}

module.exports = {
  buildRebasedScales,
  convertRemLiteral,
  convertValue,
  rebaseFlatScale,
  rebaseFontSize,
  resolveDefaultScale,
  FACTOR,
};

// CLI: `node scripts/tailwind-rebase.cjs`         → pretty-print the rebased scales
//      `node scripts/tailwind-rebase.cjs --audit` → assert every rebased rem == default ÷1.6
if (require.main === module) {
  const scales = buildRebasedScales();
  if (process.argv.includes("--audit")) {
    // Independent re-derivation check: for each rem in each rebased scale, the
    // corresponding default rem must be exactly 1.6× larger.
    let checked = 0;
    let failures = 0;
    const remOf = (s) => (typeof s === "string" ? (s.match(/(-?\d*\.?\d+)rem/g) || []) : []);
    const walk = (rebased, original) => {
      for (const k of Object.keys(rebased)) {
        const rv = rebased[k];
        const ov = original[k];
        const flatten = (x) => (Array.isArray(x) ? [x[0], ...Object.values(x[1] || {})] : [x]);
        const rTokens = flatten(rv).flatMap(remOf);
        const oTokens = flatten(ov).flatMap(remOf);
        if (rTokens.length !== oTokens.length) {
          console.error(`AUDIT MISMATCH ${k}: token count ${rTokens.length} != ${oTokens.length}`);
          failures++;
          continue;
        }
        for (let i = 0; i < rTokens.length; i++) {
          checked++;
          const rebasedVal = parseFloat(rTokens[i]);
          const origVal = parseFloat(oTokens[i]);
          if (Math.abs(rebasedVal * FACTOR - origVal) > 1e-9 * Math.max(1, Math.abs(origVal))) {
            console.error(`AUDIT MISMATCH ${k}[${i}]: ${rebasedVal}rem × 1.6 = ${rebasedVal * FACTOR} != ${origVal}`);
            failures++;
          }
        }
      }
    };
    const originals = {
      spacing: resolveDefaultScale("spacing"),
      fontSize: resolveDefaultScale("fontSize"),
      lineHeight: resolveDefaultScale("lineHeight"),
      borderRadius: resolveDefaultScale("borderRadius"),
      maxWidth: resolveDefaultScale("maxWidth"),
      columns: resolveDefaultScale("columns"),
    };
    for (const name of Object.keys(scales)) walk(scales[name], originals[name]);
    if (failures) {
      console.error(`\n✗ AUDIT FAILED: ${failures} mismatch(es) over ${checked} rem tokens`);
      process.exit(1);
    }
    console.log(`✓ AUDIT PASSED: all ${checked} rebased rem tokens are exactly default ÷ 1.6`);
  } else {
    console.log(JSON.stringify(scales, null, 2));
  }
}
