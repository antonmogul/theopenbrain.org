# OPENBRAIN-60: Retina figures from the database

Branch: refactor/openbrain-60-retina-figures-db. Production data was read with anonymous GETs only on 20 Nov 2026; no production data or review_feedback was written.

## What changed

The reader resolves figure records only through useAnimations (animations + animation_states + animation_variants). Removed all eight reader JSON imports and both resolver fallbacks. A missing figure warns after loading settles; the pane also warns at trigger registration, except the deliberately blank Placeholder. The shared resolver still provides Lottie/media asset checks.

The three section placements are represented on their first prose paragraph, with hold: next preserving their former span up to the next figure/section boundary. Horizontal cells retains animationRetinalCellTypes3 and stage Horizontal cells; bipolar cells retains animationRetinalCellTypes2 and stage Bipolar cells; the introduction uses animationDragon. The section-level rendering branches in TextComp and SectionComp are removed. A generic loader compatibility function lowers existing DB section placements into paragraph placements until SQL runs, with no Retina slug/key map. The horizontal-cell section FK previously pointed at animationRetinalCellTypes despite its configuration naming animationRetinalCellTypes3; the migration fixes that discrepancy.

18 Retina animation_trigger names become auto with exact old-value guards. Four of these paragraphs no longer have an animation_id because published widget blocks replaced those old figures; normalising their stale trigger names does not restore obsolete figures. No code was interpreting names as modes: figureFor already uses only the scroll literal and animationFlags.transition, so there is no name-interpretation branch to remove.

Normal Vision and Cataracts already failed to mount on phones because IllustrationInline checked for nonexistent Lottie assets before drawing their MP4/still flip cards. Flip and switch renderers now bypass that unrelated asset check. All six flip figures remain video/still cards with no clickable state list.

## Field-by-field audit

All 32 historical records exist in the database. The nine supposedly missing states are either supplied by ordered animation_states rows (anatomy/cell types) or intentionally empty (six disease flip cards). WavesOfActivity.youtube_id is already populated. No state or variant rows need reseeding; preserving the database's reviewed edits is essential. The migration adds only the six explicit empty states arrays to complete literal field parity; a missing empty array behaved identically before the migration.

The table lists every JSON field checked against the resolved database record. The test runs the actual useAnimations loader against a captured, prose-free DB fixture before and after the migration's field change. Differences below are authoritative reviewed database values; all unlisted fields match exactly.

