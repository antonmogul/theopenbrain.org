-- OPENBRAIN-142: the History chapter's breakout boxes, from Stuart's 7 Oct
-- review (open again on 13 Oct: "See my email from last week outlining how
-- to organize a couple of the breakout boxes").
--
--   4. "Breakout boxes G and H - both of these stem from the paragraph right
--      above them, so I think they can't be separated per se. … a picture of
--      Hippocrates on the left and the attached drawing related to humoral
--      theory … 'Explore more about Hippocrates' view on epilepsy' and
--      'Explore more about humoral theory', and when you click on one then
--      it reveals the relevant text and another related image."
--      The two boxes become one, "Hippocrates: the sacred disease and the
--      four humours": box-humoral-theory's paragraph moves into
--      box-sacred-disease and that section goes. Each paragraph is folded
--      behind an "Explore more" card (content.explore, read by
--      chapterTransform.exploreFor and drawn by ExploreCard.vue): the quote
--      behind the bust of Hippocrates, the humours behind Thurneysser's 1574
--      woodcut, whose legend is Stuart's. The humours paragraph keeps its
--      Figure K, which opens with its text. The stale "Figure K. Bust of
--      Hippocrates" legend paragraph goes: the legend now sits under the
--      card's image.
--   5. "Breakout box B … can be broken down into two distinct 'Explore
--      further' segments, one for 'Hippocampus minor' and one for 'Rete
--      mirabile'." Its two paragraphs each get a card, teased by their own
--      figure (C, D), which opens with the text.
--   9. "multi-line quote sections (like in descartes box …) … a more
--      stylized text layout": the poem on Descartes' skull, four one-line
--      paragraphs, becomes one blockquote block (lines kept with <br>), and
--      the Sacred Disease quote a blockquote block, so index.css can set
--      them as extracts. Nothing else changes in their text.
--  12. "To the development breakout box. Add photos of Rita and Roger."
--      One portrait pair on the Sperry paragraph (box-ngf ¶3; ¶2 has the
--      Levi-Montalcini video). No source is known for the photos (Stuart
--      sent them), so the captions name the sitters and nothing else; a
--      credit line is still owed.
--   7. "reletter them in order" needs no SQL: useChapterOutline letters the
--      boxes in reading order.
--
-- Rows are found by their text (the snapshot of 20 Oct), never by id.
-- Idempotent: every step tests the state it leaves behind (a blockquote
-- block already there, a section already gone, a figure already attached).
-- reading_progress.last_paragraph_id / last_section_id have no ON DELETE,
-- so they are repointed before a row goes. No BEGIN/COMMIT.

do $$
declare
  chapter_id uuid;
  sacred uuid;
  humoral uuid;
  rete uuid;
  descartes uuid;
  ngf uuid;
  quote_id uuid;
  poem_id uuid;
  poem_from integer;
  poem_to integer;
  poem_html text;
  poem_text text;
  poem_refs jsonb;
  figure_id uuid;
  n integer;
begin
  select id into chapter_id from public.modules
   where slug = 'foundations-of-neuroscience';
  if chapter_id is null then
    raise notice 'History breakout boxes: no foundations-of-neuroscience module, skipped';
    return;
  end if;

  select id into sacred from public.sections
   where module_id = chapter_id and slug = 'box-sacred-disease';
  select id into humoral from public.sections
   where module_id = chapter_id and slug = 'box-humoral-theory';
  select id into rete from public.sections
   where module_id = chapter_id and slug = 'box-rete-mirabile';
  select id into descartes from public.sections
   where module_id = chapter_id and slug = 'box-descartes';
  select id into ngf from public.sections
   where module_id = chapter_id and slug = 'box-ngf';

  ------------------------------------------------------------------
  -- 4. Hippocrates: one box, two "Explore more" cards
  ------------------------------------------------------------------
  if sacred is not null then
    select id into quote_id from public.paragraphs
     where section_id = sacred and content_text like '“It is thus with regard to the disease called Sacred%';

    -- The legend paragraph for the bust (its text moves under the image).
    if quote_id is not null then
      update public.reading_progress r
         set last_paragraph_id = quote_id
       where r.last_paragraph_id in (
         select id from public.paragraphs
          where section_id = sacred and content_text like 'Figure K. Bust of Hippocrates%');
    end if;
    delete from public.paragraphs
     where section_id = sacred and content_text like 'Figure K. Bust of Hippocrates%';
    get diagnostics n = row_count;
    raise notice 'History boxes: bust legend paragraph removed (% row)', n;

    -- The quote: a blockquote block, folded behind the bust.
    update public.paragraphs p
       set content = p.content || jsonb_build_object(
             'blocks', (
               select jsonb_agg(
                 case when b->>'type' = 'text'
                      then jsonb_build_object('type', 'blockquote', 'content', b->>'content')
                      else b end
                 order by o)
                 from jsonb_array_elements(p.content->'blocks') with ordinality as t(b, o)),
             'explore', jsonb_build_object(
               'title', 'Hippocrates’ view on epilepsy',
               'prompt', 'Explore more about Hippocrates’ view on epilepsy',
               'image', jsonb_build_object(
                 'src', '/publicAssets/images/foundations/narrative/hippocrates-bust.jpg',
                 'alt', 'Marble bust of Hippocrates in profile, from the British Museum.'),
               'legend', 'Bust of Hippocrates from the British Museum. Source: The Wellcome Collection.')),
           updated_at = now()
     where p.id = quote_id;
    get diagnostics n = row_count;
    raise notice 'History boxes: Hippocrates quote card (% row)', n;

    -- The humours paragraph joins the box, after the quote.
    if humoral is not null then
      update public.paragraphs
         set section_id = sacred, order_index = 10 + order_index, updated_at = now()
       where section_id = humoral;
      get diagnostics n = row_count;
      raise notice 'History boxes: humoral paragraphs moved (% row)', n;

      update public.reading_progress set last_section_id = sacred
       where last_section_id = humoral;
      delete from public.sections where id = humoral;
      raise notice 'History boxes: box-humoral-theory section removed';
    end if;

    update public.paragraphs p
       set content = p.content || jsonb_build_object(
             'explore', jsonb_build_object(
               'title', 'Humoral theory',
               'prompt', 'Explore more about humoral theory',
               'image', jsonb_build_object(
                 'src', '/publicAssets/images/foundations/thurneysser-four-humours-1574.jpg',
                 'alt', 'A 1574 woodcut: a figure split down the middle, ringed by the four humours with their elements and zodiac signs.'),
               'legend', 'The four humours and their corresponding elements and zodiacal signs. Woodcut in Quinta Essentia by Leonhart Thurneysser (1574). Credit: Wikimedia Commons.')),
           updated_at = now()
     where p.section_id = sacred
       and p.content_text like 'In ancient Greece, the Pythogoreans%';
    get diagnostics n = row_count;
    raise notice 'History boxes: humoral theory card (% row)', n;

    update public.sections
       set title = 'Hippocrates: the sacred disease and the four humours', updated_at = now()
     where id = sacred;
  else
    raise notice 'History boxes: no box-sacred-disease, Hippocrates step skipped';
  end if;

  ------------------------------------------------------------------
  -- 5. Box B: the rete mirabile and the hippocampus minor as two cards
  ------------------------------------------------------------------
  if rete is not null then
    update public.paragraphs p
       set content = p.content || jsonb_build_object(
             'explore', jsonb_build_object(
               'title', 'The rete mirabile',
               'prompt', 'Explore more about the rete mirabile',
               'image', jsonb_build_object(
                 'src', '/publicAssets/images/foundations/figc-01.jpg',
                 'alt', 'A diagram of Galen''s physiology, with the rete mirabile at the base of the brain.'),
               'legend', 'Galen’s physiology, with the rete mirabile at the base of the brain (Singer, 1925). Source: Wellcome Collection.')),
           updated_at = now()
     where p.section_id = rete
       and p.content_text like 'How does our brain generate the mind?%';
    get diagnostics n = row_count;
    raise notice 'History boxes: rete mirabile card (% row)', n;

    update public.paragraphs p
       set content = p.content || jsonb_build_object(
             'explore', jsonb_build_object(
               'title', 'The hippocampus minor',
               'prompt', 'Explore more about the hippocampus minor',
               'image', jsonb_build_object(
                 'src', '/publicAssets/images/foundations/figd-01.jpg',
                 'alt', 'Top-down views of a human and a chimpanzee brain, with the hippocampus minor marked x.'),
               'legend', 'Human and chimpanzee brains, the hippocampus minor marked ‘x’ in both (Huxley, 1863).')),
           updated_at = now()
     where p.section_id = rete
       and p.content_text like 'In contrast to the example above%';
    get diagnostics n = row_count;
    raise notice 'History boxes: hippocampus minor card (% row)', n;
  else
    raise notice 'History boxes: no box-rete-mirabile, step skipped';
  end if;

  ------------------------------------------------------------------
  -- 9. The poem on Descartes' skull: one blockquote, four lines
  ------------------------------------------------------------------
  if descartes is not null then
    select id, order_index into poem_id, poem_from from public.paragraphs
     where section_id = descartes
       and content_text like '“This small skull once belonged%'
       and content->'blocks'->0->>'type' = 'text';
    select order_index into poem_to from public.paragraphs
     where section_id = descartes
       and content_text like 'And his spirit still rejoices%';

    if poem_id is not null and poem_to is not null and poem_to > poem_from then
      select string_agg(content_text, '<br>' order by order_index),
             string_agg(content_text, E'\n' order by order_index)
        into poem_html, poem_text
        from public.paragraphs
       where section_id = descartes and order_index between poem_from and poem_to;
      -- The citation(s) on the lines follow the quote.
      select coalesce(jsonb_agg(b order by p.order_index, o), '[]'::jsonb)
        into poem_refs
        from public.paragraphs p,
             jsonb_array_elements(p.content->'blocks') with ordinality as t(b, o)
       where p.section_id = descartes
         and p.order_index between poem_from and poem_to
         and b->>'type' = 'citation_ref';

      update public.paragraphs
         set content = content || jsonb_build_object(
               'blocks',
               jsonb_build_array(jsonb_build_object('type', 'blockquote', 'content', poem_html))
                 || poem_refs),
             content_text = poem_text,
             updated_at = now()
       where id = poem_id;

      update public.reading_progress r
         set last_paragraph_id = poem_id
       where r.last_paragraph_id in (
         select id from public.paragraphs
          where section_id = descartes
            and order_index > poem_from and order_index <= poem_to);
      delete from public.paragraphs
       where section_id = descartes
         and order_index > poem_from and order_index <= poem_to;
      get diagnostics n = row_count;
      raise notice 'History boxes: Descartes poem folded into one quote (% lines removed)', n;
    else
      raise notice 'History boxes: Descartes poem already one quote (or not found)';
    end if;
  end if;

  ------------------------------------------------------------------
  -- 12. The developing brain: Rita Levi-Montalcini and Roger Sperry
  ------------------------------------------------------------------
  if ngf is not null then
    insert into public.animations
      (animation_key, title, media_type, interaction_type, component_name,
       image_file_url, config, scientific_domain, load_priority)
    values (
      'animationFoundationsNgfPortraits',
      'Rita Levi-Montalcini and Roger Sperry',
      'image', 'static_image', 'IllustrationPlaceholder',
      '/publicAssets/images/foundations/portrait-levi-montalcini.jpg',
      $j${
        "placeholder": true,
        "diagramType": "photo",
        "caption": "Rita Levi-Montalcini and Roger Sperry.",
        "images": [
          {"src": "/publicAssets/images/foundations/portrait-levi-montalcini.jpg",
           "alt": "Rita Levi-Montalcini in a white coat at a laboratory bench, one hand on a dissecting microscope.",
           "caption": "Rita Levi-Montalcini."},
          {"src": "/publicAssets/images/foundations/portrait-sperry.jpg",
           "alt": "Roger Sperry at a desk, in profile, drawings of brain sections pinned on the wall behind him.",
           "caption": "Roger Sperry."}
        ]
      }$j$::jsonb,
      'history', 'low')
    on conflict (animation_key) do update
      set title = excluded.title,
          image_file_url = excluded.image_file_url,
          config = excluded.config,
          updated_at = now()
    returning id into figure_id;

    update public.paragraphs p
       set animation_id = figure_id, has_animation = true,
           animation_trigger = 'auto', updated_at = now()
     where p.section_id = ngf
       and p.content_text like 'However, if NGF was the only factor%'
       and (p.animation_id is null or p.animation_id = figure_id);
    get diagnostics n = row_count;
    raise notice 'History boxes: Levi-Montalcini and Sperry portraits on the Sperry paragraph (% row)', n;
  else
    raise notice 'History boxes: no box-ngf, portraits skipped';
  end if;
end $$;
