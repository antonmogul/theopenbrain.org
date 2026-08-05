# DB-ACTUAL — Chapter 1 as produced by the Supabase render path

> **Provenance: LIVE-FETCHED.** Data was pulled from the production Supabase
> project `ocenwbkdzmxhsvwlornp.supabase.co` on 2026-07-11 using the app's own
> publishable key (from `.env`) and the _exact_ REST queries `useChapter.fetchChapter`
> and `useAnimations.fetchAnimations` issue. The verbatim transform functions from
> `useChapter.js` and `useAnimations.js` were then run over that raw data
> (`_run_transform.mjs`). Outputs saved as `_db_transformed_text.json` and
> `_db_transformed_anims.json`. **Nothing is fabricated or traced** — this is what
> the running app receives.

Module: `the-retina` → id `2e3f5723-3a17-464a-9083-9128d3e3a9ee`, status `published`.

---

## A. Raw DB fetch (what the queries return)

| Table / query                               | Result                                                           |
| ------------------------------------------- | ---------------------------------------------------------------- |
| `modules?slug=eq.the-retina`                | 1 row ✓                                                          |
| `sections?module_id=eq.…&order=order_index` | **13 rows** (10 content + intro + further-reading + footnotes) ✓ |
| `paragraphs?section_id=in.(…)`              | **191 rows** ✓                                                   |
| `animations?select=*`                       | **77 rows** ✓                                                    |
| `animation_states?select=*`                 | **0 rows** ⛔                                                    |
| `animation_variants?select=*`               | **0 rows** ⛔                                                    |

Paragraph `content.blocks` type histogram (191 rows):
`text:58, footnote:106, heading:16, image:7, animation_full:3, break_section:1, further_reading:1`.
→ **No `animation`, `citation_ref`, or `figure_placeholder` block types present.**

Paragraph nesting metadata: `subsection_level` dist `{0:131, 1:42, 2:18}`,
`is_subsection_header` = 19.

Paragraph→animation links: **25 paragraph rows carry `animation_id`**, resolving to
**21 distinct animation keys** (all the interactive Ch1 figures are linked, incl. the
5 disease videos).

---

## B. Transformed output (`transformModuleToChapterFormat`)

Run over the live data:

```
TEXT: intro 1  sections 10
ANIMS transformed: 77
anims WITH states/statesHighlight/switches: 0
```

### Text tree

- `intro`: 1 ✓ (`animation:{name:"dragon"}` ✓)
- `sections`: 10 ✓ — **titles match static exactly, in order.**
- Section skeleton is faithful.

But animation references embedded in the tree collapse:

|                           | Static tree | DB tree |
| ------------------------- | :---------: | :-----: |
| animation objects in tree |     28      | **14**  |
| distinct animation ids    |     20      | **11**  |

Every `animation` object in the DB tree (context = nesting level):

```
[top]  dragon
[top]  animationEyeStructur          [top]  animationRetinalCellTypes3   ⚠ name/id mismatch
[top]  animationAccommodationVergence[top]  animationRetinalCellTypes2
[top]  animationPupillaryLightreflex [top]  animationRetinalCellTypes
[top]  animationImpairedVision       [sub]  animationWavesOfActivity
[top]  animationRetinalCellTypes     [top]  animationNormalVision
[sub]  animationSynapticArchitecture [top]  Placeholder
[top]  animationPhotoreceptors
```

**Absent entirely** (present in static, gone in DB): CenterSurroundReceptiveFields,
ColorOpponency, DirectionSelectivity, ObjectMotionSensitivity, RodVsConeCircuits,
LightSensitiveGanglionCells, EyeMovements, Cataracts, Glaucoma, DiabeticRetinopathy,
AgeRelatedMacularDegeneration, RetinitisPigmentosa.

The Diseases section (index 8) transforms to **one** subSection + a `subSubSection[4]`,
with only `NormalVision` surviving — the 5 disease-video figures are dropped. Raw rows
prove the links exist (see DIFF.md §Nesting-bug).

### Animations list (`fetchAnimations` transform)

- 77 animation objects produced.
- **Most config flags survive** — `_db_transformed_anims.json` shows `fullscreen, loop,
flip, split, isTransition, clickTriggered, highlight, autoplay, blockSwitches,
legend, video, source, …` intact (they live in the `config` JSONB column). **But two
  config-level gaps exist** (Codex-surfaced, verified): the `switch:true` flag is
  **absent** for the 4 switch figures, and `infoText` is **truncated** (~99 vs 1864
  chars) for Phototransduction / TheVisualCycle. See DIFF §3.
- **`states` / `statesHighlight` / `switches`: 0 of 77** — because
  `animation_states` and `animation_variants` are empty tables. The transform
  reads those tables to build the arrays; with 0 rows it emits none.

Example — `animationEyeStructur`:

```jsonc
// DB-transformed (actual)
{
  "id": "animationEyeStructur",
  "title": "Eye structure",
  "highlight": true,
  "fullscreen": false,
  "clickTriggered": true,
}
// static target — same flags PLUS:
//   "states":["Lens","Iris","Cornea","Choroid","Sclera","Fovea",
//             "Aqueous humour","Ciliary muscle","Retina","Vitreous humour","Optic nerve"]
```

The 11 clickable layer labels are gone.
