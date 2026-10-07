-- OPENBRAIN-129: slide decks edited in the creator dashboard.
--
-- A deck is one row. `slides` is the working copy: a JSON array of entries
-- { id, label, notes?, layout, props, hidden?, source? }, the shape
-- src/data/decks/*.js already uses. Creators edit it in Dashboard → Decks;
-- it autosaves and is never served to anyone else. publish_deck() copies it
-- into `published_slides` and appends a deck_revisions row in one transaction.
--
-- Only creators can read or write the tables (no anon policy, no anon grant),
-- so the publishable key in the page cannot list decks. The public reads a
-- published snapshot through two SECURITY DEFINER functions:
-- get_shared_deck(token) for /deck/s/<token>, get_pinned_deck() for /deck.
-- Both drop hidden slides and, unless the caller is a creator, speaker notes
-- and the deck's slug (a creator's name for it, which may name a funder).
--
-- The editor saves with a compare-and-swap on `version`
-- (PATCH decks?id=eq.<id>&version=eq.<n> setting n+1): zero rows back means
-- another tab or creator saved first. Discarding unpublished changes is
-- discard_deck_changes(), which copies the row's own snapshot back on the
-- server, so a tab that missed another tab's publish can't restore a stale
-- one. The table checks only that `slides` is
-- an array of at most 100 entries and 1 MB; layouts are validated in
-- src/data/decks/validate.js, so a new layout needs no migration.
--
-- Idempotent. No BEGIN/COMMIT: `supabase db push` runs the file in one
-- transaction. The last block fails the push if anything here would let anon
-- read a deck or run a creator function.
--
-- Push after 20261007000000_trending_highlights_sync.sql, then
-- 20261007010100_seed_funding_deck.sql.

create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'
           and slug not in ('new', 'present', 's', 'templates')),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  kind text not null default 'funding'
    check (kind in ('funding', 'pitch', 'talk', 'section')),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  schema_version integer not null default 1,
  slides jsonb not null default '[]'::jsonb
    check (case when jsonb_typeof(slides) = 'array'
                then jsonb_array_length(slides) <= 100
                     and octet_length(slides::text) <= 1048576
                else false end),
  slide_count integer generated always as (
    case when jsonb_typeof(slides) = 'array' then jsonb_array_length(slides) else 0 end
  ) stored,
  version integer not null default 1 check (version >= 1),
  published_slides jsonb
    check (published_slides is null
           or (case when jsonb_typeof(published_slides) = 'array'
                    then octet_length(published_slides::text) <= 1048576
                    else false end)),
  published_title text,
  published_version integer,
  published_at timestamptz,
  published_by uuid references auth.users (id) on delete set null,
  share_token text not null unique
    default replace(gen_random_uuid()::text, '-', '')
    check (share_token ~ '^[0-9a-f]{32}$'),
  pinned boolean not null default false,
  module_id uuid references public.modules (id) on delete set null,  -- reserved: section decks
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint decks_published_has_snapshot
    check (status <> 'published' or published_slides is not null)
);

create index if not exists decks_status_updated_idx on public.decks (status, updated_at desc);
create index if not exists decks_module_idx on public.decks (module_id) where module_id is not null;
-- At most one deck is shown at /deck.
create unique index if not exists decks_one_pinned_idx on public.decks ((true)) where pinned;

create or replace function public.decks_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end;
$$;
-- A trigger function is never called directly; nobody needs EXECUTE on it.
revoke all on function public.decks_touch() from public, anon, authenticated;

drop trigger if exists decks_touch on public.decks;
create trigger decks_touch before update on public.decks
  for each row execute function public.decks_touch();

create table if not exists public.deck_revisions (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks (id) on delete cascade,
  version integer not null,
  title text not null,
  slides jsonb not null check (jsonb_typeof(slides) = 'array'),
  schema_version integer not null default 1,
  note text,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists deck_revisions_deck_idx
  on public.deck_revisions (deck_id, created_at desc);

-- ── RLS: creators only ──────────────────────────────────────────────────────
alter table public.decks enable row level security;
alter table public.deck_revisions enable row level security;
-- Supabase's default privileges grant anon everything on a new table.
revoke all on public.decks from anon;
revoke all on public.deck_revisions from anon;
-- The editor's requests; RLS below limits them to creators.
grant select, insert, update, delete on public.decks to authenticated;
grant select, insert, delete on public.deck_revisions to authenticated;

drop policy if exists "decks: creators read" on public.decks;
create policy "decks: creators read" on public.decks
  for select to authenticated using (public.is_creator());
drop policy if exists "decks: creators write" on public.decks;
create policy "decks: creators write" on public.decks
  for all to authenticated
  using (public.is_creator()) with check (public.is_creator());

drop policy if exists "deck revisions: creators read" on public.deck_revisions;
create policy "deck revisions: creators read" on public.deck_revisions
  for select to authenticated using (public.is_creator());
drop policy if exists "deck revisions: creators insert" on public.deck_revisions;
create policy "deck revisions: creators insert" on public.deck_revisions
  for insert to authenticated with check (public.is_creator());
drop policy if exists "deck revisions: creators delete" on public.deck_revisions;
create policy "deck revisions: creators delete" on public.deck_revisions
  for delete to authenticated using (public.is_creator());
-- No update policy: revisions are immutable.

-- ── public read path ───────────────────────────────────────────────────────
-- Drops hidden slides; drops speaker notes unless p_keep_notes.
create or replace function public.deck_public_slides(p_slides jsonb, p_keep_notes boolean)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select coalesce(
    jsonb_agg(case when p_keep_notes then e else e - 'notes' end order by o),
    '[]'::jsonb)
  from jsonb_array_elements(coalesce(p_slides, '[]'::jsonb)) with ordinality as t (e, o)
  where coalesce(e -> 'hidden', 'false'::jsonb) <> 'true'::jsonb
$$;
-- Supabase's default privileges grant EXECUTE to anon/authenticated explicitly,
-- so revoking from public alone is not enough.
revoke all on function public.deck_public_slides(jsonb, boolean) from public, anon, authenticated;

-- /deck/s/<token>: the published snapshot, or null (wrong token, rotated
-- link, unpublished or archived deck).
create or replace function public.get_shared_deck(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'slug', case when public.is_creator() then d.slug end,
    'title', coalesce(d.published_title, d.title),
    'kind', d.kind,
    'published_at', d.published_at,
    'slides', public.deck_public_slides(d.published_slides, public.is_creator()))
  from public.decks d
  where p_token ~ '^[0-9a-f]{32}$'
    and d.share_token = p_token
    and d.status = 'published'
    and d.published_slides is not null
  limit 1
$$;
revoke all on function public.get_shared_deck(text) from public, anon, authenticated;
grant execute on function public.get_shared_deck(text) to anon, authenticated;

-- /deck: the pinned published deck, or null (the page shows its bundled copy).
create or replace function public.get_pinned_deck()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'slug', case when public.is_creator() then d.slug end,
    'title', coalesce(d.published_title, d.title),
    'kind', d.kind,
    'published_at', d.published_at,
    'slides', public.deck_public_slides(d.published_slides, public.is_creator()))
  from public.decks d
  where d.pinned and d.status = 'published' and d.published_slides is not null
  limit 1
$$;
revoke all on function public.get_pinned_deck() from public, anon, authenticated;
grant execute on function public.get_pinned_deck() to anon, authenticated;

-- ── creator actions (SECURITY INVOKER: RLS still applies) ──────────────────
-- The working copy at `p_version` becomes the published snapshot, with a
-- revision row. A stale version (another save came first) raises
-- deck_conflict, which PostgREST returns as a 400.
create or replace function public.publish_deck(p_id uuid, p_version integer)
returns public.decks
language plpgsql
security invoker
set search_path = public
as $$
declare d public.decks;
begin
  if not public.is_creator() then
    raise exception 'Only creators can publish decks' using errcode = '42501';
  end if;
  update public.decks
     set status = 'published',
         published_slides = slides,
         published_title = title,
         published_version = version,
         published_at = now(),
         published_by = auth.uid()
   where id = p_id and version = p_version
  returning * into d;
  if not found then
    raise exception 'deck_conflict' using errcode = 'P0001';
  end if;
  insert into public.deck_revisions (deck_id, version, title, slides, schema_version, note)
  values (d.id, d.version, d.title, d.slides, d.schema_version, 'Published');
  return d;
end;
$$;
revoke all on function public.publish_deck(uuid, integer) from public, anon, authenticated;
grant execute on function public.publish_deck(uuid, integer) to authenticated;

-- "Discard unpublished changes": the published snapshot becomes the working
-- copy again, read from the row itself (never from what a tab remembers, which
-- may predate another tab's publish), and the deck is in sync at version n+1.
-- A stale version or a deck never published raises deck_conflict.
create or replace function public.discard_deck_changes(p_id uuid, p_version integer)
returns public.decks
language plpgsql
security invoker
set search_path = public
as $$
declare d public.decks;
begin
  if not public.is_creator() then
    raise exception 'Only creators can discard deck changes' using errcode = '42501';
  end if;
  -- Both right-hand sides read the old version, so both columns become n+1.
  update public.decks
     set slides = published_slides,
         title = coalesce(published_title, title),
         version = version + 1,
         published_version = version + 1
   where id = p_id and version = p_version and published_slides is not null
  returning * into d;
  if not found then
    raise exception 'deck_conflict' using errcode = 'P0001';
  end if;
  return d;
end;
$$;
revoke all on function public.discard_deck_changes(uuid, integer) from public, anon, authenticated;
grant execute on function public.discard_deck_changes(uuid, integer) to authenticated;

-- Show deck `p_id` at /deck (it must be published), or none with null. The
-- editor's "off" switch unpins its own row with a PATCH instead, so a stale
-- switch can never unpin a different deck.
create or replace function public.set_pinned_deck(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_creator() then
    raise exception 'Only creators can change /deck' using errcode = '42501';
  end if;
  update public.decks set pinned = false where pinned and (p_id is null or id <> p_id);
  if p_id is not null then
    update public.decks set pinned = true where id = p_id and status = 'published';
    if not found then
      raise exception 'deck_not_published' using errcode = 'P0001';
    end if;
  end if;
end;
$$;
revoke all on function public.set_pinned_deck(uuid) from public, anon, authenticated;
grant execute on function public.set_pinned_deck(uuid) to authenticated;

-- ── self-check ─────────────────────────────────────────────────────────────
do $$
declare bad integer;
begin
  if not (select relrowsecurity from pg_class where oid = 'public.decks'::regclass)
     or not (select relrowsecurity from pg_class where oid = 'public.deck_revisions'::regclass) then
    raise exception 'decks: RLS is not enabled';
  end if;
  select count(*) into bad from pg_policies
   where schemaname = 'public' and tablename in ('decks', 'deck_revisions')
     and ('anon'::name = any (roles) or 'public'::name = any (roles));
  if bad > 0 then raise exception 'decks: % policies reach anon/public', bad; end if;
  select count(*) into bad from pg_policies
   where schemaname = 'public' and tablename in ('decks', 'deck_revisions')
     and coalesce(qual, '') !~ 'is_creator' and coalesce(with_check, '') !~ 'is_creator';
  if bad > 0 then raise exception 'decks: % policies without is_creator()', bad; end if;
  if has_table_privilege('anon', 'public.decks', 'select')
     or has_table_privilege('anon', 'public.deck_revisions', 'select') then
    raise exception 'decks: anon can read the tables';
  end if;
  if not exists (select 1 from pg_proc where oid = 'public.get_shared_deck(text)'::regprocedure and prosecdef)
     or not exists (select 1 from pg_proc where oid = 'public.get_pinned_deck()'::regprocedure and prosecdef) then
    raise exception 'decks: read functions must be security definer';
  end if;
  if exists (select 1 from pg_proc where oid = 'public.publish_deck(uuid, integer)'::regprocedure and prosecdef)
     or exists (select 1 from pg_proc where oid = 'public.discard_deck_changes(uuid, integer)'::regprocedure and prosecdef)
     or exists (select 1 from pg_proc where oid = 'public.set_pinned_deck(uuid)'::regprocedure and prosecdef) then
    raise exception 'decks: write functions must be security invoker';
  end if;
  if not has_function_privilege('anon', 'public.get_shared_deck(text)', 'execute')
     or not has_function_privilege('anon', 'public.get_pinned_deck()', 'execute') then
    raise exception 'decks: anon cannot execute the read functions';
  end if;
  if has_function_privilege('anon', 'public.publish_deck(uuid, integer)', 'execute')
     or has_function_privilege('anon', 'public.discard_deck_changes(uuid, integer)', 'execute')
     or has_function_privilege('anon', 'public.set_pinned_deck(uuid)', 'execute')
     or has_function_privilege('anon', 'public.deck_public_slides(jsonb, boolean)', 'execute') then
    raise exception 'decks: anon can execute a creator function';
  end if;
  if public.deck_public_slides('[{"id":"a","notes":"x"},{"id":"b","hidden":true}]'::jsonb, false)
     <> '[{"id":"a"}]'::jsonb then
    raise exception 'decks: notes or hidden slides are not stripped';
  end if;
end $$;
