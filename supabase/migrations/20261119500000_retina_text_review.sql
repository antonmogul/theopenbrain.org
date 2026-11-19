-- OPENBRAIN-50: Stuart's Retina text review, 19 Nov 2026.
-- Pending: no live writes. Only the-retina; snapshots captured by publishable-key GET.
-- Every paragraph compares its full JSONB fingerprint AND its observed content at
-- write time. Drift (including creator edits) is skipped, never overwritten.
-- The 106 Footnotes remain the bibliography: chapterBackReferences already maps
-- them into the same ReferenceList and useReferenceJump as History. Only the
-- legacy in-text markers need the History citation-ref/data-ref contract.
-- Source audit: text.json contains the three unfinished notes removed below too;
-- they are authoring reminders, not scientific prose (one was type "Josh", one
-- type "Markus Meister", one an unlinked Dennis Baylor breakVideo).
-- Tom Baden's source entry has no videoSlug or media URL; left pending a source.
-- No review_feedback writes, schema changes, or other chapters' content.

insert into public.animations
  (animation_key, title, media_type, image_file_url, interaction_type, component_name, config)
select 'animationRetinaCountingPhotons', 'Counting photons', 'image',
       '/publicAssets/images/currentVoltage.png', 'static_image', 'IllustrationComp',
       '{"placeholder":true,"diagramType":"chart","caption":"Current through cGMP-gated channels at different membrane potentials."}'::jsonb
where exists (
  select 1 from public.paragraphs p
  join public.sections s on s.id = p.section_id
  join public.modules m on m.id = s.module_id
  where m.slug = 'the-retina' and p.id = 'bced1220-5563-4751-995d-5ddd31acc061'
    and p.animation_id is null and p.has_animation = false
    and md5(p.content::text) = '0535ea6f57cc52c6a1305fd7936ff4f4'
)
on conflict (animation_key) do nothing;

do $retina$
declare
  r record;
  b jsonb;
  old_content jsonb;
  next_content jsonb;
  next_blocks jsonb;
  html text;
  marker text[];
  replacement text;
  chart_id uuid;
