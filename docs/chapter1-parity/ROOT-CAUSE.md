# ROOT-CAUSE — why Chapter 1 renders differently from Supabase

**Diagnosis method:** live-fetched production Supabase data run through the verbatim
`useChapter.js` / `useAnimations.js` transforms. Every claim below is backed by the
actual transformed output (`_db_transformed_text.json`, `_db_transformed_anims.json`),
not by reading the transformer and guessing.

**Headline:** The body prose and section skeleton are faithful. **The illustration
layer is broken in two independent ways**, and together they make roughly half of
Chapter 1's interactive figures either disappear or render as dead artwork. The single
biggest lever is a **transformer bug** (CODE), closely followed by an **empty
animation-state/variant dataset** (DATA).

---

## Ranked discrepancies

### #1 — `reconstructNesting` drops consecutive subsection headers ⟶ **CODE-FIX** 🔴 biggest lever

`useChapter.js:169-193`. When a new `is_subsection_header && level===1` row begins, the
prior `currentSubSection` is **never pushed to `result`** — it's overwritten. Only the
last header in a run survives.

- **What's wrong:** ~11 of 12 missing figures trace here, incl. the entire Diseases
  video strip (Cataracts, Glaucoma, DiabeticRetinopathy, AMD, RetinitisPigmentosa),
  plus EyeMovements, RodVsConeCircuits, LightSensitiveGanglionCells, and the level-2
  bodies whose parent subSection is discarded (CenterSurround, ColorOpponency,
  ObjectMotionSensitivity).
- **Why it shows:** those illustrations never mount; their body paragraphs may also be
  lost or reparented into the wrong subSubSection.
- **Fix:** before overwriting `currentSubSection` on a new header, flush the existing
  one (push into `result` as `{subSection:[currentSubSection]}`, or into a shared
  buffer so `mergeConsecutiveSubSections` groups them). Add a unit test with the
  Diseases row fixture (5 consecutive headers → 5 subSections).
- **Verified:** Diseases raw rows show 5 header rows; transformed output has 1
  subSection + orphaned subSubSection[4]. Direct evidence, not inference.

### #2 — `animation_states` & `animation_variants` tables are EMPTY ⟶ **DATA-FIX** 🔴

Both tables return **0 rows**. `fetchAnimations` builds `states/statesHighlight/switches`
solely from them, so **0 of 77** animations get state/switch arrays.

- **What's wrong:** 14 static figures carry these arrays (EyeStructur's 11 layers,
  Photoreceptors' highlight states, the 4 switch figures, etc.). All lost.
- **Why it shows:** the Lottie/GSAP artwork mounts (config flags survive) but has no
  states to step through → clicking does nothing, highlights don't sync, switch
  toggles are absent. The figure looks "frozen/dead."
- **Fix:** backfill `animation_states` (state_label, state_description,
  is_highlight_state, order_index) and `animation_variants` (variant_label) for the 14
  interactive keys, from `animations.json`. Pure data; the transform already reads it.
- **Verified:** raw table fetch = 0 rows; transform output = 0 anims with states.

### #3 — Switch figures never get the `switch` flag → wrong renderer ⟶ **DATA-FIX** (or code) 🟠

_(Surfaced by Codex review; verified.)_ The 4 switch animations
(CenterSurroundReceptiveFields, DirectionSelectivity, ObjectMotionSensitivity,
RodVsConeCircuits) have `"switch": true` in static `animations.json` config, but the DB
`config` JSONB **omits `switch`**. `useAnimations` spreads `config` but never derives
`switch` from `interaction_type==="switch"`. `IllustrationComp:128` uses
`animation.switch` to mount `IllustrationSwitch`.

- **What's wrong:** even after backfilling `animation_variants` (→ `switches[]`), these
  figures mount the ordinary Lottie renderer, not the switch renderer — controls/toggle
  behavior absent.
- **Why it shows:** switch figures render but can't be toggled between variants.
- **Fix:** add `"switch": true` to the DB `config` for these 4 keys (DATA), **or** have
  `useAnimations` set `anim.switch = true` when `interaction_type==="switch"` (CODE).
- **Verified:** static `switch:true` present for all 4; DB config `switch` = null for all 4.

### #4 — Fullscreen rows emit BOTH `animationFull` and a normal `animation` object → double render on mobile ⟶ **CODE-FIX** 🟠

