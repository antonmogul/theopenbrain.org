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

`migration repair` only writes rows to `supabase_migrations.schema_migrations`; it executes nothing from the files. Marking a file applied means it will never run, so only do it for a migration you have verified is live. When unsure and the file is idempotent, leave it pending and let `db push` run it: that is how the reading-progress migration turned out to have been missing all along.

## Fallback: the dashboard SQL editor

`https://supabase.com/dashboard/project/ocenwbkdzmxhsvwlornp/sql/new`. If you paste a migration there, also run `supabase migration repair --status applied <version>` afterwards or the next `db push` will try to apply it again. When copying a large file from a terminal use `LC_ALL=en_US.UTF-8 pbcopy < file.sql`: plain `pbcopy` in a non-interactive shell runs in the C locale and turned curly quotes into mojibake in nine Chapter 1 rows on 2026-09-03. Check the pasted text for `‚Ä` before running.
