# Widget placement audit — OPENBRAIN-62

20 November 2026. Chapter widget positions and presentation belong to `paragraphs.content.blocks`. `WIDGET_PLACEMENTS` is empty, `useChapter` no longer injects placements, and a regression test rejects either returning. Library routes and the authors' original source files are retained.

## Release order

**Push `20261120066200_retina_widgets_db.sql` BEFORE merging/deploying this PR.** The coordinator approved this order. Current main skips the three old placements by the new blocks' `placementId`; its existing host styles harmlessly duplicate the widget-local styles until deployment. Production was read only throughout this work.

Accepted intermediate phone behaviour: current main does not pass a block's `narrowKind` to the renderer. Between the SQL push and deployment, the 390px RetINaBox launch card therefore becomes a dark viewport band. It still waits for Load before fetching or mounting the widget. This PR passes the DB fields through and restores the original phone card. The coordinator accepted this short review-site interval after comparing the three screenshots in `proof/chromium-390-{before,main-migrated,after}-retinabox-cover.png`.

## Placements

| Widget                          | Database placement                                                                          | Preserved behaviour                                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Colour vision                   | Immediately after Dalton, paragraph `1dd1d2ae-f64f-4d19-8ead-f1a343bcae09`                  | Inline viewport band, History's pause, original explorer uploaded as `retina-color-vision`                            |
| Direction selectivity           | Immediately after the final DS passage, `2371e7b0-c86e-4f5b-9fc2-cd07ba6d8e39`              | One inline viewport band using `retina-direction-selectivity`                                                         |
| RetINaBox                       | Immediately before the Rod and cone pathways header, `bfb594df-a813-4762-8dfa-8c81d470d38a` | Logo, prompt and explicit Load gate; phone breakout card; Vue fallback                                                |
| History phrenology and Penfield | Existing blocks with placementIds `foundations-phrenology` / `foundations-case-cabinet`     | `fullScreen: true` on the blocks themselves; current published rows already have it, older installations are repaired |
| Attention biased competition    | Existing published DB block                                                                 | Remove only its dead code placement; retain its Vue port, which the chapter still uses                                |

The live Retina showed the direction-selectivity upload in the figure pane and the separate Python/data Vue port after the final DS passage. Following the task's choice of the upload, the migration removes the pane link from `03f92733-17dd-46a2-9131-c3c64875dba1` and puts that upload at the former code band's position. The Python/data port remains available at `/direction-selectivity`; it is no longer a chapter placement.

The migration changes ordering and widget/figure keys, preserving all authored prose, citations and unrelated content keys. It replays safely. Upload changes refuse an intervening author HTML edit, and isolated SQL tests check the resulting HTML against all 15 committed files byte for byte. Colour vision is made from `src/widgets/source/color-vision-widget.html`; reversing the documented token substitutions and marked fit rules reproduces that original byte for byte. Stimulus colours, text, artwork and scripts are retained.

All `.rb-*` and `.tob-*` presentation rules formerly injected by `widgetHost.js` now live in the 14 affected Retina upload files. Generic kit control rules remain in the host. No narration or animation content is changed.

## Cleanup audit

Creator-free published GETs returned 3 modules, 40 sections, 399 paragraphs and 120 animation rows. Paragraph links, section configuration, content blocks and the registry were checked together. The captured records and old published upload HTML are under `/Volumes/Brain/artifacts/retina-cleanup/62/`.

Deleted the unused schema widgets `center-surround`, `direction-selectivity`, `object-motion`, `on-off`, `phototransduction`, `pupillary-reflex`, `refraction-errors`, `rod-cone` and `visual-cycle`, their now-unused `step-through` / `switch` components, and their dedicated tests/stories. None has a published paragraph link. Original artwork and uploaded replacements remain.

Kept `animationLatteralOrganization`: paragraph `c41015c0-4b87-49d4-9868-8ba943adcaa6` links it. Also kept both transition schemas/components: the live reader mounts `animationEyeStructurTransition` and `animationRetinalCellTypesTransition` through section entrance choreography, despite their lack of direct paragraph foreign keys. History's two schema widgets remain.

