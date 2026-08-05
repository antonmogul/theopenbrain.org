# FIX-REPORT — Chapter 1 Supabase-vs-static parity

Branch: `fix/chapter1-parity` (pushed). Follows `FIX-PLAN.md`, which follows the
authoritative `ROOT-CAUSE.md` (on `origin/diagnosis/chapter1-parity`).

**Headline: missing figures 11 → 0 after the code fixes; 2 seed scripts ready for Anton
to run.** The CODE fixes restore figure PRESENCE + structure (verified against LIVE
production data and in a real browser render). Full DATA-dependent interactivity
(clickable states, switch toggles, scroll transitions) stays inert until Anton applies
the seed scripts — this is expected and by design (this run never writes to prod).

---

## CODE fixes (implemented + verified)

| Fix                                                       | File                                                                    | Commit    |
| --------------------------------------------------------- | ----------------------------------------------------------------------- | --------- |
| #1 reconstructNesting flush (+ orphan level-2 reset)      | `src/composables/useChapter.js`                                         | `36a9f36` |
| #4 fullscreen: skip inline animation when `animationFull` | `src/composables/useChapter.js`                                         | `36a9f36` |
| #3 switch: derive `anim.switch` from `interaction_type`   | `src/composables/useAnimations.js`                                      | `36a9f36` |
| dead-code: remove `fetchChapterById` (0 callers)          | `src/composables/useChapter.js`                                         | `36a9f36` |
| unit tests (13)                                           | `src/composables/__tests__/useChapter.test.js`, `useAnimations.test.js` | `36a9f36` |

### Before / after — transform harness over LIVE production Supabase

Ran the diagnosis harness approach (`_run_transform.mjs` style) live-fetching prod, then
ran the OLD (main, buggy) and NEW (HEAD, fixed) `reconstructNesting` over identical raw
rows:

| Metric                             | BEFORE (main) | AFTER (HEAD) |
| ---------------------------------- | ------------: | -----------: |
| Diseases section subSections       |         **1** |        **6** |
| Distinct animation figures in tree |         **9** |       **18** |
| Total animation refs in tree       |            10 |           22 |
| Missing disease figures            |       5 (all) |        **0** |

**11 figures recovered** (present after, absent before):
AgeRelatedMacularDegeneration, Cataracts, CenterSurroundReceptiveFields, ColorOpponency,
DiabeticRetinopathy, EyeMovements, Glaucoma, LightSensitiveGanglionCells,
ObjectMotionSensitivity, RetinitisPigmentosa, RodVsConeCircuits. This matches
ROOT-CAUSE's "~11 of 12 missing figures trace to #1."

### Browser render (Playwright, live prod data, 1600×1000)

`/chapter/1/the-retina` loaded (13 sections / 191 paragraphs from prod). **All 27
illustration trigger anchors mount**, including **every one of the 11 previously-missing
figures** (`triggerAnimationCataracts`, `…Glaucoma`, `…DiabeticRetinopathy`,
`…AgeRelatedMacularDegeneration`, `…RetinitisPigmentosa`, `…EyeMovements`,
`…LightSensitiveGanglionCells`, and the switch figures
`triggeranimationCenterSurroundReceptiveFields`, `…ObjectMotionSensitivity`,
`…RodVsConeCircuits`, `…ColorOpponency`). The Diseases strip renders all 6 figures.

Switch figures now carry `switch:true` (transform-level, verified live) — with **zero**
data change.

**Console errors observed are pre-existing and unrelated to the fix:** local-dev 404s on
IBM-Plex font files and on some `publicAssets/animations/*.json` Lottie files (artwork not
committed to the local tree), and a YouTube CSP frame block. Content and structure load
correctly from prod.

### Gates

- `npm run build` → **exit 0**.
- `npm test` → **154 passed** (141 baseline + 13 new). No regressions.
- Codex plan review: round 1 REVISE (8 items, all addressed) → round 2 REVISE (1 item,
  `fetchChapterById`) → resolved by verified-zero-callers removal.
- Codex diff review: **CLEAN** (independently re-ran the focused suite, 13/13).

---

## DATA seed scripts (WRITTEN — Anton runs them; this run did NOT)

All are ID-scoped to Chapter-1 `animation_key`s (safe for Chapter 2+), idempotent, and
perform NO writes at build/import/CI time. Apply with **service_role / superuser**
(bypasses RLS). **Run order: #1 then #2.**

### 1. `supabase/migrations/20260711000000_seed_chapter1_anim_states.sql` (commit `91ffc99`)