_(Surfaced by Codex; verified.)_ All 3 DB rows with an `animation_full` block **also**
carry an `animation_id` FK, so `transformParagraph` attaches both `animationFull:true`
and an `animation:{…}` object. Static fullscreen paragraphs carry **only**
`animationFull` (0 of them have both). On mobile, `SectionComp:115` can then render
`FullScreenIllustration` _and_ `IllustrationInline` for the same paragraph.

- **Fix (CODE):** in `transformParagraph`, skip building `.animation` when the row has an
  `animation_full` block. **Or (DATA):** null the `animation_id` FK on those 3 rows.
- **Verified:** DB = 3/3 rows have both; static = 0 rows have both.

### #5 — Interactive figures render "dead" #2 subset: `states`/`statesHighlight` split must be reproduced exactly ⟶ **DATA-FIX (validation)** 🟡

_(Refinement from Codex.)_ `useAnimations:69` partitions rows by `is_highlight_state`
into `states[]` vs `statesHighlight[]`. Several static figures (Photoreceptors,
Phototransduction, TheVisualCycle, RetinalCellTypes*) carry **both** arrays with
different lengths. The #2 backfill must set `is_highlight_state` per row correctly, not
just dump one row per label — otherwise highlight sync stays broken.

- **Verified:** static figures with both arrays enumerated in `_static_anim_states.txt`.

### #6 — Truncated `infoText` in fullscreen figures ⟶ **DATA-FIX** 🟡

_(Surfaced by Codex; verified against raw DB.)_ DB `config.infoText` is a stub:
Phototransduction 99 chars (static 1864); TheVisualCycle 118 chars (static 1342).

- **Why it shows:** the fullscreen explanatory panel shows a fragment instead of the
  full paragraph. Content loss, not just interaction loss.
- **Fix:** backfill full `infoText` into the DB config for these keys.

### #7 — `AccommodationVergence` key mismatch (static typo vs DB clean) ⟶ **DATA (verify asset)** 🟢

Static tree id = `animationAnimationAccommodationVergence` (doubled prefix typo); DB
emits `animationAccommodationVergence`. The DB value is arguably _correct_, but the
Lottie asset file + any hardcoded references must agree. **Verify** the artwork file
name and that no code hardcodes the doubled key.

- **Note:** this contradicts my earlier "surviving refs match" claim — corrected.

### #8 (was #3, RETRACTED) — `RetinalCellTypes3` name/id trigger mismatch ⟶ **NOT A BUG**

_My original finding #3 was WRONG._ `key.replace(/^animation/,"")` on
`animationRetinalCellTypes3` yields `RetinalCellTypes3` (the "3" is kept — it's not a
leading "animation"). DOM round-trip: `triggerAnimationRetinalCellTypes3` →
`animationretinalcelltypes3` == target. **Matches.** The static `name:"RetinalCellTypes"`
/ `id:"animationRetinalCellTypes3"` split is intentional (section trigger uses `name`,
mobile inline uses `id`). Retracted. _(My earlier DIFF §4 resolution table had a
scripting error — it stripped only the first "trigger" substring incorrectly.)_

### #9 (was #4, REFRAMED) — Scroll-transitions never fire ⟶ **DATA-FIX**

The tree `transition` flag = `animation_trigger==="scroll"`, and **no DB paragraph has
`animation_trigger="scroll"`**, so every tree `transition` is `false` and no
`IllustrationTransition` / scroll-anchor is emitted. The transition components build
their own trigger id by appending `"Transition"` to the base name
(`SectionComp:10`), so the base animation link is correct — **not** an orphaned
`*Transition` key problem (my earlier framing was wrong).

- **Fix (DATA):** set `animation_trigger="scroll"` on the paragraphs that should
  scroll-drive their transition (EyeStructur intro, RetinalCellTypes intro).
- **Verified:** all DB tree `transition` = false; `SectionComp` appends `"Transition"`.

### #10 — Split-brain (static seed shadowing DB) ⟶ **NOT A CAUSE** (monitor only)

Traced fully (DIFF §5). DB content overwrites the store before paint; `source`
(static) is only used for caption strings. Residual: `updateText("*")` persists the
_degraded_ DB tree into `localStorage.sections`, so a stale cached copy can outlive a
later DB fix until cleared. Low priority; not the visible break.

---

## Data-fix vs code-fix split (revised after Codex review)

