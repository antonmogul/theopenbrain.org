-- Professor Dashboard Test Data
-- Run this in Supabase SQL Editor to set up test data for the Professor Dashboard
--
-- PREREQUISITES:
-- 1. You need a user account with email 'professor@test.com' (or change the email below)
-- 2. You need published modules in the database (from the Creator workflow)
--
-- To create a test professor user:
-- 1. Sign up via the app with email 'professor@test.com'
-- 2. Then run this script to update their profile to 'professor' role

-- ============================================
-- Step 1: Create/Update Professor Profile
-- ============================================

-- First, check if we have a test professor user
-- If you signed up with a different email, update this variable
DO $$
DECLARE
    professor_user_id UUID;
    professor_email TEXT := 'professor@test.com';
BEGIN
    -- Try to find an existing user with this email
    SELECT id INTO professor_user_id FROM auth.users WHERE email = professor_email;

    IF professor_user_id IS NULL THEN
        RAISE NOTICE 'No user found with email %. Please sign up first via the app.', professor_email;
    ELSE
        -- Update or insert the profile
        INSERT INTO profiles (id, email, full_name, role, institution, professor_department)
        VALUES (
            professor_user_id,
            professor_email,
            'Dr. Jane Smith',
            'professor',
            'Open Brain University',
            'Neuroscience'
        )
        ON CONFLICT (id) DO UPDATE SET
            role = 'professor',
            full_name = COALESCE(profiles.full_name, 'Dr. Jane Smith'),
            institution = COALESCE(profiles.institution, 'Open Brain University'),
            professor_department = 'Neuroscience';

        RAISE NOTICE 'Professor profile created/updated for user %', professor_user_id;
    END IF;
END $$;

-- ============================================
-- Step 2: Create Sample Courses
-- ============================================

-- Insert sample courses for the professor
-- (uses a subquery to get the professor_id)
INSERT INTO courses (id, professor_id, title, description, course_code, semester, is_published, published_url)
SELECT
    gen_random_uuid(),
    p.id,
    course_data.title,
    course_data.description,
    course_data.course_code,
    course_data.semester,
    course_data.is_published,
    course_data.published_url
FROM profiles p
CROSS JOIN (
    VALUES
        ('Introduction to Neuroscience', 'A comprehensive introduction to the structure and function of the nervous system.', 'NEURO101', 'Spring 2025', true, 'intro-neuro-spring25'),
        ('The Visual System', 'Deep dive into how the brain processes visual information.', 'NEURO201', 'Spring 2025', true, 'visual-system-spring25'),
        ('Cognitive Neuroscience', 'Exploring the neural basis of cognition, memory, and decision-making.', 'NEURO301', 'Fall 2025', false, NULL)
) AS course_data(title, description, course_code, semester, is_published, published_url)
WHERE p.role = 'professor' AND p.email = 'professor@test.com'
ON CONFLICT DO NOTHING;

-- ============================================
-- Step 3: Link Courses to Modules
-- ============================================

-- Add published modules to the first course (Introduction to Neuroscience)
INSERT INTO course_modules (id, course_id, module_id, order_index, is_required)
SELECT
    gen_random_uuid(),
    c.id,
    m.id,
    m.order_index,
    true
FROM courses c
JOIN modules m ON m.status = 'published'
WHERE c.title = 'Introduction to Neuroscience'
ON CONFLICT DO NOTHING;

-- ============================================
-- Step 4: Create Sample Students
-- ============================================

