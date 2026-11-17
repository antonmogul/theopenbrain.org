-- OPENBRAIN-200: History has no Further reading any more (Stuart, 17 Nov
-- 2026: "I think we can get rid of the 'further reading' section at the
-- end, since we already have like a million references"). Its three links
-- pointed at references 29, 8 and 2, which stay in the list.
--
-- Deletes the chapter's `further-reading` section and its one paragraph.
-- What points at them:
--   reading_progress.last_section_id / last_paragraph_id have no ON DELETE:
--     a reader whose place was saved there is moved to the References
--     section (and no paragraph) first.
--   highlights, trending_highlights and notes cascade. A reader's own
--     highlight or note must not vanish with a section, so the migration
--     stops (and nothing is applied) if any exists; then decide by hand.
--   feedback.section_id is set null; analytics_events cascade.
--
-- The reader needs no change: TextComp shows Further reading only when a
-- chapter has one, and the Acknowledgements (helper/chapterCredits.js)
-- take its place above the references.
--
-- Idempotent: a second run finds no section and changes nothing. No
-- BEGIN/COMMIT.
--
-- To go back: the section and paragraph as they were are in the History
-- fixture before this change (src/stories/historyFullReaderData.json,
-- `history-section-further-reading`) and in the REST backup taken before
-- the push (~/Documents/openbrain-backups/2026-11-17-*).

do $$
declare
  chapter_id uuid;
  fr_id uuid;
  refs_id uuid;
  personal integer;
  affected integer;
begin
  select id into chapter_id from public.modules
   where slug = 'foundations-of-neuroscience';
  if chapter_id is null then
    raise notice 'Further reading: no foundations-of-neuroscience module, skipped';
    return;
  end if;

  select id into fr_id from public.sections
   where module_id = chapter_id and slug = 'further-reading';
  if fr_id is null then
    raise notice 'Further reading: already gone, nothing to do';
    return;
  end if;

  select (select count(*) from public.highlights h
            join public.paragraphs p on p.id = h.paragraph_id
           where p.section_id = fr_id)
       + (select count(*) from public.notes n
           where n.section_id = fr_id
              or n.paragraph_id in (select id from public.paragraphs where section_id = fr_id))
    into personal;
  if personal > 0 then
    raise exception 'Further reading: % reader highlight(s) or note(s) on it; not deleted', personal;
  end if;

  select id into refs_id from public.sections
   where module_id = chapter_id and slug = 'references';

  update public.reading_progress
     set last_section_id = refs_id, last_paragraph_id = null
   where last_section_id = fr_id
      or last_paragraph_id in (select id from public.paragraphs where section_id = fr_id);
  get diagnostics affected = row_count;
  raise notice 'Further reading: % saved reading place(s) moved to References', affected;

  delete from public.paragraphs where section_id = fr_id;
  get diagnostics affected = row_count;
  raise notice 'Further reading: % paragraph(s) deleted', affected;

  delete from public.sections where id = fr_id;
  get diagnostics affected = row_count;
  raise notice 'Further reading: % section deleted', affected;
end $$;
