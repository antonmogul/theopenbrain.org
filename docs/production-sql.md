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

## Pending

Committed, not yet pushed. `supabase migration list` is the authority: any other local-only row it shows is pending too.

| Migration                                                 | What it does, and what the reader does until it is live                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20261007000000_trending_highlights_sync` (OPENBRAIN-128) | Makes shared highlights private to their owner and creators, recounts Trending as distinct readers, limits Trending to published chapters, and adds the probe the "Share with readers" switch waits for. Details below. Until it is pushed the switch stays hidden and Trending keeps its old insert-only counts.                                                                         |
| `20261007010000_decks` (OPENBRAIN-129)                    | Adds `decks` and `deck_revisions` (creators only), the public read functions `get_pinned_deck()` / `get_shared_deck(token)` and the editor's `publish_deck()` / `discard_deck_changes()` / `set_pinned_deck()`. Details below. Until it is pushed `/deck` shows the bundled October copy, `/deck/s/<token>` links don't exist, and Dashboard → Decks says "Decks need a database update". |
| `20261007010100_seed_funding_deck` (OPENBRAIN-129)        | Generated from `src/data/decks/funding.js` (`npm run deck:seed-sql`). Inserts the funding deck (slug `funding`) as published and shows it at `/deck`. Until it is pushed (with the table) `/deck` keeps the bundled copy.                                                                                                                                                                 |
| `20261007010200_chapter_media_no_listing` (OPENBRAIN-129) | Replaces the `chapter-media` bucket's "Anyone reads chapter media" SELECT policy with "Creators read chapter media". Public image URLs keep working; until it is pushed, the publishable key can list every folder and file in the bucket (draft chapters' and decks' uploads included).                                                                                                  |

### `20261007000000_trending_highlights_sync`

- **Highlight rows.** Drops every permissive SELECT policy on `highlights` except an owner one, which removes the initial-schema "Users can view public highlights" (it returned a shared row, with `user_id`, tags and the legacy note, to anyone). Owners keep their rows through "Users manage own highlights"; the new "Creators read shared highlights" lets creators read `is_public` rows only.
- **Reading Trending.** "Anyone reads trending highlights" (`USING (true)`) becomes "Read trending passages of published chapters": a row is visible when its paragraph's module is published, or to a creator.
- **The count.** Triggers on insert, update and delete recompute the affected passage: the number of distinct readers whose shared `selected_text`, whitespace-normalised, occurs in the paragraph's reader text (`trending_paragraph_text`, which mirrors `contentBlocksToHTML`) or in its `content_text`. The shown text is the normalised text most of those readers chose (a tie goes to the shortest, then byte order). The file then rebuilds the table, dropping drifted counts, one reader's duplicates, text that is not in its paragraph and the `seed_dashboard_data.sql` fixture rows. The helpers (`trending_squash`, `trending_paragraph_text`, `trending_text_in_paragraph`, `trending_refresh_passage`) are not callable over RPC.
- **The probe.** `public.trending_sharing_ready()` returns true, for signed-in readers only. The highlight toolbar asks it once per page load (`useTrendingSharing`) and shows "Share with readers" only on a true answer, so a frontend deployed before this push never offers sharing while the old policy stands. Readers see the switch from their next page load after the push. Supabase reloads the PostgREST schema cache on DDL; if the switch is still hidden, run `NOTIFY pgrst, 'reload schema';`.
- **Self-check.** The push fails, and changes nothing, if there is no owner policy on `highlights` (FOR ALL or FOR SELECT, `USING` `auth.uid() = user_id` either way round, the `(select auth.uid())` form included), if any other permissive SELECT or ALL policy there could expose rows (the error names it), if `trending_highlights` has any other policy, if the probe is callable by `anon` or not by `authenticated`, or if the table does not match the recount.
- **Before pushing,** look at what production has, since dashboard edits are not in the migrations:

  ```sql
  select tablename, policyname, cmd, permissive, roles, qual
    from pg_policies
   where schemaname = 'public' and tablename in ('highlights', 'trending_highlights');
  ```

### `20261007010000_decks`, `20261007010100_seed_funding_deck` and `20261007010200_chapter_media_no_listing`

**Push them with the timeline file, in one `supabase db push`.** The CLI applies them in version order: `20261007000000_trending_highlights_sync` → `20261007010000_decks` → `20261007010100_seed_funding_deck` → `20261007010200_chapter_media_no_listing`. Each file is its own transaction and a failure stops the push, so if the trending self-check fails, the deck files wait too. The seed needs the table: never paste it on its own.

```bash
supabase migration list
supabase db push --dry-run     # should list exactly these four
supabase db push
```

- **Tables.** `decks` holds one row per deck: `slides` (the working copy the editor autosaves), `published_slides` (the snapshot the public sees), `share_token`, `pinned` (at most one row, by a partial unique index) and `version` (the editor's compare-and-swap). The table checks only that `slides` is an array of at most 100 entries and 1 MB; layouts are validated in the app. `deck_revisions` gets a row per publish and has no update policy. Both tables are creators only (`public.is_creator()`), with no anon policy and no anon grant, so the publishable key cannot list decks.
- **Read functions.** `get_pinned_deck()` (for `/deck`) and `get_shared_deck(p_token)` (for `/deck/s/<token>`) are SECURITY DEFINER and executable by `anon` and `authenticated`. They are `stable`, so the app calls them with GET. Each returns the published snapshot without hidden slides and, unless the caller is a creator, without speaker notes and with `slug` null (a slug may name a funder), or `null` when there is no match. Their shared helper `deck_public_slides` is not callable over RPC.
- **Write functions.** `publish_deck(p_id, p_version)` (snapshot plus revision row in one transaction; raises `deck_conflict` when the version moved), `discard_deck_changes(p_id, p_version)` (copies the row's own published snapshot and title back into the working copy at version n+1, `published_version` with it; raises `deck_conflict` on a stale version or a deck never published) and `set_pinned_deck(p_id)` are SECURITY INVOKER, so RLS still applies, and refuse non-creators with `42501`. None is executable by `anon`. The editor's "off" switch for `/deck` does not call `set_pinned_deck(null)`: it PATCHes its own row's `pinned`, so it never unpins another deck.
- **Self-check.** The push fails, and changes nothing, if RLS is off on either table, a policy reaches `anon` or `public` or lacks `is_creator()`, `anon` can select either table, the read functions are not SECURITY DEFINER or not executable by `anon`, a write function is SECURITY DEFINER or executable by `anon`, or notes and hidden slides are not stripped.
- **The seed.** Inserts the deck `funding` ("The Open Brain — Funding deck", 9 slides) as published, with its first `deck_revisions` row, and pins it to `/deck` unless another deck already is. It is `on conflict (slug) do nothing`, so it never overwrites a deck edited in the dashboard. It is generated (`npm run deck:seed-sql`); see `docs/funding-deck.md`.
- **Storage.** Deck images go to the existing `chapter-media` bucket under `decks/<deck id>/` (the uuid, not the slug), which its write policies already cover. `20261007010200_chapter_media_no_listing` closes listing: the bucket's anon/authenticated SELECT policy only ever let the publishable key call `POST /storage/v1/object/list/chapter-media` and walk every folder (Supabase advisor lint 0025), since `/object/public/` downloads skip RLS. SELECT becomes creators only. Its self-check fails the push if the bucket isn't public, if a SELECT policy naming `chapter-media` reaches `anon`/`public` or lacks `is_creator()`, or if a SELECT policy naming no bucket reaches `anon`/`public`. Before pushing, look for dashboard-made policies:

  ```sql
  select policyname, cmd, roles, qual
    from pg_policies
   where schemaname = 'storage' and tablename = 'objects';
  ```

**Checks after the push:**

1. `supabase migration list` shows all four versions on both sides.
2. In the SQL editor:

   ```sql
   select slug, status, pinned, slide_count, version, published_version
     from public.decks;
   -- funding | published | true | 9 | 1 | 1
   select note from public.deck_revisions;
   -- one row: Seeded from src/data/decks/funding.js
   ```

3. With the publishable key only (what an anonymous visitor has):

   ```bash
   KEY=<VITE_SUPABASE_PUBLISHABLE_KEY>
   API=https://ocenwbkdzmxhsvwlornp.supabase.co/rest/v1
   curl -s "$API/rpc/get_pinned_deck" -H "apikey: $KEY" \
     | jq '.slides | length, (map(has("notes")) | any)'   # 9, false
   curl -s "$API/rpc/get_shared_deck?p_token=00000000000000000000000000000000" \
     -H "apikey: $KEY"                                    # null
   curl -s "$API/decks?select=id" -H "apikey: $KEY"       # permission denied, never rows
   curl -s "$API/rpc/get_pinned_deck" -H "apikey: $KEY" | jq '.slug'   # null
   curl -s -X POST "https://ocenwbkdzmxhsvwlornp.supabase.co/storage/v1/object/list/chapter-media" \
     -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
     -d '{"prefix":"decks/"}'                             # []
   ```

4. Open `/deck` on production (`https://theopenbrainorg-production.up.railway.app/deck`): `document.querySelector('.deck-view').dataset.deckSource` is `"db"` and the console has no `[deck]` warning. Signed in as a creator, Dashboard → Decks lists the funding deck with "Shown at /deck".
5. If a function still answers 404, reload the PostgREST schema cache: `NOTIFY pgrst, 'reload schema';`.

**Then, in a follow-up PR:**

- Remove the temporary `get_pinned_deck` entry from `IGNORED_ERRORS` in `scripts/smoke.mjs`. It covers the 404 the browser logs while the function is missing; once it exists, a 404 there is a real failure.
- Add a smoke route for `/deck/s/00000000000000000000000000000000` that expects the "isn't available" text and no console errors (the function answers `null` with a 200).
- Move the four rows out of Pending into this ledger, with how each was verified.

## Fallback: the dashboard SQL editor

`https://supabase.com/dashboard/project/ocenwbkdzmxhsvwlornp/sql/new`. If you paste a migration there, also run `supabase migration repair --status applied <version>` afterwards or the next `db push` will try to apply it again. When copying a large file from a terminal use `LC_ALL=en_US.UTF-8 pbcopy < file.sql`: plain `pbcopy` in a non-interactive shell runs in the C locale and turned curly quotes into mojibake in nine Chapter 1 rows on 2026-09-03. Check the pasted text for `‚Ä` before running.
