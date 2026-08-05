/*
 * Chapter colour ramps in brand.css are keyed off [data-chapter="1".."5"] on
 * <html>. The router owns that attribute: set on chapter routes, cleared
 * everywhere else. The mapping lives here (not inline in the router) so the
 * range guard is unit-testable without a DOM.
 */

// Keep in sync with the [data-chapter="n"] blocks in src/styles/brand.css.
export const CHAPTER_RAMP_MIN = 1;
export const CHAPTER_RAMP_MAX = 5;

/**
 * Map a route's :number param to a data-chapter attribute value.
 * Returns "1".."5", or null when the param is absent, junk, or outside the
 * range brand.css defines — null means "remove the attribute" so the neutral
 * :root ramp resolves instead of a broken/empty colour.
 */
export function chapterAttrFromParam(param) {
  if (typeof param !== "string" || !/^\d+$/.test(param)) return null;
  const n = Number.parseInt(param, 10);
  if (n < CHAPTER_RAMP_MIN || n > CHAPTER_RAMP_MAX) return null;
  return String(n);
}

/**
 * Apply the mapping to an element (the real <html> in the app, a stub in
 * tests). Removing the attribute — rather than setting a sentinel — is what
 * lets :root's neutral ramp take over.
 */
export function applyChapterAttr(param, el = document.documentElement) {
  const value = chapterAttrFromParam(param);
  if (value === null) {
    el.removeAttribute("data-chapter");
  } else {
    el.setAttribute("data-chapter", value);
  }
  return value;
}
