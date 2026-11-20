-- OPENBRAIN-63: chapter presentation settings on the same rows as the prose.
-- Existing table grants and RLS apply to these columns as to their neighbours:
-- 20260923000000 permits anon reads of published modules/sections only and
-- creators write. No new table, public policy or broader grant is needed.
-- select=* keeps the reader compatible before and after this migration.
alter table public.modules add column if not exists cover jsonb;
alter table public.modules add column if not exists credits jsonb;
alter table public.sections add column if not exists art jsonb;
alter table public.sections add column if not exists rail boolean;

comment on column public.modules.cover is
  'Opener: {image, reactive: {kind: lottie|head, ...}}. reactive:null selects a still only. NULL/malformed values fall back during rollout.';
comment on column public.modules.credits is
  'Chapter credits: {funding: {text,url,logo}, acknowledgements: [plain text]}. funding:null and acknowledgements:[] intentionally hide those blocks.';
comment on column public.sections.art is
  'Section artwork for opener contents and pane cards: {src,alt,position?}. NULL/malformed values fall back during rollout.';
comment on column public.sections.rail is
  'Whether a compatible breakout box reads sideways. false explicitly selects the fold layout; NULL falls back during rollout.';
