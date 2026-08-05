# FIX-PLAN — Chapter 1 Supabase-vs-static parity

Derived from `docs/chapter1-parity/ROOT-CAUSE.md` (authoritative, on
`origin/diagnosis/chapter1-parity`) and verified against `useChapter.js`,
`useAnimations.js`, `animations.json`, and the initial-schema DDL.

**Split of responsibility**

- **CODE fixes** (#1, #4, #3) — implemented on `fix/chapter1-parity`, with unit tests.
  They touch the **shared** transformer, so every fix ships with fixtures proving
  Chapter 2+ does not regress.
- **DATA fixes** (#2/#5, #6, #9) — **script-only**. Idempotent SQL that Anton reviews
  and runs against prod himself. **This run never writes to prod.**
- **VERIFY-only** (#7, #10) — reported; changed only if a real mismatch exists
  (spoiler: neither needs a change).

---

## PART A — CODE FIXES (implement)

### CODE-FIX #1 — `reconstructNesting` flush (biggest lever)

`src/composables/useChapter.js:169-193`.

**Bug.** When a new `is_subsection_header && level===1` row begins, the code closes any
open `currentSubSubGroup`, then **overwrites** `currentSubSection` with a fresh object
(line 178) — the prior `currentSubSection` is **never pushed to `result`**. In a run of
N consecutive header rows, only the **last** survives; N−1 subSections (and any figures /
prose attached to them) are silently dropped. This is the entire Diseases video strip
and ~11 of the 12 missing figures.

**Fix.** Before building the new `currentSubSection`, **flush** the existing one into
`result` as `{ subSection: [currentSubSection] }`. `mergeConsecutiveSubSections` (already
called downstream) then re-groups the consecutive flushed entries into a single
`{ subSection: [sub1, sub2, …] }` wrapper — exactly the static text.json shape.

```js
if (p.is_subsection_header && level === 1) {
  // Flush the previous subSection before starting a new one.
  if (currentSubSection) {
    if (currentSubSubGroup) {
      currentSubSection.paragraphs.push({ subSubSection: currentSubSubGroup });
      currentSubSubGroup = null;
    }
    result.push({ subSection: [currentSubSection] });   // <-- NEW: don't lose it
  }
  currentSubSection = { id: p.id, title: p.content_text || "", paragraphs: [] };
  if (p.animation_id && p.animation_key) {
    currentSubSection.animation = { /* unchanged */ };
  }
  continue;
}
```

Only the header-branch changes. The `level===2`, `level===1 body`, `level===0`, and
final-flush branches are untouched (they already push correctly).

**Orphan level-2 rows (Codex).** A level-2 row arriving with no open `currentSubSection`
opens a `currentSubSubGroup` that a later header does not clear (the header's flush is
gated on `if (currentSubSection)`), so a stray subSubGroup could get mis-attached to the
next subSection. Real Ch1 data never emits an orphan level-2 (headers precede their
level-2 bodies), but the shared transformer must be robust for Ch2+. **Fix:** in the
header branch, reset `currentSubSubGroup = null` unconditionally after the flush (an
orphan group has no valid parent and is discarded rather than leaking forward), and add a
`level-2 → level-1 header` regression test asserting the new subSection has no phantom
`subSubSection`.

**Unit test** (`useChapter.reconstructNesting.spec` — Cypress component or a plain vitest
harness importing the composable):

1. **Diseases fixture** — 5 consecutive `is_subsection_header,level=1` rows, each with a
   distinct `animation_id/animation_key` (NormalVision, Cataracts, Glaucoma,
   DiabeticRetinopathy, AMD/RetinitisPigmentosa). After
   `mergeConsecutiveSubSections(reconstructNesting(rows))`, expect **one**
   `{ subSection: [...] }` entry whose array has **5** subSections, each carrying its
   `animation.id`. (Pre-fix: 1 subSection.)
2. **Header + level-1 body** — header row then a level-1 non-header paragraph → that
   paragraph lands in the header's `.paragraphs`.
3. **Level-2 rows** — header, then two level-2 rows → a `{ subSubSection: [2] }` inside
   the header's paragraphs.
4. **Interleaved level-0** — header, body, then a level-0 paragraph → subSection is
   flushed and the level-0 paragraph sits at top level after it.
5. **Chapter-2 shape (no headers)** — flat level-0 rows only → `hasNesting` false path,
   unchanged output. (Regression guard for the shared transformer.)
6. **Orphan level-2 → header** — a level-2 row with no preceding header, then a header →
   the new subSection carries no phantom `subSubSection`; the orphan group is discarded.
7. **Empty header** (`content_text` empty) and **header immediately after level-2
   content** — cover the remaining shared-transformer patterns Ch2+ can produce, per
   Codex. These fixtures run in `npm test` and are the regression proof for the shared
   transformer (the single flat-rows case alone is insufficient).

### CODE-FIX #4 — Fullscreen double-render

`src/composables/useChapter.js:141` (`transformParagraph`).

**Bug.** Fullscreen rows carry an `animation_full` block (→ `meta.animationFull=true`)
**and** an `animation_id` FK (→ `para.animation`). Static fullscreen paragraphs carry
**only** `animationFull`. On mobile, `SectionComp` can then mount both
`FullScreenIllustration` and `IllustrationInline` for the same paragraph. (3 DB rows.)

**Fix.** Skip building `para.animation` when the row is a fullscreen row:

```js
if (p.animation_id && p.animation_key && !para.animationFull) {
  para.animation = {/* unchanged */};
}
```

(`meta` is already spread into `para` above this line, so `para.animationFull` is set.)

**Unit test** — a row with an `animation_full` block **and** `animation_id/animation_key`
→ `para.animationFull === true` and `para.animation === undefined`. Control: a normal row
with `animation_id` but no `animation_full` block → `para.animation` present.

### CODE-FIX #3 — Switch flag (CODE option)

`src/composables/useAnimations.js:84`.

**Bug.** `IllustrationComp` mounts `IllustrationSwitch` only when `animation.switch` is
truthy. The DB `config` JSONB omits `switch`, and the transform never derives it, so the
4 switch figures mount the ordinary Lottie renderer. (Choosing the CODE option so it
works without a data change.)

**Fix.** When `row.interaction_type === "switch"`, set `anim.switch = true` (in addition
to the existing `anim.switches` array):

```js
if (row.interaction_type === "switch") {
  anim.switch = true;
  if (variants.length > 0) {
    anim.switches = variants.map((v) => v.variant_label);
  }
}
```

4 keys: CenterSurroundReceptiveFields, DirectionSelectivity, ObjectMotionSensitivity,
RodVsConeCircuits.

**Unit test** — a row with `interaction_type:"switch"` + 2 variant rows → `anim.switch
=== true` and `anim.switches.length === 2`. A non-switch row → no `switch` key.

---

## PART B — DATA FIXES (script-only — DO NOT RUN)

All DATA scripts live under `supabase/migrations/` (timestamped) so Anton applies them
with his normal migration tooling / service-role connection. Each is **idempotent**
(re-runnable) and **ID-scoped to Chapter-1 animation_keys** (safe for Chapter 2+).
**None runs in this session.**

### DATA-FIX #2 + #5 — Backfill `animation_states` / `animation_variants`

`animation_states` and `animation_variants` are **empty in prod (0 rows)**, so 0 of 77
animations get `states/statesHighlight/switches`.

**Source of truth: `src/assets/json_backend/animations.json`** — NOT the existing
`20260406000000` migration, which **mis-sets `is_highlight_state=true`** for EyeStructur,
RetinalCellTypes(×3), and Photoreceptors. Those labels live in the JSON `.states` array
(non-highlight); marking them highlight makes the transform emit an **empty `states[]`**
and parity stays broken. **Rule: `is_highlight_state` = which JSON array the label is in**
(`.states` → false, `.statesHighlight` → true).

Keys needing rows (14):

- **states only** (is_highlight_state=false): EyeStructur(11), ImpairedVision(4),
  SynapticArchitecture(3), Photoreceptors(6), RetinalCellTypes(10),
  RetinalCellTypes2(10), RetinalCellTypes3(10).
- **states + statesHighlight** (mixed): PupillaryLightreflex(5 + 4hl),
  Phototransduction(8 + 11hl), TheVisualCycle(6 + 5hl).
- **variants** (switch keys, 2 each): CenterSurroundReceptiveFields, DirectionSelectivity,
  ObjectMotionSensitivity, RodVsConeCircuits.

**order_index scheme** (satisfies `UNIQUE(animation_id, order_index)` and
`UNIQUE(animation_id, state_label)`): regular states `0..N-1`; highlight states
`100..100+M-1`. Variants `0,1`.

**`state_label` vs `state_description`.** The transform uses `state_description ||
state_label` for regular states and `state_label` for highlights. Rather than classify
figures as "sentences vs labels" (the earlier draft wrongly called ImpairedVision
sentences — its states are short labels), the generator uses one **deterministic rule**:

- **Regular state** (from `.states`): put the exact JSON string in `state_description`,
  and a stable synthetic `state_label` (`Step {i+1}`) to satisfy `UNIQUE(animation_id,
state_label)` without clashing across figures. Transform yields `state_description ||
state_label` = the exact JSON string.
- **Highlight state** (from `.statesHighlight`): put the exact JSON string in
  `state_label`. Transform yields `state_label` = the exact JSON string.
- **Byte-for-byte.** Copy JSON strings verbatim — **preserve whitespace** (TheVisualCycle
  has a trailing space in a regular state and in the `"Retinal "` highlight). No trim.

**Idempotency.** Per animation_key, inside one transaction:

```sql
-- resolve the prod UUID by the UNIQUE key (animations already exist in prod)
SELECT id INTO v_anim_id FROM animations WHERE animation_key = 'animationEyeStructur';
DELETE FROM animation_states   WHERE animation_id = v_anim_id;   -- clean slate, re-runnable
DELETE FROM animation_variants WHERE animation_id = v_anim_id;
INSERT INTO animation_states (...) VALUES (...);                 -- from animations.json
```

DELETE-then-INSERT keyed on the resolved UUID is fully re-runnable and cannot duplicate.
Wrap all 14 in a single `BEGIN…COMMIT`. The DELETE targets only the resolved Ch1 UUIDs —
the JSON is authoritative for these keys, so the migration intentionally **replaces all
child rows** for them (documented in the migration header).

**Missing key = abort (Codex).** All 14 keys are expected to exist in prod. A NULL lookup
must **not** fall through to an insert with `animation_id = NULL`. Guard with
`IF v_anim_id IS NULL THEN RAISE EXCEPTION 'animation_key % not found', k; END IF;` so the
whole transaction rolls back — an exact-parity migration should fail loudly, not partially.

**Empty-states figures (#parity scope).** The 6 disease videos have `states: []` in
`animations.json`; with no state rows the transform simply omits the `states` key. Static
carries `states:[]` (empty), DB carries no key. This is **behaviorally identical** (both
render zero step controls), so parity here is defined as **behavioral**, not deep object
equality. No rows seeded for these 6; documented as intentional.

**Generation + self-check.** The SQL is generated by a Node helper
(`scripts/seed/gen-chapter1-anim-states.mjs`) that reads `animations.json` and emits the
SQL, so the split can never drift from source. The generator also runs a **self-assertion**
(Codex): it feeds the rows it is about to emit through the _actual_ `useAnimations`
partition logic (`state_description || state_label` for non-highlight, `state_label` for
highlight; variants when switch) and **deep-compares the reconstructed `states` /
`statesHighlight` / `switches` against `animations.json`**, throwing if any figure
mismatches. The committed artifacts are the emitted `.sql` migration **and** the generator
(for provenance); the generator is filesystem-only — no Supabase client, no credentials,
no lifecycle hook. Applying the SQL is the only prod write, done by Anton.

### DATA-FIX #6 — Full `infoText`

DB `config.infoText` is truncated: Phototransduction 99 chars (static **1864**),
TheVisualCycle 118 chars (static **1342**). Backfill the full string from
`animations.json` into `animations.config` via `jsonb_set`, keyed by `animation_key`.
Idempotent by construction (overwrite). Included in the same migration file as #2/#5.

### DATA-FIX #9 — Scroll trigger

No DB paragraph has `animation_trigger='scroll'`, so every tree `transition` is false and
no scroll-transition is emitted. Set `animation_trigger='scroll'` on the two intro
paragraphs that should scroll-drive their transition: **EyeStructur intro** and
**RetinalCellTypes intro**.

Row selection is the risky part (there is no natural key). The script identifies them by
the animation FK of the _transition_ animations plus section — but because a bad WHERE
could touch the wrong row, the migration **selects and RAISE NOTICEs the candidate rows
first** and updates by explicit `id` list that Anton confirms. Documented as
**"review the printed candidate rows, then uncomment the UPDATE."** Idempotent (setting
`='scroll'` twice is a no-op).

---

## PART C — VERIFY-ONLY

### #7 AccommodationVergence — NO CHANGE

Static `text.json` has the doubled-prefix typo `animationAnimationAccommodationVergence`,
but the DB emits the clean `animationAccommodationVergence`, and the Lottie asset on disk
is `public/publicAssets/animations/animationAccommodationVergence.json` (single prefix).
**The DB value matches the asset**; no code hardcodes the doubled key (grep clean). The
DB render path is correct; nothing to fix.

### #10 Split-brain — NO CODE CHANGE, note in report

`ChapterView.loadChapter` clears `localStorage.sections` only on a **title change**
(`the-retina` → same title = no clear). But every successful fetch calls
`updateText("*", data)`, which **overwrites** `localStorage.sections` with fresh DB data —
so a degraded cache **self-heals on the next successful load**. Residual: if a user holds
a stale degraded tree and a later fetch fails, they keep the stale copy. **Mitigation for
the report:** after the fix ships, a single successful reload refreshes the cache; users
stuck on a degraded cache can clear `localStorage.sections`. No code change required.

---

## Chapter-2+ regression note

- **DATA** fixes are scoped by Chapter-1 `animation_key`s → cannot touch Ch2+.
- **CODE** fixes touch the shared transformer. #1 only adds a previously-missing flush
  (it can only _recover_ dropped subSections, never drop new ones); #4 gates on the
  Ch1-only `animationFull` meta; #3 gates on `interaction_type==="switch"`. Each ships
  with fixtures (incl. the no-nesting Ch2 shape, orphan level-2, empty header) run in
  `npm test` before merge.

**`fetchChapterById` — REMOVE (Codex).** `useChapter.fetchChapterById` does not select
`subsection_level`, does not resolve `animation_key`, and references an undefined
`supabase` import (it would throw if ever called). **Verified zero callers:**
`grep -rn "fetchChapterById" src/` returns only its own definition (`useChapter.js:519`)
and its entry in the returned object (`useChapter.js:605`) — no view/component imports or
invokes it. Rather than leave a broken, unused parity path or invest in aligning a
never-called function, **this branch deletes `fetchChapterById` and its return-object
entry.** This removes the only other (broken) chapter-fetch path, so `fetchChapter` is
unambiguously the single source of truth. (A grep-verified dead-code removal, not a
behavior change.)
