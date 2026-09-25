-- OPENBRAIN-101: readers' feedback.
--
-- Stuart, 24 Sep: "Can we add a feedback option – where the student can write
-- feedback", and for creators later "a feedback view with AI summary". One
-- row per message, with where it was sent from (chapter, section, page) so a
-- creator can read it in context. Signed-in readers write their own rows and
-- can read them back; creators read everything.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null default 'general'
    check (kind in ('general', 'content', 'bug', 'idea')),
  message text not null check (char_length(btrim(message)) between 1 and 4000),
  module_id uuid references public.modules (id) on delete set null,
  section_id uuid references public.sections (id) on delete set null,
  page text,
  created_at timestamptz not null default now()
);

create index if not exists feedback_created_at_idx on public.feedback (created_at desc);
create index if not exists feedback_module_idx on public.feedback (module_id);

alter table public.feedback enable row level security;

drop policy if exists "feedback: write own" on public.feedback;
create policy "feedback: write own" on public.feedback
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "feedback: read own" on public.feedback;
create policy "feedback: read own" on public.feedback
  for select to authenticated
  using (user_id = auth.uid() or public.is_creator());
