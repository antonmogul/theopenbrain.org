# Chapter 1 parity — post-seed verification checklist

Run this **after** applying the two seed migrations (and the backup). It confirms the
DB now matches the static source of truth and that Chapter 1 renders with full
interactivity. Three layers: **DB data → runtime transform → rendered behaviour.**

Project: `ocenwbkdzmxhsvwlornp` · SQL editor:
https://supabase.com/dashboard/project/ocenwbkdzmxhsvwlornp/sql

---

## 0. Pre-flight (before you seed)

- [ ] Backup ran (`scripts/seed/backup-before-chapter1-seed.sql`) and printed
      `animation_states=0`, `animation_variants=0` (that empty state is the bug).
- [ ] Seed 1 (`20260711000000_seed_chapter1_anim_states.sql`) committed with no error
      (it's all-or-nothing — a missing key rolls the whole thing back).
- [ ] Seed 2 STEP 1 run, the 2 intro paragraph IDs confirmed from the NOTICE output,
      STEP 2 uncommented + run.

---

## 1. DB data layer — counts must match the static source of truth

Run in the SQL editor. The expected numbers come from
`src/assets/json_backend/animations.json` (the target).

- [ ] **Tables are no longer empty:**
  ```sql
  SELECT (SELECT count(*) FROM animation_states)   AS states,
         (SELECT count(*) FROM animation_variants) AS variants;
  ```
  Expect **states = 93** (73 plain + 20 highlight, summed from the static source) and
  **variants = 8** (4 switch figures × 2). If either is 0, the seed didn't apply.

- [ ] **Per-figure parity** — each interactive figure has exactly the right split.
      Expected (states / highlight / switches), from static:
      | animation_key | states | statesHighlight | switches |
      |---|---:|---:|---:|
      | animationEyeStructur | 11 | 0 | 0 |
      | animationPupillaryLightreflex | 5 | 4 | 0 |
      | animationImpairedVision | 4 | 0 | 0 |
      | animationPhototransduction | 8 | 11 | 0 |
      | animationTheVisualCycle | 6 | 5 | 0 |
      | animationSynapticArchitecture | 3 | 0 | 0 |
      | animationPhotoreceptors | 6 | 0 | 0 |
      | animationRetinalCellTypes | 10 | 0 | 0 |
      | animationRetinalCellTypes2 | 10 | 0 | 0 |
      | animationRetinalCellTypes3 | 10 | 0 | 0 |
      | animationCenterSurroundReceptiveFields | 0 | 0 | 2 |
      | animationDirectionSelectivity | 0 | 0 | 2 |
      | animationObjectMotionSensitivity | 0 | 0 | 2 |
      | animationRodVsConeCircuits | 0 | 0 | 2 |

      Query to verify states/highlight per key:
  ```sql
  SELECT a.animation_key,
         count(*) FILTER (WHERE s.is_highlight_state = false) AS states,
         count(*) FILTER (WHERE s.is_highlight_state = true)  AS highlight
  FROM animations a
  JOIN animation_states s ON s.animation_id = a.id
  GROUP BY a.animation_key
  ORDER BY a.animation_key;
  ```
  And variants (switches):
  ```sql
  SELECT a.animation_key, count(*) AS variants
  FROM animations a JOIN animation_variants v ON v.animation_id = a.id
  GROUP BY a.animation_key ORDER BY a.animation_key;
  ```
  - [ ] Every row matches the table above. **⚠️ Watch the highlight split** — the
        legacy `20260406000000` migration mis-marked EyeStructur / RetinalCellTypes×3 /
        Photoreceptors as highlight. Confirm those show **highlight = 0** now.

- [ ] **infoText repaired** (not truncated stubs):
  ```sql
  SELECT animation_key, length(config->>'infoText') AS len
  FROM animations
  WHERE animation_key IN ('animationPhototransduction','animationTheVisualCycle');
  ```
  Expect **Phototransduction len ≈ 1864** (was 99) and **TheVisualCycle ≈ 1342** (was 118).

- [ ] **Scroll triggers set** on exactly the 2 intro paragraphs:
  ```sql
  SELECT p.id, a.animation_key, p.animation_trigger
  FROM paragraphs p JOIN animations a ON a.id = p.animation_id
  WHERE p.animation_trigger = 'scroll';
  ```
  Expect **2 rows** — the EyeStructur intro and the RetinalCellTypes intro. Not more
  (over-setting would fire transitions on the wrong paragraphs).

---

## 2. Runtime transform layer — the app's own read

Confirms `useAnimations` now emits the arrays the components consume. Fastest check:
re-run the diagnosis transform harness against live prod (the `_run_transform.mjs`
approach on the old `diagnosis/chapter1-parity` branch), OR in the browser console on
`/chapter/1` after load:

- [ ] `animation_states`-backed figures now carry `states` / `statesHighlight`:
      the transformed animation list has **0 figures with empty states** among the 14
      interactive keys (was 14/14 empty pre-seed).
- [ ] Switch figures carry `switches: [...]` (2 each) AND `switch: true`
      (the `switch:true` is the code fix — already true pre-seed; the `switches` array
      is what the seed adds).

---

## 3. Rendered behaviour — the real parity test on /chapter/1

Load `/chapter/1/the-retina` (prod data). These are the things that were **inert before
the seed** and should now work — this is what "parity" means to a user:

- [ ] **All figures mount** (this was already true after the code-fix merge — 11
      recovered figures incl. the Diseases strip of 6). Confirm still true.
- [ ] **State-stepping works:** click into a multi-state figure (e.g. **EyeStructur** —
      11 layers, **Photoreceptors**, **RetinalCellTypes**). Clicking advances through
      its states instead of doing nothing.
- [ ] **Highlight sync works:** on a figure with `statesHighlight`
      (**Phototransduction**, **TheVisualCycle**, **PupillaryLightreflex**), the
      highlight states light the right elements — no desync, no "frozen" figure.
- [ ] **Switch toggles work:** the 4 switch figures
      (**CenterSurroundReceptiveFields**, **DirectionSelectivity**,
      **ObjectMotionSensitivity**, **RodVsConeCircuits**) show a toggle/switch control
      and flip between their 2 variants.
- [ ] **Scroll transitions fire:** scrolling through the EyeStructur and
      RetinalCellTypes section intros drives their transition animation
      (`IllustrationTransition` / scroll anchor present).
- [ ] **Fullscreen info panels show full text** (not a truncated fragment) on
      Phototransduction / TheVisualCycle.
- [ ] **No double-render on mobile** — at a phone width, fullscreen figures show ONCE
      (the `animationFull` dedup code fix; confirm it holds with real seeded data).

### Side-by-side (optional, strongest): DB vs static
If you still have the static build, open the original static Chapter 1 next to the DB
one and spot-check that a couple of interactive figures behave **identically** (same
states, same order, same toggles). That's the definitive parity confirmation.

---

## 4. Regression guard — Chapter 2+ still fine

The transformer is shared. Quick check nothing else broke:

- [ ] Load `/chapter/2` (or any Supabase chapter) — renders normally, figures present,
      no console errors.
- [ ] `npm test` still green (154) on `main` — no code changed by seeding, but confirm
      the branch you're on matches.

---

## If something's off

- Counts wrong / highlight mis-split → the seed may have hit the legacy-migration
  mis-marking. Re-run Seed 1 (idempotent) — it wipes+reinserts per key from JSON.
- Figures still inert after seeding → hard-reload (the app caches the transformed tree
  in `localStorage.sections`; a stale degraded copy can outlive the fix). Clear site
  data / `localStorage.removeItem('sections')` and reload.
- Anything worse → restore from the backup (restore block at the bottom of
  `scripts/seed/backup-before-chapter1-seed.sql`).

---

## Done = parity achieved

When section 1 counts match the static table, section 3's interactions all work, and
Chapter 2+ is unregressed — **Chapter 1 from the database is at parity with the static
version.** The north star is reached.