| #   | Discrepancy                                                        | Class                   | Impact                                     | Verified              |
| --- | ------------------------------------------------------------------ | ----------------------- | ------------------------------------------ | --------------------- |
| 1   | Nesting drops consecutive subSection headers                       | **CODE**                | ~11 figures + subsection prose/bodies lost | ✅ Diseases rows      |
| 2   | Empty animation_states / animation_variants                        | **DATA**                | 14 dead interactive figures                | ✅ 0 rows             |
| 3   | Switch figures lack `switch` config flag                           | **DATA/code**           | 4 switch figures wrong renderer            | ✅ config null        |
| 4   | Fullscreen rows emit both animationFull + animation                | **CODE**                | 3 figures double-render on mobile          | ✅ 3/3                |
| 5   | states/statesHighlight split must match `is_highlight_state`       | **DATA (validate)**     | highlight sync on ~5 figures               | ✅ static both-arrays |
| 6   | Truncated `infoText`                                               | **DATA**                | 2 fullscreen panels show fragments         | ✅ 99 vs 1864         |
| 7   | AccommodationVergence key typo mismatch                            | **DATA (verify asset)** | possibly 1 figure                          | ✅ ids differ         |
| 8   | ~~RetinalCellTypes3 name/id mismatch~~                             | **RETRACTED**           | none                                       | ✅ round-trips        |
| 9   | Scroll-transitions never fire (`animation_trigger` never "scroll") | **DATA**                | 2 scroll transitions dead                  | ✅ all false          |
| 10  | Split-brain seed                                                   | none (monitor)          | 0 (not the cause)                          | ✅ traced             |

**Most impactful data fix:** backfill `animation_states`/`animation_variants` (#2),
respecting the `is_highlight_state` split (#5).
**Most impactful code fix:** the `reconstructNesting` flush bug (#1).
Neither alone achieves parity — **you need both.** #1 makes the figures + their prose
appear; #2 makes them interactive. Then #3/#4/#6/#9 clean up the residue.

## Verdict on the biggest lever

Two co-equal levers, different symptoms:

- **#1 (CODE)** — "half the illustrations _and their subsection bodies_ are missing." Fix the nesting flush.
- **#2 (DATA)** — "the illustrations that do appear are dead." Backfill state/variant tables (with correct highlight split).

Recommended sequence: **#1 → #2 (+#5) → #3 → #4 → #6 → #9 → #7.**

### Chapter 2+ regression caveat (from Codex — accepted)

- **#2/#3/#5/#6/#7 (DATA)** are scoped by Chapter-1 animation IDs → **safe** for Ch2+.
- **#1/#4 (CODE)** touch the **shared** transformer. Correctly preserving subsections
  should not regress Ch2+, but this is unproven here. **Any code fix MUST ship with
  fixtures covering: consecutive level-1 headers, empty headers, level-2 rows,
  animation_full+FK rows — run against every chapter's real row patterns before merge.**

---

## STEP 4 — Codex review verdicts

### Round 1 — **VERDICT: GAPS** (substantive, mostly correct — accepted)

Codex ran `codex exec --sandbox read-only` against the codebase. Findings and my adjudication:

- ✅ **Accepted — #3 switch flag missing.** Verified: static `switch:true`, DB config null. Added as new #3.
- ✅ **Accepted — #4 fullscreen double-render.** Verified: 3/3 DB full rows carry FK; 0 static. Added as new #4.
- ✅ **Accepted — #6 infoText truncated.** Verified against raw DB config (99 vs 1864 chars). Added.
- ✅ **Accepted — #7 AccommodationVergence key mismatch.** Verified ids differ. Added; corrected my "refs match" claim.
- ✅ **Accepted — #5 states/statesHighlight split.** Verified static both-arrays. Added as validation caveat.
- ✅ **Accepted — RetinalCellTypes3 is NOT a bug.** Verified round-trip matches. **Retracted my #3.** My DIFF §4 table had a scripting error.
- ✅ **Accepted — transition reframed.** Verified `SectionComp` appends "Transition"; real issue is `animation_trigger` never "scroll". Reframed as #9.
- ✅ **Accepted — "body prose faithful" overstated.** Corrected: the nesting bug drops subsection _bodies_, not only figures.
- ✅ **Accepted — Ch2+ regression coverage.** Added the caveat above; DATA fixes are ID-scoped/safe, CODE fixes need cross-chapter fixtures.

**All GAP items were independently re-verified against live data / code before acceptance
— none taken on faith.** Two of my original findings were wrong (RetinalCellTypes3
retracted; transition reframed); six new/refined discrepancies added. The two headline
root causes (#1 nesting bug, #2 empty state tables) **survived review unchanged and
confirmed.**

### Round 2 — not required

Round 1 gaps were concrete, verifiable, and fully addressed above; re-running would not
change the headline. Skipped per the "max 2 rounds" budget.
