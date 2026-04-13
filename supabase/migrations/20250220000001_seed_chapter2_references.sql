-- Ensure the "references" table exists (may have been skipped due to reserved-word issue)
CREATE TABLE IF NOT EXISTS "references" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  authors TEXT NOT NULL,
  title TEXT NOT NULL,
  journal TEXT,
  year INTEGER,
  volume TEXT,
  pages TEXT,
  doi TEXT,
  url TEXT,
  pub_type TEXT DEFAULT 'article',
  raw_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_id, number)
);

ALTER TABLE "references" ENABLE ROW LEVEL SECURITY;

-- Idempotent policy creation (drop if exists, then create)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can read references" ON "references";
  DROP POLICY IF EXISTS "Creators can insert references" ON "references";
  DROP POLICY IF EXISTS "Creators can update references" ON "references";
  DROP POLICY IF EXISTS "Creators can delete references" ON "references";
END $$;

CREATE POLICY "Anyone can read references" ON "references" FOR SELECT USING (true);
CREATE POLICY "Creators can insert references" ON "references" FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'creator'));
CREATE POLICY "Creators can update references" ON "references" FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'creator'));
CREATE POLICY "Creators can delete references" ON "references" FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'creator'));

CREATE INDEX IF NOT EXISTS idx_references_module_id ON "references"(module_id);

-- Seed references for Chapter 2 (Visual Perception & UX)
-- Uses a subquery so it gracefully does nothing if the module doesn't exist yet.

DO $$
DECLARE
  v_module_id UUID;
BEGIN
  -- Look up the Chapter 2 module
  SELECT id INTO v_module_id
  FROM modules
  WHERE slug = 'visual-perception-ux'
  LIMIT 1;

  -- If no module found, exit gracefully
  IF v_module_id IS NULL THEN
    RAISE NOTICE 'Module visual-perception-ux not found — skipping reference seed.';
    RETURN;
  END IF;

  -- Insert 15 neuroscience / visual perception references
  INSERT INTO "references" (module_id, number, authors, title, journal, year, volume, pages, doi, pub_type)
  VALUES
    (v_module_id, 1, 'Hubel, D.H. & Wiesel, T.N.', 'Receptive fields, binocular interaction and functional architecture in the cat''s visual cortex', 'The Journal of Physiology', 1962, '160(1)', '106-154', '10.1113/jphysiol.1962.sp006837', 'article'),
    (v_module_id, 2, 'Marr, D.', 'Vision: A Computational Investigation into the Human Representation and Processing of Visual Information', NULL, 1982, NULL, NULL, NULL, 'book'),
    (v_module_id, 3, 'Wandell, B.A.', 'Foundations of Vision', NULL, 1995, NULL, NULL, NULL, 'book'),
    (v_module_id, 4, 'Palmer, S.E.', 'Vision Science: Photons to Phenomenology', NULL, 1999, NULL, NULL, NULL, 'book'),
    (v_module_id, 5, 'Treisman, A.M. & Gelade, G.', 'A feature-integration theory of attention', 'Cognitive Psychology', 1980, '12(1)', '97-136', '10.1016/0010-0285(80)90005-5', 'article'),
    (v_module_id, 6, 'Ware, C.', 'Information Visualization: Perception for Design', NULL, 2020, NULL, NULL, '10.1016/C2016-0-02395-1', 'book'),
    (v_module_id, 7, 'Wolfe, J.M. & Horowitz, T.S.', 'Five factors that guide attention in visual search', 'Nature Human Behaviour', 2017, '1(3)', '0058', '10.1038/s41562-017-0058', 'article'),
    (v_module_id, 8, 'Livingstone, M. & Hubel, D.', 'Segregation of form, color, movement, and depth: anatomy, physiology, and perception', 'Science', 1988, '240(4853)', '740-749', '10.1126/science.3283936', 'article'),
    (v_module_id, 9, 'Ungerleider, L.G. & Mishkin, M.', 'Two cortical visual systems', 'Analysis of Visual Behavior', 1982, NULL, '549-586', NULL, 'chapter'),
    (v_module_id, 10, 'Norman, D.A.', 'The Design of Everyday Things', NULL, 2013, NULL, NULL, NULL, 'book'),
    (v_module_id, 11, 'Healey, C.G. & Enns, J.T.', 'Attention and visual memory in visualization and computer graphics', 'IEEE Transactions on Visualization and Computer Graphics', 2012, '18(7)', '1170-1188', '10.1109/TVCG.2011.127', 'article'),
    (v_module_id, 12, 'Zeki, S.', 'A century of cerebral achromatopsia', 'Brain', 1990, '113(6)', '1721-1777', '10.1093/brain/113.6.1721', 'article'),
    (v_module_id, 13, 'Yarbus, A.L.', 'Eye Movements and Vision', NULL, 1967, NULL, NULL, NULL, 'book'),
    (v_module_id, 14, 'Borji, A. & Itti, L.', 'State-of-the-art in visual attention modeling', 'IEEE Transactions on Pattern Analysis and Machine Intelligence', 2013, '35(1)', '185-207', '10.1109/TPAMI.2012.89', 'article'),
    (v_module_id, 15, 'Johnson, J.', 'Designing with the Mind in Mind: Simple Guide to Understanding User Interface Design Guidelines', NULL, 2020, NULL, NULL, NULL, 'book')
  ON CONFLICT (module_id, number) DO NOTHING;

  RAISE NOTICE 'Inserted % references for module %', 15, v_module_id;

  -- Inject citation_ref blocks into a few existing paragraphs.
  -- We update the first 3 paragraphs of the first non-intro section
  -- by appending citation_ref blocks to their content.blocks array.
  UPDATE paragraphs
  SET content = jsonb_set(
    content,
    '{blocks}',
    content->'blocks' || '[{"type": "citation_ref", "number": 1}]'::jsonb
  )
  WHERE section_id = (
    SELECT s.id FROM sections s
    WHERE s.module_id = v_module_id
      AND s.order_index = 1
    LIMIT 1
  )
  AND order_index = 0
  AND content IS NOT NULL
  AND content->'blocks' IS NOT NULL;

  UPDATE paragraphs
  SET content = jsonb_set(
    content,
    '{blocks}',
    content->'blocks' || '[{"type": "citation_ref", "number": 5}]'::jsonb
  )
  WHERE section_id = (
    SELECT s.id FROM sections s
    WHERE s.module_id = v_module_id
      AND s.order_index = 1
    LIMIT 1
  )
  AND order_index = 1
  AND content IS NOT NULL
  AND content->'blocks' IS NOT NULL;

  UPDATE paragraphs
  SET content = jsonb_set(
    content,
    '{blocks}',
    content->'blocks' || '[{"type": "citation_ref", "number": 8}]'::jsonb
  )
  WHERE section_id = (
    SELECT s.id FROM sections s
    WHERE s.module_id = v_module_id
      AND s.order_index = 2
    LIMIT 1
  )
  AND order_index = 0
  AND content IS NOT NULL
  AND content->'blocks' IS NOT NULL;

END $$;
