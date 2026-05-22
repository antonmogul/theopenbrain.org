-- User preferences table — Track 1 (design refresh)
-- Per-user storage for theme, accent, type, motion preferences.
-- localStorage remains the source of truth on the client; this table syncs across devices.

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'system'
    check (theme in ('system', 'light', 'dark')),
  accent text not null default 'magenta'
    check (accent in ('magenta', 'teal', 'amber', 'mono')),
  reading_size text not null default 'regular'
    check (reading_size in ('compact', 'regular', 'comfortable')),
  line_length text not null default 'standard'
    check (line_length in ('tight', 'standard', 'wide')),
  reduce_motion text not null default 'auto'
    check (reduce_motion in ('auto', 'on', 'off')),
  font_pair text not null default 'ibm-plex-legacy',
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

create policy "own prefs read"
  on public.user_preferences
  for select
  using (auth.uid() = user_id);

create policy "own prefs insert"
  on public.user_preferences
  for insert
  with check (auth.uid() = user_id);

create policy "own prefs update"
  on public.user_preferences
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own prefs delete"
  on public.user_preferences
  for delete
  using (auth.uid() = user_id);
