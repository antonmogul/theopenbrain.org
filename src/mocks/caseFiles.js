/*
 * caseFiles.js — MOCK data for the Case Cabinet ("Wilder Penfield and the
 * Montreal Procedure", Figma Open-Brain-Chapters node 3:1653).
 *
 * This is the single swap-point for the later database move. Today it returns a
 * hardcoded array; later, replace the body of `useCaseFiles()` (or this module)
 * with a Supabase fetch — the CaseCabinetView never changes, only the source.
 *
 * The seven folders are the patients on the Figma drawer, each tab carrying the
 * patient's case number in Penfield & Perot (Brain, 1963). Only R.W. has case
 * content in the design so far; the others open onto a blank page until the
 * authors supply their excerpts. Nothing here is invented beyond the design.
 */

// Folder tints consume the chapter colour ramp (brand.css): the Figma folder
// purples are the History ramp's main/deep/soft/pale. Under a chapter route
// they follow that chapter's data-chapter ramp; on the unlisted /case-cabinet
// route they fall back to the neutral :root ramp, which is the same purple.
const T = {
  main: "rgb(var(--color-chapter))",
  deep: "rgb(var(--color-chapter-deep))",
  soft: "rgb(var(--color-chapter-soft))",
  pale: "rgb(var(--color-chapter-pale))",
};

/**
 * @typedef {Object} CaseNote
 * @property {string} speaker   Short label shown in the speaker badge (e.g. "R.W.")
 * @property {string} text      The line of transcript
 * @property {string} [caption] Clinician annotation, set right-aligned in mono
 *
 * @typedef {Object} CaseRegion
 * @property {number} n   Stimulation point number (matches the brain diagram)
 * @property {number} x   % left position over the illustration (0–100)
 * @property {number} y   % top position over the illustration (0–100)
 *
 * @typedef {Object} CaseFile
 * @property {string} id
 * @property {string} tab       Patient initials on the tab (e.g. "R.W.")
 * @property {number} caseNo    Case number in Penfield & Perot (1963)
 * @property {string} tint      Folder colour (a chapter-ramp token)
 * @property {[number, number]} tabSpan  Tab start/end as fractions of the
 *                                       folder's long edge (Figma drawer frame)
 * @property {string|null} illustration  Brain illustration asset, or null
 * @property {number|null} point  The stimulation point the transcript is from
 * @property {CaseRegion[]} regions
 * @property {CaseNote[]} notes
 */

/**
 * Back of the drawer first, front last — the order they are painted.
 * @type {CaseFile[]}
 */
export const CASE_FILES = [
  { id: "ge", tab: "G.E.", caseNo: 32, tint: T.soft, tabSpan: [0.113, 0.429] },
  {
    id: "sbe",
    tab: "S.BE.",
    caseNo: 29,
    tint: T.deep,
    tabSpan: [0.569, 0.871],
  },
  { id: "gp", tab: "G.P.", caseNo: 24, tint: T.pale, tabSpan: [0.254, 0.55] },
  { id: "yn", tab: "Y.N.", caseNo: 12, tint: T.main, tabSpan: [0.265, 0.563] },
  { id: "nc", tab: "N.C.", caseNo: 11, tint: T.soft, tabSpan: [0.577, 0.875] },
  {
    id: "abra",
    tab: "A.BRA.",
    caseNo: 4,
    tint: T.deep,
    tabSpan: [0.127, 0.429],
  },
  {
    id: "rw",
    tab: "R.W.",
    caseNo: 3,
    tint: T.main,
    tabSpan: [0.442, 0.746],
    // No engraving shipped yet: the view draws a line placeholder when null.
    illustration: null,
    point: 24,
    regions: [
      { n: 24, x: 16, y: 38 },
      { n: 22, x: 26, y: 47 },
      { n: 31, x: 39, y: 42 },
      { n: 32, x: 48, y: 42 },
      { n: 30, x: 57, y: 44 },
      { n: 28, x: 25, y: 60 },
      { n: 23, x: 43, y: 64 },
    ],
    notes: [
      { speaker: "R.W.", text: "“I hear singing.”" },
      { speaker: "", text: "“Yes, it is White Christmas.”" },
      {
        speaker: "",
        text: "",
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
].map((c) => ({
  illustration: null,
  point: null,
  regions: [],
  notes: [],
  ...c,
}));

export const CASE_SOURCE =
  "Excerpts from: The Brain’s Record of Auditory and Visual Experience — A Final Summary and Discussion, by Wilder Penfield and Phanor Perot. Brain, 1963.";

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