begin
  select id into chart_id from public.animations
  where animation_key = 'animationRetinaCountingPhotons'
    and title = 'Counting photons'
    and image_file_url = '/publicAssets/images/currentVoltage.png'
    and config = '{"placeholder":true,"diagramType":"chart","caption":"Current through cGMP-gated channels at different membrane potentials."}'::jsonb;

  for r in
    select p.* from public.paragraphs p
    join public.sections s on s.id = p.section_id
    join public.modules m on m.id = s.module_id
    join (values
    ('65b52ec0-a886-486c-af64-cadc150d2096'::uuid, 'e76400413844f5ad46c77349b0fc3558'),
    ('a985ddef-a669-48a2-b0e6-cf9a63bacac0'::uuid, '84ec75c2f7cd972d638d844c7e63aef5'),
    ('47673b73-0047-42a2-b218-8af9d9cecdc0'::uuid, 'b6cc2c37970be7b3aa68f89c8aa19199'),
    ('8db9c849-1cbf-4217-a4cd-d0da1597705e'::uuid, 'f7c2c42366c83f56d6d98aa41e799277'),
    ('b0173343-657f-409f-b4bc-c4518baaefdd'::uuid, '97797e4e8a94d7b29572903743a9ae72'),
    ('1a481649-da77-4450-afd2-1e331a5ab435'::uuid, '336ed54a914bde6ed826d49ef7beef3f'),
    ('1fb4842a-5843-4fd0-8a8a-a5fbc2a30ac0'::uuid, 'f77de468bc57c7c2db92f78d28bf523b'),
    ('c41015c0-4b87-49d4-9868-8ba943adcaa6'::uuid, '1472d6c50cce661c53bf9cf85729d07f'),
    ('3411da2f-071c-4486-93be-a9d3cbd4db8d'::uuid, '7b20186d8e8b0100b5c0bb7c2f01a21a'),
    ('c8b845f1-30b8-45b8-8dce-dd8ec14d1ab7'::uuid, '57dc7c8315fa2e92c4c66221e862bc89'),
    ('a88a9f8f-2cc4-4d02-b953-9ba10eee7a79'::uuid, '424031c4fa226fa7d806337183f9b2ea'),
    ('d82faaf9-dd9b-48fd-a43c-fc756b5e2b96'::uuid, '5f2f07611225492054444ae1bb7f08ad'),
    ('78d714f8-2bef-45d3-8e5c-6339bb33eacc'::uuid, '290c04d17de6ea252ffeb30da7242b5c'),
    ('20923617-6ce5-418e-b2f9-f56448a29490'::uuid, '985e0455e4bf9312ba591cd864149734'),
    ('e4eacc51-0c65-4876-b918-35dcce02a936'::uuid, 'b1e5ddce834e0e802706c4039ed174ec'),
    ('7b9a8ec7-53c0-4815-accc-4e8baeec1b8c'::uuid, '89253d030871aa6cc602387b7007b198'),
    ('42828df2-c097-4ecc-9a06-978899b5ccad'::uuid, 'e4bd9f9394a4eaf899a3b1910383621b'),
    ('37f73c1d-d42b-4b2b-bd8c-773d3633eaea'::uuid, '275c2dd29b10a4744958f9afae7f9ce4'),
    ('0c312cd5-5107-4931-b766-a659294a64f3'::uuid, 'de0f480ea75440b9b8731a168ad11950'),
    ('ca9f9ab9-ea8c-4404-bd96-7cb7c1270fe7'::uuid, '3acde95bdc89bebadd8fc7a326269124'),
    ('bced1220-5563-4751-995d-5ddd31acc061'::uuid, '0535ea6f57cc52c6a1305fd7936ff4f4'),
    ('ad6af548-5205-4f42-ac03-224533d5d3bf'::uuid, 'a4131b414f8cb1c3ff79f43427e6008b'),
    ('bb84d092-7ba2-4003-a1eb-1b5eb4ecf67e'::uuid, '6ebf46e7c2728dabac33b5f3e7f586ed'),
    ('bc408844-249e-4f7c-ba42-bd1496d227ed'::uuid, '9cd4b360c5c79f4a5a2dbaedf20d259a'),
    ('6cb473ef-50d9-4976-b8b0-707be960fbc7'::uuid, 'b0edbe46d8136a1423bb8dafda53386c'),
    ('0cb275ed-dc4e-4ee2-b78b-2d51e0b2b88c'::uuid, '3c822f3b8d880666245bfd1cd327a4cc'),
    ('4bb764b8-e8ce-4503-8d09-9db82ccb9958'::uuid, '0d9cb76f5bfb7cb27e65f114bf6b06eb'),
    ('b9d2316d-f213-4d6d-a0ad-21aa85194e9a'::uuid, '6e23ce7c87154981c4f2c5761004e45f'),
    ('3ab539e7-2567-4948-826b-68eb4fb86bb9'::uuid, 'b4cdd354196dd37dc358e090e4204484'),
    ('62938da4-330a-4782-b82d-b668125596f3'::uuid, '0f5600d7ed28813583c34005b3cee8b4'),
    ('0b0abadc-4e4c-44a8-b1a8-c146e1549324'::uuid, 'a41c13183ef89e2dd2f07a7d14553d8d'),
    ('9d58814b-cffe-4e2e-9292-8859e833c8cf'::uuid, '33c07872217d863e2a3b7d8e686974dd'),
    ('08333789-23e1-4864-bb75-de07fc3447d4'::uuid, 'c409c86ae408ca19df3375f971cf0a85'),
    ('9d0c04b0-f71e-4b4d-8533-ba5c37c7eedc'::uuid, '848966f87f3589e04a8d3eecb33cfae6'),
    ('5b101815-0894-48a9-9ed0-a94a9d4d9492'::uuid, '4a448f8215c9d5a6fe2ae39ae13491de'),
    ('fccf2f42-9f63-4c68-b8d9-24f67b239637'::uuid, '67b8d53ea1f8273a70061bcdb5865224'),
    ('1dd1d2ae-f64f-4d19-8ead-f1a343bcae09'::uuid, '73ba972481de1db69c796dbec1b676a0'),
    ('03f92733-17dd-46a2-9131-c3c64875dba1'::uuid, '29978284531e26d676752fa91d433aae'),
    ('2371e7b0-c86e-4f5b-9fc2-cd07ba6d8e39'::uuid, '033ed2fa198aebebce8dd6349999cb71'),
    ('63f9a3e3-1f34-46a0-b973-92e282d5f386'::uuid, 'a952291949b4fa3a272d2a8a977db119'),
    ('b92459b8-0d8f-4bc6-9f2f-d48d2f8f70e9'::uuid, 'a9ba81f7160b4b6e8379637727e9e9dd'),
    ('53ba8f11-4513-4f89-bb14-2246ecafcd18'::uuid, 'ee6e86af1d5bcc207892d4836716e098'),
    ('34fee795-e864-4e1d-ad85-9d08ca8f11a6'::uuid, 'acf4f740fdf5df372b803e9204f9a733'),
    ('82e3b741-f487-483d-961b-83710b62557e'::uuid, 'a83403c80dc1de9dda1894c3d528012b'),
    ('4107a5c6-18d1-40a2-a517-23caee05c465'::uuid, '597e597a1f5cd6bca817de328a31d46b'),
    ('a1bd2b12-e9ca-4eae-bf4c-bdbfdc04e435'::uuid, 'f9bc6ca00935d5fdba4c33d83558755d'),
    ('f96d99ae-0771-4784-8949-d73788bb9c90'::uuid, '67709bd1b61f7d39063c00dada9f1746'),
    ('1dca0aa4-b5c3-42eb-af2e-95c42ac8fb8d'::uuid, '0e503ee3815b30f690e915d7bb561eca'),
    ('9ddc1c79-a97d-48c2-b5e9-ecf1a6dfe9c0'::uuid, 'f48f2e1e9d5eaee22c566f1c30c9c925'),
    ('b2b947fe-ddd1-4e32-89e4-11e66566bc6c'::uuid, 'fbc0a2540cbefd569e476f0ff0913e47'),
    ('6826b459-418c-44cb-91f2-d12df25e030b'::uuid, '80fbf3517d3308947e79924dd8bc2883'),
    ('5d07c4f3-da8c-499b-9d59-c5821fbe5691'::uuid, '26d4778e6c7047e8124e78380339bfa8'),
    ('c1452029-5f88-4072-af0b-5a8287b88596'::uuid, '2fceb579d7f0fdd8d1abfb92b178c997')
    ) expected(id, fingerprint) on expected.id = p.id
    where m.slug = 'the-retina' and md5(p.content::text) = expected.fingerprint
  loop
    old_content := r.content;
    if r.id in ('bc408844-249e-4f7c-ba42-bd1496d227ed',
                'b92459b8-0d8f-4bc6-9f2f-d48d2f8f70e9',
                '1dca0aa4-b5c3-42eb-af2e-95c42ac8fb8d') then
      -- Delete only the exact unlinked planning note, retaining all real prose,
      -- circuit subsections, figures and widgets around it.
      delete from public.paragraphs
      where id = r.id and content = old_content and animation_id is null
        and has_animation = false and is_subsection_header = false;
      continue;
    end if;

    next_blocks := '[]'::jsonb;
    for b in select value from jsonb_array_elements(old_content->'blocks') loop
      if r.id in ('bced1220-5563-4751-995d-5ddd31acc061',
                  'bb84d092-7ba2-4003-a1eb-1b5eb4ecf67e')
         and b->>'type' = 'break_section' then
        continue; -- These are ordinary paragraphs, not empty full-screen demos.
      end if;
      if b->>'type' in ('text', 'paragraph') then
        html := b->>'content';
        for marker in select regexp_matches(html,
          $sup$<sup data-sup=['"]([0-9 ]+)['"]>([^<]*)</sup>$sup$, 'g') loop
          select string_agg(
            format('<sup class="citation-ref" data-ref="%s">%s%s%s</sup>',
              n, case when ord > 1 then '<span aria-hidden="true">,</span>' else '' end,
              n, case when ord = cardinality(regexp_split_to_array(trim(marker[1]), '\s+'))
                         and trim(marker[2]) like '%,' then '<span aria-hidden="true">,</span>' else '' end),
            '' order by ord)
          into replacement
          from unnest(regexp_split_to_array(trim(marker[1]), '\s+')) with ordinality v(n, ord);
          -- Replace only this authored marker, leaving scientific superscripts,
          -- prose, emphasis and all other HTML untouched.
          html := replace(replace(html,
            '<sup data-sup=' || chr(39) || marker[1] || chr(39) || '>' || marker[2] || '</sup>', replacement),
            '<sup data-sup="' || marker[1] || '">' || marker[2] || '</sup>', replacement);
        end loop;
        b := jsonb_set(b, '{content}', to_jsonb(html));
      end if;
      next_blocks := next_blocks || jsonb_build_array(b);
    end loop;
    next_content := jsonb_set(old_content, '{blocks}', next_blocks);
    update public.paragraphs
       set content = next_content,
           animation_id = case when r.id = 'bced1220-5563-4751-995d-5ddd31acc061'
                                   and animation_id is null and chart_id is not null then chart_id else animation_id end,
           has_animation = case when r.id = 'bced1220-5563-4751-995d-5ddd31acc061'
                                    and animation_id is null and chart_id is not null then true else has_animation end,
           updated_at = now()
     where id = r.id and content = old_content
       and animation_id is not distinct from r.animation_id;
  end loop;
end $retina$;

-- A caption on the original Color Opponency figure, only while it still has
-- the exact uncaptioned config and is used exclusively by the Retina.
update public.animations a
set config = jsonb_set(config, '{caption}',
  '"Stare at the cross for 30 seconds, then close your eyes or look at a white wall and notice how the colours change."'::jsonb),
    updated_at = now()
where a.animation_key = 'animationColorOpponency'
  and a.config = '{"illuImage":true,"fullHeight":true}'::jsonb
  and exists (select 1 from public.paragraphs p
    join public.sections s on s.id = p.section_id join public.modules m on m.id = s.module_id
    where p.animation_id = a.id and m.slug = 'the-retina')
  and not exists (select 1 from public.paragraphs p
    join public.sections s on s.id = p.section_id join public.modules m on m.id = s.module_id
    where p.animation_id = a.id and m.slug <> 'the-retina');
