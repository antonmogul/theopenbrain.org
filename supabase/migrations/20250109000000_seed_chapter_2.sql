-- =============================================================================
-- Chapter 2: Visual Perception and UX - Database Seed Script
-- Migration: 20250109000000_seed_chapter_2.sql
-- Description: Seeds Chapter 2 content into the database with proper relationships
-- 
-- IMPORTANT: This script should be run with service_role or superuser privileges
-- to bypass RLS policies during seeding.
-- =============================================================================

-- Use a transaction to ensure atomic insertion
BEGIN;

-- =============================================================================
-- Helper: Create a placeholder creator profile if none exists
-- In production, replace this with an actual creator user ID
-- =============================================================================

-- Note: This script requires an existing creator profile in the profiles table
-- The profiles table has a foreign key to auth.users, so you must:
-- 1. Create a user via Supabase Auth (sign up in your app, or use Supabase dashboard)
-- 2. Then create a profile for that user with role='creator'
-- 
-- OR run this script with service_role key which can bypass RLS
-- 
-- For now, we'll use the first creator profile found, or raise an error if none exists

-- =============================================================================
-- Variables for IDs (using DO block to handle references)
-- =============================================================================

DO $$
DECLARE
  -- Get creator ID (either seed user or first creator in profiles)
  v_creator_id UUID;
  
  -- Content version and module IDs
  v_content_version_id UUID;
  v_module_id UUID;
  
  -- Section IDs
  v_section_intro_id UUID;
  v_section_1_id UUID;
  v_section_2_id UUID;
  v_section_3_id UUID;
  v_section_4_id UUID;
  v_section_5_id UUID;
  v_section_6_id UUID;
  v_section_7_id UUID;
  v_section_8_id UUID;
  v_section_9_id UUID;
  v_section_10_id UUID;
  v_section_11_id UUID;
  v_section_glossary_id UUID;
  v_section_resources_id UUID;

