# The History fixture

`src/stories/historyFullReaderData.json` is a dated export of the **published** History chapter (`foundations-of-neuroscience`). The "History fixture browser QA" lane (`.github/workflows/history-fixture-browser.yml`) renders it through the real App, ChapterView and TextComp in Storybook and runs the browser assertions in `scripts/history-full-reader-browser.mjs` against it, so the lane tests the chapter readers get.

The database is History's source of truth: the chapter is edited in the admin. Until OPENBRAIN-167 the fixture was rebuilt from twelve migrations, and it had drifted from the published chapter (16 sections against 15, a box that no longer exists, no widget blocks, 33 figures against 37).

## What is in it

| Key                     | Contents                                                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `header`                | `source` ("published chapter export"), `chapter`, `exportedAt` (the date), `exportedBy`, and `counts` of every kind of row below. |
| `boundary`, `omissions` | What the fixture does and does not stand for. Written by the export script; the stories and the lane's manifest quote them.       |
| `module`                | The `modules` row.                                                                                                                |
| `sections`              | Its `sections` rows, breakout boxes included (`parent_section_id`, `anchor_paragraph_id`, `box_treatment`).                       |
| `paragraphs`            | Their `paragraphs` rows, with `content.blocks` (widget blocks too), `content.explore` and `content.animationFlags`.               |
| `animations`            | The `animations` rows a paragraph links through `animation_id`, and no others.                                                    |
| `references`            | The chapter's `references` rows, which the reader lists in the References section.                                                |
| `uploads`               | Each uploaded widget a figure or block names (`upload:<slug>`): slug, title, ramp, status, byte length and sha256 of its HTML.    |

Every column is exported except `created_at`, `updated_at`, `created_by` and `content_version_id`, so a column a later migration adds arrives without a change to the script. Row ids are replaced with stable ones (`history-fixture-module`, `history-section-<slug>`, `<section id>-p<order_index>`, `history-animation-<animation_key>`, `history-reference-<number>`): stories and assertions name rows by them, and a refresh's diff stays about content. A paragraph's id therefore changes when an editor reorders its section.

An uploaded widget's HTML is not copied into the fixture. The story serves the committed copy in `src/widgets/uploads/<slug>.html`, and the fixture test holds that file to the sha256 the export recorded. If the test fails after a refresh, the published widget changed: update the committed copy in the same pull request.

## Refreshing it

```bash
npm run history:fixture:export     # fetch the published chapter, rewrite the fixture
npm run history:fixture:drift      # compare the committed fixture with the published chapter
```

Both read `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the environment, else from the file given as `-- --env <path>`, else from `./.env` (a worktree has no `.env`; pass the main checkout's). They make GET requests with the publishable key and nothing else, so they see what an anonymous reader sees and cannot write. Neither value is printed or stored.

`history:fixture:drift` prints one line per difference (`+` a row only the published chapter has, `-` a row only the fixture has, `~` a row whose listed fields differ) and exits 1, or prints `History fixture drift: 0` and exits 0. It needs the network and the key, so it is a local command and not a CI step.

Refresh:

- at the end of an editing session on History in the admin, and
- before changing a History widget or the reader code History uses, so the change is tested against today's chapter.

Commit a refresh as its own pull request. Its diff is then exactly what changed in the chapter, and a widget or reader change lands separately against a fresh fixture. After exporting, run the lane's steps (below): new content can need a line in `scripts/history-full-reader-prepare.mjs` (artwork outside `public/publicAssets/images/foundations/`) or a changed expectation in the browser script.

## What CI checks

CI never reads the database. It checks the committed file:

- `src/__tests__/historyFullReaderFixture.test.js` (in `npm test` and in the History lane): the header is present and its counts match the rows, ids follow the stable scheme and no production id or dropped column is left, every paragraph's section exists, every `animation_id` resolves, every box has a parent section and an anchor paragraph in it, widget blocks have a view to mount, each uploaded widget's committed copy matches its recorded hash, and every figure's artwork is a committed file or a YouTube poster.
- `scripts/history-full-reader-prepare.mjs`: copies the artwork the fixture names into the Storybook build and records it, with any YouTube poster listed as skipped (the story stands in for those).
- `scripts/history-full-reader-browser.mjs`: the reader at 390, 768, 1024 and 1440 px. Box, Explore-part and widget expectations are read from the fixture, so a refresh that adds or removes one changes what is asserted. Any outside request fails the run: the story (`src/views/__stories__/HistoryFullReader.stories.js`) draws a plain stand-in for each YouTube poster and serves each uploaded widget without its Google Fonts links, and those are the only two things it changes in the export.

To run the lane locally, build Storybook, prepare, serve the build on a free loopback port and point the script at it. The script refuses to start unless `GITHUB_ACTIONS=true`, a guard against launching Chromium in a sandbox that forbids it; set it for the one command when you mean to run it:

```bash
npm run build-storybook
node scripts/history-full-reader-prepare.mjs
npx serve storybook-static -c ../.storybook/serve.json -l tcp://127.0.0.1:6110 &
GITHUB_ACTIONS=true STORYBOOK_URL=http://127.0.0.1:6110 node scripts/history-full-reader-browser.mjs
```

## The migration replay

The twelve History seed and content migrations are still replayed in PGlite, as `src/__tests__/historyMigrationReplay.sql.test.js` (it runs in the History lane, and locally when `HISTORY_SQL_HARNESS` is set). It proves the committed migrations apply in order on an empty database, place all eight seeded boxes and end with every audited source repair in place. It no longer writes or checks the fixture: `scripts/history-full-reader-generate.mjs`, which did, is gone.

## Known reader defect the lane steps around

Under the Reduce motion setting (`data-reduce-motion="1"`), when the chapter opener changes height after the figure triggers exist, the pane's triggers keep their old positions until the next window resize: every figure then appears and leaves early or late by the height difference. `ChapterOpener` does re-measure, but in the same tick it publishes `--opener-h`, and the reduce-motion rule gives every property a 0.01 ms transition, so the text has not moved yet when ScrollTrigger measures. With the attribute off the re-measure is correct.

The lane used to add its classic scrollbar after the page loaded. With the published contents list that narrows the page enough to rewrap the opener by one line, which set this off and failed the Broca figure's timing by 24 px. The browser script now installs the scrollbar before first layout, as a real classic scrollbar is. The defect itself is unfixed and has no test.
