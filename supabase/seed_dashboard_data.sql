-- =============================================================
-- Dashboard Seed Data
-- Seeds stub data for testing the Creator Dashboard tabs
-- Run this after the main schema is in place
-- =============================================================

-- Note: This script assumes you have at least one creator and some student profiles
-- If not, you may need to create them first or adjust the queries

-- =============================================================
-- 1. CONTENT VERSIONS
-- =============================================================
-- Uses INSERT ... WHERE NOT EXISTS to skip if version_number already exists

INSERT INTO content_versions (id, version_number, status, release_notes, created_at, published_at, created_by)
SELECT
  'a0000001-0001-0001-0001-000000000001'::uuid,
  '1.0',
  'published',
  'Initial release with Chapter 1: The Retina. Covers fundamental retina anatomy, photoreceptor cells, and basic visual processing concepts.',
  NOW() - INTERVAL '60 days',
  NOW() - INTERVAL '55 days',
  (SELECT id FROM profiles WHERE role = 'creator' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM content_versions WHERE version_number = '1.0');

INSERT INTO content_versions (id, version_number, status, release_notes, created_at, published_at, created_by)
SELECT
  'a0000001-0001-0001-0001-000000000002'::uuid,
  '1.1',
  'archived',
  'Minor corrections and additional diagrams for Chapter 1. Fixed typos in rod cell section.',
  NOW() - INTERVAL '45 days',
  NOW() - INTERVAL '40 days',
  (SELECT id FROM profiles WHERE role = 'creator' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM content_versions WHERE version_number = '1.1');

INSERT INTO content_versions (id, version_number, status, release_notes, created_at, published_at, created_by)
SELECT
  'a0000001-0001-0001-0001-000000000003'::uuid,
  '2.0',
  'published',
  'Major update: Added Chapter 2 on Visual Perception and UX. New interactive animations for Gestalt principles.',
  NOW() - INTERVAL '20 days',
  NOW() - INTERVAL '15 days',
  (SELECT id FROM profiles WHERE role = 'creator' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM content_versions WHERE version_number = '2.0');

INSERT INTO content_versions (id, version_number, status, release_notes, created_at, published_at, created_by)
SELECT
  'a0000001-0001-0001-0001-000000000004'::uuid,
  '2.1',
  'draft',
  'Work in progress: Adding attention and consciousness chapter. New quiz integration.',
  NOW() - INTERVAL '5 days',
  NULL,
  (SELECT id FROM profiles WHERE role = 'creator' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM content_versions WHERE version_number = '2.1');


-- =============================================================
-- 2. MEDIA / ANIMATIONS
-- =============================================================

