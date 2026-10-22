# Stuart follow-ups — 22 October 2026

Coordinator working notes. Scope: Stuart's two follow-ups at 17:23 and 17:50 UTC in the existing update conversation. These are new requests; do not mix them with the earlier meeting backlog.

## Delivery rules

- Each group gets an isolated checkout from origin/main, an Astra research/plan/implementation pass, a PR, and an independent code reviewer.
- Research production versus current main first: the last verified Railway deployment predates PR #143. A missing deployment is not proof of a missing implementation. Reproduce and record the exact code/environment.
- No merges, deployments, production writes or credential changes in this phase. Content fixes needing SQL must ship guarded, idempotent migrations and clear application notes.
- Preserve scientific source material, source hashes, coordinates, transcripts, credits, accessibility and reduced-motion support. Create presentation derivatives rather than silently changing historical source scans.
- Use the established Open Brain design system; square controls. Research technical uncertainties in primary documentation. Capture real browser evidence, including responsive and keyboard behavior.
- Each implementation report must contain: research findings, implementation plan/decisions, files changed, acceptance evidence, PR URL/SHA, remaining questions, database/deployment requirements, and a short plain-English completion note for Stuart.
- Reviewers inspect the exact PR head independently and distinguish bugs from subjective preferences. Findings return to the original Astra owner for correction; review again at the new SHA.
- Do not send a completion email yet. Maintain `completion-log.md` for the eventual reply; only describe something as live after deployment acceptance.

## Request inventory and ownership

