-- OPENBRAIN-141: uploaded widgets may be 4 MB.
--
-- The 2 MB check on widget_uploads.html (20260926020000) was sized for a
-- widget with its fonts and a few clips inlined. Stuart's RetINaBox v3
-- (1 October 2026) carries 61 narration clips and is 2.4 MB, so the limit is
-- 4 MB: here, in MAX_WIDGET_BYTES (src/widgets/uploaded/widgetHost.js, the
-- Studio's "Under 4 MB" check) and in the widget kit's SKILL.md.
--
-- Idempotent: drops whatever check constrains octet_length(html), named or
-- not (the original was an inline column check, so Postgres named it
-- widget_uploads_html_check), then adds the 4 MB one. No BEGIN/COMMIT.

do $$
declare
  c record;
begin
  for c in
    select conname
      from pg_constraint
     where conrelid = 'public.widget_uploads'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%octet_length(html)%'
  loop
    execute format('alter table public.widget_uploads drop constraint %I', c.conname);
  end loop;

  alter table public.widget_uploads
    add constraint widget_uploads_html_size_check
    check (octet_length(html) <= 4194304);

  raise notice 'widget_uploads.html: up to 4 MB';
end $$;
