-- OPENBRAIN-40: book order. Foundations (History) opens the book; the Retina
-- and Attention follow. Until now the DB had Retina 1, Foundations 3,
-- Attention 4 with slot 2 empty (left behind by the temporary UX chapter), so
-- the library labelled History "Chapter 3".
--
-- modules has UNIQUE(content_version_id, order_index) and every chapter shares
-- one content version. Postgres checks a plain UNIQUE row by row during an
-- UPDATE, so assigning the final numbers directly collides (History -> 1 while
-- the Retina still holds 1). Two phases: park everything in an unused range,
-- then assign. Idempotent: a second run parks and lands on the same numbers.
--
-- No explicit BEGIN/COMMIT: `supabase db push` runs each file, and records its
-- version, in one transaction already (an inner COMMIT would split the two),
-- and the dashboard SQL editor runs a multi-statement paste atomically too.
--
-- Reader URLs resolve by slug, so existing /chapter/<n>/<slug> links keep
-- working; only the number shown changes.

update public.modules
set order_index = order_index + 1000
where slug in (
  'foundations-of-neuroscience',
  'the-retina',
  'attention-and-working-memory'
)
and order_index < 1000;

update public.modules
set order_index = case slug
  when 'foundations-of-neuroscience' then 1
  when 'the-retina' then 2
  when 'attention-and-working-memory' then 3
end
where slug in (
  'foundations-of-neuroscience',
  'the-retina',
  'attention-and-working-memory'
);

-- TODO(Anton): publishing decision. Attention is Arjun's draft manuscript
-- ("marked not final") and is creator-only while status = 'draft', which is
-- why it looks missing from the library. Uncomment to show it to everyone:
--
-- update public.modules set status = 'published'
--   where slug = 'attention-and-working-memory';

select order_index, slug, status from public.modules order by order_index;
