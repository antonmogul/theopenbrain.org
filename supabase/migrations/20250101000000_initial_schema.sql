-- Open Brain Platform - Initial Database Schema
-- Migration: 20250101000000_initial_schema.sql
-- Description: Creates all tables, indexes, RLS policies, and functions

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for text search (if needed)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- 1. AUTHENTICATION & USERS
-- ============================================

-- Extended user profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('creator', 'professor', 'student')),
  institution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Creator-specific fields
  creator_bio TEXT,
  creator_website TEXT,
  
  -- Professor-specific fields
  professor_department TEXT,
  
  -- Student-specific fields
  student_year INTEGER,
  student_major TEXT
);

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);

-- ============================================
-- 2. CONTENT STRUCTURE
-- ============================================

-- Master content versions (v1.0, v1.1, etc.)
CREATE TABLE content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  created_by UUID NOT NULL REFERENCES profiles(id),
  release_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Modules (top-level content units - equivalent to "chapters")
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_version_id UUID NOT NULL REFERENCES content_versions(id) ON DELETE CASCADE,
  
  -- Metadata
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  
  -- Configuration
  animation_config JSONB,
  layout_config JSONB,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(content_version_id, slug),
  UNIQUE(content_version_id, order_index)
);

CREATE INDEX idx_modules_version ON modules(content_version_id);
CREATE INDEX idx_modules_status ON modules(status);

-- ============================================
-- 3. ANIMATIONS & DIAGRAMS (created before sections/paragraphs due to FK references)
-- ============================================

-- Standardized animation/diagram definitions
CREATE TABLE animations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  animation_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  
  -- Media type
  media_type TEXT NOT NULL CHECK (media_type IN ('lottie', 'video', 'image', 'youtube', 'gsap', 'css')),
  
  -- File references
  lottie_file_url TEXT,
  video_file_url TEXT,
  image_file_url TEXT,
  youtube_id TEXT,
  gsap_config JSONB,
  css_class_name TEXT,
  
  -- Interaction pattern (standardized)
  interaction_type TEXT NOT NULL CHECK (interaction_type IN (
    'auto_loop',
    'click_states',
    'switch',
    'fullscreen_states',
    'scroll_transition',
    'scroll_linked',
    'video_flip',
    'static_image',
    'youtube_embed'
  )),
  
  -- Component mapping
  component_name TEXT NOT NULL,
  
  -- Configuration (flexible JSONB)
  config JSONB NOT NULL DEFAULT '{}',
  
  -- Metadata
  file_size_bytes INTEGER,
  scientific_domain TEXT,
  load_priority TEXT DEFAULT 'high' CHECK (load_priority IN ('critical', 'high', 'low', 'lazy')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_animations_type ON animations(interaction_type);
CREATE INDEX idx_animations_key ON animations(animation_key);
CREATE INDEX idx_animations_domain ON animations(scientific_domain);

-- Animation states (for click/switch interactions)
CREATE TABLE animation_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animation_id UUID NOT NULL REFERENCES animations(id) ON DELETE CASCADE,
  
  state_label TEXT NOT NULL,
  state_description TEXT,
  order_index INTEGER NOT NULL,
  
  -- Highlighting
  is_highlight_state BOOLEAN DEFAULT FALSE,
  highlight_class_name TEXT,
  highlight_elements TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(animation_id, state_label),
  UNIQUE(animation_id, order_index)
);

CREATE INDEX idx_animation_states_animation ON animation_states(animation_id);

-- Animation variants (for switch-based animations)
CREATE TABLE animation_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animation_id UUID NOT NULL REFERENCES animations(id) ON DELETE CASCADE,
  
  variant_label TEXT NOT NULL,
  lottie_file_url TEXT,
  video_file_url TEXT,
  order_index INTEGER NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(animation_id, variant_label),
  UNIQUE(animation_id, order_index)
);

CREATE INDEX idx_animation_variants_animation ON animation_variants(animation_id);

-- ============================================
-- 4. CONTENT STRUCTURE (continued - sections and paragraphs)
-- ============================================

-- Sections (within modules)
CREATE TABLE sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  
  -- Content
  introduction_text TEXT,
  
  -- Animation/Diagram configuration
  animation_id UUID REFERENCES animations(id),
  animation_config JSONB,
  
  -- Layout
  fullscreen BOOLEAN DEFAULT FALSE,
  split_screen BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(module_id, slug),
  UNIQUE(module_id, order_index)
);

