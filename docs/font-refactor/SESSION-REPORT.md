# SESSION REPORT — Remove `font-size: 62.5%` root hack

**Branch:** `refactor/remove-font-hack`
**Date:** 2026-07-10 (session), analysis continued into 2026-07-11 UTC
**Outcome (Phase 1, 2026-07-10):** ⛔ **HALTED — Layer-2 found a Tailwind-default-scale regression the codemod did not cover.**
**Outcome (Phase 2, 2026-07-11):** ✅ **RESOLVED — PUSHED.** The Tailwind default scale was rebased ÷1.6, the one remaining runtime-computed rem was fixed, and Layer-2 re-verification is clean: **Chapter 1 rendered-element size deltas dropped from 747 → 0** (only `<html>`/`<head>` font inheritance changes, as intended). Build exit 0, tests 141/141.

> The sections below marked **[Phase 1]** record the halted state as it stood on 2026-07-10. The **Phase 2 resolution** at the bottom documents what closed the gap and why the branch is now pushable.

---

## TL;DR

The ÷1.6 codemod correctly converts **all 1408 authored `rem` literals** in `src/` + `tailwind.config.js` — the Layer-1 token audit passes with **0 mismatches**, `npm run build` exits 0, and `npm test` is 141/141 green. **But** removing the `62.5%` hack also changes the base for **Tailwind's built-in default utility scale** (`gap-2`=`0.5rem`, `px-24`=`6rem`, `h-64`=`16rem`, …), which is defined in **Tailwind core, not in any `src/` file**, so the codemod never touched it. Rendered comparison of Chapter 1 (main vs branch) shows **~747 elements differ**, with hundreds of Tailwind-utility-driven sizes rendering **1.6× larger** on the branch. This is a genuine visual regression, so the work is halted for a scope expansion (see “The fix” below).

---

## What was done

1. **Resumed** the existing `refactor/remove-font-hack` branch and its 2-round-refined `PLAN.md`.
2. **Ran the final plan review** (`codex exec`) — and continued through **5 further review rounds** (rounds 3–7). Each round found and fixed a real issue; the core conversion math (`convertToken`) was confirmed sound from round 3 on. Round 7's codex invocation hung server-side and produced no verdict; per the "never wait on a signal that isn't coming" rule the work proceeded, relying on the empirical audit + rendered parity as the authoritative gates.
3. **Hardened the codemod** (`scripts/convert-rem.mjs`) across rounds:
   - `toFixed(6)` precision bug → `Number.toString()` (exact); caught by the round-trip assertion on `0.8125rem`.
   - `'src/**/*.css'` glob silently excluded `src/index.css` (the hack file, 152 rem tokens) → switched to a `src` directory pathspec + extension filter. Token count corrected 1256 → **1408**.
   - `--audit` reimplemented as a **rem-token positional** comparison vs a fresh ÷1.6 conversion of the base ref, with **index-anchored** manual-token accounting (body pin add + reworded-comment removals), path reconciliation, and `1.rem`/exponent/multi-dot guards.
4. **Ran the codemod** — 1408 tokens across 103 files converted; manifest at `docs/font-refactor/conversion-manifest.tsv`.
5. **Removed the hack + pinned body** in `src/index.css` (split `html, body`; `html` → browser default 16px; `body` → `0.390625rem` = 6.25px to preserve the inheritance floor, PLAN §4a) and fixed 4 stale code comments + 1 current doc.
6. **Layer-1 audit: PASSED** — `node scripts/convert-rem.mjs --audit` → 0 mismatches over all 1408 tokens. (It caught 5 real defects in my *manual* comment edits along the way — comment `1rem` literals re-entering the token stream, and a duplicate `0.390625` in the pin comment — all fixed.)
7. **Build/test gates: PASSED** — `npm run build` exit 0; `npm test` 141/141 (== baseline).
8. **Layer-2 rendered verification (main vs branch, Chapter 1 "The Retina"): FAILED** — see below.

## Codex verdicts