INSERT INTO animations (id, animation_key, title, description, media_type, component_name, interaction_type, scientific_domain, load_priority, file_size_bytes, created_at, updated_at)
VALUES
  -- Lottie Animations
  (
    'b0000001-0001-0001-0001-000000000001'::uuid,
    'retina-layers-cross-section',
    'Retina Layers Cross Section',
    'Interactive diagram showing all 10 layers of the retina with click-to-highlight functionality',
    'lottie',
    'LottieAnimation',
    'click_states',
    'neuroscience',
    'critical',
    245000,
    NOW() - INTERVAL '90 days',
    NOW() - INTERVAL '30 days'
  ),
  (
    'b0000001-0001-0001-0001-000000000002'::uuid,
    'rod-cone-comparison',
    'Rod vs Cone Cells',
    'Side-by-side comparison of rod and cone photoreceptor cell structure and distribution',
    'lottie',
    'LottieAnimation',
    'switch',
    'neuroscience',
    'high',
    189000,
    NOW() - INTERVAL '85 days',
    NOW() - INTERVAL '25 days'
  ),
  (
    'b0000001-0001-0001-0001-000000000003'::uuid,
    'gestalt-proximity',
    'Gestalt Proximity Principle',
    'Interactive demonstration of how proximity affects perceptual grouping',
    'lottie',
    'LottieAnimation',
    'scroll_linked',
    'psychology',
    'high',
    156000,
    NOW() - INTERVAL '40 days',
    NOW() - INTERVAL '10 days'
  ),
  (
    'b0000001-0001-0001-0001-000000000004'::uuid,
    'gestalt-similarity',
    'Gestalt Similarity Principle',
    'Shows how similar elements are grouped together visually',
    'lottie',
    'LottieAnimation',
    'click_states',
    'psychology',
    'high',
    178000,
    NOW() - INTERVAL '38 days',
    NOW() - INTERVAL '8 days'
  ),
  (
    'b0000001-0001-0001-0001-000000000005'::uuid,
    'attention-spotlight',
    'Attention Spotlight Demo',
    'Demonstrates the spotlight model of selective attention with interactive focus',
    'lottie',
    'LottieAnimation',
    'click_states',
    'psychology',
    'high',
    312000,
    NOW() - INTERVAL '35 days',
    NOW() - INTERVAL '5 days'
  ),
  (
    'b0000001-0001-0001-0001-000000000006'::uuid,
    'phototransduction-cascade',
    'Phototransduction Cascade',
    'Step-by-step animation of the phototransduction process in photoreceptors',
    'lottie',
    'LottieAnimation',
    'auto_loop',
    'neuroscience',
    'critical',
    425000,
    NOW() - INTERVAL '80 days',
    NOW() - INTERVAL '20 days'
  ),
  (
    'b0000001-0001-0001-0001-000000000007'::uuid,
    'receptive-field-demo',
    'Center-Surround Receptive Fields',
    'Interactive demonstration of on-center/off-surround ganglion cell receptive fields',
    'lottie',
    'LottieAnimation',
    'click_states',
    'neuroscience',
    'high',
    267000,
    NOW() - INTERVAL '75 days',
    NOW() - INTERVAL '15 days'
  ),

  -- Videos
  (
    'b0000001-0001-0001-0001-000000000010'::uuid,
    'visual-pathway-animation',
    'Visual Pathway Journey',
    'Animated walkthrough from photon hitting retina to visual cortex processing',
    'video',
    'VideoPlayer',
    'auto_loop',
    'neuroscience',
    'high',
    52000000,
    NOW() - INTERVAL '70 days',
    NOW() - INTERVAL '12 days'
  ),
  (
    'b0000001-0001-0001-0001-000000000011'::uuid,
    'lateral-inhibition-video',
    'Lateral Inhibition Explained',
    'Video explanation of how lateral inhibition enhances edge detection',
    'video',
    'VideoPlayer',
    'auto_loop',
    'neuroscience',
    'high',
    38000000,
    NOW() - INTERVAL '65 days',
    NOW() - INTERVAL '10 days'
  ),

  -- YouTube Embeds
  (
    'b0000001-0001-0001-0001-000000000020'::uuid,
    'change-blindness-demo',
    'Change Blindness Demo',
    'Classic change blindness experiment demonstrating failures of visual attention',
    'youtube',
    'YouTubeEmbed',
    'youtube_embed',
    'psychology',
    'lazy',
    0,
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '5 days'
  ),
  (
    'b0000001-0001-0001-0001-000000000021'::uuid,
    'inattentional-blindness-gorilla',
    'Invisible Gorilla Experiment',
    'The famous selective attention test by Simons and Chabris',
    'youtube',
    'YouTubeEmbed',
    'youtube_embed',
    'psychology',
    'lazy',
    0,
    NOW() - INTERVAL '28 days',
    NOW() - INTERVAL '3 days'
  ),

  -- Images
  (
    'b0000001-0001-0001-0001-000000000030'::uuid,
    'eye-anatomy-diagram',
    'Eye Anatomy Diagram',
    'Detailed labeled cross-section of the human eye showing all major structures',
    'image',
    'StaticImage',
    'static_image',
    'anatomy',
    'critical',
    850000,
    NOW() - INTERVAL '100 days',
    NOW() - INTERVAL '50 days'
  ),
  (
    'b0000001-0001-0001-0001-000000000031'::uuid,
    'fovea-detail',
    'Fovea Detail View',
    'Magnified view of the foveal pit showing cone distribution',
    'image',
    'StaticImage',
    'static_image',
    'anatomy',
    'high',
    620000,
    NOW() - INTERVAL '95 days',
    NOW() - INTERVAL '45 days'
  ),
  (
    'b0000001-0001-0001-0001-000000000032'::uuid,
    'optic-disc-photo',
    'Optic Disc Photograph',
    'Fundus photograph showing the optic disc (blind spot)',
    'image',
    'StaticImage',
    'static_image',
    'anatomy',
    'low',
    420000,
    NOW() - INTERVAL '90 days',
    NOW() - INTERVAL '40 days'
  ),
  (
    'b0000001-0001-0001-0001-000000000033'::uuid,
    'color-spectrum-wavelengths',
    'Visible Light Spectrum',
    'Diagram showing wavelength ranges for different colors and cone sensitivities',
    'image',
    'StaticImage',
    'static_image',
    'physics',
    'high',
    380000,
    NOW() - INTERVAL '85 days',
    NOW() - INTERVAL '35 days'
  )
