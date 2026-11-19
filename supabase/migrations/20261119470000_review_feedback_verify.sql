-- OPENBRAIN-47: fixed notes await their author's check. No content is rewritten.
-- Requires the review-feedback migration; guarded and safe to rerun.
do $$
begin
  if to_regclass('public.review_feedback') is null then
    raise exception 'review_feedback prerequisite missing';
  end if;
end;
$$;

alter table public.review_feedback add column if not exists verified_at timestamptz;
alter table public.review_feedback drop constraint if exists review_feedback_status_check;
alter table public.review_feedback add constraint review_feedback_status_check
  check (status in ('new', 'doing', 'done', 'wont_do', 'question', 'verified'));
grant select (verified_at) on public.review_feedback to authenticated;

-- Creators may also choose verified; they cannot forge its timestamp.
create or replace function public.review_feedback_touch()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if new.reply is distinct from old.reply then
    new.reply := nullif(btrim(new.reply), '');
    new.replied_at := case when new.reply is null then null else now() end;
  end if;
  if new.status = 'verified' then
    if old.status is distinct from 'verified' then new.verified_at := now(); end if;
  else
    new.verified_at := null;
  end if;
  return new;
end;
$$;
revoke all on function public.review_feedback_touch() from public, anon, authenticated;

-- Verifications do not insert a note, so account for them separately in the
-- same rate budget as submit. Reopens consume that budget through their reply.
create table if not exists public.review_feedback_verify_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  ip_hash text
);
create index if not exists review_feedback_verify_events_created_idx
  on public.review_feedback_verify_events (created_at);
create index if not exists review_feedback_verify_events_ip_idx
  on public.review_feedback_verify_events (ip_hash, created_at);
alter table public.review_feedback_verify_events enable row level security;
revoke all on public.review_feedback_verify_events from public, anon, authenticated;

-- Existing submit is unchanged, including idempotent retries. This trigger adds
-- verification events to its insert budget without replacing its validation.
create or replace function public.review_feedback_insert_budget()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext('public.submit_review_feedback'));
  if new.ip_hash is not null and
    (select count(*) from public.review_feedback where ip_hash = new.ip_hash and created_at > now() - interval '1 hour')
    + (select count(*) from public.review_feedback_verify_events where ip_hash = new.ip_hash and created_at > now() - interval '1 hour') >= 120 then
    raise exception using errcode = 'PT429', message = 'review_rate_limited';
  end if;
  if (select count(*) from public.review_feedback where created_at > now() - interval '1 hour')
    + (select count(*) from public.review_feedback_verify_events where created_at > now() - interval '1 hour') >= 2000 then
    raise exception using errcode = 'PT429', message = 'review_rate_limited';
  end if;
  return new;
end;
$$;
revoke all on function public.review_feedback_insert_budget() from public, anon, authenticated;
drop trigger if exists review_feedback_insert_budget on public.review_feedback;
create trigger review_feedback_insert_budget before insert on public.review_feedback
  for each row execute function public.review_feedback_insert_budget();

create or replace function public.review_feedback_author_action(
  p_id uuid, p_client_id text, p_action text, p_note text default null
) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  v_row public.review_feedback%rowtype;
  v_note text := nullif(btrim(p_note), '');
  v_headers text;
  v_ip text;
  v_hash text;
