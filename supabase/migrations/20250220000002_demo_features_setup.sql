-- =============================================================================
-- Demo Features Setup: Schema fixes + RLS + Seed Data
-- Migration: 20250220000002_demo_features_setup.sql
-- Description: Makes quizzes, flashcards, code labs, and AI tutor work end-to-end
--              for the Stuart demo by fixing schema mismatches, adding RLS policies,
--              and seeding Chapter 2 demo content.
-- =============================================================================

-- ============================================
-- 1A. SCHEMA FIXES (ALTER TABLE)
-- ============================================

-- Quizzes: add is_published column the composable expects
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;

-- Quiz attempts: add columns composable expects
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id);
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS passed BOOLEAN;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS time_taken_seconds INTEGER;
-- Backfill user_id from student_id for existing rows
UPDATE quiz_attempts SET user_id = student_id WHERE user_id IS NULL;

-- Quiz answers: add selected_answer column composable expects
ALTER TABLE quiz_answers ADD COLUMN IF NOT EXISTS selected_answer TEXT;

-- Flashcard sessions: make card_ids nullable, add composable columns
ALTER TABLE flashcard_sessions ALTER COLUMN card_ids DROP NOT NULL;
ALTER TABLE flashcard_sessions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id);
ALTER TABLE flashcard_sessions ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES modules(id);
ALTER TABLE flashcard_sessions ADD COLUMN IF NOT EXISTS cards_reviewed INTEGER;
ALTER TABLE flashcard_sessions ADD COLUMN IF NOT EXISTS cards_correct INTEGER;
ALTER TABLE flashcard_sessions ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
-- Backfill user_id from student_id
UPDATE flashcard_sessions SET user_id = student_id WHERE user_id IS NULL;

-- Flashcard responses: make was_correct nullable, add composable columns
ALTER TABLE flashcard_responses ALTER COLUMN was_correct DROP NOT NULL;
ALTER TABLE flashcard_responses ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id);
ALTER TABLE flashcard_responses ADD COLUMN IF NOT EXISTS rating INTEGER;
ALTER TABLE flashcard_responses ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
UPDATE flashcard_responses SET user_id = student_id WHERE user_id IS NULL;

-- Code submissions: add user_id alias
ALTER TABLE code_submissions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id);
UPDATE code_submissions SET user_id = student_id WHERE user_id IS NULL;

-- Code labs: add difficulty column
ALTER TABLE code_labs ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'beginner';

-- ============================================
-- 1B. RLS POLICIES FOR FEATURE TABLES
-- ============================================

-- Drop existing policies if they exist (idempotent)
DO $$ BEGIN
  -- Flashcards
  DROP POLICY IF EXISTS "Anyone can read flashcards" ON flashcards;
  DROP POLICY IF EXISTS "Students manage own flashcard sessions" ON flashcard_sessions;
  DROP POLICY IF EXISTS "Students manage own flashcard responses" ON flashcard_responses;
  -- Code labs
  DROP POLICY IF EXISTS "Anyone can read code labs" ON code_labs;
  DROP POLICY IF EXISTS "Students manage own code submissions" ON code_submissions;
  -- AI
  DROP POLICY IF EXISTS "Users manage own conversations" ON ai_conversations;
  DROP POLICY IF EXISTS "Users manage own messages" ON ai_messages;
  -- Quiz answers
  DROP POLICY IF EXISTS "Students manage own quiz answers" ON quiz_answers;
  -- Quiz questions
  DROP POLICY IF EXISTS "Anyone can read quiz questions" ON quiz_questions;
END $$;

-- Flashcards: anyone can read, students manage own sessions/responses
CREATE POLICY "Anyone can read flashcards" ON flashcards FOR SELECT USING (true);
CREATE POLICY "Students manage own flashcard sessions" ON flashcard_sessions FOR ALL
  USING (auth.uid() = student_id OR auth.uid() = user_id);
CREATE POLICY "Students manage own flashcard responses" ON flashcard_responses FOR ALL
  USING (auth.uid() = student_id OR auth.uid() = user_id);