ON CONFLICT (id) DO NOTHING;


-- =============================================================
-- 3. QUIZZES
-- =============================================================

-- Quiz 1: Chapter 1 Retina Quiz
INSERT INTO quizzes (id, module_id, title, description, time_limit_minutes, passing_score, allow_multiple_attempts, show_correct_answers, is_active, created_by, created_at)
SELECT
  'c0000001-0001-0001-0001-000000000001'::uuid,
  (SELECT id FROM modules WHERE slug = 'the-retina' LIMIT 1),
  'The Retina: Fundamentals Quiz',
  'Test your understanding of retinal anatomy and photoreceptor function. Covers layers of the retina, rod and cone cells, and basic phototransduction.',
  15,
  70,
  true,
  true,
  true,
  (SELECT id FROM profiles WHERE role = 'creator' LIMIT 1),
  NOW() - INTERVAL '50 days'
WHERE NOT EXISTS (SELECT 1 FROM quizzes WHERE id = 'c0000001-0001-0001-0001-000000000001'::uuid);

-- Quiz 1 Questions
INSERT INTO quiz_questions (id, quiz_id, question_text, question_type, options, correct_answer, points, order_index)
VALUES
  (
    'q0000001-0001-0001-0001-000000000001'::uuid,
    'c0000001-0001-0001-0001-000000000001'::uuid,
    'How many distinct layers make up the human retina?',
    'multiple_choice',
    '["5 layers", "8 layers", "10 layers", "12 layers"]'::jsonb,
    '10 layers',
    1,
    1
  ),
  (
    'q0000001-0001-0001-0001-000000000002'::uuid,
    'c0000001-0001-0001-0001-000000000001'::uuid,
    'Rod cells are primarily responsible for color vision.',
    'true_false',
    NULL,
    'false',
    1,
    2
  ),
  (
    'q0000001-0001-0001-0001-000000000003'::uuid,
    'c0000001-0001-0001-0001-000000000001'::uuid,
    'Which type of photoreceptor is most concentrated in the fovea?',
    'multiple_choice',
    '["Rod cells", "Cone cells", "Bipolar cells", "Ganglion cells"]'::jsonb,
    'Cone cells',
    1,
    3
  ),
  (
    'q0000001-0001-0001-0001-000000000004'::uuid,
    'c0000001-0001-0001-0001-000000000001'::uuid,
    'The blind spot occurs because there are no photoreceptors at the optic disc.',
    'true_false',
    NULL,
    'true',
    1,
    4
  ),
  (
    'q0000001-0001-0001-0001-000000000005'::uuid,
    'c0000001-0001-0001-0001-000000000001'::uuid,
    'Explain why we have better color vision in daylight than at night.',
    'short_answer',
    NULL,
    'cones, photopic, scotopic, rods',
    2,
    5
  ),
  (
    'q0000001-0001-0001-0001-000000000006'::uuid,
    'c0000001-0001-0001-0001-000000000001'::uuid,
    'Which molecule undergoes conformational change when light hits a photoreceptor?',
    'multiple_choice',
    '["Melanin", "Rhodopsin", "Dopamine", "Acetylcholine"]'::jsonb,
    'Rhodopsin',
    1,
    6
  ),
  (
    'q0000001-0001-0001-0001-000000000007'::uuid,
    'c0000001-0001-0001-0001-000000000001'::uuid,
    'The human eye contains approximately how many rod cells?',
    'multiple_choice',
    '["6 million", "60 million", "120 million", "200 million"]'::jsonb,
    '120 million',
    1,
    7
  ),
  (
    'q0000001-0001-0001-0001-000000000008'::uuid,
    'c0000001-0001-0001-0001-000000000001'::uuid,
    'Horizontal cells in the retina contribute to lateral inhibition.',
    'true_false',
    NULL,
    'true',
    1,
    8
  )