CREATE INDEX idx_sections_module ON sections(module_id);

-- Paragraphs (content blocks within sections)
CREATE TABLE paragraphs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  
  -- Content (stored as structured JSON to avoid HTML injection)
  content JSONB NOT NULL,
  content_text TEXT, -- Plain text for search (generated)
  
  order_index INTEGER NOT NULL,
  
  -- Interactive elements
  has_animation BOOLEAN DEFAULT FALSE,
  animation_id UUID REFERENCES animations(id),
  animation_trigger TEXT, -- 'scroll', 'click', 'auto'
  
  -- Subsection support (nested content)
  is_subsection_header BOOLEAN DEFAULT FALSE,
  subsection_level INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(section_id, order_index)
);

CREATE INDEX idx_paragraphs_section ON paragraphs(section_id);
CREATE INDEX idx_paragraphs_animation ON paragraphs(animation_id) WHERE animation_id IS NOT NULL;
CREATE INDEX idx_paragraphs_search ON paragraphs USING gin(to_tsvector('english', content_text)) WHERE content_text IS NOT NULL;

-- ============================================
-- 5. USER INTERACTIONS & COLLABORATION
-- ============================================

-- User highlights (replaces localStorage)
CREATE TABLE highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  paragraph_id UUID NOT NULL REFERENCES paragraphs(id) ON DELETE CASCADE,
  
  -- Selection data
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL,
  selected_text TEXT NOT NULL,
  
  -- Metadata
  color TEXT DEFAULT 'yellow',
  note TEXT,
  
  -- Privacy
  is_public BOOLEAN DEFAULT FALSE,
  is_shared BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure valid selection
  CHECK (end_offset > start_offset)
);

CREATE INDEX idx_highlights_user ON highlights(user_id);
CREATE INDEX idx_highlights_paragraph ON highlights(paragraph_id);
CREATE INDEX idx_highlights_public ON highlights(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_highlights_created ON highlights(created_at DESC);

-- Trending highlights (aggregated view)
CREATE TABLE trending_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paragraph_id UUID NOT NULL REFERENCES paragraphs(id) ON DELETE CASCADE,
  selected_text TEXT NOT NULL,
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL,
  
  -- Aggregation
  highlight_count INTEGER DEFAULT 1,
  last_highlighted_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Cache refresh
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(paragraph_id, start_offset, end_offset)
);

CREATE INDEX idx_trending_highlights_count ON trending_highlights(highlight_count DESC);
CREATE INDEX idx_trending_highlights_updated ON trending_highlights(updated_at DESC);

-- User notes (standalone or attached to highlights)
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  highlight_id UUID REFERENCES highlights(id) ON DELETE CASCADE,
  
  -- Note content
  content TEXT NOT NULL,
  
  -- Context
  paragraph_id UUID REFERENCES paragraphs(id) ON DELETE CASCADE,
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  
  -- Privacy
  is_public BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notes_user ON notes(user_id);
CREATE INDEX idx_notes_paragraph ON notes(paragraph_id) WHERE paragraph_id IS NOT NULL;
CREATE INDEX idx_notes_public ON notes(is_public) WHERE is_public = TRUE;

-- ============================================
-- 6. COURSE CURATION (PROFESSOR FEATURES)
-- ============================================

-- Courses (professor-curated module collections)
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Course info
  title TEXT NOT NULL,
  description TEXT,
  course_code TEXT,
  semester TEXT,
  
  -- Publishing
  published_url TEXT UNIQUE,
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_courses_professor ON courses(professor_id);
CREATE INDEX idx_courses_published ON courses(is_published) WHERE is_published = TRUE;
CREATE INDEX idx_courses_url ON courses(published_url) WHERE published_url IS NOT NULL;

-- Course modules (many-to-many: courses ↔ modules)
CREATE TABLE course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  
  -- Order within course
  order_index INTEGER NOT NULL,
  
  -- Customization
  custom_title TEXT,
  is_required BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(course_id, module_id),
  UNIQUE(course_id, order_index)
);

CREATE INDEX idx_course_modules_course ON course_modules(course_id);
CREATE INDEX idx_course_modules_module ON course_modules(module_id);