BEGIN
  -- Get creator ID (try to find existing creator)
  SELECT id INTO v_creator_id FROM profiles WHERE role = 'creator' LIMIT 1;
  
  -- If no creator exists, try to use any existing profile (for development)
  IF v_creator_id IS NULL THEN
    SELECT id INTO v_creator_id FROM profiles LIMIT 1;
  END IF;
  
  -- If still no profile exists, we need to create one
  -- But we can't create a profile without an auth user
  -- So we'll use a workaround: create content with a placeholder UUID
  -- This will work if RLS is temporarily disabled or using service_role
  IF v_creator_id IS NULL THEN
    -- Use a placeholder UUID - this will only work if:
    -- 1. RLS is disabled on content_versions/modules tables, OR
    -- 2. Running with service_role key
    v_creator_id := '00000000-0000-0000-0000-000000000000';
    RAISE NOTICE 'WARNING: No creator profile found. Using placeholder UUID.';
    RAISE NOTICE 'This will only work if RLS is disabled or using service_role key.';
    RAISE NOTICE 'Recommended: Create a creator user first via Supabase Auth.';
  END IF;

  -- =============================================================================
  -- 1. Create Content Version
  -- =============================================================================
  
  INSERT INTO content_versions (version_number, status, created_by, release_notes)
  VALUES ('1.0', 'draft', v_creator_id, 'Initial release of Chapter 2: Visual Perception and UX')
  RETURNING id INTO v_content_version_id;
  
  RAISE NOTICE 'Created content version: %', v_content_version_id;

  -- =============================================================================
  -- 2. Create Module (Chapter 2)
  -- =============================================================================
  
  INSERT INTO modules (
    content_version_id,
    title,
    slug,
    description,
    order_index,
    status,
    created_by,
    layout_config
  )
  VALUES (
    v_content_version_id,
    'Visual Perception and UX',
    'visual-perception-ux',
    'This chapter bridges neuroscience and user experience design, exploring how the brain''s visual processing systems shape interface design principles.',
    1,  -- Chapter 2, order_index 1 (assuming Chapter 1 is order_index 0)
    'draft',
    v_creator_id,
    '{"defaultLayout": "split-screen", "animationPosition": "right"}'::JSONB
  )
  RETURNING id INTO v_module_id;
  
  RAISE NOTICE 'Created module: %', v_module_id;

  -- =============================================================================
  -- 3. Create Sections
  -- =============================================================================
  
  -- Section 0: Introduction
  INSERT INTO sections (module_id, title, slug, order_index, introduction_text)
  VALUES (
    v_module_id,
    'Introduction',
    'introduction',
    0,
    'Why understanding visual neuroscience matters for UX practitioners.'
  )
  RETURNING id INTO v_section_intro_id;
  
  -- Section 1: From Retina to Recognition
  INSERT INTO sections (module_id, title, slug, order_index, introduction_text)
  VALUES (
    v_module_id,
    'From Retina to Recognition',
    'from-retina-to-recognition',
    1,
    'Bridge the previous chapter on retinal processing to higher-level visual cognition.'
  )
  RETURNING id INTO v_section_1_id;
  
  -- Section 2: The Attention Economy of the Brain
  INSERT INTO sections (module_id, title, slug, order_index, introduction_text)
  VALUES (
    v_module_id,
    'The Attention Economy of the Brain',
    'attention-economy',
    2,
    'Explain selective attention as a limited resource and its profound implications for interface design.'
  )
  RETURNING id INTO v_section_2_id;
  
  -- Section 3: Foveal vs Peripheral Processing
  INSERT INTO sections (module_id, title, slug, order_index, introduction_text)
  VALUES (
    v_module_id,
    'Foveal vs Peripheral Processing',
    'foveal-peripheral-processing',
    3,
    'Explain the dramatic difference between central and peripheral vision and why this matters enormously for interface layout.'
  )
  RETURNING id INTO v_section_3_id;
  
  -- Section 4: Saccades, Fixations and Scanning Patterns
  INSERT INTO sections (module_id, title, slug, order_index, introduction_text)
  VALUES (
    v_module_id,
    'Saccades, Fixations and Scanning Patterns',
    'saccades-fixations-scanning',
    4,
    'Explain how eyes actually move across interfaces and debunk common myths about reading patterns.'
  )
  RETURNING id INTO v_section_4_id;
  
  -- Section 5: Gestalt Principles
  INSERT INTO sections (module_id, title, slug, order_index, introduction_text)
  VALUES (
    v_module_id,
    'Gestalt Principles — The Brain''s Grouping Heuristics',
    'gestalt-principles',
    5,
    'Explain Gestalt principles not as arbitrary design rules but as reflections of neural visual processing.'
  )
  RETURNING id INTO v_section_5_id;
  
  -- Section 6: Color Perception and Its Limits
  INSERT INTO sections (module_id, title, slug, order_index, introduction_text)
  VALUES (
    v_module_id,
    'Color Perception and Its Limits',
    'color-perception',
    6,
    'Explain color vision mechanisms and their direct implications for accessible, effective color use in interfaces.'
  )
  RETURNING id INTO v_section_6_id;
  
  -- Section 7: Cognitive Load and Working Memory
  INSERT INTO sections (module_id, title, slug, order_index, introduction_text)
  VALUES (
    v_module_id,
    'Cognitive Load and Working Memory',
    'cognitive-load-working-memory',
    7,
    'Explain memory limitations and cognitive load as fundamental constraints on interface complexity.'
  )
  RETURNING id INTO v_section_7_id;
  
  -- Section 8: Perceptual Biases in Decision-Making
  INSERT INTO sections (module_id, title, slug, order_index, introduction_text)
  VALUES (
    v_module_id,
    'Perceptual Biases in Decision-Making',
    'perceptual-biases',
    8,
    'Bridge perception to decision-making biases, showing how interfaces can ethically (or unethically) influence choices.'
  )
  RETURNING id INTO v_section_8_id;
  
  -- Section 9: Motion, Animation and Temporal Perception
  INSERT INTO sections (module_id, title, slug, order_index, introduction_text)
  VALUES (
    v_module_id,
    'Motion, Animation and Temporal Perception',
    'motion-animation-temporal',
    9,
    'Explore how the visual system processes motion and time, with implications for animation and perceived performance.'
  )
  RETURNING id INTO v_section_9_id;
  
  -- Section 10: Applied Case Studies
  INSERT INTO sections (module_id, title, slug, order_index, introduction_text)
  VALUES (
    v_module_id,
    'Applied Case Studies',
    'applied-case-studies',
    10,
    'Bring together chapter concepts through real-world examples and research findings.'
  )
  RETURNING id INTO v_section_10_id;
  
  -- Section 11: Looking Forward
  INSERT INTO sections (module_id, title, slug, order_index, introduction_text)
  VALUES (
    v_module_id,
    'Looking Forward — Emerging Research and Neuro-UX',
    'looking-forward',
    11,
    'Explore cutting-edge research and future directions at the intersection of neuroscience and UX.'
  )
  RETURNING id INTO v_section_11_id;
  
  -- Appendix: Glossary
  INSERT INTO sections (module_id, title, slug, order_index, introduction_text)
  VALUES (
    v_module_id,
    'Appendix: Key Terms Glossary',
    'appendix-glossary',
    12,
    'Reference glossary of key neuroscience and perception terms used in this chapter.'
  )
  RETURNING id INTO v_section_glossary_id;
  
  -- Appendix: Resources
  INSERT INTO sections (module_id, title, slug, order_index, introduction_text)
  VALUES (
    v_module_id,
    'Appendix: Recommended Reading and Resources',
    'appendix-resources',
    13,
    'Annotated reading list for continued learning in neuro-UX.'
  )
  RETURNING id INTO v_section_resources_id;
  
  RAISE NOTICE 'Created 14 sections';

  -- =============================================================================
  -- 4. Create Paragraphs for Each Section
  -- =============================================================================
  
  -- Introduction paragraphs
  INSERT INTO paragraphs (section_id, content, content_text, order_index, is_subsection_header, subsection_level)
  VALUES 
  (v_section_intro_id, 
   '{"blocks": [{"type": "heading", "level": 2, "content": "Why Your Users Don''t See What You Think They See"}]}'::JSONB,
   'Why Your Users Don''t See What You Think They See',
   0, true, 1),
  (v_section_intro_id,
   '{"blocks": [{"type": "text", "content": "In 2013, a major airline redesigned their booking interface. The design team spent months crafting what they considered the perfect checkout flow—clean typography, generous whitespace, and a prominent \"Continue to Payment\" button in their brand''s signature orange. Yet conversion rates dropped by 23%. Users were abandoning bookings at an alarming rate."}]}'::JSONB,
   'In 2013, a major airline redesigned their booking interface...',
   1, false, 0),
  (v_section_intro_id,
   '{"blocks": [{"type": "text", "content": "This scenario illustrates a critical gap in how we approach interface design. Most designers operate with an implicit model of vision as a camera: light enters, an image forms, and the brain \"sees\" the complete picture. This model is not merely incomplete—it''s fundamentally wrong."}]}'::JSONB,
   'This scenario illustrates a critical gap in how we approach interface design...',
   2, false, 0),
  (v_section_intro_id,
   '{"blocks": [{"type": "heading", "level": 2, "content": "The Camera Model Is Broken"}]}'::JSONB,
   'The Camera Model Is Broken',
   3, true, 1),
  (v_section_intro_id,
   '{"blocks": [{"type": "text", "content": "The human visual system is not a passive recording device. It is an active, constructive system that builds perception from fragmentary data, fills in missing information based on expectations, and ruthlessly filters out anything deemed irrelevant to current goals."}]}'::JSONB,
   'The human visual system is not a passive recording device...',
   4, false, 0);

  -- Section 1: From Retina to Recognition - paragraphs
  INSERT INTO paragraphs (section_id, content, content_text, order_index, is_subsection_header, subsection_level)
  VALUES 
  (v_section_1_id,
   '{"blocks": [{"type": "heading", "level": 2, "content": "The Journey from Light to Meaning"}]}'::JSONB,
   'The Journey from Light to Meaning',
   0, true, 1),
  (v_section_1_id,
   '{"blocks": [{"type": "text", "content": "In Chapter 1, we explored how the retina transforms light into neural signals. But those signals—the output of roughly 1.2 million retinal ganglion cells per eye—are far from the rich visual experience you enjoy right now as you read this text."}]}'::JSONB,
   'In Chapter 1, we explored how the retina transforms light into neural signals...',
   1, false, 0),
  (v_section_1_id,
   '{"blocks": [{"type": "heading", "level": 2, "content": "What Actually Leaves the Retina"}]}'::JSONB,
   'What Actually Leaves the Retina',
   2, true, 1),
  (v_section_1_id,
   '{"blocks": [{"type": "text", "content": "First, let''s dispel a common misconception: your retina does not send \"images\" to your brain. The roughly 130 million photoreceptors in each eye converge onto just 1.2 million ganglion cells—a compression ratio of over 100:1."}]}'::JSONB,
   'First, let''s dispel a common misconception: your retina does not send images to your brain...',
   3, false, 0);

  -- Section 2: Attention Economy - subsection paragraphs
  INSERT INTO paragraphs (section_id, content, content_text, order_index, is_subsection_header, subsection_level)
  VALUES 
  (v_section_2_id,
   '{"blocks": [{"type": "heading", "level": 2, "content": "2.1 Selective Attention and the Cocktail Party Effect"}]}'::JSONB,
   '2.1 Selective Attention and the Cocktail Party Effect',
   0, true, 1),
  (v_section_2_id,
   '{"blocks": [{"type": "text", "content": "At any given moment, your sensory systems deliver approximately 11 million bits of information to your brain. Yet conscious processing handles roughly 50 bits per second—less than 0.0005% of incoming data."}]}'::JSONB,
   'At any given moment, your sensory systems deliver approximately 11 million bits of information...',
   1, false, 0),
  (v_section_2_id,
   '{"blocks": [{"type": "heading", "level": 2, "content": "2.2 Inattentional Blindness"}]}'::JSONB,
   '2.2 Inattentional Blindness',
   2, true, 1),
  (v_section_2_id,
   '{"blocks": [{"type": "text", "content": "In 1999, psychologists Daniel Simons and Christopher Chabris conducted the famous \"invisible gorilla\" experiment. Roughly half the participants didn''t see the gorilla despite it being clearly visible for nine seconds."}]}'::JSONB,
   'In 1999, psychologists Daniel Simons and Christopher Chabris conducted the famous invisible gorilla experiment...',
   3, false, 0),
  (v_section_2_id,
   '{"blocks": [{"type": "heading", "level": 2, "content": "2.3 Change Blindness"}]}'::JSONB,
   '2.3 Change Blindness',
   4, true, 1),
  (v_section_2_id,
   '{"blocks": [{"type": "text", "content": "Change blindness reveals that we maintain far less detailed representation of our visual environment than intuition suggests. We don''t store mental photographs that can be compared against current perception."}]}'::JSONB,
   'Change blindness reveals that we maintain far less detailed representation...',
   5, false, 0),
  (v_section_2_id,
   '{"blocks": [{"type": "heading", "level": 2, "content": "2.4 The Attentional Blink"}]}'::JSONB,
   '2.4 The Attentional Blink',
   6, true, 1),
  (v_section_2_id,
   '{"blocks": [{"type": "text", "content": "For roughly 200-500 milliseconds after identifying an important item, your ability to identify a second important item plummets. It''s as if attention itself needs a moment to recover."}]}'::JSONB,
   'For roughly 200-500 milliseconds after identifying an important item...',
   7, false, 0);

  -- Continue with similar patterns for remaining sections...
  -- Note: Full content for all paragraphs would be extensive
  -- This demonstrates the structure; full content can be added incrementally

  -- Section 3: Foveal vs Peripheral
  INSERT INTO paragraphs (section_id, content, content_text, order_index, is_subsection_header, subsection_level)
  VALUES 
  (v_section_3_id,
   '{"blocks": [{"type": "heading", "level": 2, "content": "3.1 The 2° Window of Sharp Focus"}]}'::JSONB,
   '3.1 The 2° Window of Sharp Focus',
   0, true, 1),
  (v_section_3_id,
   '{"blocks": [{"type": "text", "content": "Close one eye. Hold your thumb at arm''s length. The area covered by your thumbnail represents, roughly, the only part of your visual field you can see in sharp detail at any moment."}]}'::JSONB,
   'Close one eye. Hold your thumb at arm''s length...',
   1, false, 0);

  -- Section 4: Saccades and Scanning
  INSERT INTO paragraphs (section_id, content, content_text, order_index, is_subsection_header, subsection_level)
  VALUES 
  (v_section_4_id,
   '{"blocks": [{"type": "heading", "level": 2, "content": "4.1 How Eyes Actually Move Across Interfaces"}]}'::JSONB,
   '4.1 How Eyes Actually Move Across Interfaces',
   0, true, 1),
  (v_section_4_id,
   '{"blocks": [{"type": "text", "content": "Your eyes are currently making rapid, jerky jumps called saccades, interspersed with brief pauses called fixations. You''re not aware of this because your brain constructs an illusion of continuous vision."}]}'::JSONB,
   'Your eyes are currently making rapid, jerky jumps called saccades...',
   1, false, 0);

  -- Section 5: Gestalt Principles
  INSERT INTO paragraphs (section_id, content, content_text, order_index, is_subsection_header, subsection_level)
  VALUES 
  (v_section_5_id,
   '{"blocks": [{"type": "heading", "level": 2, "content": "5.1 Proximity and Similarity"}]}'::JSONB,
   '5.1 Proximity and Similarity',
   0, true, 1),
  (v_section_5_id,
   '{"blocks": [{"type": "text", "content": "In the early twentieth century, German psychologists noticed something curious: when people look at arrangements of visual elements, they don''t perceive isolated individual items—they see groups."}]}'::JSONB,
   'In the early twentieth century, German psychologists noticed something curious...',
   1, false, 0);

  -- Section 6: Color Perception
  INSERT INTO paragraphs (section_id, content, content_text, order_index, is_subsection_header, subsection_level)
  VALUES 
  (v_section_6_id,
   '{"blocks": [{"type": "heading", "level": 2, "content": "6.1 Trichromacy and Color Deficiency"}]}'::JSONB,
   '6.1 Trichromacy and Color Deficiency',
   0, true, 1),
  (v_section_6_id,
   '{"blocks": [{"type": "text", "content": "Every color you perceive—from the subtlest pastel to the most vivid neon—is constructed from the output of just three types of cone photoreceptors in your retina."}]}'::JSONB,
   'Every color you perceive is constructed from the output of just three types of cone photoreceptors...',
   1, false, 0);

  -- Section 7: Cognitive Load
  INSERT INTO paragraphs (section_id, content, content_text, order_index, is_subsection_header, subsection_level)
  VALUES 
  (v_section_7_id,
   '{"blocks": [{"type": "heading", "level": 2, "content": "7.1 Miller''s 7±2 and Chunking"}]}'::JSONB,
   '7.1 Miller''s 7±2 and Chunking',
   0, true, 1),
  (v_section_7_id,
   '{"blocks": [{"type": "text", "content": "In 1956, psychologist George Miller published one of the most cited papers in cognitive psychology about the magical number seven, plus or minus two."}]}'::JSONB,
   'In 1956, psychologist George Miller published one of the most cited papers in cognitive psychology...',
   1, false, 0);

  -- Section 8: Perceptual Biases
  INSERT INTO paragraphs (section_id, content, content_text, order_index, is_subsection_header, subsection_level)
  VALUES 
  (v_section_8_id,
   '{"blocks": [{"type": "heading", "level": 2, "content": "8.1 Anchoring Effects in UI"}]}'::JSONB,
   '8.1 Anchoring Effects in UI',
   0, true, 1),
  (v_section_8_id,
   '{"blocks": [{"type": "text", "content": "In a classic experiment, Tversky and Kahneman spun a wheel of fortune in front of participants. An arbitrary number—acknowledged as arbitrary—profoundly influenced subsequent numerical judgments."}]}'::JSONB,
   'In a classic experiment, Tversky and Kahneman spun a wheel of fortune...',
   1, false, 0);

  -- Section 9: Motion and Animation
  INSERT INTO paragraphs (section_id, content, content_text, order_index, is_subsection_header, subsection_level)
  VALUES 
  (v_section_9_id,
   '{"blocks": [{"type": "heading", "level": 2, "content": "9.1 Biological Motion Detection"}]}'::JSONB,
   '9.1 Biological Motion Detection',
   0, true, 1),
  (v_section_9_id,
   '{"blocks": [{"type": "text", "content": "Long before our ancestors needed to read text or navigate interfaces, they needed to detect predators, prey, and kin. Motion detection is among the visual system''s most ancient and sophisticated capabilities."}]}'::JSONB,
   'Long before our ancestors needed to read text or navigate interfaces...',
   1, false, 0);

  -- Section 10: Case Studies
  INSERT INTO paragraphs (section_id, content, content_text, order_index, is_subsection_header, subsection_level)
  VALUES 
  (v_section_10_id,
   '{"blocks": [{"type": "heading", "level": 2, "content": "10.1 Eye-Tracking Research Findings"}]}'::JSONB,
   '10.1 Eye-Tracking Research Findings',
   0, true, 1),
  (v_section_10_id,
   '{"blocks": [{"type": "text", "content": "Eye-tracking technology lets us observe where users look, for how long, and in what sequence. What began as laboratory curiosity has become an essential UX research tool."}]}'::JSONB,
   'Eye-tracking technology lets us observe where users look, for how long, and in what sequence...',
   1, false, 0);

  -- Section 11: Looking Forward
  INSERT INTO paragraphs (section_id, content, content_text, order_index, is_subsection_header, subsection_level)
  VALUES 
  (v_section_11_id,
   '{"blocks": [{"type": "heading", "level": 2, "content": "Where Neuroscience Meets Design''s Future"}]}'::JSONB,
   'Where Neuroscience Meets Design''s Future',
   0, true, 1),
  (v_section_11_id,
   '{"blocks": [{"type": "text", "content": "The principles in this chapter represent our current understanding of visual perception applied to interface design. But this field is evolving rapidly with new technologies and research methods."}]}'::JSONB,
   'The principles in this chapter represent our current understanding...',
   1, false, 0);

  -- Glossary section
  INSERT INTO paragraphs (section_id, content, content_text, order_index, is_subsection_header, subsection_level)
  VALUES 
  (v_section_glossary_id,
   '{"blocks": [{"type": "heading", "level": 2, "content": "Visual Anatomy Terms"}]}'::JSONB,
   'Visual Anatomy Terms',
   0, true, 1),
  (v_section_glossary_id,
   '{"blocks": [{"type": "definition", "term": "Fovea", "definition": "The small pit in the center of the retina containing the highest density of cone photoreceptors. Responsible for sharp central vision."}]}'::JSONB,
   'Fovea: The small pit in the center of the retina...',
   1, false, 0);

  -- Resources section
  INSERT INTO paragraphs (section_id, content, content_text, order_index, is_subsection_header, subsection_level)
  VALUES 
  (v_section_resources_id,
   '{"blocks": [{"type": "heading", "level": 2, "content": "Foundational Texts"}]}'::JSONB,
   'Foundational Texts',
   0, true, 1),
  (v_section_resources_id,
   '{"blocks": [{"type": "resource", "title": "Vision Science: Photons to Phenomenology", "author": "Palmer, S. E.", "year": "1999", "description": "The comprehensive reference on visual perception."}]}'::JSONB,
   'Palmer, S. E. (1999). Vision Science: Photons to Phenomenology...',
   1, false, 0);

  RAISE NOTICE 'Created paragraphs for all sections';
  RAISE NOTICE 'Chapter 2 seeding complete!';
  