-- Create test student profiles (if they don't exist)
-- NOTE: In production, students would sign up themselves
-- This creates placeholder profiles for demo purposes

DO $$
DECLARE
    student_emails TEXT[] := ARRAY[
        'student1@test.com',
        'student2@test.com',
        'student3@test.com',
        'student4@test.com',
        'student5@test.com'
    ];
    student_names TEXT[] := ARRAY[
        'Alice Johnson',
        'Bob Williams',
        'Carol Davis',
        'David Brown',
        'Emma Wilson'
    ];
    student_id UUID;
    i INTEGER;
BEGIN
    FOR i IN 1..array_length(student_emails, 1) LOOP
        -- Check if user exists in auth.users
        SELECT id INTO student_id FROM auth.users WHERE email = student_emails[i];

        IF student_id IS NOT NULL THEN
            -- Create/update profile
            INSERT INTO profiles (id, email, full_name, role, student_year, student_major)
            VALUES (
                student_id,
                student_emails[i],
                student_names[i],
                'student',
                2 + (i % 3), -- Years 2-4
                CASE i % 3
                    WHEN 0 THEN 'Neuroscience'
                    WHEN 1 THEN 'Psychology'
                    ELSE 'Biology'
                END
            )
            ON CONFLICT (id) DO UPDATE SET
                role = 'student',
                full_name = COALESCE(profiles.full_name, student_names[i]);

            RAISE NOTICE 'Student profile created for %', student_emails[i];
        END IF;
    END LOOP;
END $$;

-- ============================================
-- Step 5: Create Sample Enrollments
-- ============================================

-- Enroll students in the first course
INSERT INTO course_enrollments (id, course_id, student_id, enrolled_at)
SELECT
    gen_random_uuid(),
    c.id,
    p.id,
    NOW() - (random() * INTERVAL '30 days')
FROM courses c
JOIN profiles p ON p.role = 'student'
WHERE c.title = 'Introduction to Neuroscience'
ON CONFLICT DO NOTHING;

-- Enroll some students in the second course
INSERT INTO course_enrollments (id, course_id, student_id, enrolled_at)
SELECT
    gen_random_uuid(),
    c.id,
    p.id,
    NOW() - (random() * INTERVAL '14 days')
FROM courses c
JOIN profiles p ON p.role = 'student'
WHERE c.title = 'The Visual System'
  AND p.full_name IN ('Alice Johnson', 'Carol Davis', 'Emma Wilson')
ON CONFLICT DO NOTHING;

-- ============================================
-- Step 6: Create Sample Quizzes for Courses
-- ============================================

-- Create a quiz for Introduction to Neuroscience
INSERT INTO quizzes (id, course_id, title, description, time_limit_minutes, passing_score, allow_multiple_attempts, show_correct_answers, created_by)
SELECT
    gen_random_uuid(),
    c.id,
    'Chapter 1 Quiz: Neuron Basics',
    'Test your understanding of basic neuron structure and function.',
    15,
    70,
    true,
    true,
    c.professor_id
FROM courses c
WHERE c.title = 'Introduction to Neuroscience'
ON CONFLICT DO NOTHING;

-- Add questions to the quiz
INSERT INTO quiz_questions (id, quiz_id, question_text, question_type, options, correct_answer, points, order_index)
SELECT
    gen_random_uuid(),
    q.id,
    question_data.question_text,
    question_data.question_type,
    question_data.options::jsonb,
    question_data.correct_answer,
    question_data.points,
    question_data.order_index
FROM quizzes q
CROSS JOIN (
    VALUES
        ('What is the primary function of a neuron?', 'multiple_choice', '["Store memories", "Transmit electrical signals", "Produce hormones", "Filter blood"]', 'Transmit electrical signals', 1, 0),
        ('The axon terminal releases neurotransmitters into the synapse.', 'true_false', NULL, 'true', 1, 1),
        ('What is the myelin sheath?', 'multiple_choice', '["A type of neuron", "A protective fatty coating around axons", "A neurotransmitter", "Part of the synapse"]', 'A protective fatty coating around axons', 1, 2),
        ('Name the gap between two neurons.', 'short_answer', NULL, 'synapse', 2, 3)
) AS question_data(question_text, question_type, options, correct_answer, points, order_index)
WHERE q.title = 'Chapter 1 Quiz: Neuron Basics'
ON CONFLICT DO NOTHING;

-- ============================================
-- Step 7: Create Sample Quiz Attempts (for analytics)
-- ============================================

-- Add some quiz attempts for existing students
INSERT INTO quiz_attempts (id, quiz_id, student_id, score, total_points, earned_points, started_at, completed_at, time_spent_seconds, status)
SELECT
    gen_random_uuid(),
    q.id,
    p.id,
    CASE WHEN random() > 0.3 THEN floor(random() * 30 + 70) ELSE floor(random() * 40 + 30) END, -- Most pass, some fail
    5, -- Total points
    CASE WHEN random() > 0.3 THEN floor(random() * 2 + 3) ELSE floor(random() * 2 + 1) END, -- Earned points
    NOW() - (random() * INTERVAL '7 days'),
    NOW() - (random() * INTERVAL '7 days') + INTERVAL '10 minutes',
    floor(random() * 600 + 300), -- 5-15 minutes
    'completed'
FROM quizzes q
JOIN course_enrollments ce ON ce.course_id = q.course_id
JOIN profiles p ON p.id = ce.student_id
WHERE q.title = 'Chapter 1 Quiz: Neuron Basics'
LIMIT 10
ON CONFLICT DO NOTHING;

-- ============================================
-- Step 8: Create Sample Reading Progress
-- ============================================

-- Add reading progress for enrolled students
INSERT INTO reading_progress (id, user_id, module_id, course_id, time_spent_seconds, is_completed, last_accessed_at)
SELECT
    gen_random_uuid(),
    ce.student_id,
    cm.module_id,
    ce.course_id,
    floor(random() * 3600 + 300), -- 5-65 minutes
    random() > 0.4, -- 60% completion rate
    NOW() - (random() * INTERVAL '7 days')
FROM course_enrollments ce
JOIN course_modules cm ON cm.course_id = ce.course_id
ON CONFLICT (user_id, module_id, course_id) DO UPDATE SET
    time_spent_seconds = reading_progress.time_spent_seconds + floor(random() * 600),
    last_accessed_at = NOW();

-- ============================================
-- Verification Queries
-- ============================================

-- Run these to verify the data was created correctly:

-- Check professor profile
-- SELECT * FROM profiles WHERE role = 'professor';

-- Check courses
-- SELECT * FROM courses;

-- Check course modules
-- SELECT c.title as course, m.title as module FROM course_modules cm
-- JOIN courses c ON c.id = cm.course_id
-- JOIN modules m ON m.id = cm.module_id;

-- Check enrollments
-- SELECT c.title as course, p.full_name as student FROM course_enrollments ce
-- JOIN courses c ON c.id = ce.course_id
-- JOIN profiles p ON p.id = ce.student_id;

-- Check quizzes
-- SELECT q.title, c.title as course,
--   (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) as question_count
-- FROM quizzes q
-- JOIN courses c ON c.id = q.course_id;

SELECT 'Professor test data seed completed!' as status;
