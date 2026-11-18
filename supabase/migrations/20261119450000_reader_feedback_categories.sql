-- OPENBRAIN-45: categories for reader feedback, not reviewer notes.
-- Keeps existing rows, defaults, grants and ownership policies unchanged.
-- Refuse an unexpected schema rather than silently replacing a custom check.
do $$
declare
  definition text;
begin
  if to_regclass('public.feedback') is null then
    raise exception 'Reader feedback prerequisite missing: public.feedback';
  end if;
  select pg_get_constraintdef(oid) into definition
  from pg_constraint
  where conrelid = 'public.feedback'::regclass
    and conname = 'feedback_kind_check' and contype = 'c';

  if definition = 'CHECK ((kind = ANY (ARRAY[''general''::text, ''content''::text, ''bug''::text, ''idea''::text, ''usability''::text, ''design''::text, ''other''::text])))' then
    return;
  end if;
  if definition is distinct from 'CHECK ((kind = ANY (ARRAY[''general''::text, ''content''::text, ''bug''::text, ''idea''::text])))' then
    raise exception 'Unexpected feedback_kind_check; inspect before widening reader categories';
  end if;

  alter table public.feedback drop constraint feedback_kind_check;
  alter table public.feedback add constraint feedback_kind_check
    check (kind in ('general', 'content', 'bug', 'idea', 'usability', 'design', 'other'));
end $$;