Backfills the **empty** `animation_states` (0 rows) and `animation_variants` (0 rows)
tables and repairs truncated `config.infoText` for **14** interactive figures.

- **Generated** by `scripts/seed/gen-chapter1-anim-states.mjs` from
  `src/assets/json_backend/animations.json` (the authoritative static source).
- `is_highlight_state` is derived from JSON array membership (`.states` → false,
  `.statesHighlight` → true). **This corrects the legacy `20260406000000` migration**,
  which mis-marked EyeStructur / RetinalCellTypes(×3) / Photoreceptors as highlight and
  would have produced empty `states[]` through the transform.
- `order_index`: regular states `0..N-1`, highlight states `100..M` (satisfies both
  UNIQUE constraints).
- The generator SELF-ASSERTS: it reconstructs `states/statesHighlight/switches` from the
  rows it emits (via the real `useAnimations` partition logic) and deep-compares against
  `animations.json` — it threw on any mismatch. Self-assertion passed for all 14.
- Idempotent: per key it `SELECT`s the existing UUID, `DELETE`s child rows, re-`INSERT`s.
  A missing key `RAISE EXCEPTION`s and rolls back the whole transaction.
- **infoText restored** for Pupillary, ImpairedVision, Phototransduction, TheVisualCycle
  (covers #6's verified-truncated Phototransduction 99→1864 and TheVisualCycle 118→1342).

**How to run:**

```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260711000000_seed_chapter1_anim_states.sql
# (or apply via the Supabase migration tooling / SQL editor with service-role)
# Re-running is safe. To regenerate from source: node scripts/seed/gen-chapter1-anim-states.mjs
```

### 2. `supabase/migrations/20260711000001_seed_chapter1_scroll_triggers.sql` (commit `91ffc99`)

Sets `animation_trigger='scroll'` on the two intro paragraphs (EyeStructur,
RetinalCellTypes) so their scroll transitions fire (#9). **Two-step, review-first:**

- **STEP 1** (runs, read-only): `RAISE NOTICE`s the candidate paragraph rows (by linked
  animation_key + section + order) so you can identify the correct intro rows.
- **STEP 2** (commented out): after confirming the ids from STEP 1, paste them into the
  `UPDATE … WHERE id IN (…)` and uncomment. Idempotent (setting `='scroll'` twice is a
  no-op).

**How to run:** apply the file → read the NOTICE output → edit STEP 2 with the confirmed
paragraph ids → re-apply.

### What stays inert until the seed runs

Until #1 is applied, `animation_states`/`animation_variants` remain 0 rows, so clickable
state layers, highlight overlays, and switch _variant labels_ are absent — the figures
**render but are non-interactive**. The `switch:true` renderer selection already works
(code fix), but the toggle needs the variant rows. Scroll transitions stay off until #2.

---

## Verify-only findings

### #7 AccommodationVergence — NO CHANGE NEEDED

The DB emits the clean key `animationAccommodationVergence`, which **matches** the on-disk
Lottie asset `public/publicAssets/animations/animationAccommodationVergence.json`. The
doubled-prefix `animationAnimationAccommodationVergence` exists **only** in the legacy
static `text.json` (a typo) and is not referenced by any code (grep clean). The DB render
path is correct.

### #10 Split-brain — NO CODE CHANGE, one caveat

`ChapterView.loadChapter` clears `localStorage.sections` only on a **title change**, but
every successful fetch calls `updateText("*", data)`, which overwrites
`localStorage.sections` with fresh DB data. So a degraded cached tree **self-heals on the
next successful load**. Caveat for rollout: a user holding a stale degraded cache whose
next fetch fails would keep the stale copy; after this fix ships, a single successful
reload refreshes it, or they can clear `localStorage.sections`.

---

## Chapter 2+ regression posture

- DATA fixes are `animation_key`-scoped → cannot touch Ch2+.
- CODE fixes touch the shared transformer but only _recover_ previously-dropped
  subSections (#1), gate on Ch1-only `animationFull` (#4), or gate on
  `interaction_type==="switch"` (#3). Covered by fixtures incl. the flat no-nesting Ch2
  shape, orphan level-2, and empty-header cases — all green in `npm test`.

## Follow-ups (not in this PR)

- `fetchChapterById` was removed (dead). If a by-id fetch path is ever needed, re-add it
  aligned with `fetchChapter` (select `subsection_level`, resolve `animation_key`, use the
  REST client, not the undefined `supabase` global).
- Consider deleting/superseding the legacy `20260406000000_seed_chapter1_animations.sql`
  (mis-classified highlight states) so it can't be applied after the corrected seed.
