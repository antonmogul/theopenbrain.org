# G6 — Breakout pairs and review proposals

[PR #147](https://github.com/antonmogul/theopenbrain.org/pull/147) targets `main`. Corrected source/evidence commit: `9e4af1de3edf0cf968c55fc9360b01fee9b99035`; this report and research-plan update are a subsequent documentation-only commit. The worker handoff pins the final PR head for a new independent review. No self-approval, merge, deployment or production write.

## Independent-review fixes and current verification

The independent review of `d3fcf1295a6c6e5575bbc1045af9caffb9bf44c6` requested changes. Both findings are addressed in the corrected source SHA above, along with the coordinator's subsequent bounded mobile artwork request:

- **P1 dependency architecture:** moved the unchanged canonical History fixture to `src/stories/historyFullReaderData.json`; updated component/view story imports, fixture tests and all three generator/prepare/browser script paths. Git records a 100% rename; bytes remain identical, SHA-256 `9a753b0a6b4d5310c633843c202a103591aa880fb4a8aee40b8ee9ab32a3c720`. No dependency rule changed. `npm run graph:check` now passes: **0 errors**, existing `retinabox.js` orphan warning only, 1,018 modules / 2,067 dependencies.
- **P2 consecutive-widget seams:** only paired Explore paragraphs use a `div` grid item; ordinary prose, widget and unpaired Explore paragraphs retain the existing span wrapper. Shared reader CSS is unchanged. Two added mounted tests cover the wrapper boundary. A new real SectionComp/WidgetBreakout story and browser assertions prove **0px touching margins / 0px gap**, while the run's outer margins and a prose-separated widget retain 40px spacing at 1440/1024/390 in both engines. A controlled browser negative test restoring the previous div structure returns 40px touching margins and a 40px gap.
- **Inherited mobile figure clipping, now corrected:** ExploreCard's scoped parent rule contains nested `.fig-shell--inline` elements to the disclosure width and removes their mobile viewport-bleed offset. The original IllustrationPlaceholder, IllustrationInline, FigureImages and global figure rules remain unchanged. Complete source figures/legends and fullscreen controls now fit within expanded cards at 320/390, with desktop pairing retained. This was inherited from main, not introduced by pairing. The new real figure story and `scripts/g6-reader-review.mjs` assert full shell/legend/image/control geometry, no clipped horizontal content, image loading/contain fit, expand/Escape and no page overflow; screenshots were visually inspected.

Current validation after all source fixes:

- **26/26 tests, six files:** the five original G6 suites plus `historyFullReaderFixture`; includes unchanged source/migration fingerprints, both new SectionComp regressions and pairing/disclosure/rail coverage. `vitest run --no-cache` avoids shared dependency caches.
- **Lint/format/build:** full lint passed (0 errors / 6 existing warnings); every changed source/JSON/report file passes Prettier; `git diff --check` passes. Production build and isolated four-story-file static Storybook build passed; existing bundle-size warnings remain. Storybook inventory **285/285** and chapter inventory **67/67**.
- **Chromium 17/17 + Firefox 17/17 Storybook scenarios:** prior pair/rail/link checks plus three widget-seam cases and full nested-figure containment at 320/390/1440. The fixture uses the canonical source figure and complete legend, not a replacement drawing.
- **Chromium 6/6 + Firefox 6/6 actual production-build reader cases:** both real boxes at 1440/390/320, current published content fetched read-only, independent keyboard/touch disclosures, retained paragraph text, loaded artwork, full nested figure bounds and expand/Escape, desktop pairing/mobile stacking, no page overflow and no prototype markup. Request guards block all non-GET/HEAD requests; none occurred. An initial temporary test used an ambiguous generic button selector; the committed runner explicitly selects `.xc-btn` and both final runs pass.

Current evidence supersedes the initial screenshots below for the repaired areas: [Chromium](G6-evidence/review-fixes/chromium.json), [Firefox](G6-evidence/review-fixes/firefox.json), [actual reader Chromium](G6-evidence/review-fixes/reader-chromium.json), [actual reader Firefox](G6-evidence/review-fixes/reader-firefox.json), [seam negative control](G6-evidence/review-fixes/seam-negative-control.json), [continuous widget run](G6-evidence/review-fixes/widget-seams-desktop.png), [complete hippocampus figure at 320](G6-evidence/review-fixes/hippocampus-320.png), [complete rete figure at 390 in Firefox](G6-evidence/review-fixes/rete-390-firefox.png).

Reproduce with a static Storybook server on a free localhost port and a local production preview:

```sh
G6_STORYBOOK_URL=http://127.0.0.1:6116 G6_OUTPUT=/tmp/g6-story-evidence node scripts/g6-breakout-review.mjs
G6_READER_URL=http://127.0.0.1:6117 G6_OUTPUT=/tmp/g6-reader-evidence node scripts/g6-reader-review.mjs
# Repeat either command with G6_BROWSER=firefox.
```

Correction-pass builds, logs, temporary Storybook config and isolated Vite cache are under `/tmp/openbrain-g6-repair/`; used only owned ports 6116/6117. Shared dependencies were not mutated. The prototypes remain Storybook-only. Full repository CI/full catalog smoke, new independent exact-head approval, sibling integration, Safari/assistive technology/physical touch, merge, deployment and live acceptance remain separate gates. No new database requirements or source-content changes.

## Findings and delivered behavior

| Request | Cause and current state                                                                                                                                                          | Delivered                                                                                                                                                                                                                              |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R02     | Main `3f1bcd81` and current demo both stack the four Explore cards; independent disclosure already works. Existing chapter migration metadata is present in the live reader.     | Adjacent authored Explore paragraphs in boxes pair at 1024px+, stack below, and independently reveal their existing content. Complete preview artwork, square 44px controls, original paragraph IDs, text and inline figures retained. |
| R03     | Legacy Retina `.hoverImg` spans offer mouse-only descriptions. The two local biography/context records contain no destination URLs; bibliography links are publication metadata. | Storybook-only ordinary underlined links for Alcmaeon, Descartes and dualism, with visible SEP attribution, keyboard focus and mouse/touch/Enter activation. Explicit sourced examples, no auto-linking or live prose rewrite.         |
| R05     | Descartes is deliberately vertical in current main and demo; no lateral trial existed.                                                                                           | Storybook-only native horizontal reading region with Previous/Next, Left/Right/Home/End on the region, vertical-reading option, no wheel handler or auto-advance, and all eight source paragraphs retained.                            |
| R18     | Retina experiment stages and History narrative boxes serve different tasks.                                                                                                      | Comparison/options in the [research plan](G6-research-plan.md); existing reader format remains the default. Final format and link policy remain for next week’s discussion.                                                            |

Deployment is separate: the supplied last-verified deployment was PR140 while main includes PR143. Live DOM was rechecked, but this run did not establish a fresh Railway deployed SHA. The G6 layout gap exists in current main, so it is not a duplicate of PR143’s fixes.

## Implementation and boundaries

- `SectionComp`, `explorePairs` and `BreakoutBox`: narrow pairing layout; ordinary prose breaks a pair, odd cards remain unpaired, and non-box sections keep their layout. G2 confirmed it leaves SectionComp unchanged.
- `ExploreCard`: paired presentation uses complete contained artwork; disclosure state remains local to each card. No content, source image, hash, coordinate or original scan changes.
- `BreakoutRail` and its story: review-only import path, no application route enables it. Ordinary links likewise exist only in the review story/CSS, rendered by the actual chapter text-block pipeline.
- Updated both chapter component inventory/count tests and normal Storybook coverage. Added focused tests and `scripts/g6-breakout-review.mjs`.
- No new migrations required. The existing `20261021010000_history_breakout_boxes.sql` is a prerequisite for authored card metadata in another environment; this run neither altered nor applied it. Live read-only inspection confirmed all four cards in the demo.

## Initial verification before independent review

- **18/18 unit tests:** `vitest run --no-cache` for `explorePairs`, `ExploreCard`, `SectionComp.reader-section`, `BreakoutRail` and chapter `storybookCoverage`.
- **Lint/format:** full `npm run lint:ci` passed, 0 errors / 6 pre-existing warnings; changed JS/Vue/CSS/Markdown/JSON pass Prettier; `git diff --check` passed.
- **Build:** `npm run build` passed. Isolated scoped Storybook build passed; global Vue story coverage **285/285**, chapter inventory **67/67**. Existing bundle-size warnings remain. Full repository unit suite and full Storybook smoke were deliberately not run concurrently with the other groups; CI owns those broader checks.
- **Chromium 11/11 + Firefox 11/11 scenarios:** both pairs at 1440, 1024 and 390px; measured two-column/stack geometry; uncropped images with nonzero natural dimensions; Space/Enter/touch independent expansion; complete mobile source text and no page horizontal overflow. Descartes buttons/keys, native vertical wheel scroll, vertical fallback, explicit motion preference precedence and panel-2 preservation through 390×1800, 844×390, 1440×1000 and original viewport resizing. Ordinary link destinations activate through mouse, keyboard and touch. External destination responses are stubbed in acceptance tests; actual source pages were independently verified during research.
- **Four local production-build reader cases:** Chromium at 1440 and 390px, both real boxes with current published content. Read-only request guard rejected non-GET/HEAD requests; none occurred. Independently expanding both cards preserved readable source paragraphs and loaded their related inline figures. This is local code + current published data evidence, not deployment acceptance.
- Static review build opens and navigates correctly on local port **6106**. No use of port 5198.

Committed evidence: [Chromium results](G6-evidence/chromium.json), [Firefox results](G6-evidence/firefox.json), [built reader results](G6-evidence/reader-build.json), [actual reader desktop](G6-evidence/reader-desktop.png), [Hippocrates desktop](G6-evidence/hippocrates-desktop.png), [comparative expansion](G6-evidence/comparative-desktop-open.png), [complete mobile expansion](G6-evidence/hippocrates-mobile-open.png), [Descartes viewport](G6-evidence/descartes-mobile-viewport.png), [reference links](G6-evidence/reference-links-mobile.png). Artwork and rendered text were visually inspected, not inferred from console silence.

**Capture limitation:** Chromium full-page screenshot capture can re-snap the tall mobile rail from x=300 to x=120, despite correct normal viewport interaction. The lateral artifact therefore uses a normal viewport screenshot, with state/position assertions after capture. Actual height changes, resizing and portrait/landscape changes preserve the selected panel in both engines. No source workaround was added solely for screenshot tooling.

To reproduce: start the repo’s Storybook on 6106, then run `node scripts/g6-breakout-review.mjs`; repeat with `G6_BROWSER=firefox G6_OUTPUT=/tmp/openbrain-g6/firefox-evidence`. This run used an uncommitted temporary config under `/tmp/openbrain-g6/storybook` for the three relevant story files, an explicit checkout root/Vue plugin and `/tmp/openbrain-g6/vite-cache`. Dependencies are an ignored symlink; shared dependency files/caches were not changed. The static review server serves `/tmp/openbrain-g6/storybook-static` at `http://127.0.0.1:6106`.

Review stories:

- `?path=/story/chapter-text-sectioncomp--hippocrates-pair`
- `?path=/story/chapter-text-sectioncomp--comparative-pair`
- `?path=/story/chapter-text-breakoutrail--descartes-trial`
- `?path=/story/chapter-text-reference-links-review--ordinary-links`

## Ready-to-use note for Stuart

“The two History Explore pairs are prepared side by side on desktop and stacked on phones, with each button opening only its own material. There are also review examples for ordinary sourced reference links and a sideways Descartes reading option with a vertical alternative. These are in a PR for independent review, not live yet; we have kept the existing breakout format so we can discuss the final approach next week.”

Remaining decisions: final Retina/History format, which boxes merit optional lateral reading and how to divide their text, preferred biography/reference sources, whether links replace or supplement portraits, and same-tab versus new-tab navigation. Independent exact-head review and any later authorized merge/deployment remain outstanding.
