-- OPENBRAIN-46: close the "Temporary: allow all for testing" holes before the
-- beta. Audit 2026-09-23.
--
-- What was live (migrations 20250101000001 and 20250109000002, both applied):
--   modules, sections, paragraphs, content_versions: a FOR ALL policy with
--     USING (true) for every role, anon included. The public key ships in the
--     page, so anyone could edit or delete the book (deleting content version
--     1.0 cascades to every chapter).
--   modules/sections/paragraphs SELECT USING (true): drafts readable by anon
--     (OPENBRAIN-38; the reader only hid them client-side).
--   profiles: SELECT USING (true) for anon (every email and name public), and
--     "update own profile" with no column limit, so any user could make
--     themselves a creator.
--   quiz_questions: read-only for everyone, so creators could not add
--     questions to the quizzes they are allowed to create.
--
-- After this migration:
--   content (modules, sections, paragraphs): anyone reads PUBLISHED chapters;
--     creators read everything, drafts included, and are the only writers.
--   content_versions: readable by all (metadata only); creators write.
--   profiles: signed-in users read profiles (professor, student and enrolment
--     screens show other people's names); anon reads none. You update your
--     own profile; creators can update anyone's (the dashboard Users section).
--     Only a creator, or the SQL editor / service role, can change a role.
--   quiz_questions: readable by all; creators and professors write (as for
--     quizzes).
--
-- The role checks go through SECURITY DEFINER helpers: a policy on profiles
-- that queries profiles directly recurses, which is how the original
-- "Creators can view all profiles" policy broke and the public-read shortcut
-- got added.
--
-- Every existing policy on the five tables is dropped from pg_policies, not
-- by name, so policies created in the dashboard go too. Idempotent. No
-- BEGIN/COMMIT: `supabase db push` runs the file in one transaction. The last
-- block fails the push if any write policy is still open.

-- ── helpers ────────────────────────────────────────────────────────────────
create or replace function public.has_any_role(roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = any (roles)
  );
$$;

create or replace function public.is_creator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_any_role(array['creator']);
$$;

revoke all on function public.has_any_role(text[]) from public;
revoke all on function public.is_creator() from public;
grant execute on function public.has_any_role(text[]) to anon, authenticated;
grant execute on function public.is_creator() to anon, authenticated;

-- ── drop every policy on the tables being rebuilt ──────────────────────────
do $$
declare
  p record;
begin
  for p in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('modules', 'sections', 'paragraphs', 'content_versions', 'profiles')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

alter table public.modules enable row level security;
alter table public.sections enable row level security;
alter table public.paragraphs enable row level security;
alter table public.content_versions enable row level security;
alter table public.profiles enable row level security;

-- ── modules ────────────────────────────────────────────────────────────────
create policy "Read published chapters, creators read all"
  on public.modules for select
  using (status = 'published' or public.is_creator());

create policy "Creators write chapters"
  on public.modules for all
  to authenticated
  using (public.is_creator())
  with check (public.is_creator());

-- ── sections ───────────────────────────────────────────────────────────────
create policy "Read sections of published chapters, creators read all"
  on public.sections for select
  using (
    public.is_creator()
    or exists (
      select 1 from public.modules m
      where m.id = sections.module_id and m.status = 'published'
    )
  );

create policy "Creators write sections"
  on public.sections for all
  to authenticated
  using (public.is_creator())
  with check (public.is_creator());

-- ── paragraphs ─────────────────────────────────────────────────────────────
create policy "Read paragraphs of published chapters, creators read all"
  on public.paragraphs for select
  using (
    public.is_creator()
    or exists (
      select 1
      from public.sections s
      join public.modules m on m.id = s.module_id
      where s.id = paragraphs.section_id and m.status = 'published'
    )
  );

create policy "Creators write paragraphs"
  on public.paragraphs for all
  to authenticated
  using (public.is_creator())
  with check (public.is_creator());

-- ── content_versions ───────────────────────────────────────────────────────
create policy "Anyone reads content versions"
  on public.content_versions for select
  using (true);

create policy "Creators write content versions"
  on public.content_versions for all
  to authenticated
  using (public.is_creator())
  with check (public.is_creator());

-- ── profiles ───────────────────────────────────────────────────────────────
create policy "Read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Signed-in users read profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Creators update any profile"
  on public.profiles for update
  to authenticated
  using (public.is_creator())
  with check (public.is_creator());

-- A role changes only by a creator, or with no user at all (SQL editor,
-- service role, migrations). New profiles still come from handle_new_user().
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_creator() then
    raise exception 'Only a creator can change a role'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_role on public.profiles;
create trigger guard_profile_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- ── quiz_questions ─────────────────────────────────────────────────────────
drop policy if exists "Creators and professors manage quiz questions" on public.quiz_questions;
create policy "Creators and professors manage quiz questions"
  on public.quiz_questions for all
  to authenticated
  using (public.has_any_role(array['creator', 'professor']))
  with check (public.has_any_role(array['creator', 'professor']));

-- ── self-check: no write policy on these tables may be open ─────────────────
do $$
declare
  n int;
begin
  select count(*) into n
  from pg_policies
  where schemaname = 'public'
    and tablename in ('modules', 'sections', 'paragraphs', 'content_versions', 'profiles', 'quiz_questions')
    and cmd <> 'SELECT'
    and (coalesce(qual, '') = 'true' or coalesce(with_check, '') = 'true');
  if n > 0 then
    raise exception 'rls lockdown: % write policies still allow everyone', n;
  end if;

  select count(*) into n
  from pg_policies
  where schemaname = 'public' and tablename = 'profiles'
    and cmd = 'SELECT' and 'anon' = any (roles) and qual = 'true';
  if n > 0 then
    raise exception 'rls lockdown: profiles still publicly readable';
  end if;
end $$;