| Record                                   | Fields audited                                                                                                        | Result / authoritative differences                                        |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `animationDragon`                        | `id`, `title`, `fullscreen`, `loop`, `loopSection`                                                                    | DB title Dragon; JSON title blank                                         |
| `animationEyeStructurTransition`         | `id`, `title`, `isTransition`, `noBleed`                                                                              | All fields match                                                          |
| `animationEyeStructur`                   | `id`, `title`, `fullscreen`, `clickTriggered`, `highlight`, `states`                                                  | 12 reviewed anatomy states including Pupil, in corrected anatomical order |
| `animationAccommodationVergence`         | `id`, `title`, `fullscreen`, `loop`, `loopSection`                                                                    | All fields match                                                          |
| `animationPupillaryLightreflex`          | `id`, `title`, `fullscreen`, `loop`, `states`, `statesHighlight`                                                      | Reviewed step descriptions                                                |
| `animationImpairedVision`                | `id`, `title`, `fullscreen`, `loop`, `infoText`, `states`, `toggle`                                                   | All fields match                                                          |
| `animationLatteralOrganization`          | `id`, `title`, `fullscreen`, `split`, `multiple`, `sources`                                                           | All fields match                                                          |
| `animationPhototransduction`             | `id`, `title`, `fullscreen`, `loop`, `infoText`, `states`, `statesHighlight`                                          | Reviewed infoText and state descriptions                                  |
| `animationTheVisualCycle`                | `id`, `title`, `fullscreen`, `loop`, `infoText`, `states`, `statesHighlight`                                          | Reviewed infoText and state descriptions                                  |
| `animationSynapticArchitecture`          | `id`, `title`, `fullscreen`, `clickTriggered`, `blockStates`, `hasTransition`, `iconPraefix`, `states`                | Excitation spelling corrected                                             |
| `animationPhotoreceptors`                | `id`, `title`, `fullscreen`, `clickTriggered`, `hasTransition`, `highlight`, `speed`, `states`                        | All fields match                                                          |
| `animationLateralOrganization`           | `id`, `title`, `fullscreen`, `scroll`, `split`                                                                        | All fields match                                                          |
| `animationRetinalCellTypesTransition`    | `id`, `title`, `isTransition`, `noBleed`                                                                              | All fields match                                                          |
| `animationRetinalCellTypes`              | `id`, `title`, `fullscreen`, `clickTriggered`, `highlight`, `iconPraefix`, `icons`, `autoplay`, `states`              | Reviewed layer order                                                      |
| `animationRetinalCellTypes2`             | `id`, `title`, `fullscreen`, `clickTriggered`, `highlight`, `iconPraefix`, `icons`, `autoplay`, `set`, `states`       | All fields match                                                          |
| `animationRetinalCellTypes3`             | `id`, `title`, `fullscreen`, `clickTriggered`, `highlight`, `iconPraefix`, `set`, `icons`, `autoplay`, `states`       | All fields match                                                          |
| `animationCenterSurroundReceptiveFields` | `id`, `title`, `fullscreen`, `loop`, `switch`, `switches`, `blockSwitches`, `legend`                                  | Excitation spelling corrected in legend                                   |
| `animationColorOpponency`                | `id`, `title`, `illuImage`, `fullHeight`                                                                              | All fields match                                                          |
| `animationONOFFLamina`                   | `id`, `title`, `illuImage`, `fullHeight`                                                                              | All fields match                                                          |
| `animationDirectionSelectivity`          | `id`, `title`, `fullscreen`, `loop`, `switch`, `switches`, `blockSwitches`, `legend`                                  | Excitation spelling corrected in legend                                   |
| `animationObjectMotionSensitivity`       | `id`, `title`, `fullscreen`, `loop`, `switch`, `switches`, `blockSwitches`, `legend`                                  | Excitation spelling corrected in legend                                   |
| `animationRodVsConeCircuits`             | `id`, `title`, `fullscreen`, `loop`, `switch`, `swicthSymboles`, `switches`, `blockSwitches`, `iconPraefix`, `legend` | Excitation spelling corrected in legend                                   |
| `animationLightSensitiveGanglionCells`   | `id`, `title`, `fullscreen`, `loop`, `legend`                                                                         | Excitation spelling corrected in legend                                   |
| `animationWavesOfActivity`               | `id`, `title`, `illuImage`, `youtubeID`                                                                               | youtube_id already contains k0_HXpcH4zI; all fields match                 |
| `animationNormalVision`                  | `id`, `title`, `fullscreen`, `flip`, `video`, `states`                                                                | SQL adds explicit states: []; all other fields match                      |
| `animationCataracts`                     | `id`, `title`, `fullscreen`, `flip`, `video`, `states`, `source`                                                      | SQL adds explicit states: []; all other fields match                      |
| `animationGlaucoma`                      | `id`, `title`, `fullscreen`, `flip`, `video`, `states`, `source`                                                      | SQL adds explicit states: []; all other fields match                      |
| `animationDiabeticRetinopathy`           | `id`, `title`, `fullscreen`, `flip`, `video`, `states`, `source`                                                      | SQL adds explicit states: []; all other fields match                      |
| `animationAgeRelatedMacularDegeneration` | `id`, `title`, `fullscreen`, `flip`, `video`, `states`, `source`                                                      | SQL adds explicit states: []; all other fields match                      |
| `animationRetinitisPigmentosa`           | `id`, `title`, `fullscreen`, `flip`, `video`, `states`, `source`                                                      | SQL adds explicit states: []; all other fields match                      |
| `animationEyeMovements`                  | `id`, `title`, `source`, `fullscreen`, `loop`                                                                         | All fields match                                                          |
| `animationPlaceholder`                   | `id`, `title`, `loop`, `fullParagraph`                                                                                | DB title Placeholder; JSON title blank; intentionally clears pane         |

