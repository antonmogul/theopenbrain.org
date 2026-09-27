-- OPENBRAIN-107: markers for what the Stress chapter still needs.
--
-- Anton, 27 Sep: the Stress chapter is still a work in progress, so for now
-- it gets markers, not widgets. The manuscript marks three interviews as
-- bold notes ("[Interview Jim Herman]"), which the reader showed as literal
-- text; each becomes a Video placeholder beside its paragraph, titled with
-- the interview, and the note leaves the text. Figure 3 is the interactive
-- the authors asked for (the SNS central autonomic network), so its
-- placeholder says Interactive. Figures 1 and 2 keep their placeholders.
--
-- Idempotent: the animations upsert on animation_key; a paragraph is only
-- given a marker if it has no figure yet; the note is removed wherever it
-- is still present.

do $$
declare
  v_module uuid;
  v_anim uuid;
  r record;
begin
  select id into v_module from public.modules where slug = 'stress';
  if v_module is null then
    raise notice 'OPENBRAIN-107: no stress module, nothing to do';
    return;
  end if;

  update public.animations
     set config = config || jsonb_build_object(
           'diagramType', 'interactive',
           'note', 'The interactive the authors asked for; to be built with the Open Brain widget kit.'),
         updated_at = now()
   where animation_key = 'animationStressFig3';

  for r in
    select * from (values
      (1, 'Ron de Kloet and Marian Joels', 'Ron de Kloet and Marian Joëls'),
      (2, 'Jim Herman', 'Jim Herman'),
      (3, 'Lars Schwabe', 'Lars Schwabe')
    ) as v(n, raw, name)
  loop
    insert into public.animations
      (animation_key, title, description, media_type, interaction_type,
       component_name, config, scientific_domain, load_priority)
    values (
      'animationStressVideo' || r.n,
      'Interview: ' || r.name,
      'Video interview with ' || r.name || ', marked here in the manuscript of "Understanding Stress" (draft).',
      'image', 'static_image', 'IllustrationPlaceholder',
      jsonb_build_object(
        'placeholder', true,
        'diagramType', 'video',
        'draft', true,
        'note', 'Interview video to come; the manuscript marks it here.'),
      'stress', 'low')
    on conflict (animation_key) do update
      set title = excluded.title,
          description = excluded.description,
          config = excluded.config,
          updated_at = now()
    returning id into v_anim;

    -- The marker, on the paragraph the note ends (if it has no figure yet)
    update public.paragraphs p
       set has_animation = true,
           animation_id = v_anim,
           animation_trigger = 'auto'
      from public.sections s
     where p.section_id = s.id
       and s.module_id = v_module
       and p.content::text like '%[Interview ' || r.raw || ']%'
       and p.animation_id is null;

    -- The note leaves the text
    update public.paragraphs p
       set content = replace(p.content::text,
                             ' <strong>[Interview ' || r.raw || ']</strong>', '')::jsonb,
           content_text = replace(coalesce(p.content_text, ''),
                                  ' [Interview ' || r.raw || ']', '')
      from public.sections s
     where p.section_id = s.id
       and s.module_id = v_module
       and p.content::text like '%[Interview ' || r.raw || ']%';
  end loop;
end $$;