| Round | Verdict | Key issue (all fixed unless noted) |
|-------|---------|-------------------------------------|
| 1 (prior session) | REVISE | body compounding, regex corruption, verification insufficient |
| 2 (prior session) | REVISE | body-pin math, Layer-2 contradiction |
| 3 | REVISE | `--audit` was a stub; property list incomplete; stale-doc claim; DOM pairing |
| 4 | REVISE | byte-for-byte audit can't pass manually-edited files; path reconciliation; `1.rem` |
| 5 | REVISE | sorted-multiset audit could pass a swap → positional |
| 6 | REVISE | value-based manual-token removal unanchored → index-anchored |
| 7 | **no verdict** | codex hung server-side ~20 min, no output; proceeded on empirical gates |

**Note:** the reviews converged on *audit-harness rigor* and never flagged the Tailwind-default-scale gap — because a static token review of `src/` **cannot** see it. Only rendered pixel diffing surfaced it. This is the value of keeping Layer-2 as an independent hard gate.

---

## The regression (why this is halted)

### Layer-2 result — Chapter 1, desktop 1440×900, main (:4174) vs branch (:4173)

- Both trees render **1792 DOM nodes** (paired OK after giving the `main` worktree the `.env` so its Supabase-backed Chapter 1 content loads identically).
- `<html>` fontSize: **10px → 16px** ✓ (the one intended change).
- `<body>` fontSize: **6.25px on both** ✓ (the §4a body pin works exactly).
- **747 elements differ** across 2158 property values. Sampling the geometry diffs:
  - `idx 124` (`px-24 py-10`): padding `40px 96px` (branch) vs `25px 60px` (main) — **1.6×**.
  - `idx 80` (`w-14 h-14`-style): `112px` vs `70px` — **1.6×**.
  - `idx 72` (`-ml-5`): `-20px` vs `-12.5px` — **1.6×**.
  - `gap-*`, `h-64`, `top-0`, etc. — all shifted **1.6×**.

### Root cause

The built CSS confirms Tailwind's **default** utilities emit unconverted rem:

```css
.px-24{padding-left:6rem;padding-right:6rem}   /* wanted 3.75rem to hold 60px */
.gap-2{gap:.5rem}                              /* wanted 0.3125rem to hold 5px  */
.h-64{height:16rem}                            /* wanted 10rem   to hold 100px */
```

These rem values live in **Tailwind core's default theme**, not in any `src/` file, so the ÷1.6 codemod (scoped to `src/` + `tailwind.config.js`) never touched them. `tailwind.config.js` only **extends** `theme.spacing` (line 70); it does not replace the defaults. The `62.5%` hack was silently rendering every default Tailwind utility at 0.625× its nominal size; removing the hack makes them all render at 1.0× (i.e. **1.6× larger** than today). ~**572** such utility uses exist across `src/`, including on the north-star Chapter 1 page.

Also affected (same root cause, correctly *not* codemod-eligible):
- **JS/GSAP-injected inline rem** (e.g. `idx 81` inline `height: 2.0815rem` set by animation code at runtime) — scales with the root by design; only fixable by changing the root or the JS.

### Why the Layer-1 audit still passed (and is not wrong)

The audit proves every **authored** `rem` literal in scope was converted exactly ÷1.6. It did that correctly. Visual invariance additionally requires that *nothing outside that scope* depends on the root base — which Tailwind's default scale and runtime-injected rem both violate. Token correctness ≠ pixel invariance; that gap is exactly what Layer-2 exists to catch.

---

## The fix (for the next session)

The refactor is sound in approach but **under-scoped**. To make it pixel-invariant, one of:

