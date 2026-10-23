-- Stuart follow-ups R08/R13/R14. Presentation metadata only; original scans,
-- overall captions, content blocks, source hashes and unrelated items survive.
-- Apply separately after review. Safe to run twice. No live application here.
do $$
declare
  chapter_id uuid;
  figure_row record;
  revised jsonb;
begin
  select id into chapter_id from public.modules where slug = 'foundations-of-neuroscience';
  if chapter_id is null then
    raise notice 'G2 media: History module absent; skipped';
    return;
  end if;

  for figure_row in
    select distinct a.id, a.animation_key, a.config
      from public.animations a
      join public.paragraphs p on p.animation_id = a.id
      join public.sections s on s.id = p.section_id
     where s.module_id = chapter_id
       and a.animation_key in ('animationFoundationsFig19', 'animationFoundationsFig21')
       and jsonb_typeof(a.config->'images') = 'array'
  loop
    if figure_row.animation_key = 'animationFoundationsFig19' then
      -- Split the existing authored plate description, retaining Galvani 1791.
      -- Never replace a caption subsequently supplied by an editor.
      select jsonb_agg(case
        when nullif(item->>'caption', '') is not null then item
        when item->>'src' = '/publicAssets/images/foundations/fig19-01.jpg' then
          item || jsonb_build_object('caption', 'Galvani’s frog leg electrical stimulation experiment using a friction machine. Source: Galvani, 1791.')
        when item->>'src' = '/publicAssets/images/foundations/fig19-02.jpg' then
          item || jsonb_build_object('caption', 'Galvani’s frog leg electrical stimulation experiment using atmospheric electricity. Source: Galvani, 1791.')
        else item end order by ordinal)
      into revised from jsonb_array_elements(figure_row.config->'images') with ordinality as e(item, ordinal);
    else
      -- Require exactly one known Huxley item; do not manufacture or deduplicate
      -- content on drifted data. Stable ordering preserves every other item.
      if (select count(*) from jsonb_array_elements(figure_row.config->'images') item
          where item->>'youtube' = 'KbA3RLz3xUQ') <> 1 then
        raise notice 'G2 media: Fig21 Huxley missing or duplicated; reorder skipped';
        continue;
      end if;
      select jsonb_agg(case
        when item->>'src' = '/publicAssets/images/foundations/fig21-01.jpg'
             and nullif(item->>'caption', '') is null
             and nullif(figure_row.config->>'caption', '') is not null then
          item || jsonb_build_object('caption', figure_row.config->>'caption')
        else item end
        order by case when item->>'youtube' = 'KbA3RLz3xUQ' then 0 else 1 end, ordinal)
      into revised from jsonb_array_elements(figure_row.config->'images') with ordinality as e(item, ordinal);
    end if;
    if revised is not null and revised is distinct from figure_row.config->'images' then
      update public.animations set config = jsonb_set(config, '{images}', revised), updated_at = now()
       where id = figure_row.id;
    end if;
  end loop;

  -- The preceding Fig10 paragraph already has room=1 (round3). Add room
  -- BELOW the exact validated-in-primates paragraph, which owns Fig11.
  update public.paragraphs p
     set content = jsonb_set(p.content, '{animationFlags}',
           coalesce(p.content->'animationFlags', '{}'::jsonb) || '{"room": 1}'::jsonb),
         updated_at = now()
    from public.sections s, public.animations a
   where p.section_id = s.id and s.module_id = chapter_id
     and s.slug = 'do-different-parts'
     and p.animation_id = a.id and a.animation_key = 'animationFoundationsFig11'
     and p.content->'blocks'->0->>'content' like 'Fritsch and Hitzig’s work was validated soon afterwards in primates%'
     and p.content->'animationFlags'->>'room' is distinct from '1';
end $$;
