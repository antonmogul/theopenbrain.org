# DIFF — static text.json/animations.json vs live DB-transformed output

All numbers verified against **live-fetched** data run through the **verbatim
transform code** (`_run_transform.mjs`). Not traced, not estimated.

---

## 1. Structural diff (text tree)

| Dimension                      | Static  |                          DB                          | Verdict                            |
| ------------------------------ | :-----: | :--------------------------------------------------: | ---------------------------------- |
| intro                          |    1    |                          1                           | ✅ match (dragon anim ✓)           |
| sections                       |   10    |                          10                          | ✅ match — same titles, same order |
| section paragraphs (body text) |    —    |                          —                           | ✅ present, HTML renders           |
| animation objects in tree      |   28    |                          14                          | ❌ **half lost**                   |
| distinct animation ids in tree |   20    |                          11                          | ❌ **9 figures missing**           |
| furtherReading                 | present |         built from `further-reading` section         | ✅ (not deeply diffed)             |
| footNotes                      | present | built from `footnotes` section (106 footnote blocks) | ✅                                 |

**Body prose is faithful.** The divergence is entirely in the **illustration layer**.

### Block-type coverage gaps (minor)

`contentBlocksToHTML` handles `citation_ref` and `figure_placeholder`, but **the DB
Chapter-1 blocks contain neither** — so those code paths are dead for Ch1. No visible
loss (static didn't use them either). Not a parity issue; noted for completeness.

---

## 2. Nesting bug — the primary structural break (CODE)

`reconstructNesting()` in `useChapter.js` (lines 169-193) **drops every
level-1 subsection header except the last in a consecutive run.**

When a new `is_subsection_header && level===1` row is seen, the code builds a fresh
`currentSubSection` but **never pushes the previous `currentSubSection` into `result`
(or a buffer).** It only closes an open subSubGroup, then overwrites the variable.
Result: prior subSections — with their animation _and_ their body/subSub children —
are silently discarded. Only the last one survives (flushed at loop end).

### Proof — Diseases section raw rows (ordered by `order_index`)

```
ord lvl hdr  anim                                text
  0  0   0   animationNormalVision               "It is estimated…"
  1  1   1   animationCataracts                  "Cataracts"          ← subSection start
  2  1   0   —                                   "A cataract arises…"
  3  1   1   animationGlaucoma                   "Glaucoma"           ← overwrites #1, Cataracts LOST
  4  1   0   —                                   "Glaucoma is…"
  5  1   1   animationDiabeticRetinopathy        "Diabetic retinopathy" ← overwrites #3, Glaucoma LOST
  6  1   0   —                                   …
  7  1   1   animationAgeRelatedMacularDegener…  "Age-related…"       ← overwrites #5
  8  1   0   —                                   …
  9  1   1   animationRetinitisPigmentosa        "Retinitis pigmentosa" ← overwrites #7
 10  1   0   —                                   …
 11  1   1   —                                   ""  (Treatment header)
 12  2   0   —                                   "Treatment strategies…"
 13  2   0   —                                   …  (→ subSubSection)
```

Transformed output for this section: **`paragraphs[0]=NormalVision` + one
`subSection[1]` + `subSubSection[4]`** — Cataracts / Glaucoma / DiabeticRetinopathy /
AgeRelatedMacularDegeneration all gone.

### Animations dropped by this bug (8 confirmed)

`EyeMovements, Cataracts, Glaucoma, DiabeticRetinopathy, AgeRelatedMacularDegeneration,
RodVsConeCircuits, RetinitisPigmentosa, LightSensitiveGanglionCells`

Plus the **level-2 body animations whose parent subSection was discarded**:
`CenterSurroundReceptiveFields, ColorOpponency, ObjectMotionSensitivity` — these sit as
level-2 rows under dropped amacrine-section headers, so they vanish with the parent.

> This single function is responsible for ~11 of the 12 missing figures.

---

## 3. Animation-config diff (animations.json vs fetchAnimations)

Matched on `id` (= `animation_key`).

| Property                                                                          |        Static        |           DB            | Verdict                                                  |
| --------------------------------------------------------------------------------- | :------------------: | :---------------------: | -------------------------------------------------------- |
| config flags (fullscreen/loop/flip/split/isTransition/clickTriggered/highlight/…) |          ✓           |            ✓            | ✅ **mostly preserved** (in `config` JSONB)              |
| **`switch` flag** (on the 4 switch figures)                                       |          ✓           |       **absent**        | ❌ **missing** → wrong renderer (`IllustrationComp:128`) |
| `infoText` (fullscreen panels)                                                    |  full (≤1864 chars)  | **truncated** (~99–118) | ❌ **content loss**                                      |
| `states[]`                                                                        | 10 figures have them |          **0**          | ❌ **all lost**                                          |
| `statesHighlight[]`                                                               |      5 figures       |          **0**          | ❌ **all lost**                                          |
| `switches[]`                                                                      |      4 figures       |          **0**          | ❌ **all lost**                                          |
| videoUrl / imageUrl / youtubeID                                                   |      via config      |   mapped from DB cols   | ✅                                                       |

Root: `animation_states` (0 rows) and `animation_variants` (0 rows) are **empty**;
`fetchAnimations` builds `states/statesHighlight/switches` _only_ from those tables.
Separately, the DB `config` JSONB **omits `switch:true`** for switch figures and holds
**truncated `infoText`** — both are DATA gaps in the `config` column itself, not
table-emptiness. (Both surfaced by Codex review, verified against raw DB.)

**14 static figures carry state/switch arrays; the DB path emits 0.** For every
interactive figure the artwork mounts but click-stepping, highlight sync, and
switch toggles have no data → the figure appears "dead."

---

## 4. Trigger-class diff (DOM render path)

The left-column GSAP listener (`IllustrationsComp.onMounted`) scans for
`.animationTrigger` / `.animationScrollAnchor` DOM nodes and sets
`activeAnimation = domId.replace("trigger","").toLowerCase()`. The section/subsection
components emit `id="triggerAnimation"+animation.name` + class `animationTrigger`.

**Where the animation object survives, the trigger contract is INTACT.** DOM-match
resolution for the 14 surviving DB animations round-trips correctly.
`name`-only refs (`dragon`, `Placeholder`) have no `id` — expected, matched by name.

> **CORRECTION (post-Codex):** An earlier draft of this section claimed
> `RetinalCellTypes3` mis-targets (`triggerAnimationRetinalCellTypes` →
> `animationretinalcelltypes` ≠ `…3`). **That was a scripting error** — my resolution
> helper stripped the wrong substring. Correct round-trip:
> `key.replace(/^animation/,"")` on `animationRetinalCellTypes3` yields
> `RetinalCellTypes3` (the "3" is kept), so `triggerAnimationRetinalCellTypes3` →
> `animationretinalcelltypes3` == target. **The trigger matches. Retracted.**
> The static `name:"RetinalCellTypes"` / `id:"animationRetinalCellTypes3"` split is
> intentional (section trigger uses `name`; mobile inline uses `id`).

### The real trigger-layer issues (verified)

1. **Scroll-transition never fires** — tree `transition = animation_trigger==="scroll"`,
   and **no DB paragraph has `animation_trigger="scroll"`** → every surviving tree
   object has `transition:false`, so `IllustrationTransition` / `animationScrollAnchor`
   is never emitted. The transition component builds its trigger by appending
   `"Transition"` to the base name (`SectionComp.vue:10`), so the base link is correct;
   the missing piece is purely the `scroll` trigger value. **DATA-FIX.**
2. **`AccommodationVergence` key**: static id `animationAnimationAccommodationVergence`
   (doubled-prefix typo) vs DB `animationAccommodationVergence`. DB is arguably correct,
   but the Lottie asset name + any hardcoded refs must agree — verify the asset.

---

## 5. Split-brain trace (useText seeding vs DB)

- `useText` store seeds `state.text = localStorage.sections ? JSON.parse(...) : jsonText`
  and `state.source = jsonText` (always static).
- `ChapterView.loadChapter()`:
  1. reads `localStorage.sections`; if `storedTitle !== incomingTitle` clears
     `sections`/`selection`/`comments`. For `the-retina`, `incomingTitle="The Retina"`,
     so a stale _other_ chapter is cleared but a stale **"The Retina"** LS copy is **kept**.
  2. sets `storeText.text = null`, awaits tick.
  3. `fetchChapter(slug)` → `updateText("*", data)` overwrites `text` with DB data
     **and writes it back to `localStorage.sections`.**

**Verdict:** On a normal load, **DB content wins** — the static `jsonText` seed is
transient (replaced before paint by `showContent` gating on `chapterDataLoaded`).
`source` (static) is only read for `animation.source` caption strings in a few Illus
components, not for content. **Split-brain is NOT the active cause of the visible
difference.** Residual risks (low): (a) a stale localStorage "The Retina" copy from a
_previous app version_ seeds `text` on first paint and is persisted back on every load
— if that old copy predates the DB path it could shadow until the fetch resolves;
(b) `updateText` persisting DB data into `localStorage.sections` means the DB's
already-degraded tree gets cached client-side. Neither creates the missing figures —
those are missing in the DB transform itself.
