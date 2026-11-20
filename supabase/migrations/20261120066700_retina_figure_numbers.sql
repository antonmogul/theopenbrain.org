-- OPENBRAIN-67: number the Retina's 26 record-backed figures in first-use
-- reading order. A repeated placement keeps the same figure number (33
-- placements, 26 records). This includes pane uploads, inline/fullscreen
-- figures, galleries and videos, just as History counts its Loewi record.
-- The Retina has no box figure records, so no lettered series is needed.
-- Standalone widget bands and the Cajal content.image remain unnumbered,
-- like History's phrenology band; there are no numbered prose citations.
--
-- Audited with anonymous GETs across all published chapters on 20 Nov 2026:
-- none of these records is shared. The live NOT EXISTS guard also protects
-- records referenced by any other chapter, including unpublished chapters
-- invisible to that audit. Shared records must not receive a global number.
--
-- Only config.figureNumber is changed, and only while it is missing or JSON
-- null. Existing creator numbers and all sibling configuration are preserved.
-- Each record must still be linked from the Retina. Data only, safe before
-- or after deploy; idempotent, no BEGIN/COMMIT and no production writes here.

do $$
declare
  chapter_id uuid;
  affected integer;
begin
  select id into chapter_id from public.modules where slug = 'the-retina';
  if chapter_id is null then
    raise notice 'Retina figure numbers: no the-retina module, skipped';
    return;
  end if;

  update public.animations a
     set config = jsonb_set(coalesce(a.config, '{}'::jsonb),
                    '{figureNumber}', to_jsonb(fig.number)),
         updated_at = now()
    from (values
      ('animationDragon', 1),
      ('animationEyeStructur', 2),
      ('animationAccommodationVergence', 3),
      ('widget-upload:retina-retinal-cell-types', 4),
      ('animationLatteralOrganization', 5),
      ('widget-upload:retina-synaptic-architecture', 6),
      ('widget-upload:retina-photoreceptors', 7),
      ('animationRetinaCountingPhotons', 8),
      ('animationRetinalCellTypes3', 9),
      ('animationRetinalCellTypes2', 10),
      ('widget-upload:retina-on-off-bipolar-cells', 11),
      ('animationRetinalCircuitsTransition', 12),
      ('widget-upload:retina-center-surround', 13),
      ('animationColorOpponency', 14),
      ('widget-upload:retina-object-motion-sensitivity', 15),
      ('widget-upload:retina-rod-vs-cone-circuits', 16),
      ('widget-upload:retina-light-sensitive-ganglion-cells', 17),
      ('animationEyeMovements', 18),
      ('animationRetinaDevelopment', 19),
      ('animationWavesOfActivity', 20),
      ('animationNormalVision', 21),
      ('animationCataracts', 22),
      ('animationGlaucoma', 23),
      ('animationDiabeticRetinopathy', 24),
      ('animationAgeRelatedMacularDegeneration', 25),
      ('animationRetinitisPigmentosa', 26)
    ) as fig(animation_key, number)
   where a.animation_key = fig.animation_key
     and a.config->>'figureNumber' is null
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
  raise notice 'Retina figure numbers: % of 26 records numbered (existing, unlinked or shared records skipped)', affected;
end $$;