Draft coverage uses committed migrations because anonymous REST intentionally hides drafts. The Stress seed (`20260925030000_seed_chapter_stress_draft.sql`) has 116 paragraphs and no widget blocks; `20260927000000_stress_widget_markers.sql` adds image/video/interactive placeholders, not Vue ports. The historical Attention draft seed and subsequent replacement migrations were checked against the current published assignments. The historical chapter-2 draft seed adds no additional author-widget port placement. No creator session was used to claim a fresh inspection of remote draft edits.

### Ports retained without a primary chapter placement

| View                           | Route                    | Recommendation                                                                 |
| ------------------------------ | ------------------------ | ------------------------------------------------------------------------------ |
| `ColorVisionView.vue`          | `/color-vision`          | Keep the library comparison and explicit upload fallback                       |
| `DirectionSelectivityView.vue` | `/direction-selectivity` | Keep the distinct Python/data demonstration in the library                     |
| `RetINaBoxView.vue`            | `/retinabox`             | Keep the library comparison and explicit upload fallback                       |
| `V1CameraView.vue`             | `/v1-camera`             | Keep for the widget library and future chapter authoring                       |
| `VisualPathwayLesionsView.vue` | `/visual-pathway`        | Keep for the widget library and future chapter authoring                       |
| `SdtWidgetView.vue`            | `/sdt`                   | Keep the library comparison; the chapter uses `upload:attn-sdt`                |
| `PosnerCueingView.vue`         | `/posner-cueing`         | Keep the library comparison; the chapter uses an upload                        |
| `ContrastResponseGainView.vue` | `/contrast-response`     | Keep the library comparison; the chapter uses an upload                        |
| `TmtFeatureAttentionView.vue`  | `/feature-attention`     | Keep the library comparison; the chapter uses an upload                        |
| `CaseCabinetView.vue`          | `/case-cabinet`          | Keep the source appendix/library fixture; the chapter uses the Penfield upload |

The standalone `/phrenology-3d` and `/playground` tools also remain. No route or `views/*View.vue` port is deleted. Biased competition, psychometric function, normalization, Hillyard ERP, Corbetta PET and phrenology still have published chapter uses and are excluded from the unused-port list.

## Verification and evidence

The reproducible browser harness is `scripts/retina-widgets-db-browser.mjs`. It applies the real SQL in PGlite and intercepts creator-free GET responses with `page.route`; it never writes to the remote database. The baseline current-main build is `cb67b487`, captured before edits. The harness checks the old production reader, that main build with migrated data, and the new reader with migrated data, in Chromium and WebKit at 1440, 1024 and 390px.

Evidence root: `/Volumes/Brain/artifacts/retina-cleanup/62/`. Main placement and History measurements/screenshots are in `proof/` and `webkit-proof/`; `existing-inline-proof/` separately exercises the four pre-existing Retina inline uploads. Results record mounts, band kind/height/pause, no eager RetINaBox fetch, sandbox errors, console errors and horizontal overflow. The intended duplicate DS pane placement disappears; its upload mounts in the new band.

WebKit's screenshot helper stalled waiting for `document.fonts.ready`; the repeat uses Playwright's `PW_TEST_SCREENSHOT_NO_FONTS_READY=1` switch, which skips that wait without disabling font loading. WebKit records the same `ResizeObserver loop completed with undelivered notifications` page event during History scrolling at 1440/1024 on production, migrated main and the new reader; there are no Retina page/console/sandbox errors or new History errors. Screenshots still require human visual acceptance. These checks establish local rendering against published data and simulated SQL, not an applied production migration, deployment or Stuart's acceptance.

## Suggested CLAUDE.md paragraph (handoff only)

Chapter widget placement is exclusively DB-authored `paragraphs.content.blocks` (`type: "widget"`); do not add code placements. Blocks carry `fullScreen`, `narrowKind`, `fallbackWidgetId` and `launchCard`, preserved by the transform and block editor. Retina Colour vision is `upload:retina-color-vision`; direction selectivity is one full-screen band after its final passage, with its former pane duplicate removed; RetINaBox keeps its click-to-load cover. Widget-specific fit and presentation CSS belongs in each uploaded HTML file, with a guarded migration whose result equals the file and a SQL test. Keep library Vue ports for author comparisons and explicit fallbacks. Lateral organization and the live section-transition schemas remain linked and must not be removed as unused.