1. **Override Tailwind's rem-based scales ÷1.6 in `tailwind.config.js`** (recommended): generate full `theme.spacing`, `theme.fontSize`, `theme.lineHeight`, `theme.borderRadius`, `theme.maxWidth`, `theme.width`/`height` (where rem-based) etc. as `default ÷ 1.6`, so utilities emit the same pixels as today. This is codemod-able (enumerate Tailwind's default theme, divide, freeze into config) and audit-able (extend the rendered check to assert utility parity). Downside: large config, and it re-hardcodes the 10px assumption into Tailwind — arguably trading one hack for another.
2. **Sweep JS/template rem injected at runtime** (GSAP/animation inline styles like `2.0815rem`) — these must be divided too, or expressed in px.
3. **Reconsider the goal.** If the *only* aim is accessibility (root respects browser font-size), a cleaner path may be to keep authored rem as-is and instead not fight Tailwind — e.g. accept a deliberate, uniform ×1.6 zoom and re-baseline the design, rather than pixel-freeze. That's a design decision, not a mechanical one.

Whichever path, **Layer-2 rendered parity must be the acceptance gate** — the Layer-1 token audit alone is insufficient (it passed on a visually-broken tree).

---

## State left behind

- Branch `refactor/remove-font-hack` has all work committed **locally** (codemod, conversions, hack removal, audit harness, this report). **[Phase 1: Not pushed]** — do not push until the Tailwind-scale gap is closed and Layer-2 passes. *(Phase 2 closed the gap and pushed — see the Phase 2 resolution below.)*
- `docs/font-refactor/PLAN.md` — full plan + all 7 round verdicts.
- `docs/font-refactor/conversion-manifest.tsv` — every one of the 1408 converted tokens.
- `scripts/convert-rem.mjs` — re-runnable codemod (`--check` / apply / `--audit`).
- Preview servers and the `/tmp/ob-main` worktree were transient (may be cleaned up).

## Uncertain / not covered [Phase 1]

- **Chapter 2+ / dashboard / settings** were not rendered-verified beyond Chapter 1 + the observation above (Supabase-backed; the same Tailwind-scale regression applies to them a fortiori since they use more utility classes).
- The exact count of visually-affected elements app-wide is ≥747 on Chapter 1 alone; the app-wide total is larger.

---

# Phase 2 resolution — Tailwind default-scale rebase (2026-07-11) ✅ PUSHED

## What was done

1. **Rebased Tailwind's default rem scales ÷1.6** — new `scripts/tailwind-rebase.cjs` imports Tailwind 3.4.19's resolved default theme and divides every rem literal in the six rem-bearing scales (`spacing`, `fontSize`, `lineHeight`, `borderRadius`, `maxWidth`, `columns`) by 1.6, using the same exact-decimal arithmetic as Phase 1 (`×0.625` + per-token round-trip assertion). Wired into `tailwind.config.js` as **hard overrides** under `theme` (not `theme.extend`), so utilities emit the same pixels at the 16px base as at the old 10px base. Overriding `theme.spacing` cascades to `padding`/`margin`/`gap`/`width`/`height`/`inset`/`translate`/`size`/etc. automatically (they derive from spacing in core). The config's pre-existing custom `extend` keys (already Phase-1-converted) survive on top.
   - Scale coverage was scoped to actual `src/` usage: spacing **585 uses**, fontSize **78**, borderRadius **61**, lineHeight **3**, maxWidth **8**, columns **0** — all rebased.
   - Self-audit: `node scripts/tailwind-rebase.cjs --audit` → **126/126 rebased rem tokens are exactly default ÷ 1.6.**
   - Built-CSS spot-check confirmed the exact Phase-1 regression classes now emit the right values: `.px-24{padding:3.75rem}` (60px), `.gap-2{gap:.3125rem}` (5px), `.py-10{1.5625rem}` (25px), `.-ml-5{-.78125rem}` (-12.5px), `.h-64{10rem}` (160px).

2. **Fixed the one runtime-computed rem** — `src/components/chapter/TextComp.vue` builds the moving intro-dot's width/height rem by string concatenation: `'' + (2.5 - Math.abs(posAugeX)/20) + 'rem'`. This has **no `Nrem` literal**, so the Phase-1 regex codemod structurally could not match it, and it rendered 1.6× too big. Rebased by hand: `2.5 → 1.5625` (÷1.6) and divisor `20 → 32` (×1.6). Both old and new formulas reduce algebraically to **`25 − |posAugeX|/2` px**, so the dot is pixel-identical for *every* animation frame (verified analytically to ≤3.55e-15px across posAugeX ∈ {0…40}).

