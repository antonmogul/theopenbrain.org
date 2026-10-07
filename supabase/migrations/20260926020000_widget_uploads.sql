-- OPENBRAIN-105: widgets uploaded by the authors.
--
-- Stuart and Arjun build widgets in Claude as one self-contained .html file
-- (the Open Brain widget skill, public/widget-kit/). A creator uploads it in
-- the creator dashboard (Widgets → Upload), checks it at phone, tablet and
-- desktop widths, and publishes it; a chapter places it with a widget block
-- whose widgetId is "upload:<slug>". The reader runs it in a sandboxed
-- iframe (src/widgets/uploaded/). Readers can read published widgets only;
-- creators read and write everything.

create table if not exists public.widget_uploads (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text,
  author text,
  ramp text check (ramp in ('fund', 'perc', 'move', 'lear', 'deve')),
  html text not null check (octet_length(html) <= 2097152),
  checks jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists widget_uploads_status_idx on public.widget_uploads (status);

alter table public.widget_uploads enable row level security;

drop policy if exists "widget uploads: read published" on public.widget_uploads;
create policy "widget uploads: read published" on public.widget_uploads
  for select to anon, authenticated
  using (status = 'published' or public.is_creator());

drop policy if exists "widget uploads: creators write" on public.widget_uploads;
create policy "widget uploads: creators write" on public.widget_uploads
  for all to authenticated
  using (public.is_creator())
  with check (public.is_creator());
