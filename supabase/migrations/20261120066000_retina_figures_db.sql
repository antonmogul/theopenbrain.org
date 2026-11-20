-- OPENBRAIN-60: figure records resolve from the DB only.
-- State/variant rows and WavesOfActivity.youtube_id already hold the authored
-- values; do not overwrite the author's reviewed state order/corrections.
-- The six flip figures intentionally have no clickable states.
update public.animations a
set config = jsonb_set(coalesce(a.config, '{}'::jsonb), '{states}', '[]'::jsonb), updated_at = now()
where a.animation_key in ('animationNormalVision', 'animationCataracts', 'animationGlaucoma', 'animationDiabeticRetinopathy', 'animationAgeRelatedMacularDegeneration', 'animationRetinitisPigmentosa')
  and not (coalesce(a.config, '{}'::jsonb) ? 'states');

-- Move the three remaining section figures to their opening prose paragraph.
-- Compare only placement keys, never prose (rewritten 19 Nov). A creator's
-- figure or stage/hold choice is protected, and the section is cleared only
-- after its paragraph update succeeds. "next" preserves the former section span.
do $$
declare target record; changed integer;
begin
  for target in select * from (values
    ('36adafd0-bc6a-4ebc-acc7-8270ea0c083b'::uuid, 'introduction', '65b52ec0-a886-486c-af64-cadc150d2096'::uuid, '063275c8-84e1-4557-afe5-967ac2bd0c93'::uuid, '063275c8-84e1-4557-afe5-967ac2bd0c93'::uuid, '{"name":"dragon"}'::jsonb),
    ('9497f217-b3e2-4688-a7cd-5360e2e779ca'::uuid, 'bipolar-cells-diversify-photoreceptor-signals', 'b9d2316d-f213-4d6d-a0ad-21aa85194e9a'::uuid, '07f91aaf-a191-4b7b-bd46-02985528b180'::uuid, '07f91aaf-a191-4b7b-bd46-02985528b180'::uuid, '{"id":"animationRetinalCellTypes2","name":"RetinalCellTypes2","stage":"Bipolar cells","title":"Retinal cell types"}'::jsonb),
    ('6af621e4-6ff0-4f27-8146-6aa72835c8f8'::uuid, 'horizontal-cells-and-feedback', '4bb764b8-e8ce-4503-8d09-9db82ccb9958'::uuid, '15296428-d3b8-4ed9-83bb-19c913d18057'::uuid, 'c45cd95d-0704-4b2f-b809-27706f338f79'::uuid, '{"id":"animationRetinalCellTypes3","name":"RetinalCellTypes3","stage":"Horizontal cells","title":"Retinal cell types"}'::jsonb)
  ) as targets(section_id, slug, paragraph_id, animation_id, old_animation_id, old_config)
  loop
    if exists (select 1 from public.sections s join public.modules m on m.id = s.module_id
      where s.id = target.section_id and m.slug = 'the-retina' and s.slug = target.slug
        and s.animation_id = target.old_animation_id and s.animation_config = target.old_config) then
      update public.paragraphs p
      set animation_id = target.animation_id, has_animation = true, animation_trigger = 'auto',
          content = jsonb_set(coalesce(p.content, '{}'::jsonb), '{animationFlags}',
            coalesce(p.content->'animationFlags', '{}'::jsonb) ||
            jsonb_strip_nulls(jsonb_build_object('hold', 'next', 'stage', target.old_config->>'stage'))),
          updated_at = now()
      where p.id = target.paragraph_id and p.section_id = target.section_id
        and p.animation_id is null and p.animation_trigger is null
        and (p.content->'animationFlags' is null or jsonb_typeof(p.content->'animationFlags') = 'object')
        and (p.content#>'{animationFlags,hold}' is null or p.content#>'{animationFlags,hold}' = '"next"'::jsonb)
        and (p.content#>'{animationFlags,stage}' is null or p.content#>'{animationFlags,stage}' = target.old_config->'stage');
      get diagnostics changed = row_count;
      if changed = 1 then
        update public.sections set animation_id = null, animation_config = null, updated_at = now()
        where id = target.section_id;
      end if;
    end if;
  end loop;
end $$;

-- These are old figure names, not trigger modes. Rendering already keys from
-- animation_id/animationFlags; normalising changes no animation behaviour.
update public.paragraphs p
set animation_trigger = 'auto', updated_at = now()
from (values
  ('2144a465-2440-4975-8f93-896894223513'::uuid, 'PupillaryLightreflex'),
  ('8b3cb725-e2ec-40ec-84da-9fcbfdaf7bfb'::uuid, 'NormalVision'),
  ('fef36b77-19b7-4ca5-869d-81a46186661a'::uuid, 'Cataracts'),
  ('25028da1-b944-46b7-b049-fc8ebbb86484'::uuid, 'eyeMovements'),
  ('fd564629-be00-4f8a-b218-0a5437b594d4'::uuid, 'wavesOfActivity'),
  ('fe833e48-bcc5-4af3-921c-1d62d42dccc9'::uuid, 'Glaucoma'),
  ('7d7d821e-03de-4336-bad8-827f063f0ebd'::uuid, 'DiabeticRetinopathy'),
  ('e69745f5-41b1-402a-910a-1bc574c2e99a'::uuid, 'AgeRelatedMacularDegeneration'),
  ('25c06831-36f4-463e-bc44-1e315a7ba388'::uuid, 'RetinitisPigmentosa'),
  ('671e3832-e311-406d-821a-97f313f9db95'::uuid, 'Phototransduction'),
  ('3ad0547d-a63d-4bda-8a43-057deabcd42b'::uuid, 'TheVisualCycle'),
  ('8db9c849-1cbf-4217-a4cd-d0da1597705e'::uuid, 'AccommodationVergence'),
  ('08333789-23e1-4864-bb75-de07fc3447d4'::uuid, 'RetinalCircuitsTransition'),
  ('c41015c0-4b87-49d4-9868-8ba943adcaa6'::uuid, 'LatteralOrganization'),
  ('fccf2f42-9f63-4c68-b8d9-24f67b239637'::uuid, 'ColorOpponency'),
  ('21ee12e5-7bd0-4b62-9153-a71135facf99'::uuid, 'ImpairedVision'),
  ('6cb473ef-50d9-4976-b8b0-707be960fbc7'::uuid, 'widget-upload:retina-photoreceptors'),
  ('f96d99ae-0771-4784-8949-d73788bb9c90'::uuid, 'animationRetinaDevelopment')
) as targets(id, old_trigger), public.sections s, public.modules m
where p.id = targets.id and p.animation_trigger = targets.old_trigger
  and p.section_id = s.id and s.module_id = m.id and m.slug = 'the-retina';