ON CONFLICT (id) DO NOTHING;


-- Quiz 2: Visual Perception Quiz
INSERT INTO quizzes (id, module_id, title, description, time_limit_minutes, passing_score, allow_multiple_attempts, show_correct_answers, is_active, created_by, created_at)
SELECT
  'c0000001-0001-0001-0001-000000000002'::uuid,
  (SELECT id FROM modules WHERE slug = 'visual-perception-ux' LIMIT 1),
  'Visual Perception & UX Principles',
  'Assess your knowledge of Gestalt principles, attention, and how visual perception applies to user experience design.',
  20,
  70,
  true,
  true,
  true,
  (SELECT id FROM profiles WHERE role = 'creator' LIMIT 1),
  NOW() - INTERVAL '15 days'
WHERE NOT EXISTS (SELECT 1 FROM quizzes WHERE id = 'c0000001-0001-0001-0001-000000000002'::uuid);

-- Quiz 2 Questions
INSERT INTO quiz_questions (id, quiz_id, question_text, question_type, options, correct_answer, points, order_index)
VALUES
  (
    'q0000001-0001-0001-0001-000000000010'::uuid,
    'c0000001-0001-0001-0001-000000000002'::uuid,
    'Which Gestalt principle states that elements close together are perceived as a group?',
    'multiple_choice',
    '["Similarity", "Proximity", "Closure", "Continuity"]'::jsonb,
    'Proximity',
    1,
    1
  ),
  (
    'q0000001-0001-0001-0001-000000000011'::uuid,
    'c0000001-0001-0001-0001-000000000002'::uuid,
    'Change blindness can occur even when people are actively watching a scene.',
    'true_false',
    NULL,
    'true',
    1,
    2
  ),
  (
    'q0000001-0001-0001-0001-000000000012'::uuid,
    'c0000001-0001-0001-0001-000000000002'::uuid,
    'The cocktail party effect demonstrates which type of attention?',
    'multiple_choice',
    '["Divided attention", "Selective attention", "Sustained attention", "Alternating attention"]'::jsonb,
    'Selective attention',
    1,
    3
  ),
  (
    'q0000001-0001-0001-0001-000000000013'::uuid,
    'c0000001-0001-0001-0001-000000000002'::uuid,
    'Describe how the Gestalt principle of closure can be applied in UI design. Give a specific example.',
    'short_answer',
    NULL,
    'incomplete shapes, icons, logos, mental completion',
    3,
    4
  ),
  (
    'q0000001-0001-0001-0001-000000000014'::uuid,
    'c0000001-0001-0001-0001-000000000002'::uuid,
    'What percentage of the visual field does the fovea (area of sharpest vision) cover?',
    'multiple_choice',
    '["About 2%", "About 10%", "About 25%", "About 50%"]'::jsonb,
    'About 2%',
    1,
    5
  ),
  (
    'q0000001-0001-0001-0001-000000000015'::uuid,
    'c0000001-0001-0001-0001-000000000002'::uuid,
    'Inattentional blindness is the same phenomenon as change blindness.',
    'true_false',
    NULL,
    'false',
    1,
    6
  )
