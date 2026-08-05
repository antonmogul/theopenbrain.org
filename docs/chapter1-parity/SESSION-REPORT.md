# SESSION REPORT — Chapter 1 Supabase-vs-static parity diagnosis

**Date:** 2026-07-11 · **Branch:** `diagnosis/chapter1-parity` · **Mode:** READ-ONLY
(no app code, no DB rows changed). **Data provenance: LIVE-FETCHED** from production
Supabase (`ocenwbkdzmxhsvwlornp`), run through the **verbatim** `useChapter.js` /
`useAnimations.js` transforms (`_run_transform.mjs`). No tracing, no fabrication.

---

## #1 ROOT CAUSE (headline)

**`reconstructNesting()` in `useChapter.js` silently drops every level-1 subsection
header except the last in a consecutive run** — taking its animation, prose, and
child paragraphs with it. This alone erases ~11 of Chapter 1's ~12 missing
illustrations (the entire Diseases video strip, the amacrine switch figures, etc.)
and their subsection bodies. `useChapter.js:169-193` never flushes the prior
`currentSubSection` before overwriting it.

## What was found

- **Section skeleton & body prose:** faithful (10 sections, correct titles/order,
  intro dragon). Divergence is the **illustration layer**, plus subsection bodies lost
  via the nesting bug.
- **Illustrations in the content tree:** 28 static → **14** DB. Distinct ids 20 → **11**.
- **Interactive figure data:** `animation_states` and `animation_variants` tables are
  **empty (0 rows)** → **0 of 77** animations get `states`/`statesHighlight`/`switches`.
  14 static figures need them. Figures mount but are "dead."
- **Config gaps:** `switch:true` missing for 4 switch figures (wrong renderer);
  `infoText` truncated for 2 fullscreen figures (content loss).
- **Structural:** fullscreen rows carry both `animationFull` + an `animation` object →
  double-render on mobile (3/3 DB rows; 0 static).
- **Scroll transitions:** `animation_trigger` is never `"scroll"` → all tree
  `transition:false` → scroll-transition figures never fire.
- **Split-brain:** traced and **ruled out** as the cause — DB content overwrites the
  store before paint; static `source` only feeds caption strings.

## Ranked root cause (see ROOT-CAUSE.md for full detail)

1. **Nesting flush bug** — CODE — ~11 figures + subsection bodies. 🔴 biggest lever.
2. **Empty `animation_states`/`animation_variants`** — DATA — 14 dead figures. 🔴
3. **Missing `switch` config flag** — DATA/code — 4 switch figures. 🟠
4. **Fullscreen double-render (both animationFull + animation)** — CODE — 3 figures. 🟠
5. **states/statesHighlight split must honor `is_highlight_state`** — DATA validation. 🟡
6. **Truncated `infoText`** — DATA — 2 panels. 🟡
7. **Scroll-transition (`animation_trigger` never "scroll")** — DATA — 2 transitions. 🟡
8. **AccommodationVergence key typo** — DATA (verify asset). 🟢

- ~~RetinalCellTypes3 name/id mismatch~~ — **RETRACTED** (round-trips correctly).
- Split-brain seed — **not a cause** (monitor only).

## Data-fix vs code-fix

- **CODE:** #1 (nesting flush), #4 (fullscreen double-emit). Both touch the **shared**
  transformer → require cross-chapter fixtures before merge (see caveat).
- **DATA:** #2, #3, #5, #6, #7, #8 — all Chapter-1 ID-scoped → **safe for Chapter 2+.**

## Codex verdict

Round 1: **VERDICT: GAPS** — substantive and mostly correct. It confirmed the two
headline root causes (#1, #2) unchanged, caught two of my errors (RetinalCellTypes3 was
NOT a bug → retracted; transition mis-framed → reframed), and surfaced four real
discrepancies I missed (switch flag, fullscreen double-render, infoText truncation,
key typo) plus the Ch2+ regression caveat. **Every GAP item was independently
re-verified against live data/code before acceptance — none on faith.** Round 2 not
needed. See ROOT-CAUSE.md §STEP 4.

## Live-fetched or traced?

**LIVE-FETCHED.** All numbers come from production Supabase run through the real
transform code. Artifacts committed for reproducibility:
`_db_transformed_text.json`, `_db_transformed_anims.json`, `_static_anim_states.txt`,
`_run_transform.mjs`.

---

## Recommended fix sequence for the NEXT (build) run

1. **Fix `reconstructNesting`** to flush each subsection before starting the next
   (push `{subSection:[current]}` into a buffer / result). **Ship with fixtures:**
   consecutive level-1 headers, empty headers, level-2 rows, animation_full+FK rows —
   validated against **every** chapter's real row patterns (Ch2+ shares this code).
2. **Backfill `animation_states` + `animation_variants`** for the 14 interactive
   Ch1 keys from `animations.json`, setting `is_highlight_state` correctly so both
   `states[]` and `statesHighlight[]` reconstruct.
3. **Add `switch:true`** to DB `config` for the 4 switch figures (or derive it from
   `interaction_type==="switch"` in `useAnimations`).
4. **Stop emitting `.animation`** on `animation_full` rows in `transformParagraph`
   (or null those FKs) to kill the mobile double-render.
5. **Backfill full `infoText`** for Phototransduction / TheVisualCycle.
6. **Set `animation_trigger="scroll"`** on the scroll-transition anchor paragraphs.
7. **Verify the `AccommodationVergence` Lottie asset** name vs the DB key.
8. Re-run `_run_transform.mjs` against live data after each DATA change to confirm
   the transformed tree now matches the 28-ref / 20-id static target.

DATA fixes (2,3,5,6,7,8) are ID-scoped and safe to ship first for fast visible wins;
CODE fixes (1,4) are the parity-critical but higher-risk changes needing regression tests.
