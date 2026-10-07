-- OPENBRAIN-69: History's opener subtitle, from the Figma component.
--
-- modules.description is the white line under the chapter title in the
-- reader's opener (ChapterOpener → OpenerToc), and nothing else shows it.
-- The seeded description ran to ~250 characters, ten lines at 54px. Figma
-- (Open-Brain-Chapters 2029:26083) uses a short subtitle; Anton chose it on
-- 24 Sep. The previous text, to restore it:
--
--   A brief survey of the ideas surrounding the brain, told through four
--   debates that helped frame our modern understanding: where the mind
--   resides, whether brain function is localized, what the brain's
--   fundamental functional unit is, and how neurons communicate.
--
-- Idempotent. No BEGIN/COMMIT.

update public.modules
set description = 'Debates that framed our understanding of the brain'
where slug = 'foundations-of-neuroscience';

do $$
begin
  if not exists (
    select 1 from public.modules
    where slug = 'foundations-of-neuroscience'
      and description = 'Debates that framed our understanding of the brain'
  ) then
    raise exception 'foundations subtitle: not updated';
  end if;
end $$;
