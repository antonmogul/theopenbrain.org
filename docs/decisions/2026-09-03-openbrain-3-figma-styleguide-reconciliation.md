# OPENBRAIN-3 — Figma styleguide vs `/styleguide`: what to reconcile, and which way

**Date:** 2026-09-03 · **Status:** decided · **Ticket:** OPENBRAIN-3 ("Add styleguide to the Figma file")

## The question

The ticket was written when no Figma file had been identified. The file is now
known — `Open-Brain-2.0` (`Yv7WvZSoabK2t5fNtsChvf`) — and it already contains a
styleguide page at node `3-2042`. So the real question is not "add a styleguide
to Figma" but: **which side is the source of truth, and what has to move in
which direction?**

## What each side has today

| Area                        | Figma `3-2042`                                                                                                                                                 | Code (`src/styles/brand.css`, `/styleguide`)                                                                                                     |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Logo                        | 8 lockup variants                                                                                                                                              | one SVG in the top bar                                                                                                                           |
| Chapter colour ramps        | 5 ramps × 4 steps: 1 Fundamentals (purple), 2 Perception (teal), 3 Movement (blue), 4 Learning, cognition & memory (red), 5 Development & degeneration (amber) | the same 5 ramps as `[data-chapter="1..5"]`, wired to the route number by `applyChapterAttr`; `/styleguide` renders them live from the tokens    |
| Support colours             | 7 "secondary support colours (across all)" with the note "eliminate primary colour in chapter"                                                                 | highlighter marks (4), `accent` variants (magenta / teal / amber / mono)                                                                         |
| Interface colours           | white, `#F2F2F7`, `#8E8E93`, `#1E1E1E`                                                                                                                         | `bg`, `paper`, `ink`, `mute`, `line` as RGB triplets, light **and dark**                                                                         |
| Type scale                  | Main title / chapter headers / subtitles / body / navigation labels / figure captions / author line, with sizes and line-heights                               | a modular scale (Perfect Fourth, 20 px body) as tokens; `TypeSection.vue` renders it live; user-tunable size and measure; four font-pair presets |
| Controls, badges, citations | button rows, numbered badges 0–10 (outline and filled), citation superscripts, figure captions, highlight styles                                               | `SharedCollection` (23 components) and `BookCollection` (17 reader components) rendered from the real components                                 |
| Tokens / variables          | **none** — `get_variable_defs` on the node returns `{}`; every colour is a raw fill                                                                            | every colour and font role is a CSS custom property; Tailwind consumes the same tokens                                                           |

One measurement that matters: sampling the chapter ramps from a full-resolution
render of `3-2042` gives values that differ from `brand.css` by up to ~15/255
per channel (e.g. chapter 4 primary renders as `#FF3351`, code has `#EF404B`).
Either the board moved after the tokens were transcribed, or the render is
colour-managed. Without variables there is no way to tell, and no way to notice
the next drift.

## Decision

1. **Code is the executable source of truth.** `brand.css` already carries more
   structure than the Figma page (dark theme, accent variants, font pairs,
   reduced motion, all five chapter ramps) and every component renders from it.
   Re-documenting that by hand in Figma would drift within a week. No code
   change is needed for OPENBRAIN-3.
2. **Give Figma variables generated from `brand.css`, instead of a hand-made
   styleguide page.** A small script emits the token set (chapter ramps,
   surfaces, accents, marks, font roles) and the Figma MCP creates them as
   variables in the file, so Sonia binds fills to `chapter/4/primary` rather
   than to a hex, and the ramp drift above becomes visible and fixable in one
   place. That is a write into a file Sonia owns, so it is done with her, not
   to her: propose it, then run it once she agrees. Follow-up ticket.
3. **Settle the ramp values with Sonia at that moment** — hers win for the
   colour, ours for the token names — and update `brand.css` in the same PR.
4. **Leave `3-2042` as the visual reference** for logo lockups and the
   editorial type intent. Do not rebuild it.

## Why not the other way round

Making Figma the source would require Sonia to maintain dark-mode and accent
variants she does not design, and would put the reading-preference system
(font pairs, measure, size) outside the tool that implements it.

## What would change this

If Sonia's Attention-chapter layouts introduce tokens that do not exist in code
(a second accent per chapter, new surfaces), the direction flips for those
tokens: they get added to `brand.css` from her values, then re-exported as
variables. The process stays "code holds the canonical list"; values may
originate in Figma.

## Tooling note

`get_metadata` / `get_design_context` on `3-2042` currently fail in the Figma
MCP client (a JSON parse error on the node's payload), so the comparison above
used `get_screenshot` at full resolution plus `get_variable_defs`. Retry the
structured calls on a child frame before scripting the variable export.