## Codex review (Phase 2)

**Round 1 — VERDICT: CLEAN.** (No second round needed.) Codex confirmed: the ÷1.6 arithmetic is correct (`×0.625` + round-trip, 126 tokens pass); all rem-bearing default scales used in `src/` are covered; overriding `theme.spacing` correctly cascades to the ~15 derived scales (padding/margin/gap/dimensions/inset/translate/size/flex-basis/scroll/border-spacing/text-indent); hard overrides replace defaults while preserving `extend.height.header`/`width.text`/`spacing.text`/`margin.body`; no double-conversion; non-rem values unchanged; `fontSize` tuple line-heights rebased and unitless `"1"` preserved. Codex independently probed `textIndent` (auto-rebases from spacing) and `decoration-*`/`ring-offset-*`/`blur-*` (no rem usage in `src/`) and found no miss.

## Layer-2 re-verification (the hard gate) — main (:4174) vs branch (:4173)

Method identical to Phase 1: two preview builds (main worktree at `/tmp/ob-main` with the same `.env` so Supabase Chapter-1 content loads identically), `data-reduce-motion=1`, `document.fonts.ready`, exhaustive `querySelectorAll('*')` computed-style traversal over the full size-property set, ≤0.1px tolerance, `transform` compared as numeric matrices.

| Page | Viewport | Nodes | `<html>` deltas (intended) | Rendered-node size regressions |
|------|----------|-------|----------------------------|--------------------------------|
| **Chapter 1 (the-retina)** | 1440×900 | 1792 | 2 (`fontSize` 10→16px, `lineHeight` 15→24px) | **0** *(was 747)* |
| **Chapter 1 (the-retina)** | 390×844 (mobile) | 3473 | 2 | **0** (16 raw deltas, all animation-phase drift on the dot + 13 rotating SVG `<g>` groups whose transform **scale = 1.0000 on both** sides — pure rotation/translation frame drift, zero rem-scale change) |
| **Home `/`** | 1440×900 | 88 | 2 | **0** (page is fully static; every rendered node — widths, `304px`/`290.664px` grids, paddings, `999px`/`4px`/`9999px` radii, font sizes — byte-identical) |

- `<body>` fontSize is **6.25px on both** everywhere (the §4a body pin holds exactly).
- The Phase-1 idx-81 dot regression (39.4px vs 20.7px) is **gone** after the TextComp fix; its residual live-diff delta is pure animation-phase drift, proven invariant.

## Headline

**Chapter 1 "The Retina" — the north-star page — rendered-element size deltas: 747 → 0.** Only `<html>`/`<head>` font-size changes (10px → 16px), which is the entire point of removing the hack. Every rendered, non-animated element is pixel-identical to `main`; the two animated elements (the intro dot and Lottie SVG groups) are proven invariant.

## What shipped (Phase 2 commits)

- `refactor(font): Phase 2 — rebase Tailwind default scales ÷1.6` — `scripts/tailwind-rebase.cjs` + `tailwind.config.js` hard overrides + PLAN §Phase 2.
- `refactor(font): rebase runtime-computed dot rem (TextComp) ÷1.6` — the sole runtime rem.
- `docs(font-refactor): Phase 2 resolution — Layer-2 clean, pushed` (this update).

## Still not rendered-verified (deferred, unchanged from Phase 1)

- **Chapter 2+ / dashboard / settings** — Supabase-backed and mostly gated behind auth locally; not rendered-diffed. They rely on the **same** rebased Tailwind scale + authored rem, both now proven invariant on Chapter 1 and Home, so the fix applies uniformly; but a full render diff of those routes is left for a follow-up. Chapter 1 (the north-star) and Home are the authoritative gates and are clean.
