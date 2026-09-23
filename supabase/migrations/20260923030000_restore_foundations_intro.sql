-- Restore the Foundations intro paragraph (OPENBRAIN-59).
--
-- On 23 Sep 2026, before OPENBRAIN-58 made the reader read-only by default,
-- the old always-on inline editor saved over this paragraph: it flattened
-- citation 1 into the plain digit "1", appended the words "Edit inline." and
-- wrapped the run in <p>. This puts back the seeded blocks
-- (20260605000000_seed_chapter_foundations.sql): text, citation_ref 1, text.
--
-- Guarded: it only touches the row while it still holds the damaged text, so
-- it's a no-op if someone has fixed it by hand in the meantime.

UPDATE paragraphs p
SET
  content = '{"blocks": [{"type": "text", "content": "Upon being asked why he decided to specialize in neurology, Oliver Sacks famously answered, “I became a neurologist rather than, say, a cardiologist, because there’s nothing for an intelligent man to be interested in in cardiology. The heart, I suppose, is an interesting pump, but it’s just a pump. Neurology is the only branch of medicine that could sustain a thinking man.”"}, {"type": "citation_ref", "number": 1}, {"type": "text", "content": " In this chapter, we provide a brief survey of ideas surrounding this most fascinating of organs, told through debates that helped frame our modern understanding of the brain."}]}'::JSONB,
  content_text = 'Upon being asked why he decided to specialize in neurology, Oliver Sacks famously answered, “I became a neurologist rather than, say, a cardiologist, because there’s nothing for an intelligent man to be interested in in cardiology. The heart, I suppose, is an interesting pump, but it’s just a pump. Neurology is the only branch of medicine that could sustain a thinking man.” In this chapter, we provide a brief survey of ideas surrounding this most fascinating of organs, told through debates that helped frame our modern understanding of the brain.',
  updated_at = NOW()
FROM sections s, modules m
WHERE p.section_id = s.id
  AND s.module_id = m.id
  AND m.slug = 'foundations-of-neuroscience'
  AND s.slug = 'introduction'
  AND p.order_index = 0
  AND p.content_text LIKE '%understanding of the brain. Edit inline.';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM paragraphs p
    JOIN sections s ON s.id = p.section_id
    JOIN modules m ON m.id = s.module_id
    WHERE m.slug = 'foundations-of-neuroscience'
      AND s.slug = 'introduction'
      AND p.content_text LIKE '%Edit inline.%'
  ) THEN
    RAISE EXCEPTION 'restore foundations intro: "Edit inline." is still there';
  END IF;
END $$;
