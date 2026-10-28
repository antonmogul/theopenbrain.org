/*
 * WCAG 2 contrast (OPENBRAIN-157). The ramp table (chapterTheme.js) uses it
 * to decide which step a text panel in the chapter's colour can stand on,
 * and the tests use it to hold every breakout treatment to AA. Plain ESM
 * with no imports: scripts load it in Node through widgetHost.js.
 */

/** "#rgb" or "#rrggbb" as [r, g, b]; anything else throws. */
export function hexToRgb(hex) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) throw new Error(`contrast: "${hex}" is not a hex colour`);
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

/** Relative luminance (sRGB), 0 for black to 1 for white. */
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((n) => {
    const c = n / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The contrast ratio of two hex colours, 1 to 21, rounded to 2 places. */
export function contrastRatio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const ratio = (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  return Math.round(ratio * 100) / 100;
}
