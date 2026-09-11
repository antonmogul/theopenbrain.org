-- OPENBRAIN-30: chapter colour ramps are keyed by *subject*, not by chapter
-- number. The five ramps come from the Figma Assets Library
-- (book/fund, perc, move, lear, deve). The reader falls back to a code-side
-- slug map (src/helper/chapterTheme.js) when this column is absent or NULL,
-- so applying this migration is safe at any time and the DB value wins once
-- it is set.
--
-- Idempotent: re-running is a no-op.

alter table public.modules
  add column if not exists ramp text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'modules_ramp_check'
  ) then
    alter table public.modules
      add constraint modules_ramp_check
      check (ramp is null or ramp in ('fund', 'perc', 'move', 'lear', 'deve'));
  end if;
end $$;

comment on column public.modules.ramp is
  'Subject colour ramp from the Figma Assets Library: fund (Fundamentals), perc (Perception), move (Movement), lear (Learning/cognition/memory), deve (Development/degeneration). NULL falls back to the code-side slug map.';

update public.modules set ramp = 'perc'
  where slug = 'the-retina' and ramp is distinct from 'perc';
update public.modules set ramp = 'fund'
  where slug = 'foundations-of-neuroscience' and ramp is distinct from 'fund';
update public.modules set ramp = 'lear'
  where slug = 'attention-and-working-memory' and ramp is distinct from 'lear';