ON CONFLICT (id) DO NOTHING;


-- =============================================================
-- 4. ANALYTICS EVENTS (Last 30 days of activity)
-- =============================================================

-- Generate page_view events
INSERT INTO analytics_events (id, user_id, event_type, event_data, module_id, created_at)
SELECT
  gen_random_uuid(),
  p.id,
  'page_view',
  jsonb_build_object('source', 'web', 'device', (ARRAY['desktop', 'tablet', 'mobile'])[floor(random() * 3 + 1)]),
  m.id,
  NOW() - (random() * INTERVAL '30 days')
FROM profiles p
CROSS JOIN modules m
CROSS JOIN generate_series(1, 5) -- 5 views per user per module
WHERE p.role IN ('student', 'professor')
LIMIT 300;

-- Generate quiz_start events
INSERT INTO analytics_events (id, user_id, event_type, event_data, module_id, created_at)
SELECT
  gen_random_uuid(),
  p.id,
  'quiz_start',
  jsonb_build_object('quiz_id', 'c0000001-0001-0001-0001-000000000001'),
  (SELECT id FROM modules WHERE slug = 'the-retina' LIMIT 1),
  NOW() - (random() * INTERVAL '30 days')
FROM profiles p
WHERE p.role = 'student'
LIMIT 50;

-- Generate quiz_complete events
INSERT INTO analytics_events (id, user_id, event_type, event_data, module_id, created_at)
SELECT
  gen_random_uuid(),
  p.id,
  'quiz_complete',
  jsonb_build_object('quiz_id', 'c0000001-0001-0001-0001-000000000001', 'score', floor(random() * 40 + 60)),
  (SELECT id FROM modules WHERE slug = 'the-retina' LIMIT 1),
  NOW() - (random() * INTERVAL '30 days')
FROM profiles p
WHERE p.role = 'student'
LIMIT 40;

-- Generate highlight_create events
INSERT INTO analytics_events (id, user_id, event_type, event_data, module_id, created_at)
SELECT
  gen_random_uuid(),
  p.id,
  'highlight_create',
  jsonb_build_object('paragraph_id', gen_random_uuid()::text),
  m.id,
  NOW() - (random() * INTERVAL '30 days')
FROM profiles p
CROSS JOIN modules m
WHERE p.role = 'student'
LIMIT 100;


-- =============================================================
-- 5. READING PROGRESS
-- =============================================================

INSERT INTO reading_progress (id, user_id, module_id, time_spent_seconds, scroll_position, is_completed, last_accessed_at)
SELECT
  gen_random_uuid(),
  p.id,
  m.id,
  floor(random() * 3600 + 300)::int,
  floor(random() * 100)::decimal,
  random() > 0.4,
  NOW() - (random() * INTERVAL '14 days')
FROM profiles p
CROSS JOIN modules m
WHERE p.role IN ('student', 'professor')
ON CONFLICT DO NOTHING;


-- =============================================================
-- 6. QUIZ ATTEMPTS (Sample completions)
-- =============================================================

-- Generate quiz attempts for Quiz 1
INSERT INTO quiz_attempts (id, quiz_id, student_id, score, total_points, started_at, completed_at, time_spent_seconds, status)
SELECT
  gen_random_uuid(),
  'c0000001-0001-0001-0001-000000000001'::uuid,
  p.id,
  floor(random() * 4 + 4)::int, -- score between 4-8
  8, -- total points
  ts,
  ts + (floor(random() * 600 + 300) * INTERVAL '1 second'),
  floor(random() * 600 + 300)::int,
  'completed'
FROM profiles p
CROSS JOIN (
  SELECT NOW() - (random() * INTERVAL '30 days') as ts
  FROM generate_series(1, 3)
) attempts
WHERE p.role = 'student'
LIMIT 35;