-- Course enrollments (students in courses)
CREATE TABLE course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ,
  
  UNIQUE(course_id, student_id)
);

CREATE INDEX idx_enrollments_course ON course_enrollments(course_id);
CREATE INDEX idx_enrollments_student ON course_enrollments(student_id);

-- ============================================
-- 7. QUIZZES & FLASHCARDS
-- ============================================

-- Quizzes (attached to sections or modules)
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  
  -- Quiz info
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  
  -- Settings
  time_limit_minutes INTEGER,
  passing_score INTEGER DEFAULT 70,
  allow_multiple_attempts BOOLEAN DEFAULT TRUE,
  show_correct_answers BOOLEAN DEFAULT TRUE,
  
  -- Order
  order_index INTEGER,
  
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quizzes_module ON quizzes(module_id) WHERE module_id IS NOT NULL;
CREATE INDEX idx_quizzes_section ON quizzes(section_id) WHERE section_id IS NOT NULL;
CREATE INDEX idx_quizzes_course ON quizzes(course_id) WHERE course_id IS NOT NULL;

-- Quiz questions
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  
  -- Question
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay')),
  
  -- Options (for multiple choice)
  options JSONB,
  
  -- Answer (for short answer/essay)
  correct_answer TEXT,
  answer_keywords TEXT[],
  
  -- Settings
  points INTEGER DEFAULT 1,
  order_index INTEGER NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(quiz_id, order_index)
);

CREATE INDEX idx_quiz_questions_quiz ON quiz_questions(quiz_id);

-- Quiz attempts (student submissions)
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Results
  score INTEGER,
  total_points INTEGER,
  earned_points INTEGER,
  
  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  time_spent_seconds INTEGER,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned'))
);

CREATE INDEX idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_student ON quiz_attempts(student_id);
CREATE INDEX idx_quiz_attempts_composite ON quiz_attempts(quiz_id, student_id, started_at);

-- Quiz answers (individual question responses)
CREATE TABLE quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  
  -- Answer
  answer_text TEXT,
  selected_option_id INTEGER,
  is_correct BOOLEAN,
  points_earned INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quiz_answers_attempt ON quiz_answers(attempt_id);
CREATE INDEX idx_quiz_answers_question ON quiz_answers(question_id);

-- Flashcards
CREATE TABLE flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  
  -- Card content
  front_text TEXT NOT NULL,
  back_text TEXT NOT NULL,
  front_image_url TEXT,
  back_image_url TEXT,
  
  -- Metadata
  tags TEXT[],
  difficulty INTEGER DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  
  -- Order
  order_index INTEGER,
  
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_flashcards_module ON flashcards(module_id) WHERE module_id IS NOT NULL;
CREATE INDEX idx_flashcards_section ON flashcards(section_id) WHERE section_id IS NOT NULL;

-- Flashcard study sessions
CREATE TABLE flashcard_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Session info
  card_ids UUID[] NOT NULL,
  study_mode TEXT DEFAULT 'review' CHECK (study_mode IN ('review', 'learn', 'test')),
  
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_flashcard_sessions_student ON flashcard_sessions(student_id);

-- Flashcard responses (spaced repetition tracking)
CREATE TABLE flashcard_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES flashcard_sessions(id) ON DELETE CASCADE,
  flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Response
  was_correct BOOLEAN NOT NULL,
  response_time_seconds INTEGER,
  
  -- Spaced repetition (SM-2 algorithm)
  ease_factor DECIMAL(4,2) DEFAULT 2.5,
  interval_days INTEGER DEFAULT 1,
  repetitions INTEGER DEFAULT 0,
  next_review_date DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_flashcard_responses_student ON flashcard_responses(student_id);
CREATE INDEX idx_flashcard_responses_next_review ON flashcard_responses(next_review_date) WHERE next_review_date IS NOT NULL;

-- ============================================
-- 8. AI TUTOR & PYTHON LABS
-- ============================================

-- AI tutor conversations
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Context
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  paragraph_id UUID REFERENCES paragraphs(id) ON DELETE CASCADE,
  
  -- Conversation
  title TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_active ON ai_conversations(is_active) WHERE is_active = TRUE;