| ID | Request / developer interpretation | Group | Acceptance |
|---|---|---|---|
| R01 | Covers do not follow the mouse in History or Retina, reported in Firefox and Chrome. | G1 reader/Retina | Reproduce both engines; actual rendered frame/pupil movement, correct reduced-motion behavior and poster fallback. |
| R02 | Hippocrates/humoral theory and comparative-neuroanatomy Explore cards side by side on desktop; only the selected one expands. | G6 breakouts/links | Responsive two-column pairing, independent controls and readable expansion; stacked mobile layout. |
| R03 | Consider ordinary biography/reference links instead of hover-only information for people and selected terms. | G6 breakouts/links | Research existing metadata, propose sourced link policy and demonstrate accessible mouse/touch/keyboard behavior; no indiscriminate auto-linking. |
| R04 | Galleries advance every 15 seconds; consider thumbnails of other images instead of dots. | G2 figures/media | 15-second timer with existing pauses; reviewable accessible thumbnail treatment, selected state and mobile handling. |
| R05 | Trial lateral scrolling in the Descartes breakout, possibly more broadly. | G6 breakouts/links | Opt-in prototype with deliberate controls, accessible content and no wheel hijacking; final default remains a discussion item. |
| R06 | Phrenology highlights wrong/mixed areas or two purple shades: lateral 31; posterior 5, 2, 4, 3, 11, 10. | G3 phrenology | All seven selections visually verified against source plates; highlight exactly the intended mapped region. |
| R07 | Selecting an organ not visible in the current skull view should switch to a view showing it. | G3 phrenology | Deterministic visible-view selection; retain current view when valid; unmapped organs remain honestly disclosed. |
| R08 | More top/bottom room for “Fritsch and Hitzig’s work was validated soon afterwards in primates...” so its visuals remain visible. | G2 figures/media | Match the actual paragraph/figure; measurable viewing window without overlap or needless global spacers. |
| R09 | Retitle Be Penfield to “Find out what is was like to be Dr. Wilder Penfield”. | G4 Penfield | Correct obvious typo to “Find out what it was like to be Dr. Wilder Penfield”; consistent reader/standalone labels. |
| R10 | Replace black scan numbers plus purple circles with clean purple clickable numbers; fit complete brain graphics on desktop. | G4 Penfield | Presentation derivative/overlay preserves original scientific scans and coordinates; labels aligned and readable; complete map visible at fit zoom. |
| R11 | Figure legends should use available horizontal width; Figure 15 growth-cone caption particularly cramped. | G2 figures/media | Full sensible pane width, balanced image room, no clipped captions or lost expansion controls. |
| R12a | Loewi “collecting the fluids” overlaps “Figure 1”; remove redundant Figure 1 label. | G5 Loewi/audio | No overlap through authored steps at relevant pane widths/heights; narration/scientific text preserved. |
| R12b | Long Loewi explanations fall behind Play/Restart. | G5 Loewi/audio | Readable complete captions and reachable transport at desktop/mobile sizes. |
| R12c | Loewi and Retina widget audio silent, while ordinary video audio works. | G5 Loewi/audio | Diagnose shared sandbox/CSP/autoplay/gesture handling; actual narration playback evidence, no weakened sandbox or fake success. |
| R13 | Gallery figure legends do not update with selected image, notably Figure 19. | G2 figures/media | Correct per-slide legend for manual, automatic, modal and reverse navigation. |
| R14 | Prefer Huxley video as Figure 21's initial image rather than complex Eccles model. | G2 figures/media | Identify real assets/config before changing; correct first entry without duplicate or lost caption/source. |
| R15 | Retina Dragon does not appear. | G1 reader/Retina | Diagnose deployment, trigger and responsive mounting separately; visible original artwork and existing caption on desktop/mobile. |
| R16 | Eye-structure, vergence/accommodation and eye-movement interactives show no eye / do not work. | G1 reader/Retina | Reproduce all three paths, restore actual artwork/interaction, validate lifecycle and transitions in both engines. |
| R17 | Video presentation differs across chapters; standardize. | G2 figures/media | Research existing History pattern; use a shared accessible presentation with original sources/captions and no lost media. |
| R18 | Retina breakout format differs; discuss and settle the common format next week. | G6 breakouts/links | Comparison/prototype and decision notes only; do not silently impose a new chapter-wide default. |
| R19 | Retina reference list duplicated at end. | G1 reader/Retina | One complete reference list, correct citation targets and legitimate further-reading content preserved. |
| P01 | Organ 12 first paragraph incorrectly split into two. | G3 phrenology | Join accidental split only; preserve wording/source provenance. |
| P02 | Organ 24 second paragraph incorrectly split into three. | G3 phrenology | Join accidental split only; preserve wording/source provenance. |
| P03 | Organ 6: remove editorial note referring to Word-doc typo. | G3 phrenology | Remove display-only editorial noise without rewriting source history. |
| P04 | Organ 11: remove editorial note referring to Word-doc typo. | G3 phrenology | Same boundary as P03. |
| P05 | Organ 22 editorial note replacement. | G3 phrenology | Exact text: “Region not labelled by Spurzheim in an image plate nor on the manuscript's frontispiece. No skull position is assigned here.” |

## Groups and likely code surfaces

- **G1 Reader/Retina:** ReactiveCover/OpenerHero, legacy Retina illustration components, illustration triggers and transitions, reference rendering. Coordinate any shared IllustrationComp changes with G2.
- **G2 Figures/media:** FigureImages, IllustrationComp legend presentation, figureCycle, VideoEmbed/legacy video presentation, authored figure configs and narrowly scoped migrations. Coordinate SectionComp with G6; no audio-host changes (G5).
- **G3 Phrenology:** Phrenology view, maps/region data, presentation text normalization and its tests. Do not invent a position for Organ 22.
- **G4 Penfield:** CaseCabinetView, point-label presentation assets/helpers, placement title and tests. Source appendix remains authoritative and original scans remain available.
- **G5 Loewi/audio:** Loewi authored upload, shared uploaded-widget host/frame/audio path, kit documentation and any necessary idempotent upload migration. No unrelated shared-stage redesign.
- **G6 Breakouts/links:** ExploreCard pairing, narrowly scoped SectionComp/BreakoutBox changes, lateral-scroll prototype stories, biography link proposal. Keep final breakout-format choice open.

Independent PRs can touch shared files only when necessary; record overlaps so integration review can resolve them deliberately. User requested PRs and reviews, not automatic merging or deployment.
