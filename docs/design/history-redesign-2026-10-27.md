# History chapter redesign — Figma vs. live

**Source:** Open-Brain-Chapters `Yv7WvZSoabK2t5fNtsChvf`
- Chapter design: node `2733:58923` ("Latest Version"), 1440×23543
- Hero animation board: node `2730:9185` ("Matisse Header")

**Read-only analysis, 2026-10-27.** Nothing deleted, nothing implemented. The
Figma covers a SUBSET of the live chapter — see "Coverage gap" before acting.

## 1. Coverage gap: the design is partial

| | Live (Supabase) | Figma |
|---|---|---|
| Body sections | 6 + references + further reading | 6 in TOC, ~12 body blocks drawn |
| Breakout boxes | **8** (`box-*`) | **4** drawn |
| Total sections | 15 | — |

Figma TOC lists: Introduction, Where is my mind?, Do different parts… (twice —
likely a duplicate row in the mock), What's the basic functional unit?, How do
neurons communicate?, Closing words, References.

**Four boxes are drawn; four are not.** Drawn (identified from the renders):

| Figma node | Box | Treatment |
|---|---|---|
| `2730:8031` | Hippocrates: On the Sacred Disease (`box-sacred-disease`) | **dark** |
| `2730:8059` | Humoral theory (part of `box-sacred-disease` live) | **violet** |
| `2730:8111` | Failures in comparative neuroanatomy / rete mirabile (`box-rete-mirabile`) | **dark** |
| `2742:71145` | Wilder Penfield / Montreal Procedure (`box-penfield`) | case-cabinet widget, dark |

Not drawn: `box-descartes`, `box-psychosurgery`, `box-electrical-stim`, `box-ngf`.
Treatment for those is undecided — do not infer it.

## 2. The three changes

### A. Figure pane → dark
The left/figure column becomes `--color-dark-surface` (#1C1C1C) with the artwork
on it and the caption in `--color-warn` (#F4A621) small-caps mono. The text
column stays paper/cream. Today both columns are paper.

### B. Breakout boxes → dark or violet
Two treatments, full-bleed (not the current card):
- **dark**: #1C1C1C ground, white text, violet kicker ("BREAKOUT BOX B"),
  images **duotoned violet**.
- **violet**: `--color-chapter` (#8D4CF6) ground, white text, images left plain
  on white.

### C. New hero: Matisse line drawing + skull cutaway
Resting state is a Matisse-style ink line drawing of a girl writing, on cream.
On pointer move a hand/eraser at top-right lifts the crown of the skull away to
reveal a **violet brain**. Four-frame sketch sequence on `2730:9185`; the
assembled hero (`2730:6787`) carries the reveal art as a HIDDEN layer,
`Foundations_ST7_NM3_LL_h04 1` (`2730:6790`), behind `hist_header_sketch 1`.

## 3. Tokens: all of them already exist

`get_variable_defs` on the dark box returned only tokens we already ship:

| Figma variable | Our token | Value |
|---|---|---|
| `rgb(var(--color-chapter))`, `book/fund/main` | `--color-chapter` | #8d4cf6 |
| `rgb(var(--color-dark-surface))` | `--color-dark-surface` | #1c1c1c |
| `rgb(var(--color-warn))` | `--color-warn` | #f4a621 |
| `rgb(var(--color-paper))` | `--color-paper` | #ffffff |
| `Reader/Body`, `Reader/Figure label` | existing type roles | — |

`--color-dark-surface` is `brand.css:40`, already used by `FullBleed.vue:220`
(widget band) and `OpenerToc.vue:101`. **No new tokens needed.**

The designer worked from our implementation: layer names are our own selectors
(`section#chapter-toc`, `div.opener-toc__title`, `span.opener-toc__lead`,
`a.opener-toc__row`, `div.fb-stage`, `div.wb-body`,
`h3#widget-breakout-foundations-phrenology`, `p.wb-blurb`). Mapping is direct.

## 4. Already built, unchanged by this design
- `div.fb-stage` is the existing phrenology widget band, with its live copy
  ("Explore phrenology" / "Click on different parts of the skull…").
- The Penfield box is the existing `case-cabinet` widget, drawn with real
  content (open folder, "Point 27 · Y.N.", patient tags, brain plate).
- Chapter timeline is drawn at the foot (`2733:68927`) — already shipped.
- FIG 06 cell-doctrine 10-image cycle is drawn — already shipped.

## 5. Open questions for Stuart/design
1. The four undrawn boxes: dark or violet? Is there a rule (e.g. primary-source
   quote = dark, concept = violet) or is it per-box?
2. Does the dark figure pane apply to ALL chapters or only History? It would
   collide with the per-chapter ramp if global.
3. Is the violet duotone on dark-box images a treatment we apply in code
   (CSS blend) or baked into the asset?
4. Hero reveal: pointer-x only, or x+y? Behaviour on touch? Under reduced
   motion (the resting frame, presumably)?
5. The TOC shows "Do different parts of the brain do different things?" twice —
   mock artefact or an intended split?

## 6. Assets still needed
- `hist_header_sketch` (resting line drawing) — export
- `Foundations_ST7_NM3_LL_h04` (brain reveal) — export
- The hand/eraser element — export or draw
- Anton said he will supply the frames.
