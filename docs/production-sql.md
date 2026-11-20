# Production SQL: how migrations reach the database

Migrations in `supabase/migrations/` are **not** applied by CI or by the Railway deploy. Merging a PR deploys the code; the SQL waits until someone pushes it. Since 2026-09-17 that push is one command, because the Supabase CLI is linked to the project.

Project ref: `ocenwbkdzmxhsvwlornp` ("The Open Brain V2").

## The workflow

```bash
supabase migration list        # local vs remote, read-only
supabase db push --dry-run     # what would be applied, read-only
supabase db push               # apply
```

- The CLI authenticates with your `supabase login` session and a temporary login role; no database password is needed. `supabase/.temp/` (the link) is git-ignored, so a fresh clone runs `supabase link --project-ref ocenwbkdzmxhsvwlornp` once.
- `db push` runs each file, and records its version, in one transaction. A file that errors is rolled back and nothing after it is applied. Do not add your own `BEGIN`/`COMMIT` to new migrations: an inner `COMMIT` separates the migration from its history row.
- If a pending file is older than the newest applied one, the CLI refuses until you add `--include-all`.
- Write migrations to be idempotent (`if not exists`, `create or replace`, `drop … if exists`, guarded updates). It is what made the September catch-up safe.
- After any Chapter 1 text write, run `npm run parity:chapter1`.

To move this into CI later: run `supabase db push` in the workflow behind a `SUPABASE_ACCESS_TOKEN` repository secret.

## State on 2026-09-17

`supabase migration list` shows all 28 local files in sync with the remote history.

| Migration                                                 | How it got there                                                                                             |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `20250101…` to `20260605000001` (15 files)                | already in the remote history                                                                                |
| `20260711000000_seed_chapter1_anim_states`                | pasted by hand earlier; verified live (93 states, 10 variants), then `migration repair --status applied`     |
| `20260711000001_seed_chapter1_scroll_triggers`            | read-only as committed; its UPDATE was run by hand (2 `scroll` paragraphs live); repaired                    |
| `20260729000000_animation_child_tables_read_policy`       | pasted by hand; verified (anon reads both child tables); repaired                                            |
| `20260828000000_remove_temporary_visual_perception_ux`    | pasted by hand; verified (module gone); repaired                                                             |
| `20260903000000_repair_chapter1_subsubsection_paragraphs` | pasted by hand; verified (`parity:chapter1` OK); repaired                                                    |
| `20260903000100_seed_chapter_attention_draft`             | pasted by hand; verified (module exists, 9 sections); repaired                                               |
| `20260828010000_harden_reading_progress_identity`         | **pushed 2026-09-17.** Had never been applied (its `DROP TRIGGER IF EXISTS` found nothing)                   |
| `20260903000200_profiles_on_signup`                       | **pushed 2026-09-17.** Trigger installed; 0 auth users were missing a profile                                |
| `20260911000000_modules_add_ramp`                         | **pushed 2026-09-17.** `fund` / `perc` / `lear` set on the three modules                                     |
| `20260911000100_modules_add_cover`                        | **pushed 2026-09-17.** `cover_image_url` is NULL everywhere; the reader falls back to `chapterCover.js`      |
| `20260911000200_modules_add_authors`                      | **pushed 2026-09-17.** Retina and Attention have authors; Foundations is NULL (falls back to the code map)   |
| `20260911000300_strip_markdown_bold`                      | **pushed 2026-09-17.** Two Foundations paragraphs had stray `**`; now 0, all 382 `content` values still JSON |
| `20260917000000_reorder_chapters_history_first`           | **pushed 2026-09-17.** Foundations 1, Retina 2, Attention 3 (still `draft`)                                  |

## State on 2026-10-20

`supabase migration list` shows every local file up to `20261013000000` applied; only `20261013010000` is local-only (see Pending). Anton pushed the rows below between 7 and 13 Oct; each was verified read-only on 2026-10-20 with the publishable key (REST, `curl -H "apikey: $KEY"`) unless noted.

