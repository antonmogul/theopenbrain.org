/*
 * Breakout box treatment (OPENBRAIN-153). The History redesign (Figma
 * Yv7WvZSoabK2t5fNtsChvf, "Latest Version" 2733:58923, read in
 * docs/design/history-redesign-2026-10-27.md) turns a breakout box from the
 * pale card into a full-bleed colour panel, in one of two treatments:
 *
 *   dark    --color-dark-surface ground, white text, the kicker
 *           ("BREAKOUT BOX B") in the chapter's colour, figure labels in
 *           --color-warn amber. Images arrive duotoned in the chapter's
 *           colour, baked into the asset (Anton, 27 Oct), never blended in
 *           CSS, so an untreated image simply sits plain on the dark.
 *   violet  --color-chapter ground, white text, images plain on white.
 *   pale    today's card: the chapter's palest ramp tone, ink text, ink
 *           hairlines. The default everywhere the map is silent, so chapters
 *           the redesign has not reached keep their look.
 *
 * Which box gets which is data, not markup: the Figma draws four of History's
 * boxes (two dark, one violet, Penfield's cabinet on dark) and leaves four
 * undrawn, and Anton (27 Oct) chose dark for all of them so a stakeholder
 * sees one treatment first. A box flips back with a one-line edit below.
 *
 * Resolution order mirrors chapterCover.js: the section's own `treatment`
 * (a sections.box_treatment column, once migrated; chapterTransform passes
 * it through, and sections are fetched with select=*) → this map, keyed by
 * chapter slug then box slug, because box slugs are only unique within a
 * module → pale. Keys are slugs, never letters: the letters follow reading
 * order (sectionLabelMap) and move when a box does.
 */
export const BOX_TREATMENTS = Object.freeze(["pale", "dark", "violet"]);
export const DEFAULT_BOX_TREATMENT = "pale";

export const BOX_TREATMENT_BY_SLUG = Object.freeze({
  "foundations-of-neuroscience": Object.freeze({
    // Drawn in the Figma: 2730:8031 (dark), 2730:8111 (dark), 2742:71145
    // (the case cabinet, dark).
    "box-sacred-disease": "dark",
    "box-rete-mirabile": "dark",
    "box-penfield": "dark",
    // Drawn violet (2730:8059, "Humoral theory"). Live, that text is the
    // second Explore card inside box-sacred-disease since
    // 20261021010000_history_breakout_boxes.sql folded the two boxes into
    // one, so the violet panel only shows on data from before the fold
    // (the Storybook fixture); one box cannot be two colours.
    "box-humoral-theory": "violet",
    // Not drawn; dark by Anton's call (27 Oct) until design says otherwise.
    "box-descartes": "dark",
    "box-psychosurgery": "dark",
    "box-electrical-stim": "dark",
    "box-ngf": "dark",
  }),
});

/** A valid treatment name, or null for anything else (unset, typo, number). */
export function normalizeBoxTreatment(raw) {
  if (typeof raw !== "string") return null;
  const value = raw.trim().toLowerCase();
  return BOX_TREATMENTS.includes(value) ? value : null;
}

/**
 * The treatment a box renders in.
 * @param {{ slug?: string, treatment?: string } | null} section the box section
 * @param {string | null | undefined} chapterSlug the module's slug
 */
export function boxTreatmentFor(section, chapterSlug) {
  if (!section || typeof section !== "object") return DEFAULT_BOX_TREATMENT;
  const own = normalizeBoxTreatment(section.treatment);
  if (own) return own;
  const chapter = chapterSlug ? BOX_TREATMENT_BY_SLUG[chapterSlug] : null;
  return (
    (chapter && normalizeBoxTreatment(chapter[section.slug])) ||
    DEFAULT_BOX_TREATMENT
  );
}
