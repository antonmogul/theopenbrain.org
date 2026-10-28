/*
 * Breakout box treatment (OPENBRAIN-153, 157). The History redesign (Figma
 * Yv7WvZSoabK2t5fNtsChvf, "Latest Version" 2733:58923, read in
 * docs/design/history-redesign-2026-10-27.md) turns a breakout box from the
 * pale card into a full-bleed colour panel. Four treatments:
 *
 *   pale     today's card: the chapter's palest ramp tone, ink text, ink
 *            hairlines. The default everywhere nothing says otherwise, so
 *            chapters the redesign has not reached keep their look.
 *   dark     --color-dark-surface ground, white text (17.0:1), the kicker
 *            ("BREAKOUT BOX B") in the chapter's colour, figure labels in
 *            --color-warn amber. Images arrive duotoned in the chapter's
 *            colour, baked into the asset (Anton, 27 Oct), never blended in
 *            CSS, so an untreated image simply sits plain on the dark.
 *   plate    the lighter dark Anton asked for (OPENBRAIN-157):
 *            --color-dark-surface-2 (#2A2A2A, white text 14.35:1), the rest
 *            as dark. A box that should read as a panel beside the dark
 *            figure pane rather than the same black.
 *   chapter  the chapter's own colour as the ground, its ink chosen by the
 *            ramp (--color-chapter-ground / --color-chapter-on, brand.css):
 *            white on the violet and blue, the dark surface on the teal, red
 *            and yellow, where white is unreadable. The Figma's "violet"
 *            (2730:8059) was this for History; the name moved to `chapter`
 *            when the picker arrived, because on the Retina it is teal.
 *
 * Not offered: magenta. It is the book's interaction accent (links, the
 * highlight tools, citations), so a magenta panel reads as one large
 * control and swallows its own citations; it is also only 4.50:1 with white.
 *
 * Which box gets which is data, not markup. Resolution order mirrors
 * chapterCover.js: the section's own `treatment` (sections.box_treatment,
 * migrated by 20261028000000_sections_box_treatment.sql, set per box in the
 * chapter editor; chapterTransform passes it through, and sections are
 * fetched with select=*) → this map, keyed by chapter slug then box slug,
 * because box slugs are only unique within a module → pale. Keys are slugs,
 * never letters: the letters follow reading order (sectionLabelMap) and
 * move when a box does.
 */
export const BOX_TREATMENTS = Object.freeze([
  "pale",
  "dark",
  "plate",
  "chapter",
]);
export const DEFAULT_BOX_TREATMENT = "pale";

/** Older names still found in data and stories, and what they mean now. */
export const BOX_TREATMENT_ALIASES = Object.freeze({ violet: "chapter" });

/** What the chapter editor's picker calls each treatment. */
export const BOX_TREATMENT_LABELS = Object.freeze({
  pale: "Pale card",
  dark: "Dark",
  plate: "Lighter dark",
  chapter: "Chapter colour",
});

/** The treatments on a dark plate: white text, Explore cards on the plate
 *  inside a hairline (BreakoutBox.vue keys those rules on `bx--dark`). */
export const DARK_BOX_TREATMENTS = Object.freeze(["dark", "plate"]);

export const BOX_TREATMENT_BY_SLUG = Object.freeze({
  "foundations-of-neuroscience": Object.freeze({
    // Drawn in the Figma: 2730:8031 (dark), 2730:8111 (dark), 2742:71145
    // (the case cabinet, dark).
    "box-sacred-disease": "dark",
    "box-rete-mirabile": "dark",
    "box-penfield": "dark",
    // Drawn violet (2730:8059, "Humoral theory"), now the chapter-colour
    // panel. Live, that text is the second Explore card inside
    // box-sacred-disease since 20261021010000_history_breakout_boxes.sql
    // folded the two boxes into one, so the panel only shows on data from
    // before the fold (the Storybook fixture); one box cannot be two
    // colours.
    "box-humoral-theory": "chapter",
    // Not drawn; dark by Anton's call (27 Oct) until design says otherwise.
    "box-descartes": "dark",
    "box-psychosurgery": "dark",
    "box-electrical-stim": "dark",
    "box-ngf": "dark",
  }),
});

/** A valid treatment name (aliases resolved), or null for anything else
 *  (unset, typo, number). */
export function normalizeBoxTreatment(raw) {
  if (typeof raw !== "string") return null;
  const value = raw.trim().toLowerCase();
  const named = BOX_TREATMENT_ALIASES[value] || value;
  return BOX_TREATMENTS.includes(named) ? named : null;
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
