-- OPENBRAIN-108: Attention and Working Memory (chapter 3, draft) — structure,
-- figure numbering, cleanup, and markers for the designers' new widgets.
--
-- Sources: the text audit of the draft against attention&wm.docx (§6 fix
-- list), the chapter inventory, and the FINAL REVIEW Figma map (what goes
-- where, in order). The draft was seeded by 20260925020000; nothing since
-- has touched it. No author text is deleted: rows are moved, relabelled or
-- marked; the only words removed are the two verbatim duplications in (5).
--
-- What it does, in order:
--
-- 1. Equation. The SDT criterion equation rendered as raw LaTeX
--      c = - \frac{1}{2}\text{ }\lbrack\text{ }z(H) + z(F)\text{ }\rbrack
--    It becomes plain Unicode, the manuscript's formula c = −½[z(H) + z(F)]:
--      c = −½ [z(H) + z(F)]
--    (same code block, lang "math", as "d' = z(H) - z(F)" above it, which is
--    left as it is).
--
-- 2. Cleanup.
--    a. Duplicated label, Attentional networks:
--         "<strong>Superior colliculus:</strong> Superior colliculus: A midbrain…"
--       → "<strong>Superior colliculus:</strong> A midbrain…"
--    b. Repeated sentence, Neural correlates (Treue & Martinez-Trujillo):
--         "<strong>Attention to a visual feature enhances neural firing in ways
--         similar to spatial attention.</strong> Attention to a visual feature
--         enhances neural firing in ways similar to spatial attention, but the
--         underlying computation differs."
--       → "<strong>Attention to a visual feature enhances neural firing in ways
--         similar to spatial attention</strong>, but the underlying computation
--         differs."  (the run-in lead keeps its bold, once)
--    c. The two author stubs in "Human studies…" become author notes, in the
--       italic treatment of the Working Memory placeholder:
--         "Fmri work – dorsal and ventral attention networks."
--           → <em>Author note: Fmri work – dorsal and ventral attention networks.</em>
--         "Oscillations (gamma)" → <em>Author note: Oscillations (gamma)</em>
--       Their wording (including "Fmri") is the author's and is not changed.
--
-- 3. Figure numbering follows the author's manuscript, where widgets are
--    figures: 1 guru painting, 3 Posner, 4 contrast vs response gain,
--    5 biased competition, 6 feature attention. There is no Figure 2 in the
--    manuscript; the gap is left.
--    a. The four widget blocks get the author's legends: `figureNumber` and
--       `caption` fields, and the blurb (what the reader shows) opens with
--       "Figure N. <legend>." Widget ids are unchanged.
--    b. Callouts become figure_placeholder blocks ("Figure N" links):
--         "(Figure XX)" contrast grows            → (Figure 4)
--         "(Figure XX)" curves shifted left        → (Figure 4)
--         "(figure XX)" vertical stretching        → (Figure 4)
--         "(FigureYY)"  Moran and Desimone         → (Figure 5)
--         "(figureZZ)"  Treue & Martinez-Trujillo  → (Figure 6)
--       "(Cohen and Maunsell, 2010) (Figure XX)" is left as text: it means the
--       Cohen & Maunsell figure, which the manuscript does not number.
--    c. The three static figures the manuscript does not number (Cohen &
--       Maunsell 2010, the attention-network cartoon, neglect) lose the
--       numbers 2, 3 and 4 the importer gave them (which clashed with the
--       author's Figures 3 and 4): their caption lines read "Figure: …" (the
--       form of the cleaned manuscript), their animations drop
--       config.figureNumber (the pane shows "FIG"), and their animation keys
--       lose the "Fig2/3/4" suffix — the reader's figure links fall back to a
--       key ending in "Fig<N>", so "Figure 4" would otherwise jump to the
--       neglect figure:
--         animationAttentionV2Fig2 → animationAttentionV2CohenMaunsell
--         animationAttentionV2Fig3 → animationAttentionV2Network
--         animationAttentionV2Fig4 → animationAttentionV2Neglect
--       Their captions are still the importer's, pending author legends.
--
-- 4. Breakout boxes, as Foundations stores them: sections slugged box-*,
--    parent_section_id = the section, anchor_paragraph_id = the paragraph the
--    box follows. The reader anchors a box only after a TOP-LEVEL paragraph
--    (subsection_level 0), and each anchor here is the last paragraph of an
--    H3 subsection, so that one paragraph is promoted to level 0. It still
--    renders in the same place and style (.P and .subP are the same rule);
--    it just closes the subsection before the box.
--    a. box-psychometric-curve, "The Psychometric curve" (title restored),
--       after "When listeners fail to report something…" in "Attention is
--       measured behaviorally": the psychometric-function widget, then the
--       Fechner and "Plotted against stimulus strength" paragraphs.
--    b. box-signal-detection-theory, "Signal detection theory", after
--       "A cautious observer and a liberal one… SDT tells you which.": the
--       box's 4 paragraphs and 2 equations with the sdt widget where the
--       manuscript puts it, after the equations and before "z is the inverse…".
--    c. box-normalization-model, "The normalization model of attention",
--       after "Reynolds and Heeger (2009) proposed…" in "Neural Correlates…":
--       the normalization-model widget (kept first, as now), then the three
--       cases "One stimulus", "Two in receptive field", "One in, one outside
--       RF" as headings inside the box (level-1 subsection headers; they were
--       H4s under "Stimuli evoke stronger firing…"). The text is unchanged;
--       the author's rewrite (comment AK2) is still to come.
--
-- 5. Markers for the four new widgets of the Figma review: widget blocks
--    pointing at uploads, which read "This interactive isn't available yet."
--    until a widget with that slug is published (widget_uploads).
--      upload:attn-helmholtz          breakout  after the Helmholtz paragraph
--                                     (last of "The story of attention"; the
--                                     mock folds that section into the
--                                     Introduction, the book does not)
--      upload:attn-cocktail-party     inline    after the first paragraph of
--                                     "The cocktail party problem"
--      upload:attn-top-down-bottom-up inline    first in "Attentional networks"
--                                     (the static attention-network figure
--                                     stays where it is)
--      upload:attn-hemispatial-neglect inline   after the hemispatial neglect
--                                     paragraph in Disease (the static
--                                     neglect figure stays)
--    Titles and blurbs from the widget briefs; credit "Design: Malpeso
--    Studio · Build: to come".
--
-- Not done here (need the authors): the typos listed in the audit, the
-- "[ref]" placeholders, the bold run-in leads, "area MT, XX, YY, ZZ.", the
-- importer-written captions, reference entries, and the off-by-one positions
-- of the Posner/feature-attention widgets and the neglect figure.
--
-- Idempotent and guarded: one transaction; if the module is missing it
-- raises a notice and does nothing; every step matches the draft's current
-- text and does nothing once applied; boxes are created only if their slug
-- is free. A check at the end raises if the chapter is not in the expected
-- shape. Status stays draft.

