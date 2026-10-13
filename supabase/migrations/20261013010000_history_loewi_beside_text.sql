-- OPENBRAIN-140: Loewi's animation beside the text (Stuart, 13 Oct: "I was
-- thinking the Loewi animation would be half-width, next to that part of
-- the text that describes his experiment").
--
-- In the two-column reader the half next to the text is the figure pane, so
-- the upload becomes a pane figure (media_type "widget", config.widgetId,
-- drawn by IllustrationWidget) on how-neurons-communicate ¶5, "The
-- experiment he dashed off to perform…", held one screen past it so it is
-- up while the result is read. Below 1024px it draws in the text after that
-- paragraph, as the full-width band it was (IllustrationInline).
--
-- The full-width widget paragraph 20261009010000 inserted after it (¶6) is
-- removed, so the animation isn't shown twice. Nothing else in the chapter
-- moves: order_index gaps are allowed.
--
-- Idempotent: the row upserts by animation_key, the figure attaches only to
-- a paragraph without one (or with this one), and the delete finds nothing
-- the second time. No BEGIN/COMMIT.

do $$
declare
  chapter_id uuid;
  figure_id uuid;
  attached integer;
  removed integer;
begin
  select id into chapter_id from public.modules
   where slug = 'foundations-of-neuroscience';
  if chapter_id is null then
    raise notice 'Loewi beside text: no foundations-of-neuroscience module, skipped';
    return;
  end if;

  insert into public.animations
    (animation_key, title, media_type, interaction_type, component_name,
     config, scientific_domain, load_priority)
  values (
    'animationFoundationsLoewiWidget',
    'Loewi''s Vagusstoff, 1921',
    'widget', 'click_states', 'IllustrationWidget',
    jsonb_build_object(
      'widgetId', 'upload:loewi-vagusstoff',
      'credit', 'Stuart Trenholm, after Loewi (1921), Figure 1'),
    'history', 'low')
  on conflict (animation_key) do update
    set title = excluded.title, media_type = excluded.media_type,
        component_name = excluded.component_name,
        config = excluded.config, updated_at = now()
  returning id into figure_id;

  update public.paragraphs p
     set animation_id = figure_id, has_animation = true,
         animation_trigger = 'auto',
         content = jsonb_set(coalesce(p.content, '{}'::jsonb), '{animationFlags}',
           coalesce(p.content->'animationFlags', '{}'::jsonb) || '{"hold": 1}'::jsonb),
         updated_at = now()
    from public.sections s
   where p.section_id = s.id and s.module_id = chapter_id
     and s.slug = 'how-neurons-communicate' and p.order_index = 5
     and (p.animation_id is null or p.animation_id = figure_id);
  get diagnostics attached = row_count;

  -- Only once the figure is in place, so the animation never disappears.
  if attached = 1 then
    -- reading_progress.last_paragraph_id has no ON DELETE: a reader saved
    -- on the band picks up on the experiment paragraph instead.
    update public.reading_progress r
       set last_paragraph_id = (
         select p5.id from public.paragraphs p5
           join public.sections s5 on s5.id = p5.section_id
          where s5.module_id = chapter_id
            and s5.slug = 'how-neurons-communicate' and p5.order_index = 5)
     where r.last_paragraph_id in (
       select p.id from public.paragraphs p
         join public.sections s on s.id = p.section_id
        where s.module_id = chapter_id
          and s.slug = 'how-neurons-communicate'
          and p.content->'blocks'->0->>'type' = 'widget'
          and p.content->'blocks'->0->>'widgetId' = 'upload:loewi-vagusstoff');

    delete from public.paragraphs p
     using public.sections s
     where p.section_id = s.id and s.module_id = chapter_id
       and s.slug = 'how-neurons-communicate'
       and p.content->'blocks'->0->>'type' = 'widget'
       and p.content->'blocks'->0->>'widgetId' = 'upload:loewi-vagusstoff';
    get diagnostics removed = row_count;
  end if;

  raise notice 'Loewi beside text: figure on ¶5 (% row), band removed (% row)',
    attached, coalesce(removed, 0);
end $$;
