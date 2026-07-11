# STATIC-SHAPE — Chapter 1 ("The Retina") source of truth

Dump of the two static JSON files that define what Chapter 1 is *supposed* to look
like. These are the target the Supabase-backed render path must reproduce.

Sources:
- `src/assets/json_backend/text.json` (1071 lines) — content tree
- `src/assets/json_backend/animations.json` (441 lines) — illustration configs

---

## A. text.json — content tree

Top-level keys: `intro`, `sections`, `furtherReading`, `footNotes`.

| Key | Count | Notes |
|-----|-------|-------|
| `intro` | 1 | `{ id, title:"The Retina", animation:{name:"dragon"}, paragraphs:[…] }` |
| `sections` | 10 | ordered content sections (see below) |
| `furtherReading` | 1 obj | `{ title:"Further reading:", paragraphs:[{title, links[]}] }` |
| `footNotes` | 1 obj | `{ title, animation:{name:"Placeholder"}, notes:[{text}] }` |

### Section titles (order preserved)
0. Story of the eye
1. Organization and cell types in the retina
2. Photoreceptors and phototransduction
3. Horizontal cells and feedback
4. Bipolar cells diversify photoreceptor signals
5. Amacrine and ganglion cells – circuits, computations and output
6. Retinal vision in the 'real world'
7. Retinal development
8. Diseases, disorders, and treatments
9. Looking forward

### Nesting shape
```
sections[]            → { id, title, paragraphs[] }
  paragraphs[]        → { id, text, animation?, animationFull?, img?, … }
                      OR { subSection: [ {id,title,animation?,paragraphs[]} ] }
    subSection.paragraphs[] → paragraph OR { subSubSection: [ paragraph… ] }
```

### Animation references embedded in the text tree (28 total)
Each `animation` object has the contract `{ name, id?, transition?, placeholder?, isTransition? }`.
The DOM trigger the left column listens for is `id="triggerAnimation" + animation.name`
(section/subsection level) or `id="trigger" + animation.id` (subSubSection level).
`IllustrationsComp` selects the artwork by `activeAnimation === animation.id.toLowerCase()`,
where `activeAnimation = domId.replace("trigger","").toLowerCase()`.

Distinct animation `id`s referenced in the tree: **20** (some appear multiple times,
e.g. `RetinalCellTypes` ×6 for its click-state stops).

Notable static-side quirks (present in the *original* JSON, carried for fidelity):
- `animationAnimationAccommodationVergence` — doubled "animation" prefix (static typo)
- `animationanimationRodVsConeCircuits` — doubled prefix (static typo)
- `dragon` and `Placeholder` refs have `name` only, no `id`.

Diseases section (index 8) illustration sequence — the visible "flip video per
disease" strip:
`NormalVision, Cataracts, Glaucoma, DiabeticRetinopathy, AgeRelatedMacularDegeneration, RetinitisPigmentosa`

---

## B. animations.json — illustration configs

Top-level: `{ animations: [ … ] }` — **32 entries**.

Every entry: `{ id, title, …configFlags }` and, for interactive figures,
`states[]` / `statesHighlight[]` / `switches[]`.

### The 14 animations that carry states / statesHighlight / switches
**These are the interactive figures.** Their state arrays drive GSAP click-state
stepping and Lottie highlight sync. Losing them = the figure renders but does nothing.

| id | states | statesHighlight | switches |
|----|:------:|:---------------:|:--------:|
| animationEyeStructur | 11 | – | – |
| animationPupillaryLightreflex | ✓ | – | – |
| animationImpairedVision | ✓ | – | – |
| animationPhototransduction | ✓ | ✓ | – |
| animationTheVisualCycle | ✓ | ✓ | – |
| animationSynapticArchitecture | ✓ | – | – |
| animationPhotoreceptors | ✓ | ✓ | – |
| animationRetinalCellTypes | ✓ | ✓ | – |
| animationRetinalCellTypes2 | ✓ | ✓ | – |
| animationRetinalCellTypes3 | ✓ | ✓ | – |
| animationCenterSurroundReceptiveFields | – | – | ✓ |
| animationDirectionSelectivity | – | – | ✓ |
| animationObjectMotionSensitivity | – | – | ✓ |
| animationRodVsConeCircuits | – | – | ✓ |

Full expansion of every state/switch label is in `_static_anim_states.txt`.

### Config flags observed across the 32 entries
`fullscreen, loop, flip, split, scroll, isTransition, clickTriggered, highlight,
autoplay, blockSwitches, blockStates, hasTransition, hasSpeedControl, noBleed,
illuImage, fullHeight, fullParagraph, icons, iconPraefix, legend, source, video,
infoText, toggle, speed, loopSection, set, swicthSymboles, multiple, sources`.

These flags select which illustration component renders (Flip vs Transition vs
Scroll vs Placeholder vs plain) and how it behaves.
