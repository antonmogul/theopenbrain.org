# Database Schema Design - Open Brain Platform

**Date:** 2025-01-XX  
**Purpose:** Scalable database architecture for multi-chapter, multi-user educational platform  
**Database:** Supabase (PostgreSQL)

---

## Overview

This schema supports:
- **Content Management**: Chapters, sections, paragraphs with versioning
- **User Roles**: Creator, Professor, Student with row-level security
- **Interactive Features**: Animations, highlights, notes, quizzes, flashcards
- **Course Curation**: Professors selecting modules into courses
- **Collaboration**: Trending highlights, shared annotations
- **AI & Labs**: Python code labs, AI tutor interactions

---

## Core Tables

### 1. Authentication & Users

```sql
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

-- Indexes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);
```

### 2. Content Structure

```sql
-- Master content versions (v1.0, v1.1, etc.)
CREATE TABLE content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number TEXT NOT NULL UNIQUE, -- '1.0', '1.1', '2.0'
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  created_by UUID NOT NULL REFERENCES profiles(id),
  release_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  
  UNIQUE(version_number)
);

-- Modules (top-level content units - equivalent to "chapters")
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_version_id UUID NOT NULL REFERENCES content_versions(id) ON DELETE CASCADE,
  
  -- Metadata
  title TEXT NOT NULL,
  slug TEXT NOT NULL, -- URL-friendly identifier
  description TEXT,
  order_index INTEGER NOT NULL, -- Display order within version
  
  -- Configuration
  animation_config JSONB, -- Default animation settings
  layout_config JSONB, -- Split-screen, fullscreen, etc.
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(content_version_id, slug),
  UNIQUE(content_version_id, order_index)
);

-- Sections (within modules)
CREATE TABLE sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  
  -- Content
  introduction_text TEXT, -- Optional intro paragraph
  
  -- Animation/Diagram configuration
  animation_id UUID REFERENCES animations(id), -- Optional linked animation
  animation_config JSONB, -- Override module defaults
  
  -- Layout
  fullscreen BOOLEAN DEFAULT FALSE,
  split_screen BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(module_id, slug),
  UNIQUE(module_id, order_index)
);

-- Paragraphs (content blocks within sections)
CREATE TABLE paragraphs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  
  -- Content (stored as structured JSON to avoid HTML injection)
  content JSONB NOT NULL, -- Structured content blocks (see content structure below)
  content_text TEXT, -- Plain text for search (generated)
  
  order_index INTEGER NOT NULL,
  
  -- Interactive elements
  has_animation BOOLEAN DEFAULT FALSE,
  animation_id UUID REFERENCES animations(id),
  animation_trigger TEXT, -- 'scroll', 'click', 'auto'
  
  -- Subsection support (nested content)
  is_subsection_header BOOLEAN DEFAULT FALSE,
  subsection_level INTEGER DEFAULT 0, -- 0 = paragraph, 1 = sub, 2 = sub-sub
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(section_id, order_index)
);

-- Content structure for paragraphs (replaces HTML strings)
-- Example JSONB structure:
-- {
--   "blocks": [
--     {"type": "text", "content": "Normal text"},
--     {"type": "highlight", "content": "Important term", "hoverImage": "image-id"},
--     {"type": "footnote", "ref": "1"},
--     {"type": "link", "url": "...", "text": "..."}
--   ]
-- }

-- Indexes for content
CREATE INDEX idx_modules_version ON modules(content_version_id);
CREATE INDEX idx_sections_module ON sections(module_id);
CREATE INDEX idx_paragraphs_section ON paragraphs(section_id);
CREATE INDEX idx_paragraphs_search ON paragraphs USING gin(to_tsvector('english', content_text));
```

### 3. Animations & Diagrams

