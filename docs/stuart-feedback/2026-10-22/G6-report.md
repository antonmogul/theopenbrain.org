# G6 — Breakout pairs and review proposals

[PR #147](https://github.com/antonmogul/theopenbrain.org/pull/147) targets `main`. Implementation/evidence commit: `27f9848eb360449a0d1b62da03e93c6065773e49`; this report is a subsequent documentation-only commit. The worker handoff pins the final PR head for independent review. No self-approval, merge, deployment or production write.

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

## Verification

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
