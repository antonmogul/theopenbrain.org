/*
 * caseFiles.js — MOCK data for the Case Cabinet prototype.
 *
 * This is the single swap-point for the later database move. Today it returns a
 * hardcoded array; later, replace the body of `useCaseFiles()` (or this module)
 * with a Supabase fetch — the CaseCabinetView never changes, only the source.
 *
 * Shape mirrors what a `case_files` table + `case_regions` / `case_notes`
 * relations would return, so the transform later is near-identity.
 */

// Folder tints consume the chapter colour ramp from brand.css (the ramp's own
// comments name "folder mid-tones" as the intent) instead of the old hardcoded
// Tailwind violets. The values resolve wherever the folder renders: under a
// chapter route they follow that chapter's data-chapter ramp; on the unlisted
// /case-cabinet route they fall back to the neutral :root ramp (Ch1 purple).
// Alternating shades, front (bottom) → back (top), matching the drawer look.
const FOLDER_TINTS = [
  "rgb(var(--color-chapter-soft))",
  "rgb(var(--color-chapter))",
  "rgb(var(--color-chapter-pale))",
  "rgb(var(--color-chapter-deep))",
];

/**
 * @typedef {Object} CaseNote
 * @property {string} speaker   Short label shown in the note bubble (e.g. "R.W.")
 * @property {string} text      The line of transcript / note
 * @property {string} [caption] Optional muted sub-line (clinician annotation)
 *
 * @typedef {Object} CaseRegion
 * @property {number} n         The numbered marker (matches the brain diagram)
 * @property {number} x         % left position over the illustration (0–100)
 * @property {number} y         % top position over the illustration (0–100)
 *
 * @typedef {Object} CaseFile
 * @property {string} id
 * @property {string} tab       Short tab label on the folder (e.g. "R.W.")
 * @property {string} title     Full case title
 * @property {string} tint      Folder colour
 * @property {boolean} openable  Whether this folder has real spread content
 * @property {string} [illustration]  Path to the brain illustration asset
 * @property {CaseRegion[]} regions
 * @property {CaseNote[]} notes
 */

/** @type {CaseFile[]} */
export const CASE_FILES = [
  {
    id: "rw",
    tab: "R.W.",
    title: "Patient R.W. — Musical Hallucination",
    tint: FOLDER_TINTS[0],
    tabX: 12, // % from left — staggered tab position (front folder)
    openable: true,
    // No brain asset shipped yet — the view renders an inline SVG placeholder
    // silhouette when `illustration` is null. Drop a real path here later.
    illustration: null,
    regions: [
      { n: 24, x: 18, y: 34 },
      { n: 31, x: 34, y: 46 },
      { n: 32, x: 43, y: 46 },
      { n: 30, x: 52, y: 47 },
      { n: 22, x: 27, y: 49 },
      { n: 28, x: 26, y: 62 },
      { n: 23, x: 40, y: 70 },
    ],
    notes: [
      { speaker: "R.W.", text: "“I hear singing.”" },
      {
        speaker: "",
        text: "“Yes, it is White Christmas.”",
        caption: "When asked if anyone was singing, she said.",
      },
      { speaker: "R.W.", text: "“Yes, a choir.”" },
      {
        speaker: "",
        text: "",
        caption:
          "When asked if she remembered it being sung with a choir, she said she thought so.",
      },
    ],
  },
  {
    id: "hm",
    tab: "H.M.",
    title: "Patient H.M. — Anterograde Amnesia",
    tint: FOLDER_TINTS[1],
    tabX: 42,
    openable: false,
    regions: [],
    notes: [],
  },
  {
    id: "sb",
    tab: "S.B.",
    title: "Patient S.B. — Restored Sight",
    tint: FOLDER_TINTS[2],
    tabX: 70,
    openable: false,
    regions: [],
    notes: [],
  },
  {
    id: "phi",
    tab: "P.G.",
    title: "Patient P.G. — Frontal Lesion",
    tint: FOLDER_TINTS[3],
    tabX: 24,
    openable: false,
    regions: [],
    notes: [],
  },
];

/**
 * The seam. Today: returns the mock synchronously wrapped in a promise so the
 * call site already looks async (matches the real Supabase composable shape).
 * Later: swap the body for `supabaseRest('case_files?select=...')`.
 */
export function useCaseFiles() {
  return {
    fetchCases: async () => CASE_FILES,
  };
}