-- AI messages
CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  
  -- Message
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  
  -- Metadata
  tokens_used INTEGER,
  model_used TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_messages_conversation ON ai_messages(conversation_id);
CREATE INDEX idx_ai_messages_created ON ai_messages(created_at);

-- Python code labs
CREATE TABLE code_labs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  
  -- Lab info
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT NOT NULL,
  
  -- Code
  starter_code TEXT,
  solution_code TEXT,
  test_cases JSONB,
  
  -- Data
  dataset_url TEXT,
  dataset_config JSONB,
  
  -- Settings
  allow_editing BOOLEAN DEFAULT TRUE,
  show_solution BOOLEAN DEFAULT FALSE,
  auto_grade BOOLEAN DEFAULT FALSE,
  
  -- Order
  order_index INTEGER,
  
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_code_labs_module ON code_labs(module_id) WHERE module_id IS NOT NULL;
CREATE INDEX idx_code_labs_section ON code_labs(section_id) WHERE section_id IS NOT NULL;

-- Code lab submissions
CREATE TABLE code_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id UUID NOT NULL REFERENCES code_labs(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Submission
  code TEXT NOT NULL,
  output TEXT,
  error_message TEXT,
  
  -- Results
  test_results JSONB,
  passed BOOLEAN,
  score INTEGER,
  
  -- Git integration
  git_repo_url TEXT,
  git_commit_hash TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_code_submissions_lab ON code_submissions(lab_id);
CREATE INDEX idx_code_submissions_student ON code_submissions(student_id);

-- ============================================
-- 9. ANALYTICS & PROGRESS TRACKING
-- ============================================

-- Reading progress (tracks student progress through content)
CREATE TABLE reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  
  -- Progress
  last_section_id UUID REFERENCES sections(id),
  last_paragraph_id UUID REFERENCES paragraphs(id),
  scroll_position DECIMAL(5,2),
  time_spent_seconds INTEGER DEFAULT 0,
  
  -- Completion
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  
  -- Tracking
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, module_id, course_id)
);

CREATE INDEX idx_reading_progress_user ON reading_progress(user_id);
CREATE INDEX idx_reading_progress_module ON reading_progress(module_id);
CREATE INDEX idx_reading_progress_course ON reading_progress(course_id) WHERE course_id IS NOT NULL;

-- Analytics events (for detailed tracking)
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Event
  event_type TEXT NOT NULL,
  event_data JSONB,
  
  -- Context
  module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
  section_id UUID REFERENCES sections(id) ON DELETE SET NULL,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  
  -- Metadata
  user_agent TEXT,
  ip_address INET,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_user ON analytics_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX idx_analytics_events_module ON analytics_events(module_id) WHERE module_id IS NOT NULL;

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update timestamps function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sections_updated_at BEFORE UPDATE ON sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_paragraphs_updated_at BEFORE UPDATE ON paragraphs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_animations_updated_at BEFORE UPDATE ON animations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_highlights_updated_at BEFORE UPDATE ON highlights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON quizzes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiz_questions_updated_at BEFORE UPDATE ON quiz_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flashcards_updated_at BEFORE UPDATE ON flashcards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_conversations_updated_at BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_code_labs_updated_at BEFORE UPDATE ON code_labs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_code_submissions_updated_at BEFORE UPDATE ON code_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trending highlights aggregation function
CREATE OR REPLACE FUNCTION update_trending_highlights()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO trending_highlights (
    paragraph_id, selected_text, start_offset, end_offset,
    highlight_count, last_highlighted_at
  )
  VALUES (
    NEW.paragraph_id, NEW.selected_text, NEW.start_offset, NEW.end_offset,
    1, NOW()
  )
  ON CONFLICT (paragraph_id, start_offset, end_offset)
  DO UPDATE SET
    highlight_count = trending_highlights.highlight_count + 1,
    last_highlighted_at = NOW(),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update trending highlights when public highlight is created
CREATE TRIGGER highlight_trending_update
  AFTER INSERT ON highlights
  FOR EACH ROW
  WHEN (NEW.is_public = TRUE)
  EXECUTE FUNCTION update_trending_highlights();

-- Generate course URL function
CREATE OR REPLACE FUNCTION generate_course_url()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.published_url IS NULL THEN
    NEW.published_url := 'course-' || NEW.id::TEXT;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate course URL