begin
  if p_action is null or p_action not in ('verify', 'reopen') then
    raise exception using errcode = '22023', message = 'review_invalid', detail = 'action';
  end if;
  -- Same lock as submit; serialize budget checks and state transitions.
  perform pg_advisory_xact_lock(hashtext('public.submit_review_feedback'));
  select * into v_row from public.review_feedback where id = p_id for update;
  if not found or p_client_id is null or v_row.client_id is null
     or v_row.client_id <> p_client_id then
    raise exception using errcode = '22023', message = 'review_invalid', detail = 'authorship';
  end if;
  if (p_action = 'verify' and v_row.status not in ('done', 'wont_do'))
     or (p_action = 'reopen' and v_row.status not in ('done', 'wont_do', 'verified')) then
    raise exception using errcode = '22023', message = 'review_invalid', detail = 'status';
  end if;
  if p_action = 'reopen' and (v_note is null or char_length(v_note) > 4000) then
    raise exception using errcode = '22023', message = 'review_invalid', detail = 'note required, at most 4000 characters';
  end if;

  v_headers := nullif(current_setting('request.headers', true), '');
  if v_headers is not null then
    v_ip := nullif(btrim(split_part(coalesce(v_headers::json->>'x-forwarded-for', ''), ',', 1)), '');
  end if;
  if v_ip is not null then
    v_hash := encode(sha256(convert_to(v_ip, 'UTF8')), 'hex');
    if (select count(*) from public.review_feedback where ip_hash = v_hash and created_at > now() - interval '1 hour')
       + (select count(*) from public.review_feedback_verify_events where ip_hash = v_hash and created_at > now() - interval '1 hour') >= 120 then
      raise exception using errcode = 'PT429', message = 'review_rate_limited';
    end if;
  end if;
  if (select count(*) from public.review_feedback where created_at > now() - interval '1 hour')
     + (select count(*) from public.review_feedback_verify_events where created_at > now() - interval '1 hour') >= 2000 then
    raise exception using errcode = 'PT429', message = 'review_rate_limited';
  end if;

  if p_action = 'reopen' then
    insert into public.review_feedback (
      parent_id, chapter_slug, section_slug, type, note, anchor,
      reviewer_name, reviewer_role, user_id, ip_hash
    ) values (
      v_row.id, v_row.chapter_slug, v_row.section_slug, 'note', v_note, '{}',
      v_row.reviewer_name, v_row.reviewer_role, auth.uid(), v_hash
    );
  else
    insert into public.review_feedback_verify_events (ip_hash) values (v_hash);
  end if;
  update public.review_feedback
    set status = case when p_action = 'verify' then 'verified' else 'new' end
    where id = p_id returning * into v_row;
  return jsonb_build_object('id', v_row.id, 'status', v_row.status,
    'reply', v_row.reply, 'replied_at', v_row.replied_at,
    'updated_at', v_row.updated_at, 'verified_at', v_row.verified_at);
end;
$$;
revoke all on function public.review_feedback_author_action(uuid, text, text, text) from public;
grant execute on function public.review_feedback_author_action(uuid, text, text, text) to anon, authenticated;

create or replace function public.list_review_feedback(
  p_chapter text,
  p_since timestamptz default null
)
returns setof jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', r.id,
    'parent_id', r.parent_id,
    'created_at', r.created_at,
    'updated_at', r.updated_at,
    'chapter_slug', r.chapter_slug,
    'section_slug', r.section_slug,
    'paragraph_id', r.paragraph_id,
    'type', r.type,
    'note', r.note,
    'quote', r.quote,
    'suggested_text', r.suggested_text,
    'anchor', r.anchor,
    'reviewer_name', r.reviewer_name,
    'reviewer_role', r.reviewer_role,
    'status', r.status,
    'reply', r.reply,
    'replied_at', r.replied_at,
    'verified_at', r.verified_at
  )
  from public.review_feedback r
  where r.chapter_slug = lower(btrim(p_chapter))
    and (p_since is null or r.updated_at > p_since)
  order by r.created_at desc, r.id desc
  limit 1000;
$$;

-- Return type gains verified_at, so PostgreSQL requires a drop/re-create.
drop function if exists public.review_feedback_status(uuid[]);
create or replace function public.review_feedback_status(p_ids uuid[])
returns table (
  id uuid,
  status text,
  reply text,
  replied_at timestamptz,
  updated_at timestamptz,
  verified_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.status, r.reply, r.replied_at, r.updated_at, r.verified_at
  from public.review_feedback r
  where r.id = any (coalesce(p_ids[1:200], '{}'::uuid[]));
$$;

revoke all on function public.review_feedback_status(uuid[]) from public;
revoke all on function public.list_review_feedback(text, timestamptz) from public;
grant execute on function public.review_feedback_status(uuid[]) to anon, authenticated;
grant execute on function public.list_review_feedback(text, timestamptz) to anon, authenticated;
