# History integration: database rollout

This integration includes two **content/data migrations**, not schema migrations.
They do not add tables, change RLS, grant permissions, or create credentials.
Their production-applied state is unknown. Committing or merging these files does
not run them: the application build does not apply Supabase migrations.

## Inventory and order

1. `20261005000000_history_source_content_repairs.sql`: updates up to 11 exact
   paragraph snapshots and two section titles; restores History reference 79;
   attaches three figures (Penfield operative image, Penfield map, Hippocrates
   bust); adds a missing Further reading section; and removes up to three exact
   importer fragments only when they have no inbound foreign-key dependencies.
2. `20261005010000_history_retina_reference_links.sql`: adds up to 23 verified
   reference links across History and Retina and repairs History reference 59's
   author/title split. History reference 79's link requires the first migration's
   restoration. Existing reference text and publication dates are retained.

Both files use the existing content schema and chapter slugs. The first requires
a single `foundations-of-neuroscience` module across content versions and aborts
if that slug is ambiguous. The second skips each chapter whose slug is ambiguous.
Resolve version selection explicitly before rollout; do not weaken these guards
to apply to every version.

## Before an authorized production rollout

- Confirm the target environment, current migration history, required tables and
  constraints, and pending migrations using approved read-only access. These
  files alone do not prove earlier migrations were applied. Do not blindly run
  every pending historical seed migration against authored content.
- Rehearse the two migrations in order on an isolated database with a recent,
  appropriately protected snapshot. Check chapter/version identity, affected
  rows, and existing author changes. Use the established migration operator role
  with complete visibility of inbound dependencies; a restricted application
  role is not an adequate rehearsal of deletion guards.
- Take a recoverable backup and retain before snapshots, row IDs, application
  version, migration history, and migration notices. Check that recovery is
  available before committing database changes.
- Deploy and verify the compatible application and its three figure assets
  before applying the first content migration. The application can be deployed
  with existing content; new database image paths must resolve when attached.
  Coordinate this with the separate application deployment approval.
- Pause competing authoring for the affected chapter during the reviewed rollout
  window. Use the migration runner's transaction boundaries; neither SQL file
  contains a separate `COMMIT`. Treat each migration as a separate rollout step.

Production application, deployment, and recovery mutations require separate
authorization. This PR does not authorize or perform those operations.

## Skips and verification

Updates require exact before snapshots; divergent author edits, existing links,
existing artwork, and authored Further reading are preserved. Fragments with
any inbound dependency are retained; unexpected composite foreign keys also
prevent deletion. No paragraph ordering compaction is performed.

Capture and reconcile every `NOTICE`. A successful migration-history entry may
include skipped rows and does **not** certify that all intended content changes
were applied. Classify skips as already applied, intentionally divergent, absent,
or blocked; prepare a separately reviewed follow-up for any necessary repair.
Do not force updates by removing snapshot predicates.

After application, compare expected and actual changes, check preserved author
content and dependent data, verify all figure paths, and exercise Further reading
and reference links in the reader. Record the resulting application and database
versions together.

## Recovery

An uncommitted migration can be rolled back by its caller transaction. After
commit, there is no automatic down migration. Use the retained backup and a
reviewed compensating migration that reverses only still-matching after
snapshots, preserving edits made since rollout. Undo the link migration before
the source repair, including links on reference 79. Restore reference 59's
metadata only after its complete expected post-link-reversal snapshot matches.

Restore deleted fragments with their original row IDs and complete saved values
only when their original section/order remains available. Detach newly attached
figures only when the paragraph still matches the recorded result. Remove newly
created animation or Further reading rows only if unchanged and unreferenced;
retain pre-existing rows. Reconcile migration history through the established
operator process rather than manually deleting history entries.

## Test coverage and limits

The committed SQL is checked against its generators. Isolated PGlite tests cover
exact-snapshot updates, repeat-run idempotency, divergent content and existing
links, missing chapters, ambiguous versions, inbound dependency protection, and
reference-migration transaction rollback. CI supplies PGlite explicitly through
`HISTORY_SQL_HARNESS`; local SQL suites skip when that variable is absent.

These tests use a minimal modeled schema. They do not establish production
applied state, hosted RLS behavior, real concurrent authoring behavior, or a
complete production backup/restore rehearsal. Those remain rollout gates.