-- Generate quiz attempts for Quiz 2
INSERT INTO quiz_attempts (id, quiz_id, student_id, score, total_points, started_at, completed_at, time_spent_seconds, status)
SELECT
  gen_random_uuid(),
  'c0000001-0001-0001-0001-000000000002'::uuid,
  p.id,
  floor(random() * 4 + 4)::int, -- score between 4-8
  8, -- total points
  ts,
  ts + (floor(random() * 900 + 400) * INTERVAL '1 second'),
  floor(random() * 900 + 400)::int,
  'completed'
FROM profiles p
CROSS JOIN (
  SELECT NOW() - (random() * INTERVAL '15 days') as ts
  FROM generate_series(1, 2)
) attempts
WHERE p.role = 'student'
LIMIT 20;


-- =============================================================
-- 7. TRENDING HIGHLIGHTS
-- =============================================================

INSERT INTO trending_highlights (id, paragraph_id, selected_text, start_offset, end_offset, highlight_count, last_highlighted_at)
VALUES
  (
    gen_random_uuid(),
    (SELECT id FROM paragraphs LIMIT 1 OFFSET 0),
    'The retina is a thin layer of tissue that lines the back of the eye and contains photoreceptor cells responsible for converting light into neural signals.',
    0,
    150,
    47,
    NOW() - INTERVAL '2 days'
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM paragraphs LIMIT 1 OFFSET 1),
    'Cones are concentrated in the fovea, providing high-acuity color vision, while rods dominate the peripheral retina for low-light and motion detection.',
    0,
    140,
    38,
    NOW() - INTERVAL '3 days'
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM paragraphs LIMIT 1 OFFSET 2),
    'The Gestalt principles of perception describe how we naturally organize visual elements into groups or unified wholes.',
    0,
    115,
    31,
    NOW() - INTERVAL '1 day'
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM paragraphs LIMIT 1 OFFSET 3),
    'Change blindness occurs because our visual system does not maintain a detailed representation of our entire visual field.',
    0,
    125,
    28,
    NOW() - INTERVAL '4 days'
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM paragraphs LIMIT 1 OFFSET 4),
    'Selective attention acts like a spotlight, allowing us to focus cognitive resources on relevant information while filtering out distractions.',
    0,
    145,
    25,
    NOW() - INTERVAL '5 days'
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM paragraphs LIMIT 1 OFFSET 5),
    'The phenomenon of lateral inhibition enhances contrast at edges, helping us detect boundaries between different regions.',
    0,
    120,
    22,
    NOW() - INTERVAL '6 days'
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM paragraphs LIMIT 1 OFFSET 6),
    'Photoreceptors hyperpolarize in response to light, which is the opposite of what happens in most sensory neurons.',
    0,
    115,
    19,
    NOW() - INTERVAL '7 days'
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM paragraphs LIMIT 1 OFFSET 7),
    'The cocktail party effect demonstrates our remarkable ability to focus on a single conversation in a noisy environment.',
    0,
    118,
    16,
    NOW() - INTERVAL '8 days'
  )
ON CONFLICT DO NOTHING;


-- =============================================================
-- VERIFICATION QUERIES (Run these to check data was inserted)
-- =============================================================

-- Check counts
-- SELECT 'content_versions' as table_name, COUNT(*) as count FROM content_versions
-- UNION ALL
-- SELECT 'animations', COUNT(*) FROM animations
-- UNION ALL
-- SELECT 'quizzes', COUNT(*) FROM quizzes
-- UNION ALL
-- SELECT 'quiz_questions', COUNT(*) FROM quiz_questions
-- UNION ALL
-- SELECT 'analytics_events', COUNT(*) FROM analytics_events
-- UNION ALL
-- SELECT 'reading_progress', COUNT(*) FROM reading_progress
-- UNION ALL
-- SELECT 'quiz_attempts', COUNT(*) FROM quiz_attempts
-- UNION ALL
-- SELECT 'trending_highlights', COUNT(*) FROM trending_highlights;
