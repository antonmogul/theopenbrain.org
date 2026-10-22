# Independent G4 review — PR #145

- PR: https://github.com/antonmogul/theopenbrain.org/pull/145
- Exact reviewed head: `7bedea98348d431e4629f96af570c258e79a2d2f`
- Exact base: `3f1bcd8171632503ac5bea8c822ea67d3c889940`
- Reviewer: fresh Codex dispatched worker, separate from Astra implementation owner; source read-only.
- Requests: R09 (corrected Penfield title), R10 (purple interactive labels and full-map fit).
- Read coordinator brief, G4-research-plan.md, G4-report.md, complete source/test/migration diff and relevant existing reader host code. GitHub read confirmed the PR is open and still has this base/head.

## Verdict

**APPROVE from independent code review: no actionable findings in the reviewed diff.** This is a local code-review verdict, not authorization to merge/deploy and not authenticated production acceptance.

## Independently reproduced evidence

1. Scoped Vitest: **54/54 passed**, four files, including executed PGlite migration, cabinet interaction/source tests and placements. Command:
   `HISTORY_SQL_HARNESS=/tmp/tahiti-smoke/node_modules/@electric-sql/pglite node_modules/.bin/vitest run --maxWorkers=1 --minWorkers=1 src/views/__tests__/CaseCabinetView.test.js src/__tests__/penfieldPresentation.test.js src/__tests__/penfieldTitle.sql.test.js src/widgets/__tests__/placements.test.js --cache=false`
2. Reran `scripts/penfield-browser.mjs` against an isolated Vite server on localhost:6114 in **Chromium and Firefox**. Each engine passed 21 whole-map fit checks (all seven cases at 1440x900, 1024x768, 390x844), 141 point selections, 246 event comparisons, all 45 mapped-label pointer targets per viewport, original-scan switching, zoom/Fit, keyboard/Escape, mobile map/notes switching, OS/app reduced motion, reversal and immediate case switching. Receipts and screenshots: `/tmp/openbrain-G4-review-browser/{chromium,firefox}-results.json` and adjacent images.
3. Additional reviewer-authored browser harness mounted the **actual WidgetBreakout and DemoModal components** with the real case-cabinet placement (not a substitute iframe). Tested S. Be. point 24, original-scan toggle, map/notes navigation where applicable and nested Escape handling at **320x844, 390x844, 768x844 and 1440x844**. Correct transcript, no page errors or horizontal document overflow. Screenshots `embedded-320.png`, `embedded-390.png`, `embedded-768.png`, `embedded-1440.png`; receipt `extra-results.json`; harness `/tmp/openbrain-G4-extra-review.mjs`. This mounts local native components with bundled data, not an authenticated DB-backed chapter. Dimensions in that receipt were sampled during the existing modal entrance transition; use settled screenshots and the standalone fit assertions for layout evidence.
4. Visually inspected actual fitted desktop maps and phone embedded UI, and all seven source-size presentation layers. For close inspection, the reviewer cloned the rendered map DOM at native source dimensions, preserving SVG geometry and resetting the label font to its declared source-pixel size; these are diagnostic mask images, not full-reader screenshots. Compared the highest-risk S. Be., A. Bra. and N.C. junctions directly with their original PNGs. No erased anatomical segment was apparent; shared junction ink remains visible. Diagnostic harness `/tmp/G4-mask-check.mjs`, images `mask-{ge,sbe,gp,yn,nc,abra,rw}.png`. Earlier `source-size-*` images were exploratory CSS overrides and must not be used as acceptance evidence.
5. `git diff --numstat 3f1bcd81...HEAD -- src/data public` is empty: scientific appendix, source scans and source assets were not edited. Hash tests independently matched each original PNG to appendix metadata. Browser and component checks reproduced all 47 points, 45 mapped locations and 82 events; G.P. 16 and G.E. 4 remain honestly unmapped, and G.P. 17d stays visible as original black source ink.
6. Scoped ESLint and `git diff --check 3f1bcd81...HEAD` passed. Worktree remained clean. Production build was reported by the implementation owner but was **not independently rerun**; no broad suite or Storybook build was run.

## Code assessment

- `src/helper/penfieldPresentation.js:1-100` is a separate display geometry layer. Original asset URLs, data, point centers and transcripts remain authoritative. Mask polygons are bounded in original image pixels rather than depending on viewport zoom.
- `src/views/CaseCabinetView.vue:728-783` keeps image and masks in the same coordinate frame, renders native labelled point buttons, distinguishes presentation/original modes in the caption and exposes an unchanged original-file link with noopener. Native keyboard operation and non-color selection/focus cues are retained. Dense labels are small at fit zoom; zoom and equivalent large point-list buttons remain available. This documented source-position constraint is not a new blocker.
- `supabase/migrations/20261022020000_penfield_experience_title.sql:4-19` filters to History modules and exact known old widget/title values, preserves block order/other fields/custom titles, guards array content and becomes a true timestamp-preserving no-op on a second execution. The executed migration test covers multiple matching blocks, nonmatching chapters/widgets/custom titles, absent/null/malformed/empty block containers and repeated application.
- No sandbox, uploaded-widget host, CSP, audio, credentials or network security configuration changed. Therefore no G5 audio/sandbox weakening is introduced by this patch; audio functionality itself is outside this Penfield review.
- Shared changes are confined to the case-cabinet title entries in catalog.js and placements.js. Other groups' reader/media/Retina changes were not combined into this checkout; integration remains a separate gate.

## Limits and remaining requirements

- Migration `20261022020000` is **unapplied**. Deployment alone does not rename existing stored cards; apply through the separately authorized migration process, verify the exact old-title targets and retain custom titles.
- Merge/deployment/authenticated reader acceptance remain outstanding. After authorized integration, check the title from stored History content plus the real reader modal on desktop/mobile, purple labels/original toggle, complete fit and notes; repeat alongside sibling follow-up PRs.
- No full accessibility audit or screen-reader session, WebKit, physical touch device, authenticated chapter, live DB or provider audio check was performed.
- A generic Playwright center-click on overlapping closed folder shapes can hit another folder; the additional harness used native keyboard activation for case opening, as the implementation's standalone acceptance does. This is not a demonstrated regression in the R09/R10 diff; it does not invalidate the actual map-label pointer checks. No forced clicks were used for map labels.
- No source edits, merge, deployment, live DB writes, credential changes or external messages were made. Only local review artifacts were written.

## PR-ready review text

Reviewed head `7bedea98348d431e4629f96af570c258e79a2d2f` against `3f1bcd8171632503ac5bea8c822ea67d3c889940`: no actionable findings. Independently passed 54 scoped tests, Chromium/Firefox complete-map and point/transcript checks, plus actual WidgetBreakout/DemoModal checks from 320px through desktop; source hashes/data and the source/display distinction are preserved. Approve from code review, with the unapplied title migration and authenticated deployed reader plus sibling-PR integration acceptance still outstanding.