```sql
-- Standardized animation/diagram definitions
CREATE TABLE animations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  animation_key TEXT NOT NULL UNIQUE, -- 'animationEyeStructur', etc.
  title TEXT NOT NULL,
  description TEXT,
  
  -- Media type
  media_type TEXT NOT NULL CHECK (media_type IN ('lottie', 'video', 'image', 'youtube', 'gsap', 'css')),
  
  -- File references
  lottie_file_url TEXT,
  video_file_url TEXT,
  image_file_url TEXT,
  youtube_id TEXT,
  gsap_config JSONB, -- For code-based animations
  css_class_name TEXT, -- For CSS animations
  
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
  component_name TEXT NOT NULL, -- 'IllustrationComp', 'IllustrationSwitch', etc.
  
  -- Configuration (flexible JSONB)
  config JSONB NOT NULL DEFAULT '{}',
  -- Example: {
  --   "loop": true,
  --   "states": ["State 1", "State 2"],
  --   "highlight": true,
  --   "fullscreen": false,
  --   "scrollTrigger": {"start": "top center", "end": "bottom center"}
  -- }
  
  -- Metadata
  file_size_bytes INTEGER,
  scientific_domain TEXT, -- 'eye_anatomy', 'circuits', 'molecular', etc.
  load_priority TEXT DEFAULT 'high' CHECK (load_priority IN ('critical', 'high', 'low', 'lazy')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
  highlight_elements TEXT[], -- Array of element IDs to highlight
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(animation_id, state_label),
  UNIQUE(animation_id, order_index)
);

-- Animation variants (for switch-based animations)
CREATE TABLE animation_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animation_id UUID NOT NULL REFERENCES animations(id) ON DELETE CASCADE,
  
  variant_label TEXT NOT NULL, -- 'Day', 'Night', 'Small light', etc.
  lottie_file_url TEXT,
  video_file_url TEXT,
  order_index INTEGER NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(animation_id, variant_label),
  UNIQUE(animation_id, order_index)
);

-- Indexes
CREATE INDEX idx_animation_states_animation ON animation_states(animation_id);
CREATE INDEX idx_animation_variants_animation ON animation_variants(animation_id);
CREATE INDEX idx_animations_type ON animations(interaction_type);
```

### 4. User Interactions & Collaboration

```sql
-- User highlights (replaces localStorage)
CREATE TABLE highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  paragraph_id UUID NOT NULL REFERENCES paragraphs(id) ON DELETE CASCADE,
  
  -- Selection data
  start_offset INTEGER NOT NULL, -- Character offset in paragraph
  end_offset INTEGER NOT NULL,
  selected_text TEXT NOT NULL,
  
  -- Metadata
  color TEXT DEFAULT 'yellow', -- Highlight color
  note TEXT, -- Optional note attached to highlight
  
  -- Privacy
  is_public BOOLEAN DEFAULT FALSE, -- For trending feed
  is_shared BOOLEAN DEFAULT FALSE, -- Shared with class
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure valid selection
  CHECK (end_offset > start_offset)
);

-- Trending highlights (aggregated view)
CREATE TABLE trending_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paragraph_id UUID NOT NULL REFERENCES paragraphs(id) ON DELETE CASCADE,
  selected_text TEXT NOT NULL,
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL,
  
  -- Aggregation
  highlight_count INTEGER DEFAULT 1, -- Number of users who highlighted this
  last_highlighted_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Cache refresh
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(paragraph_id, start_offset, end_offset)
);

-- User notes (standalone or attached to highlights)
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  highlight_id UUID REFERENCES highlights(id) ON DELETE CASCADE, -- Optional link
  
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

-- Indexes
CREATE INDEX idx_highlights_user ON highlights(user_id);
CREATE INDEX idx_highlights_paragraph ON highlights(paragraph_id);
CREATE INDEX idx_highlights_public ON highlights(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_trending_highlights_count ON trending_highlights(highlight_count DESC);
CREATE INDEX idx_notes_user ON notes(user_id);
```

### 5. Course Curation (Professor Features)

```sql
-- Courses (professor-curated module collections)
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Course info
  title TEXT NOT NULL,
  description TEXT,
  course_code TEXT, -- 'BIO101', etc.
  semester TEXT, -- 'Fall 2024'
  
  -- Publishing
  published_url TEXT UNIQUE, -- Generated unique URL slug
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Course modules (many-to-many: courses ↔ modules)
CREATE TABLE course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  
  -- Order within course
  order_index INTEGER NOT NULL,
  
  -- Customization
  custom_title TEXT, -- Override module title for this course
  is_required BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(course_id, module_id),
  UNIQUE(course_id, order_index)
);

-- Course enrollments (students in courses)
CREATE TABLE course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ,
  
  UNIQUE(course_id, student_id)
);

-- Indexes
CREATE INDEX idx_courses_professor ON courses(professor_id);
CREATE INDEX idx_course_modules_course ON course_modules(course_id);
CREATE INDEX idx_course_modules_module ON course_modules(module_id);
CREATE INDEX idx_enrollments_course ON course_enrollments(course_id);
CREATE INDEX idx_enrollments_student ON course_enrollments(student_id);
```