| Migration                                                  | How it got there, and what was checked                                                                                                                                                                                                                                 |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260923…` to `20261005010000` (25 files)                 | pushed with `db push` on their day; in the remote history                                                                                                                                                                                                              |
| `20261007000000_trending_highlights_sync` (OPENBRAIN-128)  | **pushed.** `rpc/trending_sharing_ready` answers `42501 permission denied` to `anon` (the probe is signed-in only, as designed), so the "Share with readers" switch is live for readers. The highlight rows themselves can't be checked without a session.             |
| `20261007010000_decks` (OPENBRAIN-129)                     | **pushed.** `decks?select=id` → `42501 permission denied for table decks`; `rpc/get_shared_deck?p_token=000…` → `null`; `rpc/get_pinned_deck` returns a deck with 9 slides, no `notes` on any slide and `slug` null (the creator-only fields are stripped for `anon`). |
| `20261007010100_seed_funding_deck` (OPENBRAIN-129)         | **pushed.** `rpc/get_pinned_deck` is "The Open Brain — Funding deck"; `/deck` on production renders it with `data-deck-source="db"`; Dashboard → Decks lists it as published (1 deck, 1 published, 0 drafts) on 2026-10-20.                                            |
| `20261007010200_chapter_media_no_listing` (OPENBRAIN-129)  | **pushed.** `POST storage/v1/object/list/chapter-media` with `{"prefix":"decks/"}` and the publishable key → `[]`.                                                                                                                                                     |
| `20261009000000_history_stuart_images` (OPENBRAIN-134)     | **pushed.** `animations` has `animationFoundationsIntroWoodcut` (1 image), `…LocalizationPortraits` (4), `…MilnerHM` (5), `…ClosingHM` (1), all with artwork URLs.                                                                                                     |
| `20261009010000_history_loewi_widget` (OPENBRAIN-134)      | **pushed.** `widget_uploads` has `loewi-vagusstoff`, published, updated 2026-10-09 (7 published uploads in all: the six Attention ones and Loewi).                                                                                                                     |
| `20261011000000_history_manuscript_videos` (OPENBRAIN-136) | **pushed.** `animationFoundationsNgfLeviMontalcini` (1 image + video) and `animationFoundationsFig19` (3 entries) exist; the Milner/H.M. gallery has 5 entries (the YouTube loop among them).                                                                          |
| `20261013000000_history_stuart_13_oct` (OPENBRAIN-138)     | **pushed.** The portrait gallery hangs on do-different-parts ¶5 (after the Descartes box); `?v=2` on the re-cut Fig 1 / Fig 16 / H.M. brain URLs; Phrenology and Penfield cards carry the "Explore phrenology" / "Be Penfield" headings on production.                 |

`migration repair` only writes rows to `supabase_migrations.schema_migrations`; it executes nothing from the files. Marking a file applied means it will never run, so only do it for a migration you have verified is live. When unsure and the file is idempotent, leave it pending and let `db push` run it: that is how the reading-progress migration turned out to have been missing all along.

## Pushed 2026-10-21 (before the Retina+History demo)

One `supabase db push` on the morning of 2026-10-21 applied these in order; every file raised its expected NOTICE lines. Checked afterwards over REST with the publishable key: 21 published `widget_uploads` (14 `retina-*`, Loewi, six Attention), the Retina's first section titled "Story of the eye", seven History box sections (humoral theory folded into the Hippocrates box) and History's first paragraph ending at "understanding of the brain."; the production smoke passed on the deployed `main`.

| Migration                                                          | How it got there  |
| ------------------------------------------------------------------ | ----------------- |
| `20261013010000_history_loewi_beside_text` (OPENBRAIN-140)         | pushed 2026-10-21 |
| `20261020230000_widget_uploads_4mb` (OPENBRAIN-141)                | pushed 2026-10-21 |
| `20261021000000_retina_stuart_widgets` (OPENBRAIN-141)             | pushed 2026-10-21 |
| `20261021010000_history_breakout_boxes` (OPENBRAIN-142)            | pushed 2026-10-21 |
| `20261021020000_history_figures_round3` (OPENBRAIN-143)            | pushed 2026-10-21 |
| `20261021030000_history_loewi_widget_fit` (OPENBRAIN-148)          | pushed 2026-10-21 |
| `20261021040000_editor_test_artefacts` (OPENBRAIN-148)             | pushed 2026-10-21 |
| `20261021050000_retina_placeholder_section_figure` (OPENBRAIN-148) | pushed 2026-10-21 |

## Pushed 2026-10-29 (before the Stuart admin demo)

| Migration                                               | How it got there, and what was checked                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20261028000000_sections_box_treatment` (OPENBRAIN-157) | **pushed.** Additive DDL only: a nullable `sections.box_treatment`, CHECK-constrained to `pale`, `dark`, `plate` or `chapter`. The drop-if-exists raised its expected NOTICE. Checked over REST with the publishable key: all seven History boxes come back with `box_treatment` null, so every box still resolves through the code map in `helper/breakoutTreatment.js` and the reader is unchanged until a creator picks a colour. The editor's Colour select is now live. |