BEGIN;

DO $$
DECLARE
  v_module   uuid;
  v_status   text;
  v_behav    uuid;  -- attention-is-measured-behaviorally
  v_neural   uuid;  -- neural-correlates-of-visual-attention
  v_box      uuid;
  v_anchor   uuid;
  v_start    int;
  v_sec      uuid;
  v_n        int;
  v_n2       int;
  v_n3       int;
  r          record;
BEGIN
  SELECT id, status INTO v_module, v_status
    FROM public.modules WHERE slug = 'attention-and-working-memory';
  IF v_module IS NULL THEN
    RAISE NOTICE 'OPENBRAIN-108: no attention-and-working-memory module, nothing to do';
    RETURN;
  END IF;
  IF v_status IS DISTINCT FROM 'draft' THEN
    RAISE NOTICE 'OPENBRAIN-108: the Attention chapter is %, not draft; patching anyway', v_status;
  END IF;

  SELECT id INTO v_behav FROM public.sections
   WHERE module_id = v_module AND slug = 'attention-is-measured-behaviorally';
  SELECT id INTO v_neural FROM public.sections
   WHERE module_id = v_module AND slug = 'neural-correlates-of-visual-attention';
  IF v_behav IS NULL OR v_neural IS NULL THEN
    RAISE EXCEPTION 'OPENBRAIN-108: the Attention chapter is missing its behavioural or neural-correlates section';
  END IF;

  -- ===========================================================================
  -- 1. The SDT criterion equation, raw LaTeX → Unicode
  -- ===========================================================================
  UPDATE public.paragraphs p
     SET content = jsonb_set(p.content, '{blocks,0,content}', to_jsonb($t$c = −½ [z(H) + z(F)]$t$::text)),
         content_text = $t$c = −½ [z(H) + z(F)]$t$
    FROM public.sections s
   WHERE p.section_id = s.id
     AND s.module_id = v_module
     AND p.content -> 'blocks' -> 0 ->> 'type' = 'code'
     -- The stored LaTeX has thin spaces (U+2009) inside \text{ }, so match
     -- on its parts rather than the whole string.
     AND left(p.content -> 'blocks' -> 0 ->> 'content', 6) = 'c = - '
     AND strpos(p.content -> 'blocks' -> 0 ->> 'content', $t$\frac{1}{2}$t$) > 0
     AND strpos(p.content -> 'blocks' -> 0 ->> 'content', $t$z(H) + z(F)$t$) > 0;

  -- ===========================================================================
  -- 2. Cleanup
  -- ===========================================================================
  -- 2a. "Superior colliculus: Superior colliculus:" (label repeated)
  UPDATE public.paragraphs p
     SET content = jsonb_set(p.content, '{blocks,0,content}', to_jsonb(replace(
           p.content -> 'blocks' -> 0 ->> 'content',
           $t$<strong>Superior colliculus:</strong> Superior colliculus: $t$,
           $t$<strong>Superior colliculus:</strong> $t$))),
         content_text = replace(p.content_text,
           $t$Superior colliculus: Superior colliculus: $t$,
           $t$Superior colliculus: $t$)
    FROM public.sections s
   WHERE p.section_id = s.id
     AND s.module_id = v_module
     AND strpos(p.content -> 'blocks' -> 0 ->> 'content',
                $t$<strong>Superior colliculus:</strong> Superior colliculus: $t$) > 0;

  -- 2b. The feature-attention lead sentence, repeated
  UPDATE public.paragraphs p
     SET content = jsonb_set(p.content, '{blocks,0,content}', to_jsonb(replace(
           p.content -> 'blocks' -> 0 ->> 'content',
           $t$<strong>Attention to a visual feature enhances neural firing in ways similar to spatial attention.</strong> Attention to a visual feature enhances neural firing in ways similar to spatial attention, but$t$,
           $t$<strong>Attention to a visual feature enhances neural firing in ways similar to spatial attention</strong>, but$t$))),
         content_text = replace(p.content_text,
           $t$Attention to a visual feature enhances neural firing in ways similar to spatial attention. Attention to a visual feature enhances neural firing in ways similar to spatial attention, but$t$,
           $t$Attention to a visual feature enhances neural firing in ways similar to spatial attention, but$t$)
    FROM public.sections s
   WHERE p.section_id = s.id
     AND s.module_id = v_module
     AND strpos(p.content -> 'blocks' -> 0 ->> 'content',
                $t$<strong>Attention to a visual feature enhances neural firing in ways similar to spatial attention.</strong> Attention to a visual feature enhances neural firing in ways similar to spatial attention, but$t$) > 0;

  -- 2c. The two author stubs become marked author notes
  UPDATE public.paragraphs p
     SET content = jsonb_set(p.content, '{blocks,0,content}',
           to_jsonb('<em>Author note: ' || (p.content -> 'blocks' -> 0 ->> 'content') || '</em>')),
         content_text = 'Author note: ' || (p.content -> 'blocks' -> 0 ->> 'content')
    FROM public.sections s
   WHERE p.section_id = s.id
     AND s.module_id = v_module
     AND s.slug = 'human-studies-reveal-rhythmic-interactions-between-attention-brain-areas'
     AND jsonb_array_length(p.content -> 'blocks') = 1
     AND p.content -> 'blocks' -> 0 ->> 'type' = 'text'
     AND p.content -> 'blocks' -> 0 ->> 'content' IN (
           $t$Fmri work – dorsal and ventral attention networks.$t$,
           $t$Oscillations (gamma)$t$);

  -- ===========================================================================
  -- 3. Figure numbering (the author's)
  -- ===========================================================================
  -- 3a. Figures 3–6 are widgets: their legends from the manuscript
  FOR r IN
    SELECT * FROM (VALUES
      ('posner-cueing',          3, $t$Posner Invalid Cueing task$t$),
      ('contrast-response-gain', 4, $t$Contrast vs response gain$t$),
      ('biased-competition',     5, $t$Attention biases competition between stimuli in the receptive field$t$),
      ('tmt-feature-attention',  6, $t$Feature Attention$t$)
    ) AS v(widget_id, num, caption)
  LOOP
    UPDATE public.paragraphs p
       SET content = jsonb_set(p.content, '{blocks,0}',
             (p.content -> 'blocks' -> 0) || jsonb_build_object(
               'figureNumber', r.num,
               'caption', r.caption,
               'blurb', 'Figure ' || r.num || '. ' || r.caption || '. '
                        || coalesce(p.content -> 'blocks' -> 0 ->> 'blurb', '')))
      FROM public.sections s
     WHERE p.section_id = s.id
       AND s.module_id = v_module
       AND p.content -> 'blocks' -> 0 ->> 'type' = 'widget'
       AND p.content -> 'blocks' -> 0 ->> 'widgetId' = r.widget_id
       AND NOT (p.content -> 'blocks' -> 0 ? 'figureNumber');
  END LOOP;

  -- 3b. "(Figure XX)" callouts → figure_placeholder blocks. Each is in a
  -- one-text-block paragraph of "Neural Correlates…"; the block is split
  -- around the callout: "…(" + Figure N + ")…".
  FOR r IN
    SELECT * FROM (VALUES
      ($t$(Figure XX)$t$, $t$many neurons, including those within the cortex, increase their firing as stimulus contrast grows (Figure XX)$t$, 4),
      ($t$(Figure XX)$t$, $t$shifted left when attention is placed upon a stimulus residing in the receptive field (Figure XX)$t$, 4),
      ($t$(figure XX)$t$, $t$recordings would show a vertical stretching (figure XX)$t$, 4),
      ($t$(FigureYY)$t$,  $t$filtered out of its receptive field entirely. (FigureYY)$t$, 5),
      ($t$(figureZZ)$t$,  $t$in the opposite hemifield, entirely outside it (figureZZ)$t$, 6)
    ) AS v(callout, context, num)
  LOOP
    UPDATE public.paragraphs p
       SET content = (p.content - 'blocks') || jsonb_build_object('blocks', jsonb_build_array(
             jsonb_build_object('type', 'text', 'content',
               left(p.content -> 'blocks' -> 0 ->> 'content',
                    strpos(p.content -> 'blocks' -> 0 ->> 'content', r.callout))),
             jsonb_build_object('type', 'figure_placeholder', 'number', r.num),
             jsonb_build_object('type', 'text', 'content',
               substr(p.content -> 'blocks' -> 0 ->> 'content',
                      strpos(p.content -> 'blocks' -> 0 ->> 'content', r.callout)
                        + length(r.callout) - 1)))),
           content_text = replace(p.content_text, r.callout, '(Figure ' || r.num || ')')
      FROM public.sections s
     WHERE p.section_id = s.id
       AND s.id = v_neural
       AND jsonb_array_length(p.content -> 'blocks') = 1
       AND p.content -> 'blocks' -> 0 ->> 'type' = 'text'
       AND strpos(p.content -> 'blocks' -> 0 ->> 'content', r.context) > 0;
  END LOOP;

  -- 3c. The static figures the manuscript does not number
  FOR r IN
    SELECT * FROM (VALUES
      ('animationAttentionV2Fig2', 'animationAttentionV2CohenMaunsell'),
      ('animationAttentionV2Fig3', 'animationAttentionV2Network'),
      ('animationAttentionV2Fig4', 'animationAttentionV2Neglect')
    ) AS v(old_key, new_key)
  LOOP
    -- The caption line in the text: "Figure N. caption" → "Figure: caption"
    UPDATE public.paragraphs p
       SET content = (p.content - 'blocks') || jsonb_build_object('blocks', jsonb_build_array(
             jsonb_build_object('type', 'text', 'content',
               'Figure: ' || (p.content -> 'blocks' -> 0 ->> 'caption')))),
           content_text = 'Figure: ' || (p.content -> 'blocks' -> 0 ->> 'caption')
      FROM public.sections s, public.animations a
     WHERE p.section_id = s.id
       AND s.module_id = v_module
       AND a.id = p.animation_id
       AND a.animation_key IN (r.old_key, r.new_key)
       AND p.content -> 'blocks' -> 0 ->> 'type' = 'figure_placeholder'
       AND p.content -> 'blocks' -> 0 ->> 'caption' IS NOT NULL;

    -- The pane: no number, and a key with no number in it
    UPDATE public.animations a
       SET animation_key = r.new_key,
           config = a.config - 'figureNumber',
           description = regexp_replace(a.description,
             '^Figure [0-9]+ of ', 'An unnumbered figure of '),
           updated_at = now()
     WHERE a.animation_key = r.old_key
       AND NOT EXISTS (SELECT 1 FROM public.animations b WHERE b.animation_key = r.new_key);
  END LOOP;

  -- ===========================================================================
  -- 4. Breakout boxes
  -- ===========================================================================
  -- 4a. The Psychometric curve
  IF NOT EXISTS (SELECT 1 FROM public.sections
                  WHERE module_id = v_module AND slug = 'box-psychometric-curve') THEN
    SELECT p.id INTO v_anchor FROM public.paragraphs p
     WHERE p.section_id = v_behav
       AND p.content_text LIKE 'When listeners fail to report something, its origin is ambiguous.%'
     ORDER BY p.order_index LIMIT 1;
    IF v_anchor IS NULL THEN
      RAISE EXCEPTION 'OPENBRAIN-108: psychometric box anchor paragraph not found';
    END IF;
    UPDATE public.paragraphs SET subsection_level = 0
     WHERE id = v_anchor AND NOT coalesce(is_subsection_header, false);

    INSERT INTO public.sections (module_id, title, slug, order_index, parent_section_id, anchor_paragraph_id)
    VALUES (v_module, $t$The Psychometric curve$t$, 'box-psychometric-curve',
            (SELECT max(order_index) + 1 FROM public.sections WHERE module_id = v_module),
            v_behav, v_anchor)
    RETURNING id INTO v_box;

    UPDATE public.paragraphs p
       SET section_id = v_box, order_index = m.ord,
           subsection_level = 0, is_subsection_header = false
      FROM (
        SELECT q.id, CASE
                 WHEN q.content -> 'blocks' -> 0 ->> 'widgetId' = 'psychometric-function' THEN 0
                 WHEN q.content_text LIKE 'Gustav Fechner''s psychophysical methods, set out in 1860%' THEN 1
                 WHEN q.content_text LIKE 'Plotted against stimulus strength, those proportions trace a sigmoid curve%' THEN 2
               END AS ord
          FROM public.paragraphs q WHERE q.section_id = v_behav
      ) m
     WHERE p.id = m.id AND m.ord IS NOT NULL;
  END IF;

  -- 4b. Signal detection theory
  IF NOT EXISTS (SELECT 1 FROM public.sections
                  WHERE module_id = v_module AND slug = 'box-signal-detection-theory') THEN
    SELECT p.id INTO v_anchor FROM public.paragraphs p
     WHERE p.section_id = v_behav
       AND p.content_text LIKE 'A cautious observer and a liberal one may have identical sensitivity%'
     ORDER BY p.order_index LIMIT 1;
    IF v_anchor IS NULL THEN
      RAISE EXCEPTION 'OPENBRAIN-108: SDT box anchor paragraph not found';
    END IF;
    UPDATE public.paragraphs SET subsection_level = 0
     WHERE id = v_anchor AND NOT coalesce(is_subsection_header, false);

    INSERT INTO public.sections (module_id, title, slug, order_index, parent_section_id, anchor_paragraph_id)
    VALUES (v_module, $t$Signal detection theory$t$, 'box-signal-detection-theory',
            (SELECT max(order_index) + 1 FROM public.sections WHERE module_id = v_module),
            v_behav, v_anchor)
    RETURNING id INTO v_box;

    -- The manuscript's order: text, text, d′, c, the widget, text, text.
    UPDATE public.paragraphs p
       SET section_id = v_box, order_index = m.ord,
           subsection_level = 0, is_subsection_header = false
      FROM (
        SELECT q.id, CASE
                 WHEN q.content_text LIKE 'Signal detection theory models “noise” and “signal”%' THEN 0
                 WHEN q.content_text LIKE 'The distance between the arithmetic means of the two distributions%' THEN 1
                 WHEN q.content -> 'blocks' -> 0 ->> 'type' = 'code'
                  AND q.content -> 'blocks' -> 0 ->> 'content' = $t$d' = z(H) - z(F)$t$ THEN 2
                 WHEN q.content -> 'blocks' -> 0 ->> 'type' = 'code'
                  AND q.content -> 'blocks' -> 0 ->> 'content' = $t$c = −½ [z(H) + z(F)]$t$ THEN 3
                 WHEN q.content -> 'blocks' -> 0 ->> 'widgetId' = 'sdt' THEN 4
                 WHEN q.content_text LIKE 'z is the inverse of the normal distribution%' THEN 5
                 WHEN q.content_text LIKE 'Plotting hit rate against false-alarm rate%' THEN 6
               END AS ord
          FROM public.paragraphs q WHERE q.section_id = v_behav
      ) m
     WHERE p.id = m.id AND m.ord IS NOT NULL;
  END IF;

  -- 4c. The normalization model of attention: the widget and everything
  -- after it in "Neural Correlates…" (the three cases run to the section end).
  IF NOT EXISTS (SELECT 1 FROM public.sections
                  WHERE module_id = v_module AND slug = 'box-normalization-model') THEN
    SELECT p.order_index INTO v_start FROM public.paragraphs p
     WHERE p.section_id = v_neural
       AND p.content -> 'blocks' -> 0 ->> 'widgetId' = 'normalization-model';
    SELECT p.id INTO v_anchor FROM public.paragraphs p
     WHERE p.section_id = v_neural
       AND p.content_text LIKE 'Reynolds and Heeger (2009) proposed that attention acts directly%'
     ORDER BY p.order_index LIMIT 1;
    IF v_start IS NULL OR v_anchor IS NULL THEN
      RAISE EXCEPTION 'OPENBRAIN-108: normalization box widget or anchor paragraph not found';
    END IF;
    UPDATE public.paragraphs SET subsection_level = 0
     WHERE id = v_anchor AND NOT coalesce(is_subsection_header, false);

    INSERT INTO public.sections (module_id, title, slug, order_index, parent_section_id, anchor_paragraph_id)
    VALUES (v_module, $t$The normalization model of attention$t$, 'box-normalization-model',
            (SELECT max(order_index) + 1 FROM public.sections WHERE module_id = v_module),
            v_neural, v_anchor)
    RETURNING id INTO v_box;

    -- Widget first (level 0); the three cases as level-1 subsections.
    UPDATE public.paragraphs p
       SET section_id = v_box,
           order_index = m.ord,
           subsection_level = CASE WHEN m.is_widget THEN 0 ELSE 1 END,
           content = CASE
             WHEN p.is_subsection_header
              AND p.content -> 'blocks' -> 0 ->> 'type' = 'heading'
               THEN jsonb_set(p.content, '{blocks,0,level}', '3'::jsonb)
             ELSE p.content END
      FROM (
        SELECT q.id,
               (row_number() OVER (ORDER BY q.order_index) - 1)::int AS ord,
               coalesce(q.content -> 'blocks' -> 0 ->> 'type' = 'widget', false) AS is_widget
          FROM public.paragraphs q
         WHERE q.section_id = v_neural AND q.order_index >= v_start
      ) m
     WHERE p.id = m.id;
  END IF;

  -- ===========================================================================
  -- 5. Markers for the new widgets (uploads to come)
  -- ===========================================================================
  FOR r IN
    SELECT * FROM (VALUES
      ('the-story-of-attention',
       'As is often the case with science, that “something” had already been caught in the act%',
       0, 'upload:attn-helmholtz', 'breakout', 'attention-helmholtz',
       $t$Helmholtz Attention (the Black Room)$t$,
       $t$Covert attention: keep your eyes on the fixation point and you can still read a letter in the periphery if you attended its location before the flash, and lose it if you did not. A recreation of Helmholtz's darkened room, lit by a spark.$t$),
      ('attention-is-measured-behaviorally',
       'How do we follow one conversation in a noisy room while ignoring all others%',
       1, 'upload:attn-cocktail-party', 'inline', 'attention-cocktail-party',
       $t$The cocktail party problem$t$,
       $t$Selective listening: with several conversations at the same volume, tune into one and it comes forward while the rest fade, an exaggerated stand-in for what your brain does automatically.$t$),
      ('primate-studies-suggest-that-brain-regions-involved-in-saccade-generation-and-planning-are-also-used-for-attention',
       'Attentional networks',
       1, 'upload:attn-top-down-bottom-up', 'inline', 'attention-top-down-bottom-up',
       $t$Bottom up vs. Top down attention$t$,
       $t$Attention can be captured from the bottom up, by a salient stimulus, or directed from the top down, by a goal, and the two run through the attention network in opposite directions.$t$),
      ('disease',
       'Unilateral damage to the same broad region produces a related but distinct syndrome%',
       0, 'upload:attn-hemispatial-neglect', 'inline', 'attention-hemispatial-neglect',
       $t$Hemispatial neglect$t$,
       $t$After right parietal damage, patients ignore the left side of space: asked to copy a clock, a house and a flower, they leave out much of the left side of each drawing.$t$)
    ) AS v(section_slug, anchor_like, lvl, widget_id, kind, placement_id, title, blurb)
  LOOP
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM public.paragraphs p JOIN public.sections s ON s.id = p.section_id
       WHERE s.module_id = v_module
         AND p.content -> 'blocks' -> 0 ->> 'widgetId' = r.widget_id);

    SELECT p.section_id, p.order_index INTO v_sec, v_start
      FROM public.paragraphs p JOIN public.sections s ON s.id = p.section_id
     WHERE s.module_id = v_module AND s.slug = r.section_slug
       AND p.content_text LIKE r.anchor_like
     ORDER BY p.order_index LIMIT 1;
    IF v_sec IS NULL THEN
      RAISE EXCEPTION 'OPENBRAIN-108: no paragraph to place % after', r.widget_id;
    END IF;

    -- Make room right after the anchor (two steps: order_index is unique
    -- per section and checked row by row).
    SELECT max(order_index) + 1 INTO v_n FROM public.paragraphs WHERE section_id = v_sec;
    UPDATE public.paragraphs SET order_index = order_index + v_n
     WHERE section_id = v_sec AND order_index > v_start;
    UPDATE public.paragraphs SET order_index = order_index - v_n + 1
     WHERE section_id = v_sec AND order_index >= v_start + 1 + v_n;

    INSERT INTO public.paragraphs (section_id, content, content_text, order_index, has_animation,
                                   animation_id, animation_trigger, is_subsection_header, subsection_level)
    VALUES (v_sec,
            jsonb_build_object('blocks', jsonb_build_array(jsonb_build_object(
              'type', 'widget',
              'widgetId', r.widget_id,
              'kind', r.kind,
              'title', r.title,
              'blurb', r.blurb,
              'credit', 'Design: Malpeso Studio · Build: to come',
              'placementId', r.placement_id))),
            'Interactive: ' || r.title,
            v_start + 1, false, NULL, NULL, false, r.lvl);
  END LOOP;

  -- ===========================================================================
  -- Check
  -- ===========================================================================
  -- Three boxes, each after a top-level paragraph of its own parent section
  SELECT count(*) INTO v_n
    FROM public.sections box
    JOIN public.sections parent ON parent.id = box.parent_section_id
    JOIN public.paragraphs p ON p.id = box.anchor_paragraph_id
   WHERE box.module_id = v_module
     AND box.slug IN ('box-psychometric-curve', 'box-signal-detection-theory', 'box-normalization-model')
     AND parent.module_id = v_module
     AND parent.slug NOT LIKE 'box-%'
     AND parent.slug <> 'introduction'
     AND p.section_id = parent.id
     AND p.subsection_level = 0;
  IF v_n <> 3 THEN
    RAISE EXCEPTION 'OPENBRAIN-108: % of 3 boxes placed on a top-level paragraph', v_n;
  END IF;

  FOR r IN
    SELECT * FROM (VALUES
      ('box-psychometric-curve', 3), ('box-signal-detection-theory', 7), ('box-normalization-model', 30)
    ) AS v(slug, expected)
  LOOP
    SELECT count(*) INTO v_n FROM public.paragraphs p JOIN public.sections s ON s.id = p.section_id
     WHERE s.module_id = v_module AND s.slug = r.slug;
    IF v_n <> r.expected THEN
      RAISE EXCEPTION 'OPENBRAIN-108: % has % paragraphs, expected %', r.slug, v_n, r.expected;
    END IF;
  END LOOP;

  -- Nothing left at level 2 (a level-2 row with no subsection is dropped by
  -- the reader's reconstructNesting)
  SELECT count(*) INTO v_n FROM public.paragraphs p JOIN public.sections s ON s.id = p.section_id
   WHERE s.module_id = v_module AND p.subsection_level >= 2;
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'OPENBRAIN-108: % paragraphs still at subsection level 2', v_n;
  END IF;

  -- Widgets: the nine, unchanged ids, once each, plus the four markers
  SELECT count(*) INTO v_n
    FROM public.paragraphs p JOIN public.sections s ON s.id = p.section_id,
         jsonb_array_elements(p.content -> 'blocks') b
   WHERE s.module_id = v_module AND b ->> 'type' = 'widget';
  IF v_n <> 13 THEN
    RAISE EXCEPTION 'OPENBRAIN-108: % widget blocks, expected 13', v_n;
  END IF;
  SELECT count(DISTINCT b ->> 'widgetId') INTO v_n
    FROM public.paragraphs p JOIN public.sections s ON s.id = p.section_id,
         jsonb_array_elements(p.content -> 'blocks') b
   WHERE s.module_id = v_module AND b ->> 'type' = 'widget'
     AND b ->> 'widgetId' IN ('posner-cueing', 'contrast-response-gain', 'biased-competition',
       'tmt-feature-attention', 'sdt', 'psychometric-function', 'normalization-model',
       'corbetta-pet-attention', 'hillyard-attention-erp', 'upload:attn-helmholtz',
       'upload:attn-cocktail-party', 'upload:attn-top-down-bottom-up', 'upload:attn-hemispatial-neglect');
  IF v_n <> 13 THEN
    RAISE EXCEPTION 'OPENBRAIN-108: % of 13 expected widget ids present', v_n;
  END IF;
  SELECT count(*) INTO v_n
    FROM public.paragraphs p JOIN public.sections s ON s.id = p.section_id,
         jsonb_array_elements(p.content -> 'blocks') b
   WHERE s.module_id = v_module AND b ->> 'type' = 'widget' AND b ? 'figureNumber';
  IF v_n <> 4 THEN
    RAISE EXCEPTION 'OPENBRAIN-108: % of 4 widget figures numbered', v_n;
  END IF;

  -- Callouts: Figure 4 ×3, 5, 6, and no other numbered callout
  SELECT count(*) FILTER (WHERE (b ->> 'number') = '4'),
         count(*) FILTER (WHERE (b ->> 'number') IN ('5', '6')),
         count(*) FILTER (WHERE (b ->> 'number') NOT IN ('1', '4', '5', '6'))
    INTO v_n, v_n2, v_n3
    FROM public.paragraphs p JOIN public.sections s ON s.id = p.section_id,
         jsonb_array_elements(p.content -> 'blocks') b
   WHERE s.module_id = v_module AND b ->> 'type' = 'figure_placeholder';
  IF v_n <> 3 OR v_n2 <> 2 OR v_n3 <> 0 THEN
    RAISE EXCEPTION 'OPENBRAIN-108: figure callouts 4: % (expected 3), 5/6: % (2), others: % (0)',
      v_n, v_n2, v_n3;
  END IF;

  SELECT count(*) INTO v_n FROM public.animations
   WHERE animation_key IN ('animationAttentionV2CohenMaunsell', 'animationAttentionV2Network',
                           'animationAttentionV2Neglect')
     AND NOT (config ? 'figureNumber');
  IF v_n <> 3 THEN
    RAISE EXCEPTION 'OPENBRAIN-108: % of 3 static figures unnumbered', v_n;
  END IF;

  -- Text fixes
  SELECT count(*) INTO v_n FROM public.paragraphs p JOIN public.sections s ON s.id = p.section_id
   WHERE s.module_id = v_module
     AND (strpos(p.content::text, 'frac{1}{2}') > 0
          OR p.content::text LIKE '%Superior colliculus:</strong> Superior colliculus:%'
          OR p.content::text LIKE '%spatial attention.</strong> Attention to a visual feature%');
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'OPENBRAIN-108: % paragraphs still have raw LaTeX or a duplication', v_n;
  END IF;
  SELECT count(*) INTO v_n FROM public.paragraphs p JOIN public.sections s ON s.id = p.section_id
   WHERE s.module_id = v_module
     AND p.content -> 'blocks' -> 0 ->> 'content' LIKE '<em>Author note: %';
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'OPENBRAIN-108: % of 2 author notes marked', v_n;
  END IF;
END $$;

COMMIT;