### 6. Quizzes & Flashcards

```sql
-- Quizzes (attached to sections or modules)
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE, -- Course-specific quiz
  
  -- Quiz info
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  
  -- Settings
  time_limit_minutes INTEGER, -- NULL = no limit
  passing_score INTEGER DEFAULT 70, -- Percentage
  allow_multiple_attempts BOOLEAN DEFAULT TRUE,
  show_correct_answers BOOLEAN DEFAULT TRUE,
  
  -- Order
  order_index INTEGER,
  
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quiz questions
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  
  -- Question
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay')),
  
  -- Options (for multiple choice)
  options JSONB, -- [{"text": "Option A", "correct": true}, ...]
  
  -- Answer (for short answer/essay)
  correct_answer TEXT,
  answer_keywords TEXT[], -- For auto-grading
  
  -- Settings
  points INTEGER DEFAULT 1,
  order_index INTEGER NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(quiz_id, order_index)
);

-- Quiz attempts (student submissions)
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Results
  score INTEGER, -- Percentage
  total_points INTEGER,
  earned_points INTEGER,
  
  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  time_spent_seconds INTEGER,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  
  UNIQUE(quiz_id, student_id, started_at) -- Allow multiple attempts
);

-- Quiz answers (individual question responses)
CREATE TABLE quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  
  -- Answer
  answer_text TEXT,
  selected_option_id INTEGER, -- For multiple choice
  is_correct BOOLEAN,
  points_earned INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- Flashcard study sessions
CREATE TABLE flashcard_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Session info
  card_ids UUID[] NOT NULL, -- Array of flashcard IDs in this session
  study_mode TEXT DEFAULT 'review' CHECK (study_mode IN ('review', 'learn', 'test')),
  
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

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

-- Indexes
CREATE INDEX idx_quizzes_module ON quizzes(module_id);
CREATE INDEX idx_quizzes_section ON quizzes(section_id);
CREATE INDEX idx_quiz_questions_quiz ON quiz_questions(quiz_id);
CREATE INDEX idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_student ON quiz_attempts(student_id);
CREATE INDEX idx_flashcards_module ON flashcards(module_id);
CREATE INDEX idx_flashcard_responses_student ON flashcard_responses(student_id);
CREATE INDEX idx_flashcard_responses_next_review ON flashcard_responses(next_review_date) WHERE next_review_date IS NOT NULL;
```

### 7. AI Tutor & Python Labs

```sql
-- AI tutor conversations
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Context
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  paragraph_id UUID REFERENCES paragraphs(id) ON DELETE CASCADE,
  
  -- Conversation
  title TEXT, -- Auto-generated from first message
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI messages
CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  
  -- Message
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  
  -- Metadata
  tokens_used INTEGER, -- For cost tracking
  model_used TEXT, -- 'gpt-4', 'claude-3', etc.
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
  starter_code TEXT, -- Initial code provided
  solution_code TEXT, -- Hidden solution (for auto-grading)
  test_cases JSONB, -- Test cases for validation
  
  -- Data
  dataset_url TEXT, -- Link to dataset file
  dataset_config JSONB, -- Dataset metadata
  
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

-- Code lab submissions
CREATE TABLE code_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id UUID NOT NULL REFERENCES code_labs(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Submission
  code TEXT NOT NULL,
  output TEXT, -- Execution output
  error_message TEXT,
  
  -- Results
  test_results JSONB, -- Results of test cases
  passed BOOLEAN,
  score INTEGER, -- If auto-graded
  
  -- Git integration
  git_repo_url TEXT, -- If cloned to Git
  git_commit_hash TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX idx_ai_messages_conversation ON ai_messages(conversation_id);
CREATE INDEX idx_code_labs_module ON code_labs(module_id);
CREATE INDEX idx_code_submissions_lab ON code_submissions(lab_id);
CREATE INDEX idx_code_submissions_student ON code_submissions(student_id);
```

