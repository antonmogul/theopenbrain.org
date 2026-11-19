-- OPENBRAIN-51: placement-only Retina figure corrections from Stuart's review.
-- Guard the published identities and preserve later author choices. No live writes here.

-- The 2023 horizontal-cell section has an explicit preset (set=1) on Types3;
-- its legacy name accidentally addressed Types1 in the desktop pane.
update public.sections s
   set animation_config = jsonb_set(s.animation_config, '{name}', '"RetinalCellTypes3"'),
       updated_at = now()
  from public.modules m
 where s.module_id = m.id and m.slug = 'the-retina'
   and s.slug = 'horizontal-cells-and-feedback'
   and s.animation_config ->> 'id' = 'animationRetinalCellTypes3'
   and s.animation_config ->> 'name' = 'RetinalCellTypes'
   and s.animation_config ->> 'stage' = 'Horizontal cells';

-- "Stays: Until the next figure". The timing engine still stops at a band
-- or section boundary (including the phototransduction interactive).
update public.paragraphs p
   set content = jsonb_set(p.content, '{animationFlags}',
         coalesce(p.content -> 'animationFlags', '{}'::jsonb) || '{"hold":"next"}'::jsonb),
       updated_at = now()
  from public.sections s, public.modules m, public.animations a
 where p.section_id = s.id and s.module_id = m.id and m.slug = 'the-retina'
   and p.animation_id = a.id
   and (p.id, a.animation_key) in (
     ('42828df2-c097-4ecc-9a06-978899b5ccad'::uuid, 'widget-upload:retina-photoreceptors'),
     ('9d0c04b0-f71e-4b4d-8533-ba5c37c7eedc'::uuid, 'widget-upload:retina-center-surround'))
   and not (coalesce(p.content -> 'animationFlags', '{}'::jsonb) ? 'hold');

-- After the full-width visual-cycle interactive, bring back the same rod
-- and cone drawing for the two paragraphs that compare their sensitivity.
-- This is a new placement of the existing figure, not a new media record.
update public.paragraphs p
   set animation_id = a.id, has_animation = true,
       animation_trigger = 'widget-upload:retina-photoreceptors',
       content = jsonb_set(p.content, '{animationFlags}',
         coalesce(p.content -> 'animationFlags', '{}'::jsonb) || '{"hold":"next"}'::jsonb),
       updated_at = now()
  from public.animations a, public.sections s, public.modules m
 where p.id = '6cb473ef-50d9-4976-b8b0-707be960fbc7'
   and p.section_id = s.id and s.module_id = m.id and m.slug = 'the-retina'
   and s.slug = 'photoreceptors-and-phototransduction'
   and a.animation_key = 'widget-upload:retina-photoreceptors'
   and p.animation_id is null
   and not (coalesce(p.content -> 'animationFlags', '{}'::jsonb) ? 'hold')
   and p.content -> 'blocks' -> 0 ->> 'content' like 'Light sensitivity and temporal differences between rods and cones.%';
