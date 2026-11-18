-- OPENBRAIN-203: reviewer feedback notes (the in-chapter review widget, OPENBRAIN-204).
--
-- Authors and designers leave notes on a chapter while the site is in review.
-- Anyone may send one (no sign-in, no review key), so the table itself is closed:
--   * anon and authenticated have NO insert grant and anon has nothing at all.
--     Notes come in only through submit_review_feedback(jsonb), SECURITY
--     DEFINER, which validates and caps every field, is idempotent on the
--     browser queue's client_id, and rate-limits (120 per IP per hour, 2000 per
--     hour overall).
--   * reviewers read back their own notes' status and reply through
--     review_feedback_status(uuid[]): the ids are random uuids, so knowing one
--     is the right to its status. Nothing else about other notes is readable.
--   * creators (public.is_creator()) read every note and update status and
--     reply only (column grants), and are the only ones who can delete.
-- The older public.feedback table (OPENBRAIN-101, students' messages) is
-- untouched.
--
-- Idempotent: create ... if not exists, create or replace, drop ... if exists.

create table if not exists public.review_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  chapter_slug text not null
    check (chapter_slug ~ '^[a-z0-9][a-z0-9-]{0,119}$'),
  section_slug text check (char_length(section_slug) between 1 and 160),
  paragraph_id uuid, -- no FK: paragraphs are rewritten by migrations
  type text not null
    check (type in ('content', 'figure', 'widget', 'design', 'bug', 'note')),
  note text check (char_length(note) <= 4000),
  quote text check (char_length(quote) <= 2000),
  suggested_text text check (char_length(suggested_text) <= 4000),
  anchor jsonb not null default '{}'::jsonb
    check (jsonb_typeof(anchor) = 'object' and octet_length(anchor::text) <= 16384),
  reviewer_name text not null check (char_length(reviewer_name) between 1 and 80),
  reviewer_role text
    check (reviewer_role in ('author', 'designer', 'reviewer', 'other')),
  user_id uuid,
  url text check (char_length(url) <= 2000),
  viewport text check (char_length(viewport) <= 100),
  user_agent text check (char_length(user_agent) <= 500),
  client_id text unique check (client_id ~ '^[A-Za-z0-9_.:-]{1,100}$'),
  status text not null default 'new'
    check (status in ('new', 'doing', 'done', 'wont_do', 'question')),
  reply text check (char_length(reply) <= 4000),
  replied_at timestamptz,
  -- sha256 of the sender's first x-forwarded-for address, for the rate limit
  -- only. Not granted to anyone, creators included.
  ip_hash text
);

create index if not exists review_feedback_chapter_idx
  on public.review_feedback (chapter_slug, created_at desc);
create index if not exists review_feedback_status_idx
  on public.review_feedback (status);
create index if not exists review_feedback_created_idx
  on public.review_feedback (created_at);
create index if not exists review_feedback_ip_idx
  on public.review_feedback (ip_hash, created_at)
  where ip_hash is not null;

-- updated_at on every change; replied_at when the reply text changes.
create or replace function public.review_feedback_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  if new.reply is distinct from old.reply then
    new.reply := nullif(btrim(new.reply), '');
    new.replied_at := case when new.reply is null then null else now() end;
  end if;
  return new;
end;
$$;

revoke all on function public.review_feedback_touch() from public, anon, authenticated;

drop trigger if exists review_feedback_touch on public.review_feedback;
create trigger review_feedback_touch
  before update on public.review_feedback
  for each row execute function public.review_feedback_touch();

-- ── grants and RLS ────────────────────────────────────────────────────────────
alter table public.review_feedback enable row level security;

-- Supabase's default privileges grant everything to anon and authenticated;
-- take it all back, then give creators (authenticated + RLS) what they need.
revoke all on public.review_feedback from anon, authenticated, public;
grant select (
  id, created_at, updated_at, chapter_slug, section_slug, paragraph_id, type,
  note, quote, suggested_text, anchor, reviewer_name, reviewer_role, user_id,
  url, viewport, user_agent, client_id, status, reply, replied_at
) on public.review_feedback to authenticated;
grant update (status, reply) on public.review_feedback to authenticated;
grant delete on public.review_feedback to authenticated;

drop policy if exists "Creators read review notes" on public.review_feedback;
drop policy if exists "Creators answer review notes" on public.review_feedback;
drop policy if exists "Creators delete review notes" on public.review_feedback;

create policy "Creators read review notes"
  on public.review_feedback for select
  to authenticated
  using (public.is_creator());

create policy "Creators answer review notes"
  on public.review_feedback for update
  to authenticated
  using (public.is_creator())
  with check (public.is_creator());

create policy "Creators delete review notes"
  on public.review_feedback for delete
  to authenticated
  using (public.is_creator());

