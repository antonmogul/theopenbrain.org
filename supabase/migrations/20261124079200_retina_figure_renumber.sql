-- OPENBRAIN-79: the Retina's eight images in the text become numbered
-- figures, so the chapter's figures are renumbered 1-34 in reading order
-- (Anton, 24 Nov 2026). OPENBRAIN-67 (20261120066700) numbered the 26
-- record-backed figures 1-26 and left these eight without a number.
--
-- Reading order: a record counts at its first placement; a paragraph that
-- carries both a record and an image shows the record first (the image is
-- drawn after the paragraph's text). The Retina has no breakout-box figures
-- and no "Figure N" citations in its prose or captions (audited 24 Nov 2026
-- with anonymous GETs), so no text changes.
--
-- Two guarded updates, both replayable:
--   1. animations.config.figureNumber moves from the OPENBRAIN-67 number to
--      the new one, only while it still holds exactly the OPENBRAIN-67
--      number. A number a creator changed is kept. The record must be linked
--      from the Retina and from no other chapter, as in OPENBRAIN-67. Records
--      1-5 keep their numbers and are not listed.
--   2. Each image block (paragraphs.content.blocks[], type "image", matched
--      by its src inside the Retina) gets figureNumber and title, each only
--      while it is missing, JSON null or empty. Every other key of the block,
--      the other blocks and the rest of content are kept.
--
-- Data only. The reader before this ticket ignores the two new block keys,
-- so deploy the reader first: pushed before it, the pane figures would show
-- the new numbers with gaps where the images are. No BEGIN/COMMIT.

do $$
declare
  chapter_id uuid;
  affected integer;
begin
  select id into chapter_id from public.modules where slug = 'the-retina';
  if chapter_id is null then
    raise notice 'Retina renumber: no the-retina module, skipped';
    return;
  end if;

  update public.animations a
     set config = jsonb_set(a.config, '{figureNumber}', to_jsonb(fig.new_number)),
         updated_at = now()
    from (values
      ('widget-upload:retina-synaptic-architecture', 6, 7),
      ('widget-upload:retina-photoreceptors', 7, 8),
      ('animationRetinaCountingPhotons', 8, 10),
      ('animationRetinalCellTypes3', 9, 11),
      ('animationRetinalCellTypes2', 10, 12),
      ('widget-upload:retina-on-off-bipolar-cells', 11, 14),
      ('animationRetinalCircuitsTransition', 12, 16),
      ('widget-upload:retina-center-surround', 13, 17),
      ('animationColorOpponency', 14, 18),
      ('widget-upload:retina-object-motion-sensitivity', 15, 20),
      ('widget-upload:retina-rod-vs-cone-circuits', 16, 21),
      ('widget-upload:retina-light-sensitive-ganglion-cells', 17, 22),
      ('animationEyeMovements', 18, 24),
      ('animationRetinaDevelopment', 19, 26),
      ('animationWavesOfActivity', 20, 27),
      ('animationNormalVision', 21, 28),
      ('animationCataracts', 22, 29),
      ('animationGlaucoma', 23, 30),
      ('animationDiabeticRetinopathy', 24, 31),
      ('animationAgeRelatedMacularDegeneration', 25, 32),
      ('animationRetinitisPigmentosa', 26, 33)
    ) as fig(animation_key, old_number, new_number)
   where a.animation_key = fig.animation_key
     and jsonb_typeof(a.config->'figureNumber') = 'number'
     and (a.config->>'figureNumber') = fig.old_number::text
     and exists (
       select 1 from public.sections s
        where s.module_id = chapter_id
          and (s.animation_id = a.id or exists (
            select 1 from public.paragraphs p
             where p.section_id = s.id and p.animation_id = a.id)))
     and not exists (
       select 1 from public.sections s
        where s.module_id is distinct from chapter_id
          and (s.animation_id = a.id or exists (
            select 1 from public.paragraphs p
             where p.section_id = s.id and p.animation_id = a.id)));
  get diagnostics affected = row_count;
  raise notice 'Retina renumber: % of 21 records renumbered (changed, unlinked or shared records skipped)', affected;

  with img(src, number, title) as (values
      ('RodBySchultze', 6, 'Rod and cone'),
      ('waveLength', 9, 'Absorption spectra'),
      ('ONOFFLamina', 13, 'ON and OFF layers'),
      ('bipolarCellTerminal', 15, 'Bipolar cell responses'),
      ('GABAergic', 19, 'Starburst amacrine cells'),
      ('retinoRecipientRegions', 23, 'Retinal projections'),
      ('testSpotLuminance', 25, 'Light adaptation'),
      ('ramonYCajal', 34, 'Cajal''s avian retina')
  ),
  rebuilt as (
    select p.id,
           jsonb_agg(
             case when i.src is null then b.block
                  else b.block
                    || case when coalesce(b.block->>'figureNumber', '') = ''
                            then jsonb_build_object('figureNumber', i.number)
                            else '{}'::jsonb end
                    || case when coalesce(b.block->>'title', '') = ''
                            then jsonb_build_object('title', i.title)
                            else '{}'::jsonb end
             end
             order by b.ord
           ) as blocks
      from public.paragraphs p
      join public.sections s on s.id = p.section_id and s.module_id = chapter_id
      cross join lateral jsonb_array_elements(p.content->'blocks')
           with ordinality as b(block, ord)
      left join img i
        on b.block->>'type' = 'image' and b.block->>'src' = i.src
     where jsonb_typeof(p.content->'blocks') = 'array'
     group by p.id
    having bool_or(
             i.src is not null
             and (coalesce(b.block->>'figureNumber', '') = ''
               or coalesce(b.block->>'title', '') = ''))
  )
  update public.paragraphs p
     set content = jsonb_set(p.content, '{blocks}', r.blocks),
         updated_at = now()
    from rebuilt r
   where p.id = r.id;
  get diagnostics affected = row_count;
  raise notice 'Retina renumber: % of 8 image paragraphs numbered (already numbered or missing images skipped)', affected;
end $$;