END $$;

-- =============================================================================
-- Verification Queries (optional - uncomment to verify)
-- =============================================================================

-- Verify content version
-- SELECT * FROM content_versions WHERE version_number = '1.0';

-- Verify module
-- SELECT * FROM modules WHERE slug = 'visual-perception-ux';

-- Verify sections
-- SELECT s.title, s.order_index 
-- FROM sections s 
-- JOIN modules m ON s.module_id = m.id 
-- WHERE m.slug = 'visual-perception-ux'
-- ORDER BY s.order_index;

-- Verify paragraph count
-- SELECT s.title, COUNT(p.id) as paragraph_count
-- FROM sections s 
-- LEFT JOIN paragraphs p ON p.section_id = s.id
-- JOIN modules m ON s.module_id = m.id 
-- WHERE m.slug = 'visual-perception-ux'
-- GROUP BY s.id, s.title, s.order_index
-- ORDER BY s.order_index;

COMMIT;

-- =============================================================================
-- Notes for production use:
-- 
-- 1. Before running this script in production:
--    - Ensure a real creator user exists in profiles
--    - Remove or modify the seed user creation block
--    - Update the created_by references to use actual user IDs
--
-- 2. To run with service_role (bypassing RLS):
--    - Use the Supabase service_role key in your connection
--    - Or run via Supabase dashboard SQL editor
--
-- 3. Full content:
--    - This script includes representative paragraphs for each section
--    - The complete markdown files in claude/Content/Chapter-2/ contain full content
--    - A content import script can be created to convert markdown to JSONB
--
-- 4. Animations:
--    - Animation references are not included in this seed
--    - Add animation_id references to sections/paragraphs after creating animations
-- =============================================================================
