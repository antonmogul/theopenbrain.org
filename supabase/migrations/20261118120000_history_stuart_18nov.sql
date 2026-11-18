-- OPENBRAIN-202: Stuart's notes of 18 Nov 2026 ("A few more notes").
--
-- 1. Figure titles (Stuart: "Updated fig legend titles"):
--      Fig 01  Woodcut from Lorenz Fries, Spiegel der Artzny, 1519
--              → Renaissance era drawing of human anatomy
--      Fig 06  Plato and Aristotle
--              → Plato, Aristotle, and the debate of head vs. heart
--      Fig 17  Deiters' nerve cell (axon & dendrites) → Deiters' nerve cells
--      Fig 22  The synapse under electron microscopy
--              → The first picture of a chemical synapse
--              (Stuart wrote "Fig 21", which is Golgi's lab at Pavia; the
--              title is the synapse's, so it goes on Figure 22)
--      Fig 25  Eccles' stretch-reflex circuit
--              → Neuronal excitability and synaptic transmission
--
-- 2. The Descartes box: "only the full skull has a fig label when
--    unexpanded (Fig D), and this label does not apply to the other photo".
--    The record (animationFoundationsFigA) holds both photographs, and the
--    box's text cites the piece in Lund as Figure E. Each image now carries
--    its own figureNumber and title (figureImages, helper/figureCycle.js),
--    so the track names each photograph on its own (RailFigure).
--
-- 3. No self-credits in the chapters ("Phrenology and Penfield widgets -
--    remove the text 'INTERACTIVE BY THE OPEN BRAIN'. Elsewhere (retina
--    chapter for instance) remove where you write by Stuart Trenholm …
--    we don't need to cite ourselves in the middle of the chapter"):
--    the `credit` of History's two widget blocks and of the Retina's four
--    goes, and so does the Retina's nine figure-pane widgets' "Stuart
--    Trenholm". Loewi's credit keeps its source and drops the name:
--    "After Loewi (1921), Figure 1".
--
-- Idempotent and guarded: every change applies only while the value is
-- still the one shown above, so a creator's later edit is left alone and a
-- second run changes nothing. No BEGIN/COMMIT.
--
-- To go back: set the titles, credits and image entries back to the values
-- above (the backup taken before the push holds the rows).

-- 1. Titles
update public.animations as a
   set title = v.new_title, updated_at = now()
  from (values
    ('animationFoundationsIntroWoodcut',
     'Woodcut from Lorenz Fries, Spiegel der Artzny, 1519',
     'Renaissance era drawing of human anatomy'),
    ('animationFoundationsPlatoAristotle',
     'Plato and Aristotle',
     'Plato, Aristotle, and the debate of head vs. heart'),
    ('animationFoundationsFig13',
     'Deiters'' nerve cell (axon & dendrites)',
     'Deiters'' nerve cells'),
    ('animationFoundationsFig18',
     'The synapse under electron microscopy',
     'The first picture of a chemical synapse'),
    ('animationFoundationsFig21',
     'Eccles'' stretch-reflex circuit',
     'Neuronal excitability and synaptic transmission')
  ) as v(animation_key, old_title, new_title)
 where a.animation_key = v.animation_key
   and a.title = v.old_title;

-- 2. Descartes: Figure D and Figure E
update public.animations
   set config = jsonb_set(
         jsonb_set(
           config,
           '{images,0}',
           (config #> '{images,0}') || jsonb_build_object(
             'figureNumber', 'D',
             'title', 'Descartes'' skull, Musée de l''homme')
         ),
         '{images,1}',
         (config #> '{images,1}') || jsonb_build_object(
           'figureNumber', 'E',
           'title', 'Piece of Descartes'' skull, Lund')
       ),
       updated_at = now()
 where animation_key = 'animationFoundationsFigA'
   and config ->> 'figureNumber' = 'D'
   and jsonb_array_length(coalesce(config -> 'images', '[]'::jsonb)) = 2
   and not (config #> '{images,0}' ? 'figureNumber')
   and not (config #> '{images,1}' ? 'figureNumber');

-- 3a. Widget blocks: drop the credit
update public.paragraphs as p
   set content = jsonb_set(
         p.content,
         '{blocks}',
         (select jsonb_agg(
                   case
                     when b.block ->> 'type' = 'widget'
                      and b.block ->> 'credit' in (
                        'Interactive by The Open Brain', 'Stuart Trenholm')
                     then b.block - 'credit'
                     else b.block
                   end
                   order by b.ord)
            from jsonb_array_elements(p.content -> 'blocks')
                 with ordinality as b(block, ord))
       ),
       updated_at = now()
  from public.sections s
  join public.modules m on m.id = s.module_id
 where p.section_id = s.id
   and m.slug in ('foundations-of-neuroscience', 'the-retina')
   and jsonb_typeof(p.content -> 'blocks') = 'array'
   and exists (
     select 1 from jsonb_array_elements(p.content -> 'blocks') as e(block)
      where e.block ->> 'type' = 'widget'
        and e.block ->> 'credit' in (
          'Interactive by The Open Brain', 'Stuart Trenholm'));

-- 3b. The Retina's figure-pane widgets
update public.animations
   set config = config - 'credit', updated_at = now()
 where animation_key like 'widget-upload:retina-%'
   and config ->> 'credit' = 'Stuart Trenholm';

-- 3c. Loewi keeps its source
update public.animations
   set config = jsonb_set(config, '{credit}',
                          to_jsonb('After Loewi (1921), Figure 1'::text)),
       updated_at = now()
 where animation_key = 'animationFoundationsLoewiWidget'
   and config ->> 'credit' = 'Stuart Trenholm, after Loewi (1921), Figure 1';
