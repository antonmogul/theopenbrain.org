-- OPENBRAIN-33: chapter authors as data instead of a hardcoded Chapter-1
-- block. JSON array of { "name": text, "affiliation": text }. The reader
-- falls back to a code-side slug map (src/helper/chapterAuthors.js) while
-- this is NULL. Idempotent.

alter table public.modules
  add column if not exists authors jsonb;

comment on column public.modules.authors is
  'Authors shown under the chapter intro heading: JSON array of {name, affiliation}. NULL falls back to the code-side slug map.';

update public.modules set authors = '[
  {"name": "Arjun Krishnaswamy", "affiliation": "Department of Physiology, McGill University, Montreal, Canada"},
  {"name": "Stuart Trenholm", "affiliation": "Montreal Neurological Institute, McGill University, Montreal, Canada"}
]'::jsonb
  where slug = 'the-retina' and authors is null;

update public.modules set authors = '[
  {"name": "Arjun Krishnaswamy", "affiliation": "Department of Physiology, McGill University, Montreal, Canada"}
]'::jsonb
  where slug = 'attention-and-working-memory' and authors is null;
