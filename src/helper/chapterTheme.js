/*
 * Chapter colour ramps in brand.css are keyed off [data-chapter="<ramp>"] on
 * <html>, where <ramp> is one of the five *subject* ramps from the Figma
 * Assets Library (book/fund, perc, move, lear, deve). Ramps are subjects, not
 * positions in the book: The Retina is Perception whichever chapter number it
 * sits at, so the ramp must come from the module, never from the route number
 * (OPENBRAIN-30 — keying off the URL painted Retina purple and Foundations
 * blue).
 *
 * Resolution order: modules.ramp (migration 20260911000000) → RAMP_BY_SLUG
 * fallback → null. The fallback exists so the reader paints correctly before
 * the migration is applied in production; the DB value wins once it is.
 */

// Keep in sync with the [data-chapter="<ramp>"] blocks in src/styles/brand.css.
export const RAMPS = Object.freeze(["fund", "perc", "move", "lear", "deve"]);

// Human names as the Assets Library labels them (chapter-primary-colors).
export const RAMP_NAMES = Object.freeze({
  fund: "Fundamentals",
  perc: "Perception",
  move: "Movement",
  lear: "Learning, Cognition & Memory",
  deve: "Development & Degeneration",
});

// Code-side fallback until modules.ramp is populated. Unknown slugs resolve
// to null (neutral :root ramp) rather than guessing.
export const RAMP_BY_SLUG = Object.freeze({
  "the-retina": "perc",
  "foundations-of-neuroscience": "fund",
  "attention-and-working-memory": "lear",
});

export function isRamp(value) {
  return typeof value === "string" && RAMPS.includes(value);
}

/**
 * Resolve the ramp key for a module row (or any object carrying `ramp` /
 * `slug`). Returns one of RAMPS, or null when nothing usable is present —
 * null means "remove the attribute" so the neutral :root ramp applies.
 */
export function rampForModule(module) {
  if (!module || typeof module !== "object") return null;
  if (isRamp(module.ramp)) return module.ramp;
  const bySlug = RAMP_BY_SLUG[module.slug];
  return isRamp(bySlug) ? bySlug : null;
}

/**
 * Apply a module's ramp to an element (the real <html> in the app, a stub in
 * tests). Removing the attribute — rather than setting a sentinel — is what
 * lets :root's neutral ramp take over.
 */
export function applyChapterRamp(module, el = document.documentElement) {
  const value = rampForModule(module);
  if (value === null) {
    el.removeAttribute("data-chapter");
  } else {
    el.setAttribute("data-chapter", value);
  }
  return value;
}

/** Clear the ramp (non-chapter routes, and on entry to any chapter route). */
export function clearChapterRamp(el = document.documentElement) {
  el.removeAttribute("data-chapter");
}

/**
 * Pick the catalog module a route refers to. The reader route carries a slug
 * and loads its content by slug, so the ramp must resolve by slug too —
 * resolving by :number there would let a stale or hand-edited URL paint one
 * module's colour over another's content (last response wins). Only the
 * overview route, which has no slug, resolves by number.
 */
export function moduleForRoute(route, catalog) {
  if (!route || !catalog) return null;
  const params = route.params || {};
  if (route.name === "chapter") {
    return (params.slug && catalog.findBySlug?.(params.slug)) || null;
  }
  if (route.name === "chapter-overview") {
    return (
      (params.number !== undefined && catalog.findByNumber?.(params.number)) ||
      null
    );
  }
  return null;
}
