-- OPENBRAIN-197: the chapter authors' lab sites (Stuart, 11 Nov: "For
-- chapter authors, add a circle to the left of the name/affiliation with
-- the face. And when clicked on, should take you to the author's lab site.
-- I'll get Maura to work on face images.").
--
-- modules.authors is a JSON array of { name, affiliation }. Each author now
-- may also carry `url` (the lab site the reader links the name and face to)
-- and `photo` (a path to the face; none yet). This writes the four links
-- Stuart gave:
--
--   Stuart Trenholm (Retina, History)   https://www.trenholmlab.com
--   Naguib Mechawar (History)           https://douglas.research.mcgill.ca/naguib-mechawar
--   Arjun Krishnaswamy (Retina, Attention)  https://www.swamylab.com/
--   Erik Cook (Attention)               https://www.mcgill.ca/physiology/directory/core-faculty/erik-cook
--
-- and adds Erik Cook to the Attention chapter, whose row lists Arjun alone.
-- His affiliation is the department his page is in.
--
-- The reader has the same links in code, by name (AUTHOR_PROFILES in
-- src/helper/chapterAuthors.js), so they show before this is pushed; an
-- older reader ignores the new keys. Either order is safe. Erik Cook's name
-- only appears once this is pushed.
--
-- Idempotent: an author who already has a `url` keeps it, Erik Cook is
-- added only where he is missing and Arjun is listed, and a row whose
-- authors would not change is not touched. No BEGIN/COMMIT.

-- 1. Erik Cook joins the Attention chapter.
update public.modules
   set authors = authors || jsonb_build_array(jsonb_build_object(
         'name', 'Erik Cook',
         'affiliation', 'Department of Physiology, McGill University, Montreal, Canada',
         'url', 'https://www.mcgill.ca/physiology/directory/core-faculty/erik-cook'
       )),
       updated_at = now()
 where slug = 'attention-and-working-memory'
   and jsonb_typeof(authors) = 'array'
   and authors @> '[{"name": "Arjun Krishnaswamy"}]'::jsonb
   and not authors @> '[{"name": "Erik Cook"}]'::jsonb;

-- 2. Each author's lab site, on every chapter that lists them.
with links(name, url) as (
  values
    ('Stuart Trenholm', 'https://www.trenholmlab.com'),
    ('Naguib Mechawar', 'https://douglas.research.mcgill.ca/naguib-mechawar'),
    ('Arjun Krishnaswamy', 'https://www.swamylab.com/'),
    ('Erik Cook', 'https://www.mcgill.ca/physiology/directory/core-faculty/erik-cook')
),
next as (
  select m.id,
         (select jsonb_agg(
                   case
                     when l.url is not null
                          and coalesce(a.author->>'url', '') = ''
                       then a.author || jsonb_build_object('url', l.url)
                     else a.author
                   end
                   order by a.position)
            from jsonb_array_elements(m.authors) with ordinality as a(author, position)
            left join links l on l.name = a.author->>'name') as authors
    from public.modules m
   where jsonb_typeof(m.authors) = 'array'
     and jsonb_array_length(m.authors) > 0
)
update public.modules m
   set authors = n.authors,
       updated_at = now()
  from next n
 where n.id = m.id
   and n.authors is distinct from m.authors;

comment on column public.modules.authors is
  'Authors shown under the chapter intro heading: JSON array of {name, affiliation, url?, photo?}. url is the author''s lab site, photo a path to their face. NULL falls back to the code-side slug map.';
