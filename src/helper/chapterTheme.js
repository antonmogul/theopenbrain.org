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

import { contrastRatio } from "./contrast.js";

// Keep in sync with the [data-chapter="<ramp>"] blocks in src/styles/brand.css.
export const RAMPS = Object.freeze(["fund", "perc", "move", "lear", "deve"]);

/*
 * The ramps as hex (OPENBRAIN-157): one table for everything that needs the
 * values outside CSS. brand.css paints the same numbers, the widget kit
 * hands them to uploaded widgets as --ob-* (widgetHost.js), and
 * src/helper/__tests__/chapterRamps.test.js holds all three equal, so a ramp
 * can't change in one place and not the others.
 *
 * `on` is the text colour on a fill of `main`: white on the violet and
 * blue, the dark surface on the light teal, red and yellow, where white is
 * unreadable (1.8:1 on the Retina's teal). Measured on main: fund 4.67,
 * perc 9.50, move 4.44, lear 4.74, deve 9.70. Move's white is just under
 * AA's 4.5 for body text, which is why a text panel asks rampGround().
 */
export const AA_TEXT = 4.5;
export const RAMP_HEX = Object.freeze({
  fund: Object.freeze({
    main: "#8D4CF6",
    deep: "#7615F5",
    soft: "#BF97FC",
    pale: "#DCCDF9",
    on: "#ffffff",
  }),
  perc: Object.freeze({
    main: "#39D8BA",
    deep: "#08AFA3",
    soft: "#4BEACC",
    pale: "#9BF9E7",
    on: "#1c1c1c",
  }),
  move: Object.freeze({
    main: "#1A72F2",
    deep: "#0E61C4",
    soft: "#5EA7EF",
    pale: "#9AC0EF",
    on: "#ffffff",
  }),
  lear: Object.freeze({
    main: "#FF3351",
    deep: "#C1062A",
    soft: "#FC708A",
    pale: "#FFC7D2",
    on: "#1c1c1c",
  }),
  deve: Object.freeze({
    main: "#F2BB40",
    deep: "#C98F1B",
    soft: "#FFD788",
    pale: "#FFE6BB",
    on: "#1c1c1c",
  }),
});

/**
 * The step a panel of body text in the chapter's colour stands on: `main`,
 * or `deep` where `on` can't reach AA on main (move: white on #1A72F2 is
 * 4.44:1, on #0E61C4 it is 5.96:1). Derived, not listed, so a ramp whose
 * Figma value moves can't keep an unreadable ground. brand.css carries the
 * answer as --color-chapter-ground; the test pins it to this.
 */
export function rampGround(ramp) {
  const r = RAMP_HEX[ramp] || RAMP_HEX.fund;
  return contrastRatio(r.main, r.on) >= AA_TEXT ? "main" : "deep";
}

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