-- ── submit ────────────────────────────────────────────────────────────────────
-- p: { chapter_slug, section_slug?, paragraph_id?, type, note?, quote?,
--      suggested_text?, anchor?, reviewer_name, reviewer_role?, url?,
--      viewport?, user_agent?, client_id? }  →  { id, status }
-- Free text is trimmed and cut to its cap (a queued note must not fail forever
-- on length); anything structurally wrong raises review_invalid (HTTP 400,
-- detail says which field). Over the limit raises review_rate_limited (HTTP 429).
create or replace function public.submit_review_feedback(p jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_client_id text;
  v_existing public.review_feedback%rowtype;
  v_chapter text;
  v_section text;
  v_paragraph uuid;
  v_type text;
  v_note text;
  v_quote text;
  v_suggested text;
  v_anchor jsonb;
  v_name text;
  v_role text;
  v_headers text;
  v_ip text;
  v_ip_hash text;
  v_row public.review_feedback%rowtype;
begin
  if p is null or jsonb_typeof(p) <> 'object' then
    raise exception using errcode = '22023', message = 'review_invalid',
      detail = 'body must be a JSON object';
  end if;

  -- A retry of a note already stored returns that note, whatever else changed.
  v_client_id := nullif(btrim(p->>'client_id'), '');
  if v_client_id is not null then
    if v_client_id !~ '^[A-Za-z0-9_.:-]{1,100}$' then
      raise exception using errcode = '22023', message = 'review_invalid',
        detail = 'client_id';
    end if;
    select * into v_existing from public.review_feedback where client_id = v_client_id;
    if found then
      return jsonb_build_object('id', v_existing.id, 'status', v_existing.status);
    end if;
  end if;

  v_chapter := lower(btrim(coalesce(p->>'chapter_slug', '')));
  if v_chapter !~ '^[a-z0-9][a-z0-9-]{0,119}$' then
    raise exception using errcode = '22023', message = 'review_invalid',
      detail = 'chapter_slug';
  end if;

  v_section := left(nullif(btrim(p->>'section_slug'), ''), 160);

  if nullif(btrim(p->>'paragraph_id'), '') is not null then
    if btrim(p->>'paragraph_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception using errcode = '22023', message = 'review_invalid',
        detail = 'paragraph_id';
    end if;
    v_paragraph := btrim(p->>'paragraph_id')::uuid;
  end if;

  v_type := lower(btrim(coalesce(p->>'type', '')));
  if v_type not in ('content', 'figure', 'widget', 'design', 'bug', 'note') then
    raise exception using errcode = '22023', message = 'review_invalid',
      detail = 'type';
  end if;

  v_note := left(nullif(btrim(p->>'note'), ''), 4000);
  v_quote := left(nullif(btrim(p->>'quote'), ''), 2000);
  v_suggested := left(nullif(btrim(p->>'suggested_text'), ''), 4000);
  if v_note is null and (v_quote is null or v_suggested is null) then
    raise exception using errcode = '22023', message = 'review_invalid',
      detail = 'note, or quote and suggested_text, required';
  end if;

  v_anchor := coalesce(p->'anchor', '{}'::jsonb);
  if jsonb_typeof(v_anchor) = 'null' then
    v_anchor := '{}'::jsonb;
  end if;
  if jsonb_typeof(v_anchor) <> 'object' or octet_length(v_anchor::text) > 16384 then
    raise exception using errcode = '22023', message = 'review_invalid',
      detail = 'anchor must be an object of at most 16 KB';
  end if;

  v_name := left(nullif(btrim(p->>'reviewer_name'), ''), 80);
  if v_name is null then
    raise exception using errcode = '22023', message = 'review_invalid',
      detail = 'reviewer_name';
  end if;

  v_role := nullif(lower(btrim(p->>'reviewer_role')), '');
  if v_role is not null and v_role not in ('author', 'designer', 'reviewer', 'other') then
    raise exception using errcode = '22023', message = 'review_invalid',
      detail = 'reviewer_role';
  end if;

  -- Rate limits. One lock so concurrent senders can't both slip under them.
  perform pg_advisory_xact_lock(hashtext('public.submit_review_feedback'));

  v_headers := nullif(current_setting('request.headers', true), '');
  if v_headers is not null then
    v_ip := nullif(btrim(split_part(coalesce(v_headers::json->>'x-forwarded-for', ''), ',', 1)), '');
  end if;
  if v_ip is not null then
    v_ip_hash := encode(sha256(convert_to(v_ip, 'UTF8')), 'hex');
    if (select count(*) from public.review_feedback
        where ip_hash = v_ip_hash and created_at > now() - interval '1 hour') >= 120 then
      raise exception using errcode = 'PT429', message = 'review_rate_limited',
        detail = 'at most 120 notes per hour from one address';
    end if;
  end if;
  if (select count(*) from public.review_feedback
      where created_at > now() - interval '1 hour') >= 2000 then
    raise exception using errcode = 'PT429', message = 'review_rate_limited',
      detail = 'too many notes this hour';
  end if;

  insert into public.review_feedback (
    chapter_slug, section_slug, paragraph_id, type, note, quote, suggested_text,
    anchor, reviewer_name, reviewer_role, user_id, url, viewport, user_agent,
    client_id, ip_hash
  ) values (
    v_chapter, v_section, v_paragraph, v_type, v_note, v_quote, v_suggested,
    v_anchor, v_name, v_role, auth.uid(),
    left(nullif(btrim(p->>'url'), ''), 2000),
    left(nullif(btrim(p->>'viewport'), ''), 100),
    left(nullif(btrim(p->>'user_agent'), ''), 500),
    v_client_id, v_ip_hash
  )
  returning * into v_row;

  return jsonb_build_object('id', v_row.id, 'status', v_row.status);
end;
$$;

-- ── status for "My notes" ─────────────────────────────────────────────────────
-- Stable, so the widget can call it with GET. The first 200 ids are answered;
-- unknown ids are simply absent.
create or replace function public.review_feedback_status(p_ids uuid[])
returns table (
  id uuid,
  status text,
  reply text,
  replied_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.status, r.reply, r.replied_at, r.updated_at
  from public.review_feedback r
  where r.id = any (coalesce(p_ids[1:200], '{}'::uuid[]));
$$;

revoke all on function public.submit_review_feedback(jsonb) from public;
revoke all on function public.review_feedback_status(uuid[]) from public;
grant execute on function public.submit_review_feedback(jsonb) to anon, authenticated;
grant execute on function public.review_feedback_status(uuid[]) to anon, authenticated;
