# Reviewer feedback: how notes reach us

OPENBRAIN-203 (database, dashboard, pull) and OPENBRAIN-204 (the widget, pointing, locate). While the book is in review, every chapter page carries a feedback widget. Authors and designers (Stuart, Arjun, Maura, Sonia, Karen) leave a note on the exact place it is about; the note lands in Supabase; a creator picks it up in the dashboard or with `npm run feedback:pull`, and the reviewer sees its status and reply under "My notes". While the site is in review, reviewers also see each other's notes and can reply to them, so Stuart can agree or disagree with Sonia's and Maura's notes in one place (Anton, 18 Nov).

Not to be confused with `public.feedback` (OPENBRAIN-101): signed-in students' messages, still shown under Feedback → Reader messages.

## The table: `public.review_feedback`

Migration `supabase/migrations/20261118150000_review_feedback.sql`, tested in PGlite by `src/__tests__/reviewFeedback.sql.test.js` (CI: `history-fixture-browser.yml`).

| Column                                        | What                                                                                                      |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `chapter_slug`, `section_slug`                | where; slugs, not ids, so they survive re-seeds                                                           |
| `parent_id`                                   | a reply to another note in the same chapter (`on delete cascade`); replies are `type` `note`, anchor `{}` |
| `paragraph_id`                                | the paragraph, no foreign key (migrations rewrite paragraphs)                                             |
| `type`                                        | `content` `figure` `widget` `design` `bug` `note`                                                         |
| `note`, `quote`, `suggested_text`             | a note, or the quoted text and its replacement (≤ 4000 / 2000 / 4000)                                     |
| `anchor`                                      | the point-at record (below), ≤ 16 KB                                                                      |
| `reviewer_name`, `reviewer_role`              | from the widget's name screen; role `author` `designer` `reviewer` `other`                                |
| `user_id`                                     | `auth.uid()` when the reviewer happened to be signed in, else null                                        |
| `url`, `viewport`, `user_agent`, `client_id`  | context; `client_id` is the browser queue's id (unique, makes retries idempotent)                         |
| `status`, `reply`, `replied_at`, `updated_at` | `new` `doing` `question` `done` `wont_do`; a trigger keeps `updated_at` and `replied_at`                  |
| `ip_hash`                                     | sha256 of the sender's first `x-forwarded-for` address, for the rate limit; granted to nobody             |

Access:

- **Nobody inserts or reads the table directly.** `anon` has no grants; `authenticated` has `select` (every column but `ip_hash`), `update (status, reply)` and `delete`, and RLS limits all three to `public.is_creator()`. A creator cannot rewrite a reviewer's words.
- `submit_review_feedback(p jsonb) → { id, status }` (SECURITY DEFINER, anon + authenticated). Trims every text field and cuts it to its cap; requires `note`, or `quote` and `suggested_text`; a known `client_id` returns the stored row unchanged. An optional `parent_id` makes the note a reply: it must be an existing note with the same `chapter_slug`, otherwise `review_invalid` (`detail`: `parent_id`, or `parent_id must be a note in the same chapter`). Errors: `review_invalid` (SQLSTATE 22023, HTTP 400; `detail` names the field: treat as permanent, don't retry) and `review_rate_limited` (SQLSTATE `PT429`, HTTP 429: retry later). Limits: 120 notes per address per hour, 2000 per hour overall.
- `list_review_feedback(p_chapter text, p_since timestamptz default null) → setof jsonb` (SECURITY DEFINER, stable, anon + authenticated). Every note and reply on the chapter, newest first (`created_at desc`), at most 1000. With `p_since`, only rows whose `updated_at` is later (new rows, and notes whose status or reply changed). Each element: `id, parent_id, created_at, updated_at, chapter_slug, section_slug, paragraph_id, type, note, quote, suggested_text, anchor, reviewer_name, reviewer_role, status, reply, replied_at`. Never the url, user agent, user id or address hash. Everyone can read these while the site is in review: revoke the grant (or drop the function) when review ends.
- `review_feedback_status(p_ids uuid[]) → (id, status, reply, replied_at, updated_at)` (SECURITY DEFINER, stable, so GET works). Answers the first 200 ids; unknown ids are absent. The ids are random uuids, so knowing one is the right to its status.

## The anchor

Built by the widget (`src/helper/reviewAnchor.js`, OPENBRAIN-204); the dashboard shows `label`, the pull script copies it, `npm run feedback:locate` replays it.

```
{ v: 1, kind, label,                       // kind: paragraph | heading | figure-pane | rail-figure | rail-part |
                                           //       widget | box | opener | toc | chrome | references | element
  paragraphId, sectionSlug, subsectionId, boxSlug,
  figureKey, figureNumber, figureTitle, widgetId, timelineId,
  railPart: { index, count, title }, plateIndex,
  textExcerpt, point: { x, y },            // point: 0–1 within the anchor's box
  selector, scrollY, docHeight, viewport: { w, h, dpr }, layout: 'two-column' | 'one-column',
  paneFigureKey, theme, reduceMotion }
```

## Picking notes up

**Dashboard.** `/dashboard?section=feedback&view=review` (Feedback → Review notes). Notes are grouped chapter → section in reading order, newest first; filters for chapter, type and status (default: open, i.e. new, doing and question). Each note shows its place (the anchor's label), the viewport and layout it was left from, the quote and suggestion, the replies other reviewers left under it (oldest first; filters apply to notes, and a reply follows its note), and "Open in chapter" (`/chapter/<n>/<slug>#<paragraph id or section slug>`, which lands through `readerJump`). Change the status and/or write a reply, then Save: one PATCH per press. The reviewer sees both the next time they open "My notes".

**Terminal.** `npm run feedback:pull` (read-only) prints a markdown tracker table of the new and doing notes, each followed by its replies (rows numbered `1↳`):

```bash
REVIEW_PULL_TOKEN=<creator access token> npm run feedback:pull -- --out /tmp/notes.json
npm run feedback:pull -- --open --chapter the-retina        # new, doing, question
npm run feedback:pull -- --all --base http://localhost:4173 # every status, local links
```

- `REVIEW_PULL_TOKEN` is a creator's access token: sign in to the dashboard, then in the console `JSON.parse(localStorage["sb-ocenwbkdzmxhsvwlornp-auth-token"]).access_token`. It lasts about an hour. The script only sends GETs with it.
- Without a token it falls back to `psql "$SUPABASE_DB_URL"` inside `BEGIN READ ONLY … ROLLBACK` with `default_transaction_read_only=on`.
- `--out` writes `{ pulledAt, source, statuses, chapter, base, notes: [{ …row, label, link }] }`; hand one note's `anchor` to `npm run feedback:locate` to see the place.
- Neither the token nor the database URL is ever printed.

## Before it works in production

The migration has to be pushed (`supabase db push`, see `docs/production-sql.md`). Until then the widget's submit fails and notes stay queued in the reviewer's browser (by design), the dashboard's Review notes view says "Database update needed", and the pull script says the table is missing.