CREATE TRIGGER course_url_generation
  BEFORE INSERT ON courses
  FOR EACH ROW
  EXECUTE FUNCTION generate_course_url();

-- ============================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE paragraphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE animations ENABLE ROW LEVEL SECURITY;
ALTER TABLE animation_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE animation_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Creators can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'creator'
    )
  );

-- Content policies (published content is public)
CREATE POLICY "Anyone can read published content"
  ON modules FOR SELECT
  USING (status = 'published');

CREATE POLICY "Creators can manage all content"
  ON modules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'creator'
    )
  );

CREATE POLICY "Anyone can read published sections"
  ON sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM modules
      WHERE modules.id = sections.module_id AND modules.status = 'published'
    )
  );

CREATE POLICY "Anyone can read published paragraphs"
  ON paragraphs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sections
      JOIN modules ON modules.id = sections.module_id
      WHERE sections.id = paragraphs.section_id AND modules.status = 'published'
    )
  );

-- Animations policies (public read, creator write)
CREATE POLICY "Anyone can read animations"
  ON animations FOR SELECT
  USING (true);

CREATE POLICY "Creators can manage animations"
  ON animations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'creator'
    )
  );

-- Highlights policies
CREATE POLICY "Users manage own highlights"
  ON highlights FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view public highlights"
  ON highlights FOR SELECT
  USING (is_public = TRUE OR auth.uid() = user_id);

-- Notes policies
CREATE POLICY "Users manage own notes"
  ON notes FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view public notes"
  ON notes FOR SELECT
  USING (is_public = TRUE OR auth.uid() = user_id);

-- Courses policies
CREATE POLICY "Professors manage own courses"
  ON courses FOR ALL
  USING (
    professor_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'professor'
    )
  );

CREATE POLICY "Students can view published courses"
  ON courses FOR SELECT
  USING (is_published = TRUE);

CREATE POLICY "Enrolled students can view course modules"
  ON course_modules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM course_enrollments
      WHERE course_enrollments.course_id = course_modules.course_id
      AND course_enrollments.student_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM courses
      JOIN profiles ON profiles.id = courses.professor_id
      WHERE courses.id = course_modules.course_id
      AND profiles.id = auth.uid()
      AND profiles.role = 'professor'
    )
  );

-- Quiz policies
CREATE POLICY "Anyone can read published quizzes"
  ON quizzes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM modules
      WHERE modules.id = quizzes.module_id AND modules.status = 'published'
    )
    OR
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = quizzes.course_id AND courses.is_published = TRUE
    )
  );

CREATE POLICY "Creators and professors can manage quizzes"
  ON quizzes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('creator', 'professor')
    )
  );

-- Quiz attempts policies
CREATE POLICY "Students manage own quiz attempts"
  ON quiz_attempts FOR ALL
  USING (auth.uid() = student_id);

-- Reading progress policies
CREATE POLICY "Users manage own reading progress"
  ON reading_progress FOR ALL
  USING (auth.uid() = user_id);

-- Analytics events (users can insert their own events)
CREATE POLICY "Users can insert own analytics events"
  ON analytics_events FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Creators can view all analytics"
  ON analytics_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'creator'
    )
  );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE profiles IS 'Extended user profiles with role-based fields';
COMMENT ON TABLE content_versions IS 'Content versioning system (v1.0, v1.1, etc.)';
COMMENT ON TABLE modules IS 'Top-level content units (chapters)';
COMMENT ON TABLE sections IS 'Sections within modules';
COMMENT ON TABLE paragraphs IS 'Content blocks with structured JSONB content';
COMMENT ON TABLE animations IS 'Standardized animation/diagram definitions';
COMMENT ON TABLE courses IS 'Professor-curated module collections';
COMMENT ON TABLE highlights IS 'User text highlights (replaces localStorage)';
COMMENT ON TABLE trending_highlights IS 'Aggregated public highlights for trending feed';
COMMENT ON TABLE quizzes IS 'Quizzes attached to modules/sections/courses';
COMMENT ON TABLE flashcards IS 'Flashcards with spaced repetition support';
COMMENT ON TABLE ai_conversations IS 'AI tutor conversation threads';
COMMENT ON TABLE code_labs IS 'Python code labs with Git integration';
COMMENT ON TABLE reading_progress IS 'Student progress tracking through content';

