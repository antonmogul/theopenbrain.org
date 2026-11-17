-- OPENBRAIN-193: two History references (Stuart, 14 Nov 2026: "Change to
-- 'fur' and the author of the book is Eric Andrew-Gee and the publisher
-- Penguin").
--
--   98  Burckhardt (1891). The journal read "Allgemeine Zeitschift fu»r
--       Psychiatrie": a broken umlaut and a missing r. It is "Allgemeine
--       Zeitschrift für Psychiatrie".
--   111 The Mind Mappers. The entry was the publisher's page title, with the
--       reference manager's escaped bar in it ("The Mind Mappers by Eric
--       Andrew-Gee \| Penguin Random House Canada. https://…"). It is a
--       book: Andrew-Gee, E. The Mind Mappers. (Penguin Random House
--       Canada), written as the list's other books are (8, 25, 117). The
--       publisher's page stays as the row's url, so the entry still links
--       to it. No year: the source gives none and we do not guess one.
--
-- Each reference is stored twice and both copies are corrected: the row in
-- public."references" (what the reader's list and the superscripts' cards
-- show) and the item in the References section's own list block (what the
-- reader falls back to, and what a creator edits).
--
-- Idempotent and guarded: a row or a list item is changed only while it
-- still reads exactly as it did on 17 Nov 2026, so an author's later edit
-- is left alone and a second run changes nothing. No BEGIN/COMMIT.
--
-- To go back: restore the four `was` strings below.

do $$
declare
  chapter_id uuid;
  fix record;
  affected integer;
begin
  select id into chapter_id from public.modules
   where slug = 'foundations-of-neuroscience';
  if chapter_id is null then
    raise notice 'History references: no foundations-of-neuroscience module, skipped';
    return;
  end if;

  -- 1. The rows.
  update public."references" r
     set journal = 'Allgemeine Zeitschrift für Psychiatrie',
         raw_text = 'Burckhardt, G. Über Rindenexzisionen als Beitrag zur operativen Therapie der Psychosen. <em>Allgemeine Zeitschrift für Psychiatrie</em> 463–548 (1891).'
   where r.module_id = chapter_id
     and r.number = 98
     and r.journal = 'Allgemeine Zeitschift fu»r Psychiatrie'
     and r.raw_text = 'Burckhardt, G. Über Rindenexzisionen als Beitrag zur operativen Therapie der Psychosen. <em>Allgemeine Zeitschift fu»r Psychiatrie</em> 463–548 (1891).';
  get diagnostics affected = row_count;
  raise notice 'History references: 98, Zeitschrift für (% row)', affected;

  update public."references" r
     set authors = 'Andrew-Gee, E',
         title = 'The Mind Mappers',
         pub_type = 'book',
         raw_text = 'Andrew-Gee, E. <em>The Mind Mappers</em>. (Penguin Random House Canada).'
   where r.module_id = chapter_id
     and r.number = 111
     and r.raw_text = 'The Mind Mappers by Eric Andrew-Gee \| Penguin Random House Canada. https://www.penguinrandomhouse.ca/books/726132/the-mind-mappers-by-eric-andrew-gee/9781039008069.';
  get diagnostics affected = row_count;
  raise notice 'History references: 111, Andrew-Gee (% row)', affected;

  -- 2. The same two entries in the References section's list (reference N
  --    is item N - 1 of the paragraph's first block).
  for fix in
    select * from (values
      (97,
       'Burckhardt, G. Über Rindenexzisionen als Beitrag zur operativen Therapie der Psychosen. <em>Allgemeine Zeitschift fu»r Psychiatrie</em> 463–548 (1891).',
       'Burckhardt, G. Über Rindenexzisionen als Beitrag zur operativen Therapie der Psychosen. <em>Allgemeine Zeitschrift für Psychiatrie</em> 463–548 (1891).'),
      (110,
       'The Mind Mappers by Eric Andrew-Gee \| Penguin Random House Canada. https://www.penguinrandomhouse.ca/books/726132/the-mind-mappers-by-eric-andrew-gee/9781039008069.',
       'Andrew-Gee, E. <em>The Mind Mappers</em>. (Penguin Random House Canada).')
    ) as t(item, was, now_reads)
  loop
    update public.paragraphs p
       set content = jsonb_set(
             p.content,
             array['blocks', '0', 'items', fix.item::text],
             to_jsonb(fix.now_reads)),
           updated_at = now()
      from public.sections s
     where s.id = p.section_id
       and s.module_id = chapter_id
       and s.slug = 'references'
       and p.content #>> array['blocks', '0', 'type'] = 'list'
       and p.content #>> array['blocks', '0', 'items', fix.item::text] = fix.was;
    get diagnostics affected = row_count;
    raise notice 'History references: list item % (% row)', fix.item + 1, affected;
  end loop;
end $$;
