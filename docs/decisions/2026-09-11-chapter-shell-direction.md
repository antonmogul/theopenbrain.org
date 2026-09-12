# Decision — chapter shell direction (2026-09-11)

Decided by Anton after reviewing Sonia's History (`3:80`) and Attention
(`1495:34228`) frames in the chapters Figma file. Implemented across
OPENBRAIN-30 … 35 on 2026-09-11/12.

## Decided

- **Dark opener, light body.** Every chapter opens with a full-viewport cover,
  then a dark block (`--color-dark-surface`, #1C1C1C) carrying the chapter
  title in the chapter's ramp colour, the subtitle in white, and a numbered
  table of contents whose accent circles sit on the divider. The dark ends
  with the TOC; the reading body below is light. `FORCE_LIGHT_THEME` stays.
  Component: `src/components/chapter/opener/ChapterOpener.vue`.
- **Chapter ramp is the accent inside a chapter.** Ramps are subjects, not
  positions in the book: Foundations = `fund`, The Retina = `perc`,
  Attention = `lear`. Values come from the Figma Assets Library variables.
  The magenta `--color-accent` is not used inside chapters.
- **Original 50/50 split** between figure pane and prose
  (`--reader-prose-w: min(50vw, calc(780px + 6.875rem))` — 50vw, capped at
  the legacy 890px measure above ~1780px wide). The scroll-trigger markers
  that used to float mid-page are dev chrome behind `?markers=1`.
- **Widgets live in chapters through `src/widgets/placements.js`** (text
  anchors, slug-stable), or as DB-authored `{ type: "widget" }` blocks, which
  win when both exist.
- **Drafts are creator-only** in the reader (client gate; RLS follow-up in
  OPENBRAIN-38).

## Still open

- Book order (Retina 1, Foundations 3, Attention 4 today; slot 2 empty) and
  which ramp Stress takes (`move` or `deve`, or shares `lear`).
- Strict 50/50 at every width, or keep the 890px prose cap.
- What counts as an activity beyond widgets (quizzes/flashcards tables exist,
  empty).
- Inline widget stages are clipped by the prose column (OPENBRAIN-37); the
  Attention placements are breakout cards until that lands.
