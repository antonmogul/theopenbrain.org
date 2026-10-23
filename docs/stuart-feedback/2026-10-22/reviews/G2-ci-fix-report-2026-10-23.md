# PR149 offline Storybook repair — 23 October 2026

PR: https://github.com/antonmogul/theopenbrain.org/pull/149

**Pushed final head:** `ef38c9d15704b3c494fa14c18bcb49bb1e87d538`. Branch: `antonmogul/Figures-media-followups`. Clean checkout after push. Only the fixture file changed in the repair commit; this report and browser evidence are local artifacts.

## Cause and repair

CI run `39834316983` failed only the `GalvaniSlideLegends` and `HuxleyFirst` catalog stories: their gallery thumbnails requested `https://i.ytimg.com` before any Play action. The player itself still requires deliberate activation; its posters and gallery thumbnails independently load on mount.

Started from clean reviewed head `48de7227a1a8b40d0ed8e2df810addb9f902ed90`. Fetched and merged main `e35c5ae25925d36f53884de7f0b82957fa26a6e5` as merge commit `1fb4759a17b3b6b047a46f0bfc4f29f1946fb364`, without conflict, rebase or force push. Compared the merged `IllustrationComp.vue` against main: its only remaining G2 differences are the VideoEmbed import and YouTube template replacement, so G1's lifecycle implementation is preserved.

Changed only the two video `src` poster fields in the Storybook-only `g2MediaFixtures.js` to a shared inline SVG labelled “Offline video preview”. Actual source artwork, Huxley and squid video IDs, credits, ordering, migration SQL and click-to-play behavior remain intact. No smoke-script, network-guard, production component or security-policy changes were made for this repair.

## Validation

- Full combined Vitest suite: **2,534 tests passed in 239 files**, with the existing isolated PGlite harness enabled and no cache writes. This includes FigureImages (16), IllustrationComp lifecycle (4), legacy captions (3), VideoEmbed (4), BreakView (2), figureCycle (9) and G2 migration execution (2).
- Lint passed with six existing warnings, zero errors. Full format check passed. Dependency graph passed with zero errors and the existing retinabox orphan warning: 1,032 modules / 2,108 dependencies. `git diff --check` passed.
- Component coverage: **285/285** represented or explicitly mapped, 257 story files.
- Production Vite build and Storybook build passed. Used isolated `/tmp/openbrain-pr149-fix` output/cache paths and existing immutable shared dependencies. The initial relocated Storybook configuration could not resolve its preview runtime; explicitly retaining the repository Vite root and Vue plugin fixed this local harness configuration, with no tracked configuration changes.
- Actual built `GalvaniSlideLegends` and `HuxleyFirst` stories passed Chromium checks at 1280×800. Each made **zero external requests on mount and video selection**; all artwork/poster images decoded. Captions retain the Physiological Society and Alan Macfarlane credits. No iframe exists until Play is clicked, then the exact original `youtube-nocookie.com` video ID is requested. All external requests were blocked throughout; provider playback was not attempted. See [two-story results](two-story-results.json).
- The first full catalog smoke completed with 13 unrelated data-story failures caused by the relocated preview configuring copied mock modules while the components used the original aliased mock modules. Both target stories passed that catalog run. Corrected only the temporary preview imports, rebuilt successfully and repeated the two-story browser checks successfully. The coordinator explicitly accepted this bounded validation and delegated canonical catalog verification to hosted CI; a just-started catalog rerun was stopped at that instruction. **No full local catalog pass is claimed.** Failure detail: `/tmp/openbrain-pr149-fix-harness-failures.json`; incomplete rerun log: `/tmp/openbrain-pr149-fix-all-smoke-final.log`.

## Reproduction and evidence

- Full unit command: `HISTORY_SQL_HARNESS=/tmp/openbrain-g2-sql/node_modules/@electric-sql/pglite/dist/index.cjs node_modules/.bin/vitest run --no-cache --maxWorkers=2 --minWorkers=1`.
- Build harness/config: `/tmp/openbrain-pr149-fix/build.mjs` and `/tmp/openbrain-pr149-fix/storybook-config/main.mjs`. Storybook uses `CACHE_DIR=/tmp/openbrain-pr149-fix/storybook-cache` and Vite uses a separate cache beneath the same task directory.
- Focused browser harness: `/tmp/openbrain-pr149-fix/two-story-smoke.mjs`; screenshots: `galvani-slide-legends.png` and `huxley-first.png` in that directory. Huxley screenshot inspected for visible credit, player button and original Eccles thumbnail.
- Catalog command: run the repository's unchanged `scripts/storybook-all-smoke.mjs` from `/tmp/openbrain-pr149-fix`, with `STORYBOOK_URL=http://127.0.0.1:6149 STORYBOOK_SMOKE_CONCURRENCY=4`, against its fresh static build.
- Logs: `/tmp/openbrain-pr149-fix-{tests,lint,format,graph,coverage,build,storybook,two-story,all-smoke}.log`.

## Remaining gates

The coordinator owns independent focused re-review, exact-head remote CI and merge. This repair does not establish deployment, applied database migrations, authenticated production acceptance or provider playback availability. No live database writes, credentials, email, merge to main or deployment were performed. Hosted CI is queued for the exact pushed head: [quality run 39934327282](https://github.com/antonmogul/theopenbrain.org/actions/runs/39934327282) and [History fixture run 39934327264](https://github.com/antonmogul/theopenbrain.org/actions/runs/39934327264). Local Storybook server and the incomplete catalog rerun were stopped at handoff; artifacts remain available for review.