## Migration and rollout

- Pending: supabase/migrations/20261120066000_retina_figures_db.sql.
- The coordinator applies SQL after deployment, as requested by the cleanup brief. There is no technical deploy-first dependency: the old reader already supports paragraph placements, and the new reader supports both the old and new section data.
- Idempotent, no outer transaction statements. Guards only the placement/configuration keys changed, preserving rewritten prose, unrelated flags and author-selected figures/stages/holds.
- No schema changes or RLS changes. No review_feedback writes.
- PGlite tests cover before/after reader-tree equality, idempotence, prose survival, author hold protection and existing state/config preservation.

animations.json stays for the filesystem-only scripts/seed/gen-chapter1-anim-states.mjs and unit/Storybook source fixtures. No application route, including /widgets, imports it. Storybook's inline/fullscreen/pane stories now use explicit database API fixtures rather than an empty API plus an implicit fallback.

## Verification

Verification is recorded under /Volumes/Brain/artifacts/retina-cleanup/60/. The browser runner scripts/retina-figures-db-browser.mjs overlays this exact SQL through PGlite and page.route, blocks application writes (the YouTube player may use its own POST playback API), and checks mounts, states, flips, local video playback, loops, the waves YouTube source, console errors and horizontal overflow. Baseline screenshots/inventories are in before.json and before-_.png; migration acceptance uses after-sql-_.png and before-sql-*.png.

Local checks: full PGlite-backed suite **3,482 passed** with bounded workers and a 30-second timeout; the later missing-FK warning regression **26/26 passed**. Format, lint (nine existing warnings), Storybook coverage and production build passed. The initial default-timeout SQL rerun hit three five-second timeouts under concurrent worker load; the bounded full rerun passed every test.

Chromium post-SQL: 1440/1024/390, 49/49/29 mount and interaction checks, all 35 trigger placements retained, no application errors or horizontal overflow. WebKit post-SQL: desktop and phone evidence under webkit-verified/ and webkit-phone-verified/. Before-SQL evidence is under pre-sql-verified/ and pre-sql-webkit-final/. Transitions: both entrance animations advance through authored frames in Chromium and WebKit (transitions.json). The two previously missing phone flip cards now join the other four; all six local MP4s decode and advance, and every available state control is exercised. The waves video check verifies the DB YouTube ID, poster/play control and mounted provider iframe; external stream playback is not asserted.

WebKit's native video-control blob icon diagnostics (invalid/pip/airplay placard) are retained in the artifacts and filtered using the repository's existing narrow pattern. The remote YouTube player is opened last in desktop checks: removing it during Safari's pending Cache API work can raise a native Context-is-stopped teardown diagnostic, seen both before and after SQL. Application errors still fail. This is a browser/provider teardown limitation, not a claim that the third-party player was repaired.

A first smoke run was invalidated by rebuilding its preview assets; it is excluded. The fixed-build full smoke rerun passes History and Retina at all widths, but has unrelated home-page brain-atlas wheel failures; final hosted CI is recorded with the PR. CI: PENDING.

## Proposed CLAUDE.md paragraph (coordinator to apply)

Reader figure records resolve only from Supabase through useAnimations, including ordered animation_states and animation_variants and the youtube_id/media URL columns; missing records warn rather than silently falling back. animations.json is retained only for seed tooling and test/Storybook fixtures. Figure placements belong to paragraphs: the OPENBRAIN-60 migration moves the three remaining Retina section figures to their opening paragraphs with hold: next and their original stage, and normalises 18 legacy named animation_trigger values to auto. Until that SQL is applied, paragraphFiguresForSection lowers old database section placements into the same paragraph path. The coordinator applies 20261120066000_retina_figures_db.sql after deployment; the data migration is also compatible with the older reader. Inline video flip cards and switches do not require a base Lottie asset.

## Lessons for the coordinator

Check the resolved record after merging child-table states/variants before reseeding fields from legacy JSON. For media figure gates, check the asset the selected renderer actually consumes: an MP4/still flip card must not be gated on a same-key Lottie file. No learned procedure was saved by this dispatched worker.
