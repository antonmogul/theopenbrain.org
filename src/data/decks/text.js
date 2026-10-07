/**
 * Small text helpers for the deck editor (OPENBRAIN-129): deck slugs (the
 * link name in /dashboard/decks/<slug>), the smart punctuation text fields
 * get on blur, and the trajectory slide's summary sentence. Pure; no Vue.
 */

/** A deck slug: what public.decks.slug accepts (20261007010000_decks.sql). */
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,79}$/;

/** Taken by routes under /dashboard/decks/ and /deck/; the table refuses them. */
export const RESERVED_SLUGS = Object.freeze([
  "new",
  "present",
  "s",
  "templates",
]);

export const isReservedSlug = (s) => RESERVED_SLUGS.includes(String(s ?? ""));

/**
 * "Funding deck — Montréal 2026" → "funding-deck-montreal-2026": lower case,
 * accents dropped, anything else between words a single dash, no dash at
 * either end, at most `max` characters. Empty input gives `fallback`.
 */
export function slugify(text, { fallback = "deck", max = 60 } = {}) {
  const slug = String(text ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/, "");
  return slug || fallback;
}

/**
 * The deck copy's typography, applied when a text field loses focus:
 * "x" → “x”, it's → it’s ('90s → ’90s), " - " → " — ", "..." → "…".
 * Idempotent: what it writes contains nothing it would change again.
 */
export function smartPunctuation(text) {
  if (typeof text !== "string" || !text) return text ?? "";
  return (
    text
      .replace(/\.\.\./g, "…")
      .replace(/ - /g, " — ")
      // An opening quote follows the start, a space, a bracket or a dash.
      .replace(/(^|[\s([{—–])"/g, "$1“")
      .replace(/"/g, "”")
      .replace(/(^|[\s([{—–“])'(?=[^\s\d'])/g, "$1‘")
      .replace(/'/g, "’")
  );
}

/**
 * The trajectory slide's sentence over the chapter strip, from the counts it
 * draws: "24 of 36 chapters still need funding".
 */
export function summaryFromCounts(chapters) {
  const n = (key) =>
    Number.isInteger(chapters?.[key]) && chapters[key] > 0 ? chapters[key] : 0;
  const total = n("live") + n("inProgress") + n("funded") + n("unfunded");
  return `${n("unfunded")} of ${total} chapters still need funding`;
}
