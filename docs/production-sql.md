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

## Pending

Committed, not yet pushed. `supabase migration list` is the authority: any other local-only row it shows is pending too.

Nothing: `supabase migration list` shows local and remote in step as of 2026-10-27.

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