## Pushed 2026-11-10 (the Penfield binder)

| Migration                                                                                           | How it got there, and what was checked                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20261110000000_history_penfield_binder` (OPENBRAIN-168, carrying the motion pass of OPENBRAIN-169) | **pushed** with `supabase db push`, after the code that reads `fullScreen` from a block was live (PR #162). Content only. Before: the two History paragraphs that hold widget blocks were saved to `~/Documents/openbrain-backups/2026-11-10-pre-penfield-binder/`. After, over REST with the publishable key: the upload `history-penfield-binder` is published and byte-identical to `src/widgets/uploads/history-penfield-binder.html`; the Penfield block is `upload:history-penfield-binder` with `fullScreen: true`, its `placementId` kept and its `route` gone; the phrenology block gained `fullScreen: true`. In a browser on the live chapter at 1440 and 390 px: one binder, no old cabinet, no errors. The History fixture was re-exported the same day (OPENBRAIN-172). To go back, the file's header has the one update. |

## Pushed 2026-11-11 (Anton's walk-through of the History chapter)

Two pushes with `supabase db push`, each after the deploy it depends on was serving. Content only: no DDL, RLS or grants. Before the first, the rows about to change were saved over REST to `~/Documents/openbrain-backups/2026-11-11-pre-openbrain-180/` (the two `animations` rows, where-is-my-mind ¶7, and both History `widget_uploads` rows with their HTML).

| Migration                                                   | How it got there, and what was checked                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20261111180000_history_cutout_figures` (OPENBRAIN-180)     | **pushed** once production served the three new files as `image/webp`. The push's notices: Fig 1 (1 row), Fig 3 (1 row), Plato and Aristotle on where-is-my-mind/7 (1 paragraph). Over REST: `animationFoundationsFig1` → `fig01-skull-cutout.webp` (figureNumber 1 kept), `…Fig3` → `fig03-papyrus-cutout.webp`, `…PlatoAristotle` exists with no figureNumber; ¶7 has it with trigger `auto`, ¶6 and ¶8 have none. On the live chapter the three images load in the figure pane. |
| `20261111180100_history_loewi_v3` (OPENBRAIN-180)           | **pushed** in the same run. Its guard passed, so the row still held the 20261022030000 payload. Over REST the row's HTML equals `src/widgets/uploads/loewi-vagusstoff.html` byte for byte (1,895,041 bytes), still `published`, author and title unchanged. On the live chapter the frame runs Maura's file at the pane's height (`data-ob-fit`).                                                                                                                                  |
| `20261111180200_history_penfield_binder_v2` (OPENBRAIN-178) | **pushed** after PR #170's deploy was serving (the widget kit's `SKILL.md` on production names `data-ob-fullscreen`). Over REST the row's HTML equals `src/widgets/uploads/history-penfield-binder.html` (770,433 bytes, sha256 `f12f433d…`), still `published`.                                                                                                                                                                                                                   |

