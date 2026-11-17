-- OPENBRAIN-193: History's figures are numbered in the order they are read
-- (Stuart, 14 Nov 2026: "the first fig (Lorenz fries) is not numbered, so
-- the next fig (trepanned skull) is labelled fig 1 but it's actually fig 2.
-- Maybe check that everything numbered in correct order").
--
-- The numbers were the manuscript's. Since then five pictures were added to
-- the chapter's text without one (the woodcut that opens it, Plato and
-- Aristotle, the four portraits, Brenda Milner and H.M., H.M.'s brain), so
-- the pane read FIG, FIG 01, FIG 02 … with unnumbered pictures in between;
-- and the breakout boxes were moved to where they are read (OPENBRAIN-142),
-- so the first lettered figure a reader met was Figure K.
--
-- Now every figure beside the text counts 1 to 26 in reading order, and
-- every figure in a breakout box A to M in reading order. The label on the
-- figure (config.figureNumber) and the citation in the prose (the
-- figure_placeholder blocks, "Figure N") change together:
--
--   text    was → now                       boxes   was → now
--   woodcut (Lorenz Fries)     –  → 1       four humors            K → A
--   trepanned skull            1  → 2       rete mirabile          C → B
--   methods of trepanation     2  → 3       hippocampus minor      D → C
--   Edwin Smith papyrus        3  → 4       Descartes' skull       A → D
--   papyrus, case 20           4  → 5       (its second picture,
--   Plato and Aristotle        –  → 6        the piece in Lund)    B → E
--   Galen's pig                5  → 7       Mary Rafferty          G → F
--   cell doctrine              6  → 8       Burckhardt             E → G
--   Vesalius                   7  → 9       Freeman                F → H
--   the four portraits         –  → 10      Penfield, operative    H → I
--   Gall & Spurzheim           8  → 11      Penfield, map of M.B.  I → J
--   Leborgne ("Tan")           9  → 12      homunculus             J → K
--   Fritsch & Hitzig           10 → 13      Levi-Montalcini film   – → L
--   Goltz and Ferrier          11 → 14      Levi-Montalcini,
--   Brenda Milner and H.M.     –  → 15       Sperry                – → M
--   van Leeuwenhoek            12 → 16
--   Deiters                    13 → 17
--   Golgi's olfactory bulb     14 → 18
--   Cajal's growth cone        15 → 19
--   dynamic polarization       16 → 20
--   Golgi's lab                17 → 21
--   the synapse                18 → 22
--   Galvani                    19 → 23
--   Loewi (the interactive)    20 → 24   (cited as Figure 20; its record had
--                                         no number, so the rail said TRY IT)
--   Eccles                     21 → 25
--   H.M.'s brain               –  → 26
--
-- The phrenology band between Figures 11 and 12 is an interactive the text
-- does not cite, and keeps no number. Animation keys (animationFoundationsFig5
-- …) are identifiers, not labels, and do not change; the two Penfield
-- records keep config.source.manuscriptLabel (H, I), which is where the
-- manuscript's letter is recorded.
--
-- Also in the Penfield box: "Figures H and I" in two paragraphs becomes
-- "Figures I and J", and the two captions that open with their letter
-- follow. The operative photograph's caption ended "See Figure H for
-- results of electrical stimulation", pointing at itself; the results are
-- in the map's caption, so it now reads "See Figure J".
--
-- Idempotent and guarded: a figure is renumbered only while it still has
-- the number in the `was` column (or none), a paragraph only while its
-- citations still read as they did on 17 Nov 2026, so an author's later
-- edit is left alone and a second run changes nothing. No BEGIN/COMMIT.
--
-- Safe before or after the deploy: the reader prints whatever the data
-- says. To go back, run the tables below the other way round.

do $$
declare
  chapter_id uuid;
  fig record;
  para record;
  old_number text;
  renumber constant jsonb := '{
    "1": 2, "2": 3, "3": 4, "4": 5, "5": 7, "6": 8, "7": 9, "8": 11,
    "9": 12, "10": 13, "11": 14, "12": 16, "13": 17, "14": 18, "15": 19,
    "16": 20, "17": 21, "18": 22, "19": 23, "20": 24, "21": 25,
    "K": "A", "C": "B", "D": "C", "A": "D", "B": "E", "G": "F", "E": "G",
    "F": "H", "J": "K"
  }'::jsonb;
  new_text text;
  affected integer;
  n_figures integer := 0;
  n_paragraphs integer := 0;
