-- OPENBRAIN-99: reviewed Retina layout and timing. Deploy the reader and
-- retinal-waves poster first. Only the named keys change; prose and boxes
-- are untouched, and a creator's explicit choices always win.
update public.paragraphs p
set content = jsonb_set(coalesce(p.content, '{}'::jsonb), '{animationFlags}',
  t.flags || coalesce(p.content->'animationFlags', '{}'::jsonb)), updated_at = now()
from (values
  ('8db9c849-1cbf-4217-a4cd-d0da1597705e'::uuid, 'animationAccommodationVergence', '{"hold":"next"}'::jsonb),
  ('63f9a3e3-1f34-46a0-b973-92e282d5f386'::uuid, 'widget-upload:retina-object-motion-sensitivity', '{"room":1}'::jsonb),
  ('bfb594df-a813-4762-8dfa-8c81d470d38a'::uuid, 'widget-upload:retina-rod-vs-cone-circuits', '{"room":1}'::jsonb),
  ('901b315e-65f7-457d-8526-0b537fae86e4'::uuid, 'widget-upload:retina-light-sensitive-ganglion-cells', '{"hold":"next"}'::jsonb),
  ('25028da1-b944-46b7-b049-fc8ebbb86484'::uuid, 'animationEyeMovements', '{"hold":"next"}'::jsonb)
) t(id, key, flags), public.animations a, public.sections s, public.modules m
where p.id=t.id and p.animation_id=a.id and a.animation_key=t.key
  and p.section_id=s.id and s.module_id=m.id and m.slug='the-retina'
  and s.slug not like 'box-%'
  and not coalesce(p.content->'animationFlags','{}'::jsonb) @> t.flags
  and exists (select 1 from jsonb_object_keys(t.flags) k where not coalesce(p.content->'animationFlags','{}'::jsonb) ? k);

-- Reuse the fitted cell-types upload, retaining the later figures' numbers.
update public.animations set config=coalesce(config,'{}'::jsonb)||'{"widgetId":"upload:retina-retinal-cell-types"}'::jsonb, updated_at=now()
where animation_key in ('animationRetinalCellTypes2','animationRetinalCellTypes3')
  and not coalesce(config,'{}'::jsonb) ? 'widgetId';

update public.animations set config=coalesce(config,'{}'::jsonb)||'{"paperBlend":true}'::jsonb, updated_at=now()
where animation_key='animationRetinaDevelopment' and not coalesce(config,'{}'::jsonb) ? 'paperBlend';

update public.animations set config=coalesce(config,'{}'::jsonb)||'{"placeholder":true,"images":[{"src":"/publicAssets/images/the-retina/video-posters/retinal-waves.jpg","youtube":"k0_HXpcH4zI","play":"player","posterPlay":"chapter","alt":"Spontaneous waves of activity"}]}'::jsonb, updated_at=now()
where animation_key='animationWavesOfActivity' and youtube_id='k0_HXpcH4zI'
  and (not coalesce(config,'{}'::jsonb) ? 'images' or config->'images'='[]'::jsonb)
  and not coalesce(config,'{}'::jsonb) ? 'imageUrl' and image_file_url is null;

-- Put direction selectivity beside both explanatory paragraphs; remove
-- only the identical stand-alone placement once both prose placements exist.
update public.paragraphs p
set animation_id=a.id, has_animation=true, animation_trigger='auto',
  content=jsonb_set(p.content,'{animationFlags}','{"hold":"next"}'::jsonb||coalesce(p.content->'animationFlags','{}'::jsonb)), updated_at=now()
from public.animations a, public.sections s, public.modules m
where p.id in ('03f92733-17dd-46a2-9131-c3c64875dba1','2371e7b0-c86e-4f5b-9fc2-cd07ba6d8e39')
  and p.animation_id is null and a.animation_key='widget-upload:retina-direction-selectivity'
  and p.section_id=s.id and s.slug='amacrine-and-ganglion-cells-circuits-computations-and-output'
  and s.module_id=m.id and m.slug='the-retina';

update public.paragraphs p set content=jsonb_set(p.content,'{blocks}','[]'::jsonb), updated_at=now()
where p.id='4fd08f62-00c0-4ebe-8000-000000000002' and p.animation_id is null
  and jsonb_array_length(p.content->'blocks')=1
  and p.content->'blocks'->0->>'type'='widget'
  and p.content->'blocks'->0->>'widgetId'='upload:retina-direction-selectivity'
  and (select count(*) from public.paragraphs q join public.animations a on a.id=q.animation_id
    where q.section_id=p.section_id and q.id in ('03f92733-17dd-46a2-9131-c3c64875dba1','2371e7b0-c86e-4f5b-9fc2-cd07ba6d8e39')
      and a.animation_key='widget-upload:retina-direction-selectivity')=2;

update public.paragraphs p set content=jsonb_set(p.content,'{blocks}',(
  select jsonb_agg(case when b->>'type'='break_video' and b->>'videoSlug' in ('baden','dowling-and-werblin') and not b ? 'posterPlay'
    then b||'{"posterPlay":"chapter"}'::jsonb else b end order by n)
  from jsonb_array_elements(p.content->'blocks') with ordinality as blocks(b,n)
)), updated_at=now()
from public.sections s, public.modules m
where p.id in ('f8fbd23b-3204-4fa4-b355-ea250b659430','a64885db-aabe-411e-bf2d-cd463e9a37e3')
  and p.section_id=s.id and s.module_id=m.id and m.slug='the-retina'
  and exists (select 1 from jsonb_array_elements(p.content->'blocks') b
    where b->>'type'='break_video' and b->>'videoSlug' in ('baden','dowling-and-werblin') and not b ? 'posterPlay');
