# G6 independent rereview — approve source at exact SHA; CI pending

PR: https://github.com/antonmogul/theopenbrain.org/pull/147
Reviewed head: `36f25bf2fc8f7d7f61cc16e6d66e7651bcc52bbc`.
Prior head: `d3fcf1295a6c6e5575bbc1045af9caffb9bf44c6`; base: `3f1bcd8171632503ac5bea8c822ea67d3c889940`.
Reviewer dispatch: `ctx_723150a127fd`, task `task_69c9b78919ad`.

## Verdict and severity

**No remaining actionable P1/P2/P3 source findings in the reviewed scope. Approve the corrected source at this exact head.** Both prior requested changes are independently verified fixed, and the bounded inherited mobile clipping correction passes actual-reader checks. This is an independent review verdict, not a GitHub approval, CI-green claim, merge authorization, deployment or production acceptance.

Both required GitHub checks remain **IN_PROGRESS** at the final review checkpoint: CI / Lint, test, build (run 39835705927) and History fixture browser QA (run 39835705854). PR remains OPEN at the reviewed head. Require successful required CI before treating the PR as merge-ready.

## Requested corrections: file/line and reproduction

1. **Prior P1 closed — fixture architecture.** `src/stories/historyFullReaderData.json:1`, `src/components/chapter/text/__stories__/breakoutReviewFixtures.js:2`, `src/components/chapter/text/__stories__/BreakoutRail.stories.js:4`. Git reports R100 from the former views path. Prior and current fixture SHA-256 are both `9a753b0a6b4d5310c633843c202a103591aa880fb4a8aee40b8ee9ab32a3c720`. All current references found by repository-wide `rg historyFullReaderData src scripts` point to the shared path: component stories, full-reader view story, fixture test, generator, prepare and browser runners. The generator/prepare/browser diffs change only this path. `.dependency-cruiser.cjs` is unchanged against base. Independent graph check exits successfully: 1,018 modules / 2,067 dependencies, **0 errors**, only existing retinabox.js orphan warning.
2. **Prior P2 closed — continuous widget seams, including ordinary sections.** `src/components/chapter/text/SectionComp.vue:101-102` chooses div only for paired Explore IDs; prose, widgets and unpaired Explore retain span. Shared `src/index.css` is unchanged. Mounted regressions cover ordinary wrappers and mixed-box boundaries. Real SectionComp + WidgetBreakout story (`SectionComp.stories.js:111`, ConsecutiveWidgets) in Chromium and Firefox at 1440/1024/390 measures 0px touching margins and 0px gap; outer/prose-separated margins remain 40px. Independent controlled DOM negative reproduction restores the old div structure and yields 40px margins / 40px gap. Evidence: `/tmp/openbrain-G6-rereview/seam-negative-control.{mjs,json}`. The story uses actual widget shells with a deliberately unavailable widget ID, not an iframe/provider integration; that is sufficient for the CSS seam contract.
3. **Bounded inherited clipping correction verified.** `src/components/chapter/text/ExploreCard.vue:212-219` scopes width/min-width/margin containment to inline figures nested in the disclosure. No shared figure implementation or global figure CSS changed. Independently rebuilt actual production reader, fetched current published content read-only, and exercised both actual boxes at 1440/390/320 in Chromium and Firefox (6 cases per engine). Comparative cards each contain one real nested inline illustration; image load, contain fit, shell/legend/image/expand-control horizontal and vertical bounds, no internal horizontal clipping, fullscreen/Escape, independent keyboard/touch disclosure, retained paragraph content, desktop pairing/mobile stacking and no document overflow all pass. All non-GET/HEAD browser requests were blocked and none occurred. Visually inspected actual-reader screenshots for hippocampus at 320 and rete at 390 Chromium and rete at 320 Firefox: full source artwork and legends/control are visible. These are actual reader renders, not merely story stubs.

## Independent execution and artifacts

All fresh artifacts are owned under `/tmp/openbrain-G6-rereview/`; no source or shared dependencies/caches were changed. Exact-source fresh application build outputs to `app-dist`, and four-story-file static Storybook build outputs to `storybook-static`; isolated Storybook Vite cache and npm graph cache also live here. Temporary localhost servers used only owned ports 6126 and 6127 and were stopped after review.