The History fixture was re-exported the same day (`npm run history:fixture:export`): before it, `history:fixture:drift` showed exactly the four expected differences (¶7's figure link, the new figure, Fig 1 and Fig 3).

## Pushed 2026-11-12 and 2026-11-17 (Stuart's 12, 13 and 14 Nov feedback)

Each with `supabase db push` after a dry run, content only (no DDL, RLS or grants), the affected rows saved over REST first to `~/Documents/openbrain-backups/2026-11-12-pre-openbrain-191/`, `…-190/`, `2026-11-17-pre-openbrain-193/` (all 81 History paragraphs, 40 History animations, 121 references), `…-196/` and `…-197/`, and checked over REST afterwards.

| Migration                                                   | How it got there, and what was checked                                                                                                                                                                                  |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20261112190000_history_penfield_binder_v3` (OPENBRAIN-191) | **pushed** 12 Nov. The row's HTML equals the v3 file (770,761 bytes), cases in numerical order.                                                                                                                         |
| `20261112193000_history_loewi_kicker` (OPENBRAIN-190)       | **pushed** 12 Nov. `config.kicker` = "Otto’s dream experiment"; credit and widgetId kept.                                                                                                                               |
| `20261117193000_history_reference_fixes` (OPENBRAIN-193)    | **pushed** 17 Nov. Notices: references 98 and 111 and their two list items, one row each.                                                                                                                               |
| `20261117193100_history_figure_numbering` (OPENBRAIN-193)   | **pushed** 17 Nov. Notices: 38 of 38 figures, 28 of 28 paragraphs' citations, both Penfield captions, "Figures H and I" in 2 of 2 paragraphs. Over REST the woodcut is 1, the skull 2, Plato and Aristotle 6, Loewi 24. |
| `20261117196000_history_penfield_binder_v4` (OPENBRAIN-196) | **pushed** 17 Nov. The row's HTML equals the v4 file (1,318,647 bytes), still `published`.                                                                                                                              |
| `20261117197000_author_links` (OPENBRAIN-197)               | **pushed** 17 Nov. History and Retina authors carry their lab URLs; Erik Cook added to Attention (a draft) with an affiliation inferred from his page, to confirm with Stuart.                                          |

`history:fixture:drift` reports 0 after these pushes.

## Pushed 2026-11-17, afternoon (Stuart's 17 Nov feedback, OPENBRAIN-200)

Stuart's two emails of 17 Nov ("Re: More feedback", 14:04 and 14:17 GMT), six items:

| #   | Item                                                                                                                           | Where it lives                                                                                        | State                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1   | The NGF ("The developing brain") side-scroll opened on text with an empty right side: put the Rita Levi-Montalcini video there | `20261117200000_history_ngf_video_first` (below)                                                      | live                                                               |
| 2   | Redo the Loewi audio with "the new AI voice Maura added"                                                                       | —                                                                                                     | done 18 Nov with Maura's rendered narration (OPENBRAIN-201, below) |
| 3   | Remove Further reading                                                                                                         | `20261117200100_history_remove_further_reading` (below)                                               | live                                                               |
| 4   | Authors under the contents, above "Introduction"                                                                               | `TextComp.vue`                                                                                        | live with the PR's deploy                                          |
| 5   | Funding line and The Neuro's logo, linked, under the authors                                                                   | `helper/chapterCredits.js`, `ChapterFunding.vue`, `public/publicAssets/images/funders/the-neuro.webp` | live with the PR's deploy                                          |
| 6   | Acknowledgements above References                                                                                              | `helper/chapterCredits.js`, `ChapterAcknowledgements.vue`                                             | live with the PR's deploy                                          |

Both migrations with `supabase db push` after a dry run (only these two pending), content only, the box's and Further reading's rows saved over REST first to `~/Documents/openbrain-backups/2026-11-17-pre-openbrain-200/`.

| Migration                                                       | How it got there, and what was checked                                                                                                                                                                 |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `20261117200000_history_ngf_video_first` (OPENBRAIN-200)        | **pushed** 17 Nov. Notice: moved (1 row). Over REST box-ngf ¶1 has the video (trigger `auto`), ¶2 none, ¶3 the portraits. The track's first part is the video, then ¶1 and ¶2.                         |
| `20261117200100_history_remove_further_reading` (OPENBRAIN-200) | **pushed** 17 Nov. Notices: 0 saved reading places moved, 1 paragraph and 1 section deleted (no reader highlight or note was on it, or it would have stopped). Over REST no `further-reading` section. |

The History fixture still holds Further reading and the video on ¶2 until it is re-exported (`npm run history:fixture:export`, its own PR).

## Pushed 2026-11-18: Maura's Loewi narration and Plato and Aristotle loop (OPENBRAIN-201)

Maura's two emails in "Re: More feedback": 17 Nov 21:06 GMT (`Loewi_Vagusstoff_Nov17.zip`: `index.html` with the narration embedded, `narration.mp3`, `timeline.json`) and 18 Nov 02:11 GMT (the Plato and Aristotle animation on Dropbox, plus embedded images, video thumbnails and two notes on the Loewi widget).

| #   | Item                                                                                                                     | Where it lives                                                                                                                                     | State                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1   | Loewi: the whole narration in Maura's new AI voice (Stuart's 17 Nov item 2), her timing, player and Vagusstoff animation | `src/widgets/uploads/loewi-vagusstoff.html` (v4: her file plus the book's comment and block), `20261118090000_history_loewi_v4`                    | live                                                                         |
| 2   | Loewi: remove the hover tooltip "0:50 · Collecting" over the timeline (Maura, 18 Nov)                                    | the same file's "Open Brain book" block (`.tip{display:none!important}`)                                                                           | live                                                                         |
| 3   | Plato and Aristotle (Fig 6) as Maura's short loop, in the still's place                                                  | `public/publicAssets/video/foundations/plato-aristotle-loop.{webm,mp4,webp}`, `FigureImages` `loop`, `20261118090100_history_plato_aristotle_loop` | live                                                                         |
| 4   | Embedded images with more breathing room (same file names), video thumbnails, the play icon's corners                    | —                                                                                                                                                  | not in this round: asked about in the reply; thumbnails need Stuart's choice |
| 5   | Author images                                                                                                            | —                                                                                                                                                  | Maura to go over sketches at the 19 Nov meeting                              |

The Loewi file: Maura's export byte for byte (3,058,906 bytes; its `track` is her `narration.mp3`, 1,592,470 bytes, 159.2 s; the captions' `total` 157.2 s), with the header comment and one block before the figure: the `--ob-*` tokens, the pane's height (`html[data-ob-fit]`), content height inline on a phone (the scene at the artwork's 720 × 853, since her phone layout sizes itself to `100dvh`), no spinner under reduced motion, and no tooltip. The video: Maura's 1440 × 1920 H.264 at 23 Mb/s (4.8 MB, 50 frames, no sound) encoded by `scripts/figures/encode-figure-loop.sh` at 960 × 1280: WebM 195 KB, MP4 232 KB, poster 156 KB (the old still was 316 KB). It plays muted, looping, inline, without controls; under reduced motion the poster is the still.

Pushed with `supabase db push` after PR #195's deploy was serving the three files (`video/webm`, `video/mp4`, `image/webp`) and the reader chunk with `figimg-loop`, after a dry run (only these two pending), content only, both rows saved over REST first to `~/Documents/openbrain-backups/2026-11-18-pre-openbrain-201/`.

| Migration                                                     | How it got there, and what was checked                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20261118090000_history_loewi_v4` (OPENBRAIN-201)             | **pushed** 18 Nov. Its guard passed (the row held v3, md5 `8395a6ea…`). Over REST the row's HTML equals `src/widgets/uploads/loewi-vagusstoff.html` byte for byte (3,061,838 bytes, sha256 `b02ce177…`), still `published`, title and author unchanged. On production at 1440 (pane, 720 × 764) and 390 (full-screen band, 390 × 742) it plays her narration with the audio within 0.04 s of the captions' clock, the transport inside the frame, no tooltip. |
| `20261118090100_history_plato_aristotle_loop` (OPENBRAIN-201) | **pushed** 18 Nov. Notice: 1 row. Over REST the figure's first image is the poster with `loop` (webm, mp4, 960 × 1280); legend, alt and figureNumber 6 kept. On production it loops muted in the pane at 1440 and inline at 390 (no horizontal scroll, no console errors).                                                                                                                                                                                    |

`history:fixture:drift` after the push shows only the four 17 Nov differences noted above (Further reading, the NGF video): this PR's fixture edits match the published rows.

## Pushed 2026-11-18: Stuart's 18 Nov notes (OPENBRAIN-202)

Rows backed up over REST first to `~/Documents/openbrain-backups/2026-11-18-pre-openbrain-202/`; dry run listed only these two; pushed after PR #197 merged.

| Migration                                   | How it got there, and what was checked                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20261118120000_history_stuart_18nov`       | **pushed** 18 Nov. Over REST: the five titles changed, Descartes' images carry D and E, no `credit` left on History or Retina widget blocks or Retina pane widgets, Loewi "After Loewi (1921), Figure 1". On production at 1440: plates read FIG D / FIG E, no widget credits, pane labels 01–06 in order (trepanation Fig 03, papyrus Fig 05), no eye beside the authors, no console errors. |
| `20261118120100_history_penfield_binder_v5` | **pushed** 18 Nov. Over REST the row's HTML equals `src/widgets/uploads/history-penfield-binder.html`.                                                                                                                                                                                                                                                                                        |

## Pushed 2026-11-18: Maura's reworked images (OPENBRAIN-205)

Pushed after PR #200's deploy served all twelve `-v2.webp` files (200, `image/webp`); figure records backed up over REST to `~/Documents/openbrain-backups/2026-11-18-pre-openbrain-205/`.

| Migration                                      | How it got there, and what was checked                                                                                                    |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `20261118140000_history_maura_images`          | **pushed** 18 Nov. Notice: 11 figure records, 1 paragraph. On production at 1440 and 390 every new file loads, no 404s or console errors. |
| `20261118140100_history_maura_images_file_url` | The same paths in `animations.image_file_url` (Figs 2, 11, 12, 15), which the chapter editor reads. Pushed with this PR's merge.          |

## Pushed 2026-11-18 evening: reviewer notes, video thumbnails, reader feedback categories

| Migration                                                  | How it got there, and what was checked                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20261119440000_history_video_thumbnails` (OPENBRAIN-44)   | **pushed** after PR #204's deploy served the three WebPs (200). Rows backed up to `~/Documents/openbrain-backups/2026-11-18-pre-openbrain-44/`. Over REST: Rita, Brenda and Andrew Huxley items carry the new `src` and `posterPlay: "corner"`. Stuart still to confirm the picks.       |
| `20261118150000_review_feedback` (OPENBRAIN-203)           | **pushed** with `--include-all` (its version is older than 44's, which was already applied). Read-only checks: `rpc/review_feedback_status?p_ids={}` → `[]`; `rpc/list_review_feedback?p_chapter=the-retina` → `[]`; `review_feedback?select=id` with the publishable key → 401 `42501`. |
| `20261119450000_reader_feedback_categories` (OPENBRAIN-45) | **pushed**; its guard found the original four-value check and widened it to add `usability`, `design`, `other`.                                                                                                                                                                          |

## Pushed 2026-11-19: review notes round 1 (OPENBRAIN-48, 49, 50, 51, 52)

PRs #211–#215 fixed 31 of the 32 notes left with the review widget on 19 Nov. Rows backed up to `~/Documents/openbrain-backups/2026-11-19-pre-openbrain-{48,50,51}/` before each push. `20261119480000`/`480100` needed `--include-all` (older than 500000/510000, which were applied first).

| Migration                                    | What it did                                                                                                                                                                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20261119500000_retina_text_review`          | Retina citations as History's markup (382 markers), three planning fragments deleted, Counting photons as prose with its chart, the colour-opponency instruction as caption. 200 paragraphs after.                                                |
| `20261119510000_retina_figure_notes`         | Retina figure holds, cross-section stages, Eye Movements legend.                                                                                                                                                                                  |
| `20261119480000_history_review_introduction` | Introduction ¶1–2 merged with Stuart's wording.                                                                                                                                                                                                   |
| `20261119480100_history_penfield_binder_v6`  | Binder close controls show only the ×.                                                                                                                                                                                                            |
| `20261119530000_review_notes_round1`         | 27 notes `done`, 3 `question` (Tom Baden video, signal-amplification image, the missing animation at "Generation and wiring"), Anton's test note `wont_do`, each with the reply the reviewer sees. Guarded on `status = 'new' and reply is null`. |

## Pending

| Migration                              | Scope and release order                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20261120066000_retina_figures_db`     | **Pending (OPENBRAIN-60).** Six explicit empty flip-state lists; three section figures moved to opening paragraphs (including the horizontal-cell alias FK); 18 named triggers normalised. Apply after deployment per the cleanup brief; compatible with both reader versions (the new loader lowers old section placements before SQL). Key-guarded, idempotent; no review-note writes. |
| `20261119540100_retina_stuart_answers` | **Pending (OPENBRAIN-54).** Counting photons legend and hold, Baden video slug after Blind spot, retinal-development silent loop placement. Deploy the reader and `/publicAssets/videos/` media before applying. Idempotent; guards only the changed placement/caption keys. No review-note writes.                                                                                      |

The Retina contents note (be3ef6b0) is tracked separately.

> The line above said "Nothing" from 21 Oct while the three 22 Oct migrations below
> sat unapplied for six days — merged in code, missing in the database. The ledger is
> only true if someone writes to it after a push. Trust `supabase migration list`.

## Pushed 2026-10-27

One `supabase db push` applied these three, which had been committed on 22 Oct with
"no live application by this PR" headers (PRs #146/#148/#149, Stuart's follow-ups).
All content only: zero DDL, zero RLS, zero grants — five data statements between them.
Backed up first to `~/ob-backups/pre-push-20261027-224515/` (the `loewi-vagusstoff`
row and the two `animations` rows the migrations overwrite; Colima was down, so this
was a targeted REST capture rather than a `db dump`).

| Migration                                                  | How it got there, and what was checked                                                                                                                                                                                                   |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20261022010000_g2_figure_media_followups` (OPENBRAIN-148) | **pushed.** `animationFoundationsFig19` and `…Fig21` both carry `updated_at` 2026-10-27T22:45:37Z.                                                                                                                                       |
| `20261022020000_penfield_experience_title` (OPENBRAIN-148) | **pushed.** Presentation copy only; the predicate makes a rerun a true no-op.                                                                                                                                                            |
| `20261022030000_g5_loewi_caption_layout` (OPENBRAIN-148)   | **pushed.** `widget_uploads.loewi-vagusstoff` still `published`, `updated_at` 2026-10-27T22:45:40Z (was 2026-10-21T08:13Z). Its guard fails closed on unexpected content, so the push also proves the row matched the expected baseline. |

**Done after the October push (OPENBRAIN-148, 2026-10-20):** the temporary `get_pinned_deck` entry is out of `IGNORED_ERRORS` in `scripts/smoke.mjs`, and the four 7 Oct rows are in the ledger above with how each was verified. Still open: a smoke route for `/deck/s/00000000000000000000000000000000` that expects the "isn't available" text and no console errors (the function answers `null` with a 200).

## Fallback: the dashboard SQL editor

`https://supabase.com/dashboard/project/ocenwbkdzmxhsvwlornp/sql/new`. If you paste a migration there, also run `supabase migration repair --status applied <version>` afterwards or the next `db push` will try to apply it again. When copying a large file from a terminal use `LC_ALL=en_US.UTF-8 pbcopy < file.sql`: plain `pbcopy` in a non-interactive shell runs in the C locale and turned curly quotes into mojibake in nine Chapter 1 rows on 2026-09-03. Check the pasted text for `‚Ä` before running.