-- Code labs: anyone can read, students manage own submissions
CREATE POLICY "Anyone can read code labs" ON code_labs FOR SELECT USING (true);
CREATE POLICY "Students manage own code submissions" ON code_submissions FOR ALL
  USING (auth.uid() = student_id OR auth.uid() = user_id);

-- AI: users manage own conversations and messages
CREATE POLICY "Users manage own conversations" ON ai_conversations FOR ALL
  USING (auth.uid() = user_id);
CREATE POLICY "Users manage own messages" ON ai_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

-- Quiz answers: students can manage their own
CREATE POLICY "Students manage own quiz answers" ON quiz_answers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM quiz_attempts
      WHERE quiz_attempts.id = quiz_answers.attempt_id
      AND (quiz_attempts.student_id = auth.uid() OR quiz_attempts.user_id = auth.uid())
    )
  );

-- Quiz questions: anyone can read (needed to display quiz)
CREATE POLICY "Anyone can read quiz questions" ON quiz_questions FOR SELECT USING (true);

-- ============================================
-- 1C-E. SEED DATA FOR CHAPTER 2
-- ============================================

DO $$
DECLARE
  v_creator_id UUID;
  v_module_id UUID;
  v_quiz_id UUID;
BEGIN
  -- Get creator profile
  SELECT id INTO v_creator_id FROM profiles WHERE role = 'creator' LIMIT 1;
  IF v_creator_id IS NULL THEN
    SELECT id INTO v_creator_id FROM profiles LIMIT 1;
  END IF;
  IF v_creator_id IS NULL THEN
    RAISE NOTICE 'No profiles found — skipping seed data';
    RETURN;
  END IF;

  -- Get Chapter 2 module
  SELECT id INTO v_module_id FROM modules WHERE slug = 'visual-perception-ux' LIMIT 1;
  IF v_module_id IS NULL THEN
    -- Try alternate slug patterns
    SELECT id INTO v_module_id FROM modules WHERE order_index = 2 LIMIT 1;
  END IF;
  IF v_module_id IS NULL THEN
    SELECT id INTO v_module_id FROM modules WHERE title ILIKE '%visual%' LIMIT 1;
  END IF;
  IF v_module_id IS NULL THEN
    RAISE NOTICE 'No Chapter 2 module found — skipping seed data';
    RETURN;
  END IF;

  RAISE NOTICE 'Seeding demo data for module: %', v_module_id;

  -- ===========================================
  -- 1C. QUIZ: Visual Perception Fundamentals
  -- ===========================================

  -- Check if quiz already exists
  IF NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'Visual Perception Fundamentals' AND module_id = v_module_id) THEN

    INSERT INTO quizzes (id, module_id, title, description, instructions, time_limit_minutes, passing_score, allow_multiple_attempts, show_correct_answers, is_published, created_by)
    VALUES (
      gen_random_uuid(),
      v_module_id,
      'Visual Perception Fundamentals',
      'Test your understanding of key visual perception concepts from Chapter 2.',
      'Answer all 8 questions. You have 15 minutes. Each question is worth 1 point. You need 70% to pass.',
      15,
      70,
      true,
      true,
      true,
      v_creator_id
    )
    RETURNING id INTO v_quiz_id;

    -- Q1: Foveal vs peripheral vision
    INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, correct_answer, points, order_index) VALUES
    (v_quiz_id, 'What is the primary difference between foveal and peripheral vision?',
     'multiple_choice',
     '[{"id": 0, "text": "Foveal vision is for color, peripheral is for brightness"},
       {"id": 1, "text": "Foveal vision provides high acuity detail, peripheral vision detects motion and changes"},
       {"id": 2, "text": "Foveal vision works in daylight, peripheral vision works at night"},
       {"id": 3, "text": "There is no functional difference between them"}]',
     '1', 1, 1);

    -- Q2: Saccades
    INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, correct_answer, points, order_index) VALUES
    (v_quiz_id, 'What are saccades?',
     'multiple_choice',
     '[{"id": 0, "text": "Slow, smooth eye movements used for tracking objects"},
       {"id": 1, "text": "Rapid eye movements that shift gaze between fixation points"},
       {"id": 2, "text": "Involuntary blinking patterns during reading"},
       {"id": 3, "text": "The afterimages seen after looking at bright lights"}]',
     '1', 1, 2);

    -- Q3: Gestalt principles
    INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, correct_answer, points, order_index) VALUES
    (v_quiz_id, 'Which Gestalt principle states that elements close together are perceived as belonging to the same group?',
     'multiple_choice',
     '[{"id": 0, "text": "Similarity"},
       {"id": 1, "text": "Closure"},
       {"id": 2, "text": "Proximity"},
       {"id": 3, "text": "Continuity"}]',
     '2', 1, 3);

    -- Q4: Color perception
    INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, correct_answer, points, order_index) VALUES
    (v_quiz_id, 'The opponent process theory of color vision proposes which opposing color channels?',
     'multiple_choice',
     '[{"id": 0, "text": "RGB: Red vs Green vs Blue"},
       {"id": 1, "text": "Red-green, blue-yellow, and black-white"},
       {"id": 2, "text": "Warm colors vs cool colors"},
       {"id": 3, "text": "Primary colors vs secondary colors"}]',
     '1', 1, 4);

    -- Q5: Cognitive load
    INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, correct_answer, points, order_index) VALUES
    (v_quiz_id, 'According to cognitive load theory, what happens when a visual interface presents too much information simultaneously?',
     'multiple_choice',
     '[{"id": 0, "text": "Users process it faster through parallel processing"},
       {"id": 1, "text": "Working memory becomes overwhelmed, leading to errors and slower performance"},
       {"id": 2, "text": "Users automatically filter irrelevant information"},
       {"id": 3, "text": "Long-term memory compensates for the overload"}]',
     '1', 1, 5);

    -- Q6: Feature integration theory
    INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, correct_answer, points, order_index) VALUES
    (v_quiz_id, 'In Treisman''s Feature Integration Theory, what is required to combine individual features (color, shape, orientation) into a unified percept?',
     'multiple_choice',
     '[{"id": 0, "text": "Peripheral vision"},
       {"id": 1, "text": "Focused attention"},
       {"id": 2, "text": "Binocular vision"},
       {"id": 3, "text": "Motion detection"}]',
     '1', 1, 6);

    -- Q7: Ventral/dorsal streams
    INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, correct_answer, points, order_index) VALUES
    (v_quiz_id, 'What are the two main visual processing streams in the brain, and what do they handle?',
     'multiple_choice',
     '[{"id": 0, "text": "Left stream (language) and right stream (spatial)"},
       {"id": 1, "text": "Ventral stream (object recognition/''what'') and dorsal stream (spatial location/''where'')"},
       {"id": 2, "text": "Conscious stream (awareness) and unconscious stream (reflexes)"},
       {"id": 3, "text": "Fast stream (motion) and slow stream (color)"}]',
     '1', 1, 7);

    -- Q8: Visual attention
    INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, correct_answer, points, order_index) VALUES
    (v_quiz_id, 'What is "inattentional blindness"?',
     'multiple_choice',
     '[{"id": 0, "text": "A medical condition causing partial vision loss"},
       {"id": 1, "text": "The failure to notice visible objects when attention is focused elsewhere"},
       {"id": 2, "text": "The inability to focus on nearby objects"},
       {"id": 3, "text": "A temporary loss of vision after looking at bright lights"}]',
     '1', 1, 8);

    RAISE NOTICE 'Quiz seeded with 8 questions';
  ELSE
    RAISE NOTICE 'Quiz already exists — skipping';
  END IF;

  -- ===========================================
  -- 1D. FLASHCARDS: Chapter 2 key terms
  -- ===========================================

  IF NOT EXISTS (SELECT 1 FROM flashcards WHERE module_id = v_module_id LIMIT 1) THEN

    INSERT INTO flashcards (module_id, front_text, back_text, tags, difficulty, order_index, created_by) VALUES
    (v_module_id, 'Photoreceptors', 'Specialized neurons in the retina that convert light into electrical signals. Rods handle low-light vision; cones handle color and detail.', ARRAY['retina', 'neurons'], 2, 1, v_creator_id),
    (v_module_id, 'Saccade', 'A rapid, ballistic eye movement that shifts the point of fixation. Humans make about 3-4 saccades per second during reading.', ARRAY['eye-movement', 'reading'], 2, 2, v_creator_id),
    (v_module_id, 'Fixation', 'A pause between saccades where the eye remains relatively still to process visual information. Typically lasts 200-300ms.', ARRAY['eye-movement', 'attention'], 1, 3, v_creator_id),
    (v_module_id, 'Gestalt Proximity', 'The perceptual principle that elements placed close together are perceived as belonging to the same group, even without explicit grouping cues.', ARRAY['gestalt', 'perception'], 2, 4, v_creator_id),
    (v_module_id, 'Gestalt Similarity', 'The principle that elements sharing visual properties (color, shape, size) are perceived as part of the same group.', ARRAY['gestalt', 'perception'], 2, 5, v_creator_id),
    (v_module_id, 'Opponent Process Theory', 'Color vision model proposing three opposing channels: red-green, blue-yellow, and black-white. Explains afterimages and color contrast effects.', ARRAY['color', 'theory'], 3, 6, v_creator_id),
    (v_module_id, 'Feature Integration Theory', 'Treisman''s theory that basic visual features are processed in parallel, but combining them into objects requires focused attention.', ARRAY['attention', 'theory'], 3, 7, v_creator_id),
    (v_module_id, 'Inattentional Blindness', 'The failure to notice a fully visible but unexpected stimulus when attention is engaged on another task (e.g., the invisible gorilla experiment).', ARRAY['attention', 'blindness'], 2, 8, v_creator_id),
    (v_module_id, 'Ventral Stream', 'The "what" pathway — runs from V1 to the temporal lobe. Responsible for object recognition, face perception, and color processing.', ARRAY['brain', 'pathways'], 3, 9, v_creator_id),
    (v_module_id, 'Dorsal Stream', 'The "where/how" pathway — runs from V1 to the parietal lobe. Handles spatial awareness, motion detection, and guiding actions.', ARRAY['brain', 'pathways'], 3, 10, v_creator_id),
    (v_module_id, 'Cognitive Load', 'The total amount of mental effort being used in working memory. Excessive cognitive load impairs learning and task performance.', ARRAY['cognition', 'ux'], 2, 11, v_creator_id),
    (v_module_id, 'WCAG Contrast Ratio', 'Web Content Accessibility Guidelines standard requiring minimum contrast ratios: 4.5:1 for normal text, 3:1 for large text (AA level).', ARRAY['accessibility', 'ux'], 2, 12, v_creator_id);

    RAISE NOTICE 'Flashcards seeded: 12 cards';
  ELSE
    RAISE NOTICE 'Flashcards already exist for this module — skipping';
  END IF;

  -- ===========================================
  -- 1E. CODE LABS: Chapter 2
  -- ===========================================

  IF NOT EXISTS (SELECT 1 FROM code_labs WHERE module_id = v_module_id LIMIT 1) THEN

    -- Lab 1: WCAG Contrast Ratio Calculator
    INSERT INTO code_labs (module_id, title, description, instructions, starter_code, solution_code, test_cases, difficulty, order_index, created_by) VALUES
    (v_module_id,
     'WCAG Contrast Ratio Calculator',
     'Build a function to calculate contrast ratios between two colors, a key accessibility metric for UX design.',
     E'## WCAG Contrast Ratio Calculator\n\nThe Web Content Accessibility Guidelines (WCAG) define contrast ratio as:\n\n**CR = (L1 + 0.05) / (L2 + 0.05)**\n\nwhere L1 is the lighter color''s relative luminance and L2 is the darker''s.\n\n### Your Task\n1. Complete `relative_luminance(hex_color)` to convert a hex color to its relative luminance (0-1)\n2. Complete `contrast_ratio(color1, color2)` to return the WCAG contrast ratio\n\n### Luminance Formula\nFor each sRGB channel (0-255 normalized to 0-1):\n- If value <= 0.03928: linear = value / 12.92\n- Else: linear = ((value + 0.055) / 1.055) ^ 2.4\n\nL = 0.2126 * R + 0.7152 * G + 0.0722 * B',
     E'def relative_luminance(hex_color):\n    """Convert a hex color (e.g., ''#FFFFFF'') to relative luminance (0-1)."""\n    # Remove # prefix\n    hex_color = hex_color.lstrip(''#'')\n    # Parse RGB values (0-255)\n    r = int(hex_color[0:2], 16)\n    g = int(hex_color[2:4], 16)\n    b = int(hex_color[4:6], 16)\n    \n    # TODO: Convert to sRGB (0-1), apply gamma correction, compute luminance\n    pass\n\n\ndef contrast_ratio(color1, color2):\n    """Calculate WCAG contrast ratio between two hex colors."""\n    # TODO: Get luminances and compute ratio\n    pass\n\n\n# Test it out:\nprint(f"White vs Black: {contrast_ratio(''#FFFFFF'', ''#000000''):.2f}:1")\nprint(f"White vs Blue:  {contrast_ratio(''#FFFFFF'', ''#0000FF''):.2f}:1")',
     E'def relative_luminance(hex_color):\n    """Convert a hex color (e.g., ''#FFFFFF'') to relative luminance (0-1)."""\n    hex_color = hex_color.lstrip(''#'')\n    r = int(hex_color[0:2], 16) / 255\n    g = int(hex_color[2:4], 16) / 255\n    b = int(hex_color[4:6], 16) / 255\n    \n    def linearize(c):\n        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4\n    \n    r_lin = linearize(r)\n    g_lin = linearize(g)\n    b_lin = linearize(b)\n    \n    return 0.2126 * r_lin + 0.7152 * g_lin + 0.0722 * b_lin\n\n\ndef contrast_ratio(color1, color2):\n    """Calculate WCAG contrast ratio between two hex colors."""\n    l1 = relative_luminance(color1)\n    l2 = relative_luminance(color2)\n    lighter = max(l1, l2)\n    darker = min(l1, l2)\n    return (lighter + 0.05) / (darker + 0.05)\n\n\nprint(f"White vs Black: {contrast_ratio(''#FFFFFF'', ''#000000''):.2f}:1")\nprint(f"White vs Blue:  {contrast_ratio(''#FFFFFF'', ''#0000FF''):.2f}:1")',
     '[
        {"name": "White vs Black = 21:1", "input": ["#FFFFFF", "#000000"], "expected": 21.0, "tolerance": 0.1},
        {"name": "Same color = 1:1", "input": ["#808080", "#808080"], "expected": 1.0, "tolerance": 0.01},
        {"name": "White vs Blue ≈ 8.59:1", "input": ["#FFFFFF", "#0000FF"], "expected": 8.59, "tolerance": 0.1},
        {"name": "WCAG AA body text (≥4.5)", "input": ["#FFFFFF", "#767676"], "expected": 4.54, "tolerance": 0.1}
      ]'::jsonb,
     'beginner',
     1,
     v_creator_id);

    -- Lab 2: Visual Scanpath Simulator
    INSERT INTO code_labs (module_id, title, description, instructions, starter_code, solution_code, test_cases, difficulty, order_index, created_by) VALUES
    (v_module_id,
     'Simulate a Visual Scanpath',
     'Visualize how the eye moves across a display by plotting fixation points and saccade lines using matplotlib.',
     E'## Visual Scanpath Simulator\n\nA scanpath is the sequence of fixations and saccades the eye makes when viewing a scene.\n\n### Your Task\n1. Complete `plot_scanpath(fixations)` where `fixations` is a list of (x, y, duration_ms) tuples\n2. Plot fixation points as circles (size proportional to duration)\n3. Connect consecutive fixations with lines (saccades)\n4. Number each fixation\n\n### Requirements\n- Use matplotlib scatter for fixation points\n- Circle size = duration_ms * 0.5\n- Saccade lines in gray, dashed\n- Add fixation number labels',
     E'import matplotlib\nmatplotlib.use(''Agg'')  # Non-interactive backend\nimport matplotlib.pyplot as plt\nimport numpy as np\n\ndef plot_scanpath(fixations):\n    """Plot a visual scanpath.\n    \n    Args:\n        fixations: list of (x, y, duration_ms) tuples\n    \n    Returns:\n        matplotlib Figure object\n    """\n    if not fixations:\n        fig, ax = plt.subplots(1, 1, figsize=(8, 6))\n        ax.set_title("Empty Scanpath")\n        return fig\n    \n    fig, ax = plt.subplots(1, 1, figsize=(8, 6))\n    \n    # TODO: Extract x, y, durations from fixations\n    # TODO: Plot saccade lines connecting consecutive fixations\n    # TODO: Plot fixation points (size proportional to duration)\n    # TODO: Add fixation number labels\n    # TODO: Set title and labels\n    \n    return fig\n\n\n# Demo scanpath: reading a webpage header then scanning content\nfixations = [\n    (100, 50, 250),   # Logo area\n    (400, 50, 180),   # Navigation\n    (300, 200, 350),  # Headline\n    (300, 350, 280),  # First paragraph\n    (500, 350, 200),  # Image\n    (300, 500, 320),  # Second paragraph\n]\n\nfig = plot_scanpath(fixations)\nplt.tight_layout()\nplt.savefig("scanpath.png", dpi=100)\nprint("Scanpath plot saved!")\nplt.show()',
     E'import matplotlib\nmatplotlib.use(''Agg'')\nimport matplotlib.pyplot as plt\nimport numpy as np\n\ndef plot_scanpath(fixations):\n    """Plot a visual scanpath."""\n    if not fixations:\n        fig, ax = plt.subplots(1, 1, figsize=(8, 6))\n        ax.set_title("Empty Scanpath")\n        return fig\n    \n    fig, ax = plt.subplots(1, 1, figsize=(8, 6))\n    \n    xs = [f[0] for f in fixations]\n    ys = [f[1] for f in fixations]\n    durations = [f[2] for f in fixations]\n    sizes = [d * 0.5 for d in durations]\n    \n    # Saccade lines\n    ax.plot(xs, ys, ''--'', color=''gray'', alpha=0.5, linewidth=1, zorder=1)\n    \n    # Fixation points\n    scatter = ax.scatter(xs, ys, s=sizes, c=range(len(fixations)),\n                         cmap=''viridis'', alpha=0.7, edgecolors=''black'',\n                         linewidth=1, zorder=2)\n    \n    # Labels\n    for i, (x, y, d) in enumerate(fixations):\n        ax.annotate(str(i + 1), (x, y), textcoords="offset points",\n                    xytext=(8, 8), fontsize=10, fontweight=''bold'', color=''#333'')\n    \n    ax.set_title("Visual Scanpath", fontsize=14)\n    ax.set_xlabel("X position (px)")\n    ax.set_ylabel("Y position (px)")\n    ax.invert_yaxis()  # Screen coordinates: Y increases downward\n    plt.colorbar(scatter, ax=ax, label="Fixation order")\n    \n    return fig\n\n\nfixations = [\n    (100, 50, 250),\n    (400, 50, 180),\n    (300, 200, 350),\n    (300, 350, 280),\n    (500, 350, 200),\n    (300, 500, 320),\n]\n\nfig = plot_scanpath(fixations)\nplt.tight_layout()\nplt.savefig("scanpath.png", dpi=100)\nprint("Scanpath plot saved!")\nplt.show()',
     '[
        {"name": "Returns a figure object", "input": [[[100, 50, 250], [400, 50, 180]]], "expected": "figure", "tolerance": null},
        {"name": "Handles empty input", "input": [[]], "expected": "figure", "tolerance": null}
      ]'::jsonb,
     'intermediate',
     2,
     v_creator_id);

    RAISE NOTICE 'Code labs seeded: 2 labs';
  ELSE
    RAISE NOTICE 'Code labs already exist for this module — skipping';
  END IF;

END $$;