### 8. Analytics & Progress Tracking

```sql
-- Reading progress (tracks student progress through content)
CREATE TABLE reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE, -- If reading via course
  
  -- Progress
  last_section_id UUID REFERENCES sections(id),
  last_paragraph_id UUID REFERENCES paragraphs(id),
  scroll_position DECIMAL(5,2), -- Percentage (0-100)
  time_spent_seconds INTEGER DEFAULT 0,
  
  -- Completion
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  
  -- Tracking
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, module_id, course_id)
);

-- Analytics events (for detailed tracking)
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Event
  event_type TEXT NOT NULL, -- 'page_view', 'animation_play', 'quiz_start', etc.
  event_data JSONB, -- Flexible event payload
  
  -- Context
  module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
  section_id UUID REFERENCES sections(id) ON DELETE SET NULL,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  
  -- Metadata
  user_agent TEXT,
  ip_address INET,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_reading_progress_user ON reading_progress(user_id);
CREATE INDEX idx_reading_progress_module ON reading_progress(module_id);
CREATE INDEX idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at);
```

---

## Row-Level Security (RLS) Policies

### Profiles
```sql
-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Creators can view all profiles (for analytics)
CREATE POLICY "Creators can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'creator'
    )
  );
```

### Content (Modules, Sections, Paragraphs)
```sql
-- Everyone can read published content
CREATE POLICY "Anyone can read published content"
  ON modules FOR SELECT
  USING (status = 'published');

-- Creators can manage all content
CREATE POLICY "Creators can manage content"
  ON modules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'creator'
    )
  );
```

### Highlights & Notes
```sql
-- Users can manage their own highlights
CREATE POLICY "Users manage own highlights"
  ON highlights FOR ALL
  USING (auth.uid() = user_id);

-- Users can view public highlights
CREATE POLICY "Users can view public highlights"
  ON highlights FOR SELECT
  USING (is_public = TRUE OR auth.uid() = user_id);
```

### Courses
```sql
-- Professors can manage their own courses
CREATE POLICY "Professors manage own courses"
  ON courses FOR ALL
  USING (
    professor_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'professor'
    )
  );

-- Students can view published courses
CREATE POLICY "Students can view published courses"
  ON courses FOR SELECT
  USING (is_published = TRUE);
```

---

## Functions & Triggers

### Update timestamps
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ... (repeat for other tables)
```

### Trending highlights aggregation
```sql
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

CREATE TRIGGER highlight_trending_update
  AFTER INSERT ON highlights
  FOR EACH ROW
  WHEN (NEW.is_public = TRUE)
  EXECUTE FUNCTION update_trending_highlights();
```

### Generate course URL
```sql
CREATE OR REPLACE FUNCTION generate_course_url()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.published_url IS NULL THEN
    NEW.published_url := 'course-' || NEW.id::TEXT;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER course_url_generation
  BEFORE INSERT ON courses
  FOR EACH ROW
  EXECUTE FUNCTION generate_course_url();
```

---

## Migration Strategy

### Phase 1: Create new schema
1. Run all CREATE TABLE statements
2. Set up RLS policies
3. Create functions and triggers

### Phase 2: Migrate existing content
1. Import first chapter from JSON to database
2. Map existing animations to new structure
3. Preserve user highlights (if any) from localStorage

### Phase 3: Build new chapters
1. Use new database structure from start
2. Use TipTap editor for content creation
3. Standardize animation interactions

---

## Next Steps

1. **Review & refine schema** based on requirements
2. **Set up Supabase project** and create tables
3. **Design migration script** for existing content
4. **Build TipTap editor integration** for content creation
5. **Implement authentication** with role-based access

---

## Notes

- **Content Structure**: Using JSONB for flexible content blocks instead of HTML strings (safer, more structured)
- **Versioning**: Content versions allow for updates without breaking existing courses
- **Scalability**: Normalized structure supports large-scale content and users
- **Performance**: Indexes on all foreign keys and frequently queried columns
- **Security**: Row-level security ensures users only access appropriate data