- Focused Vitest `--no-cache`: **26/26 tests, 6 files**: explorePairs, ExploreCard, SectionComp.reader-section, BreakoutRail, chapter storybookCoverage, historyFullReaderFixture. Includes canonical source/migration fingerprints. Log `tests.log`.
- Graph check with own `NPM_CONFIG_CACHE`: **0 errors / 1 existing warning**; `graph.log`.
- Fresh `vite build --outDir /tmp/openbrain-G6-rereview/app-dist`: PASS, existing large-chunk warnings; `app-build.log`.
- Fresh isolated `storybook build`: PASS; `storybook-build.log`.
- Full eslint without fixes: PASS, 0 errors / 6 existing warnings; `lint.log`.
- Storybook coverage: **285/285**, chapter inventory **67**; `git diff --check`: PASS.
- Committed `g6-breakout-review.mjs` independently executed against fresh build: **Chromium 17/17 and Firefox 17/17**; `chromium/`, `firefox/`, respective JSON/screenshots/logs. Includes seam, nested figure, desktop/mobile pairs, disclosure, link activation, rail navigation/motion/resize/vertical fallback.
- Committed `g6-reader-review.mjs` independently executed against fresh application build: **Chromium 6/6 and Firefox 6/6**, `reader-chromium/` and `reader-firefox/`; results JSON plus actual figure screenshots. Published content is read-only live data, so future content changes can change this reproduction.
- Independent seam negative control proves the browser assertion detects the prior defect rather than passing only the fixture shape.

Reproduce using static Storybook server on 6126 and Vite preview of the fresh app-dist on 6127:

```sh
G6_STORYBOOK_URL=http://127.0.0.1:6126 G6_OUTPUT=/tmp/g6-independent-story node scripts/g6-breakout-review.mjs
G6_READER_URL=http://127.0.0.1:6127 G6_OUTPUT=/tmp/g6-independent-reader node scripts/g6-reader-review.mjs
# Repeat with G6_BROWSER=firefox.
```

## Preservation, proposals, migrations and integration limits

- BreakoutRail production import search finds only its story and test. ReferenceLinks review CSS/prose is imported only by its review story. Actual reader contains neither `.br-track` nor `.review-reference-links`. Lateral reading and ordinary sourced-link trials remain Storybook-only; R18 remains a decision proposal. No regex auto-linking or replacement of live scientific prose was introduced. External-link browser activation tests stub destination responses and are not fresh third-party page-render checks.
- Scientific fixture bytes are unchanged, and `git diff --quiet base HEAD -- .dependency-cruiser.cjs src/index.css supabase public` succeeds. Source chapter records, source repairs, scans, coordinates, captions/transcripts/credits and scientific media are preserved by source diff and fixture fingerprint tests. New story metadata is review composition; production pairing derives IDs without rewriting content.
- **No migration added or modified and none applied.** Existing `20261021010000_history_breakout_boxes.sql` remains a prerequisite where Explore metadata has not yet been applied. Local reader success with currently published data does not establish migration state in another environment.
- Live file inventories for sibling PRs **144/145/146/148/149** have no direct changed-path overlap with this PR. Newly visible G1 (#148) changes TextComp, illustration lifecycle, reduced motion and chapter-reference logic; G2 (#149) changes FigureImages/IllustrationPlaceholder and media layout plus its own migration. These are semantic integration risks despite nonoverlapping G6 files: rerun nested Explore figure/legend/fullscreen, desktop pairing, mobile overflow, widget seams and motion after combination. No combined checkout, merges or sibling migration testing was performed here. Scoped Storybook mock behavior is not combined provider/iframe acceptance.
- Full repository suite, full Storybook catalog smoke, Safari, screen reader and physical touch were not independently run; touch coverage uses browser emulation. Rail full-page screenshot re-snapping remains the previously disclosed capture limitation; viewport/resize assertions pass both engines.
- Working tree remained clean at exact head. No edit, merge, deployment, DB write, credential operation, email or external-channel post was performed. Runtime/deployed SHA and authenticated production acceptance remain separate gates.
