-- OPENBRAIN-100, a2e798d3: enable Descartes' inscribed-skull title card.
-- Reader support and the existing image are already live. Change only the
-- enabled key; preserve image/quote/layer edits and every other section.
DO $card$
DECLARE
  target_id uuid;
  prior jsonb;
BEGIN
  SELECT s.id, s.box_card INTO target_id, prior
    FROM public.sections s JOIN public.modules m ON m.id = s.module_id
   WHERE m.slug = 'foundations-of-neuroscience' AND s.slug = 'box-descartes'
   FOR UPDATE OF s;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Descartes title card: section missing';
  END IF;
  IF prior->'enabled' = 'true'::jsonb THEN RETURN; END IF;
  IF prior IS NULL OR prior->'enabled' IS DISTINCT FROM 'false'::jsonb THEN
    RAISE EXCEPTION 'Descartes title card: enabled differs from expected false; review author edit';
  END IF;
  UPDATE public.sections SET box_card = jsonb_set(prior, '{enabled}', 'true'::jsonb)
   WHERE id = target_id;
END
$card$;
