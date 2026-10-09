-- OPENBRAIN-134: History images from Stuart's email (8 Oct 2026, "history
-- chapter additional images and stuff"). Four stretches of the chapter had
-- text on the right and nothing in the figure pane on the left.
--
--   1. Introduction ¶0: the 1519 Fries woodcut.
--   3. Localization ¶4 (Descartes, then Steensen, Swedenborg, Willis, Haller):
--      a portrait gallery. Stills hold until the next figure (OPENBRAIN-131),
--      so it stays in the pane through Haller. Steensen's portrait is not in
--      the files yet; add it to `images` when it arrives.
--   4. Localization ¶18 (Milner and H.M.): a gallery of Brenda Milner,
--      Scoville operating, H.M. in 1958, and his brain being sectioned, the
--      last one looping the YouTube clip Stuart linked (FigureImages video
--      items; reduced motion keeps the still and links to the video).
--   5. Closing words ¶0: H.M.'s brain.
--
-- Not here: item 2 (Plato/Aristotle) is for Sonia and Maura to design, and
-- Figure 20's replacement is Stuart's Loewi animation, an uploaded widget.
--
-- The new figures carry no figureNumber, so they read "FIG" and the chapter's
-- existing numbering (and its "Figure N" text references) is unchanged.
-- Images: public/publicAssets/images/foundations/. Idempotent: rows upsert by
-- animation_key; a figure attaches only to a paragraph that has none.
-- No BEGIN/COMMIT.

do $$
declare
  chapter_id uuid;
  fig record;
  figure_id uuid;
  affected integer;
begin
  select id into chapter_id from public.modules
   where slug = 'foundations-of-neuroscience';
  if chapter_id is null then
    raise notice 'History images: no foundations-of-neuroscience module, skipped';
    return;
  end if;

  for fig in
    select * from (values
      ('animationFoundationsIntroWoodcut', 'introduction', 0,
       'Woodcut from Lorenz Fries, Spiegel der Artzny, 1519',
       $j${
         "caption": "Woodcut published in Fries, Lorenz: Spiegl der Artzny des gleichen vormals nie von keinem doctor…, Strassburg: J. Grieninger, 1519.",
         "images": [
           {"src": "/publicAssets/images/foundations/fries-woodcut-1519.jpg",
            "alt": "A 1519 anatomical woodcut: a standing man with his chest and abdomen opened to show the organs, surrounded by numbered drawings of the head and brain dissected layer by layer."}
         ]
       }$j$::jsonb),
      ('animationFoundationsLocalizationPortraits', 'do-different-parts', 4,
       'Descartes, Swedenborg, Willis and Haller',
       $j${
         "caption": "Thinkers who argued over the localization of function in the 17th and 18th centuries.",
         "images": [
           {"src": "/publicAssets/images/foundations/portrait-descartes.jpg",
            "alt": "Oil portrait of René Descartes in black with a white collar, holding a book.",
            "caption": "Portrait of René Descartes, by Jan Baptist Weenix, 1647–1649. Source: Collectie Centraal Museum Utrecht / foto Ruben de Heer."},
           {"src": "/publicAssets/images/foundations/portrait-swedenborg.jpg",
            "alt": "Portrait of an elderly Emanuel Swedenborg in a powdered wig and brown coat, holding a manuscript titled Apocalypsis Revelata.",
            "caption": "Portrait of Emanuel Swedenborg, circa 1766. Source: Wikimedia Commons."},
           {"src": "/publicAssets/images/foundations/portrait-willis.jpg",
            "alt": "Engraved portrait of Thomas Willis with long hair, in an oval frame above a table of books, a skull and anatomical specimens.",
            "caption": "Portrait of Thomas Willis. Line engraving by G. Vertue, 1742, after D. Loggan. Source: Wellcome Collection."},
           {"src": "/publicAssets/images/foundations/portrait-haller.jpg",
            "alt": "Portrait of a young Albrecht von Haller in a powdered wig, holding papers, with mountains behind him.",
            "caption": "Portrait of Albrecht von Haller, 1736. Source: Burgerbibliothek Bern, Negativnummer 2453."}
         ]
       }$j$::jsonb),
      ('animationFoundationsMilnerHM', 'do-different-parts', 18,
       'Brenda Milner and H.M.',
       $j${
         "caption": "Brenda Milner, William Beecher Scoville, and Henry Molaison (H.M.).",
         "images": [
           {"src": "/publicAssets/images/foundations/hm-brenda-milner.jpg",
            "alt": "Black-and-white portrait of Brenda Milner.",
            "caption": "Brenda Milner."},
           {"src": "/publicAssets/images/foundations/hm-scoville-surgery.jpg",
            "alt": "Surgeons in masks and gowns operating, William Beecher Scoville among them.",
            "caption": "William Beecher Scoville performing surgery."},
           {"src": "/publicAssets/images/foundations/hm-smoking-1958.jpg",
            "alt": "Snapshot dated November 1958 of Henry Molaison seated outside a house, smoking.",
            "caption": "Henry Molaison (H.M.), 1958."},
           {"src": "/publicAssets/images/foundations/hm-brain-slicing.jpg",
            "alt": "H.M.'s frozen brain being cut into thin sections.",
            "caption": "H.M.'s brain being sectioned after his death.",
            "youtube": "OmmH4Rp9-to"}
         ]
       }$j$::jsonb),
      ('animationFoundationsClosingHM', 'closing-words', 0,
       'The brain of H.M.',
       $j${
         "caption": "The brain of Henry Molaison (H.M.).",
         "images": [
           {"src": "/publicAssets/images/foundations/hm-brain.jpg",
            "alt": "A preserved human brain seen from the side, against a black and grey background."}
         ]
       }$j$::jsonb)
    ) as t(animation_key, section_slug, order_index, title, cfg)
  loop
    insert into public.animations
      (animation_key, title, media_type, interaction_type, component_name,
       image_file_url, config, scientific_domain, load_priority)
    values (
      fig.animation_key, fig.title, 'image', 'static_image',
      'IllustrationPlaceholder',
      fig.cfg->'images'->0->>'src',
      fig.cfg || jsonb_build_object('placeholder', true, 'diagramType', 'diagram'),
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
      from public.sections s
     where p.section_id = s.id and s.module_id = chapter_id
       and s.slug = fig.section_slug
       and p.order_index = fig.order_index
       and (p.animation_id is null or p.animation_id = figure_id);
    get diagnostics affected = row_count;
    raise notice 'History images: % on %/% (% paragraph)',
      fig.animation_key, fig.section_slug, fig.order_index, affected;
  end loop;
end $$;