begin
  select id into chapter_id from public.modules
   where slug = 'foundations-of-neuroscience';
  if chapter_id is null then
    raise notice 'History figure numbers: no foundations-of-neuroscience module, skipped';
    return;
  end if;

  -- 1. The label on each figure. `was` null: the record had no number.
  for fig in
    select * from (values
      ('animationFoundationsIntroWoodcut',          null,   '1'),
      ('animationFoundationsFig1',                  '1',    '2'),
      ('animationFoundationsFig2',                  '2',    '3'),
      ('animationFoundationsFig3',                  '3',    '4'),
      ('animationFoundationsFig4',                  '4',    '5'),
      ('animationFoundationsPlatoAristotle',        null,   '6'),
      ('animationFoundationsFig5',                  '5',    '7'),
      ('animationFoundationsFig6',                  '6',    '8'),
      ('animationFoundationsFig7',                  '7',    '9'),
      ('animationFoundationsLocalizationPortraits', null,   '10'),
      ('animationFoundationsFig8',                  '8',    '11'),
      ('animationFoundationsFig9',                  '9',    '12'),
      ('animationFoundationsFig10',                 '10',   '13'),
      ('animationFoundationsFig11',                 '11',   '14'),
      ('animationFoundationsMilnerHM',              null,   '15'),
      ('animationFoundationsFig12',                 '12',   '16'),
      ('animationFoundationsFig13',                 '13',   '17'),
      ('animationFoundationsFig14',                 '14',   '18'),
      ('animationFoundationsFig15',                 '15',   '19'),
      ('animationFoundationsFig16',                 '16',   '20'),
      ('animationFoundationsFig17',                 '17',   '21'),
      ('animationFoundationsFig18',                 '18',   '22'),
      ('animationFoundationsFig19',                 '19',   '23'),
      ('animationFoundationsLoewiWidget',           null,   '24'),
      ('animationFoundationsFig21',                 '21',   '25'),
      ('animationFoundationsClosingHM',             null,   '26'),
      -- The breakout boxes' figures, lettered.
      ('animationFoundationsFigK',                  '"K"',  '"A"'),
      ('animationFoundationsFigC',                  '"C"',  '"B"'),
      ('animationFoundationsFigD',                  '"D"',  '"C"'),
      ('animationFoundationsFigA',                  '"A"',  '"D"'),
      ('animationFoundationsFigG',                  '"G"',  '"F"'),
      ('animationFoundationsFigE',                  '"E"',  '"G"'),
      ('animationFoundationsFigF',                  '"F"',  '"H"'),
      ('animationFoundationsPenfieldOperative',     '"H"',  '"I"'),
      ('animationFoundationsPenfieldMap',           '"I"',  '"J"'),
      ('animationFoundationsFigJ',                  '"J"',  '"K"'),
      ('animationFoundationsNgfLeviMontalcini',     null,   '"L"'),
      ('animationFoundationsNgfPortraits',          null,   '"M"')
    ) as t(animation_key, was, now_is)
  loop
    update public.animations a
       set config = coalesce(a.config, '{}'::jsonb)
                    || jsonb_build_object('figureNumber', fig.now_is::jsonb),
           updated_at = now()
     where a.animation_key = fig.animation_key
       and a.config->'figureNumber' is not distinct from fig.was::jsonb;
    get diagnostics affected = row_count;
    n_figures := n_figures + affected;
  end loop;
  raise notice 'History figure numbers: % of 38 figures renumbered', n_figures;

  -- 2. The two captions that open with their letter.
  update public.animations a
     set config = jsonb_set(a.config, '{caption}', to_jsonb(
           replace(replace(a.config->>'caption',
             'Figure H. Operative photo', 'Figure I. Operative photo'),
             'See Figure H for results', 'See Figure J for results'))),
         updated_at = now()
   where a.animation_key = 'animationFoundationsPenfieldOperative'
     and a.config->>'caption' like 'Figure H. Operative photo%';
  get diagnostics affected = row_count;
  raise notice 'History figure numbers: operative photograph caption (% row)', affected;

  update public.animations a
     set config = jsonb_set(a.config, '{caption}', to_jsonb(
           replace(a.config->>'caption',
             'Figure I. Penfield''s map', 'Figure J. Penfield''s map'))),
         updated_at = now()
   where a.animation_key = 'animationFoundationsPenfieldMap'
     and a.config->>'caption' like 'Figure I. Penfield''s map%';
  get diagnostics affected = row_count;
  raise notice 'History figure numbers: map caption (% row)', affected;

  -- 3. The citations in the prose: each paragraph's figure_placeholder
  --    blocks, in order, as they read today. content_text (the paragraph as
  --    plain text) follows. The § keeps a number already changed from being
  --    changed again (3 → 4 and 4 → 5 in one paragraph).
  for para in
    select t.id::uuid as id, t.cites::jsonb as cites from (values
      ('98a7f0f4-dd39-40fc-848b-0eff8afcdfd3', '[1]'),         -- where-is-my-mind ¶0
      ('05b3702a-6272-4c38-bddc-6bdaa7ed2bcd', '[2]'),         -- where-is-my-mind ¶1
      ('d8cca9b1-8463-41eb-a7d9-096fc42b7d7b', '[3, 4]'),      -- where-is-my-mind ¶3
      ('38bbacd5-b524-4a08-a9dc-394a3fb2e5b4', '["K"]'),       -- box-sacred-disease ¶11
      ('3674e1b8-6ca3-4550-afff-9d5d6993d087', '["C"]'),       -- box-rete-mirabile ¶1
      ('f79050a4-08ab-42dd-8392-3d4da61ada59', '["D"]'),       -- box-rete-mirabile ¶2
      ('9f205460-7a38-4c32-9f8e-d450a2ce04c1', '[5]'),         -- do-different-parts ¶1
      ('ea7ca3bc-6f28-47d8-9f0e-84f6f905640a', '[6]'),         -- do-different-parts ¶2
      ('94365fd8-3620-408c-92b2-c0f942a825df', '[7]'),         -- do-different-parts ¶3
      ('3c471e9c-c15e-4878-9b7f-93766ec504d4', '["A", "B"]'),  -- box-descartes ¶8
      ('5fb5161e-905e-4984-a599-56517e1f180c', '[8]'),         -- do-different-parts ¶11
      ('d49273f2-3c6c-47fc-8433-768de7921a5d', '[9]'),         -- do-different-parts ¶14
      ('c546fac1-de01-48e8-a54f-8538dfbcd211', '[10]'),        -- do-different-parts ¶15
      ('e43a4102-08e4-450c-802b-294962b8da04', '["G"]'),       -- box-electrical-stim ¶1
      ('abe785c2-92d0-444f-a8c2-d463245a25d3', '[11]'),        -- do-different-parts ¶16
      ('91a2b0ef-a210-4124-b9a1-a208ffd30ddc', '["E"]'),       -- box-psychosurgery ¶0
      ('124c2b77-f633-47e4-ae29-bc08492dc8ee', '["F"]'),       -- box-psychosurgery ¶2
      ('3ad37ea1-7860-4892-9856-9f0bcfdcb684', '["J"]'),       -- box-penfield ¶2
      ('d53c5d01-0a81-48fa-a449-1aa604c2860d', '[12]'),        -- basic-functional-unit ¶2
      ('e447693a-3a10-4cb0-971d-c4c3b99d5054', '[13]'),        -- basic-functional-unit ¶4
      ('3399bccb-9931-47aa-acdf-5bd31070b2f4', '[14]'),        -- basic-functional-unit ¶5
      ('081f9a45-6ac8-46b2-a857-e24cdfacc9cb', '[15]'),        -- basic-functional-unit ¶7
      ('c13d768b-16b5-4b39-a3f5-0f79a4e46b75', '[16]'),        -- basic-functional-unit ¶9
      ('f4d15bdd-118c-44c1-a826-db44451ddc0a', '[17]'),        -- basic-functional-unit ¶12
      ('31016195-34f2-40b1-b959-9906984005c5', '[18]'),        -- basic-functional-unit ¶13
      ('c2a68212-cf5f-42c0-a6a2-1b52a2a3b5dc', '[19]'),        -- how-neurons-communicate ¶1
      ('3af65259-a9c4-4f5f-9f83-55d3b9d99729', '[20]'),        -- how-neurons-communicate ¶5
      ('a3a9d8e1-2f84-4c01-970c-53ffaa8a555e', '[21, 21]')     -- how-neurons-communicate ¶9
    ) as t(id, cites)
  loop
    select p.content_text into new_text from public.paragraphs p
      join public.sections s on s.id = p.section_id
     where p.id = para.id
       and s.module_id = chapter_id
       and (select jsonb_agg(b->'number' order by n)
              from jsonb_array_elements(p.content->'blocks') with ordinality e(b, n)
             where b->>'type' = 'figure_placeholder') = para.cites;
    continue when not found;

    for old_number in
      select distinct c #>> '{}' from jsonb_array_elements(para.cites) c
    loop
      new_text := regexp_replace(
        new_text,
        'Figure ' || old_number || '\M',
        'Figure §' || (renumber ->> old_number),
        'g');
    end loop;
    new_text := replace(new_text, 'Figure §', 'Figure ');

    update public.paragraphs p
       set content = jsonb_set(p.content, '{blocks}', (
             select jsonb_agg(
                      case when b->>'type' = 'figure_placeholder'
                           then jsonb_set(b, '{number}',
                                  coalesce(renumber -> (b->>'number'), b->'number'))
                           else b end
                      order by n)
               from jsonb_array_elements(p.content->'blocks') with ordinality e(b, n))),
           content_text = new_text,
           updated_at = now()
     where p.id = para.id;
    n_paragraphs := n_paragraphs + 1;
  end loop;
  raise notice 'History figure numbers: % of 28 paragraphs'' citations renumbered', n_paragraphs;

  -- 4. "Figures H and I", written into the Penfield box's prose.
  update public.paragraphs p
     set content = replace(p.content::text,
           '<strong>Figures H and I</strong>',
           '<strong>Figures I and J</strong>')::jsonb,
         content_text = replace(p.content_text, 'Figures H and I', 'Figures I and J'),
         updated_at = now()
    from public.sections s
   where s.id = p.section_id
     and s.module_id = chapter_id
     and s.slug = 'box-penfield'
     and p.content::text like '%<strong>Figures H and I</strong>%';
  get diagnostics affected = row_count;
  raise notice 'History figure numbers: "Figures H and I" (% of 2 paragraphs)', affected;
end $$;
