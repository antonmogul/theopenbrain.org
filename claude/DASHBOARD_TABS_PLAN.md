# Dashboard Tabs Implementation Plan

## Overview

Building out the Creator Dashboard with 5 additional tabs beyond the existing Chapters tab. Each tab will connect to the existing Supabase database schema.

---

## Tab 1: VERSIONS

### Purpose
Manage content versions (v1.0, v1.1, etc.) - the versioning container that holds modules/chapters.

### Database Table: `content_versions`
```sql
id, version_number, status, created_by, release_notes, created_at, published_at
```

### UI Layout
```
+------------------------------------------------------------------+
| VERSIONS                                           [+ New Version] |
+------------------------------------------------------------------+
|                                                                    |
| +--------------------------------------------------------------+  |
| | v2.0                                          [DRAFT]    [v] |  |
| | Created: Dec 10, 2025 · 3 modules · 42 sections              |  |
| | Release Notes: "Added Visual Perception chapter..."          |  |
| +--------------------------------------------------------------+  |
|                                                                    |
| +--------------------------------------------------------------+  |
| | v1.0                                      [PUBLISHED]    [v] |  |
| | Published: Nov 15, 2025 · 2 modules · 28 sections            |  |
| | Release Notes: "Initial release with Retina chapter"         |  |
| +--------------------------------------------------------------+  |
|                                                                    |
+------------------------------------------------------------------+
```

### Features
- List all versions with status badges (draft/published/archived)
- Expand to see modules in that version
- Create new version (clone from existing or blank)
- Publish version (changes status, sets published_at)
- Archive old versions
- View diff between versions (future)

### API Calls
```javascript
// Fetch all versions with module counts
GET /rest/v1/content_versions?select=*,modules(count)&order=created_at.desc

// Create new version
POST /rest/v1/content_versions
Body: { version_number, status: 'draft', created_by, release_notes }

// Update version (publish/archive)
PATCH /rest/v1/content_versions?id=eq.{id}
Body: { status: 'published', published_at: now() }
```

---

## Tab 2: MEDIA

### Purpose
Manage all animations, images, videos, and Lottie files used in content.

### Database Table: `animations`
```sql
id, animation_key, title, description, media_type, 
lottie_file_url, video_file_url, image_file_url, youtube_id,
interaction_type, component_name, config, file_size_bytes,
scientific_domain, load_priority, created_at, updated_at
```

### UI Layout
```
+------------------------------------------------------------------+
| MEDIA LIBRARY                    [Filter: All v] [+ Upload Media] |
+------------------------------------------------------------------+
| Search: [________________________]                                 |
+------------------------------------------------------------------+
|                                                                    |
| LOTTIE ANIMATIONS (12)                                            |
| +--------+ +--------+ +--------+ +--------+                       |
| |  [>]   | |  [>]   | |  [>]   | |  [>]   |                       |
| | thumb  | | thumb  | | thumb  | | thumb  |                       |
| +--------+ +--------+ +--------+ +--------+                       |
| | Retina | | Rod    | | Cone   | | Optic  |                       |
| | Layers | | Cell   | | Types  | | Nerve  |                       |
| | 245 KB | | 189 KB | | 312 KB | | 156 KB |                       |
| +--------+ +--------+ +--------+ +--------+                       |
|                                                                    |
| VIDEOS (4)                                                        |
| +--------+ +--------+ +--------+ +--------+                       |
| | [play] | | [play] | | [play] | | [play] |                       |
| +--------+ +--------+ +--------+ +--------+                       |
|                                                                    |
| IMAGES (8)                                                        |
| +--------+ +--------+ +--------+ +--------+                       |
| | [img]  | | [img]  | | [img]  | | [img]  |                       |
| +--------+ +--------+ +--------+ +--------+                       |
|                                                                    |
+------------------------------------------------------------------+

MEDIA DETAIL PANEL (when selected):
+---------------------------+
| [Large Preview]           |
|                           |
| Title: Retina Layers      |
| Key: retina-layers-01     |
| Type: Lottie              |
| Size: 245 KB              |
| Priority: Critical        |
| Domain: Neuroscience      |
|                           |
| Used in:                  |
| - Chapter 1, Section 2    |
| - Chapter 1, Section 4    |
|                           |
| [Edit] [Replace] [Delete] |
+---------------------------+
```

### Features
- Grid view of all media assets grouped by type
- Filter by type (lottie/video/image/youtube)
- Search by title/key
- Preview panel with full details
- Show where each asset is used (linked paragraphs)
- Upload new assets (Supabase Storage)
- Edit metadata (title, key, domain, priority)
- Delete unused assets

### API Calls
```javascript
// Fetch all animations grouped by type
GET /rest/v1/animations?select=*&order=media_type,title

// Get usage for an animation
GET /rest/v1/paragraphs?animation_id=eq.{id}&select=id,section_id,sections(title,module_id,modules(title))

// Create new animation
POST /rest/v1/animations
Body: { animation_key, title, media_type, file_url, ... }

// Upload file to storage
supabase.storage.from('animations').upload(path, file)
```

---

## Tab 3: USERS

### Purpose
View and manage all platform users (creators, professors, students).

### Database Table: `profiles`
```sql
id, email, full_name, role, institution, created_at, updated_at,
creator_bio, creator_website, professor_department, student_year, student_major
```

### UI Layout
```
+------------------------------------------------------------------+
| USERS                                      Total: 156 users       |
+------------------------------------------------------------------+
| [All v] [Creators v] [Professors v] [Students v]  Search: [____]  |
+------------------------------------------------------------------+
|                                                                    |
| ROLE BREAKDOWN                                                    |
| +------------------+------------------+------------------+         |
| |    CREATORS      |   PROFESSORS     |    STUDENTS     |         |
| |       3          |       12         |      141        |         |
| |    [icon]        |    [icon]        |    [icon]       |         |
| +------------------+------------------+------------------+         |
|                                                                    |
+------------------------------------------------------------------+
| USER LIST                                                         |
+------------------------------------------------------------------+
| [Avatar] Dr. Sarah Chen              Professor    MIT             |
|          sarah.chen@mit.edu          Joined: Oct 2024             |
|          Department: Neuroscience    Last active: 2 hours ago     |
|                                                     [View] [Edit] |
+------------------------------------------------------------------+
| [Avatar] John Smith                  Student      Stanford        |
|          john.smith@stanford.edu     Joined: Nov 2024             |
|          Year: 3 · Major: CS         Last active: 1 day ago       |
|                                                     [View] [Edit] |
+------------------------------------------------------------------+
| [Avatar] Emma Wilson                 Creator      -               |
|          emma@openbrain.org          Joined: Sep 2024             |
|          Bio: Neuroscience educator  Last active: Just now        |
|                                                     [View] [Edit] |
+------------------------------------------------------------------+

PAGINATION: [< Prev] Page 1 of 16 [Next >]
```

### Features
- Summary cards showing user counts by role
- Filterable/searchable user list
- Role-based columns (show relevant fields per role)
- View user detail modal
- Edit user role/details (admin function)
- See user activity (courses enrolled, progress, quiz scores)
- Invite new users (send email invite)

### API Calls
```javascript
// Fetch all profiles with pagination
GET /rest/v1/profiles?select=*&order=created_at.desc&limit=20&offset=0

// Count by role
GET /rest/v1/profiles?select=role&role=eq.professor (with count header)

// Get user detail with activity
GET /rest/v1/profiles?id=eq.{id}&select=*,
    reading_progress(count),
    quiz_attempts(count),
    highlights(count),
    course_enrollments(count)

// Update user
PATCH /rest/v1/profiles?id=eq.{id}
Body: { role, full_name, institution, ... }
```

---

## Tab 4: ANALYTICS

### Purpose
Visualize platform usage, engagement metrics, and learning outcomes.

### Database Tables
- `analytics_events` - detailed event tracking
- `reading_progress` - student progress through content
- `quiz_attempts` - quiz performance
- `highlights` - engagement via highlighting
- `ai_messages` - AI tutor usage

### UI Layout
```
+------------------------------------------------------------------+
| ANALYTICS                          [Last 7 days v] [Export CSV]   |
+------------------------------------------------------------------+
|                                                                    |
| OVERVIEW METRICS                                                  |
| +------------+ +------------+ +------------+ +------------+       |
| | Active     | | Total      | | Avg Time   | | Quiz       |       |
| | Users      | | Page Views | | on Content | | Completion |       |
| |    89      | |   2,341    | |   12m 34s  | |    78%     |       |
| | +12% ↑     | | +8% ↑      | | +2m ↑      | | -3% ↓      |       |
| +------------+ +------------+ +------------+ +------------+       |
|                                                                    |
+------------------------------------------------------------------+
|                                                                    |
| USER ENGAGEMENT OVER TIME                                         |
| +--------------------------------------------------------------+ |
| |     ^                                                        | |
| | 100 |          ****                                          | |
| |  80 |    ****       ****                                     | |
| |  60 |  **               ****    ****                         | |
| |  40 | *                     ****    ****                     | |
| |  20 |                                   ****                 | |
| |   0 +-----------------------------------------------------> | |
| |     Mon  Tue  Wed  Thu  Fri  Sat  Sun                        | |
| +--------------------------------------------------------------+ |
|                                                                    |
+------------------------------------------------------------------+
|                                                                    |
| CONTENT PERFORMANCE                    QUIZ PERFORMANCE           |
| +-----------------------------+  +-----------------------------+  |
| | Chapter              Views  |  | Quiz               Avg Score|  |
| | Ch2: Visual Percep.  1,234  |  | Ch1 Quiz 1            82%   |  |
| | Ch1: The Retina        891  |  | Ch2 Quiz 1            76%   |  |
| | Ch2: Section 3         567  |  | Ch1 Quiz 2            71%   |  |
| | Ch1: Section 1         445  |  | Ch2 Quiz 2            68%   |  |
| +-----------------------------+  +-----------------------------+  |
|                                                                    |
+------------------------------------------------------------------+
|                                                                    |
| POPULAR HIGHLIGHTS                     AI TUTOR USAGE             |
| +-----------------------------+  +-----------------------------+  |
| | "The retina performs..."    |  | Questions Asked:    456     |  |
| | 45 users highlighted        |  | Avg per User:       3.2     |  |
| |                             |  | Top Topic: Attention        |  |
| | "Gestalt principles..."     |  |                             |  |
| | 38 users highlighted        |  | +------------------------+  |  |
| |                             |  | |  Daily AI Questions    |  |  |
| | "Change blindness occurs..."|  | |  ****                  |  |  |
| | 31 users highlighted        |  | |      ****   ****       |  |  |
| +-----------------------------+  | +------------------------+  |  |
|                                  +-----------------------------+  |
+------------------------------------------------------------------+
```

### Features
- **Overview Cards**: Active users, page views, avg time, quiz completion
- **Time Series Chart**: Daily/weekly engagement trends
- **Content Heatmap**: Most viewed chapters/sections
- **Quiz Analytics**: Average scores, completion rates, hardest questions
- **Highlight Trends**: Most highlighted passages (trending_highlights)
- **AI Tutor Metrics**: Questions asked, popular topics
- **Export**: CSV download of analytics data

### Charts (using Chart.js or similar)
1. Line chart: Daily active users over time
2. Bar chart: Views per chapter
3. Pie chart: User role distribution
4. Heatmap: Section engagement
5. Line chart: Quiz scores trend

### API Calls
```javascript
// Get event counts by type for date range
GET /rest/v1/analytics_events?select=event_type,created_at
    &created_at=gte.{startDate}&created_at=lte.{endDate}

// Get reading progress stats
GET /rest/v1/reading_progress?select=module_id,time_spent_seconds,is_completed

// Get quiz performance
GET /rest/v1/quiz_attempts?select=quiz_id,score,total_points,completed_at

// Get trending highlights
GET /rest/v1/trending_highlights?select=*,paragraphs(content_text)
    &order=highlight_count.desc&limit=10

// Get AI usage
GET /rest/v1/ai_messages?select=role,created_at&role=eq.user
```

---

## Tab 5: QUIZZES

### Purpose
Create and manage quizzes attached to modules/sections.

### Database Tables
- `quizzes` - quiz definitions
- `quiz_questions` - questions within quizzes
- `quiz_attempts` - student submissions
- `quiz_answers` - individual answers

### UI Layout
```
+------------------------------------------------------------------+
| QUIZZES                                            [+ New Quiz]   |
+------------------------------------------------------------------+
|                                                                    |
| QUIZ LIST                                                         |
+------------------------------------------------------------------+
| +--------------------------------------------------------------+ |
| | Chapter 1: The Retina - Section Quiz                 [ACTIVE] | |
| | 10 questions · Multiple Choice · 15 min limit                 | |
| | 45 attempts · Avg Score: 78% · Pass Rate: 82%                 | |
| |                                     [Edit] [Results] [Delete] | |
| +--------------------------------------------------------------+ |
|                                                                    |
| +--------------------------------------------------------------+ |
| | Chapter 2: Visual Perception - Midterm          [DRAFT]      | |
| | 25 questions · Mixed Types · 45 min limit                     | |
| | 0 attempts · Not published                                    | |
| |                                     [Edit] [Publish] [Delete] | |
| +--------------------------------------------------------------+ |
|                                                                    |
+------------------------------------------------------------------+

QUIZ EDITOR (expanded or modal):
+------------------------------------------------------------------+
| EDIT QUIZ: Chapter 1 Section Quiz                                 |
+------------------------------------------------------------------+
| Title: [Chapter 1: The Retina - Section Quiz___]                  |
| Module: [Chapter 1: The Retina_______v]                           |
| Section: [All Sections____________v] (optional)                   |
|                                                                    |
| Time Limit: [15] minutes    Passing Score: [70]%                  |
| [x] Allow multiple attempts  [x] Show correct answers after       |
+------------------------------------------------------------------+
| QUESTIONS                                          [+ Add Question]|
+------------------------------------------------------------------+
| Q1. What is the primary function of rod cells?    [Multiple Choice]|
|     A) Color vision                                               |
|     B) Low-light vision  [correct]                               |
|     C) Sharp central vision                                       |
|     D) Motion detection                                           |
|                                               [Edit] [Delete] [↑↓]|
+------------------------------------------------------------------+
| Q2. True or False: The fovea contains mostly...   [True/False]    |
|     Answer: True                                                  |
|                                               [Edit] [Delete] [↑↓]|
+------------------------------------------------------------------+
| Q3. Describe how photoreceptors convert light...  [Short Answer]  |
|     Keywords: phototransduction, chemical, electrical             |
|                                               [Edit] [Delete] [↑↓]|
+------------------------------------------------------------------+
|                                            [Cancel] [Save Draft]  |
+------------------------------------------------------------------+
```

### Features
- List all quizzes with stats (attempts, avg score, pass rate)
- Create/edit quiz with inline question editor
- Question types: Multiple choice, True/False, Short answer, Essay
- Drag-drop reorder questions
- Set time limit, passing score, attempt rules
- View results/analytics per quiz
- Export results to CSV

### API Calls
```javascript
// Fetch all quizzes with stats
GET /rest/v1/quizzes?select=*,
    quiz_questions(count),
    quiz_attempts(count,score,total_points)
    &order=created_at.desc

// Create quiz
POST /rest/v1/quizzes
Body: { title, module_id, section_id, time_limit_minutes, passing_score, ... }

// Add question
POST /rest/v1/quiz_questions
Body: { quiz_id, question_text, question_type, options, correct_answer, points }

// Get quiz results
GET /rest/v1/quiz_attempts?quiz_id=eq.{id}&select=*,
    profiles(full_name,email),
    quiz_answers(question_id,is_correct,points_earned)
```

---

## Tab 6: FLASHCARDS (Bonus)

### Purpose
Create spaced-repetition flashcard decks for study.

### Database Tables
- `flashcards` - card definitions
- `flashcard_sessions` - study sessions
- `flashcard_responses` - SM-2 algorithm tracking

### UI Layout (Brief)
- Card deck list with card counts
- Card editor (front/back with rich text)
- Preview mode with flip animation
- Stats: cards due, mastery level

---

## SQL Seed Scripts for Stub Data

### Versions Seed
```sql
INSERT INTO content_versions (id, version_number, status, release_notes, created_at, published_at)
VALUES 
  (gen_random_uuid(), '1.0', 'published', 'Initial release with Chapter 1: The Retina', NOW() - INTERVAL '30 days', NOW() - INTERVAL '25 days'),
  (gen_random_uuid(), '2.0', 'draft', 'Adding Chapter 2: Visual Perception and UX', NOW() - INTERVAL '5 days', NULL);
```

### Media/Animations Seed
```sql
INSERT INTO animations (id, animation_key, title, description, media_type, interaction_type, scientific_domain, load_priority, file_size_bytes)
VALUES
  (gen_random_uuid(), 'retina-layers-cross-section', 'Retina Layers Cross Section', 'Interactive diagram showing all retina layers', 'lottie', 'click_states', 'neuroscience', 'critical', 245000),
  (gen_random_uuid(), 'rod-cone-comparison', 'Rod vs Cone Cells', 'Side-by-side comparison of photoreceptor types', 'lottie', 'switch', 'neuroscience', 'high', 189000),
  (gen_random_uuid(), 'visual-pathway-animation', 'Visual Pathway Journey', 'Animated path from retina to visual cortex', 'video', 'auto_loop', 'neuroscience', 'high', 5200000),
  (gen_random_uuid(), 'gestalt-proximity', 'Gestalt Proximity Principle', 'Interactive demo of proximity grouping', 'lottie', 'scroll_linked', 'psychology', 'low', 156000),
  (gen_random_uuid(), 'attention-spotlight', 'Attention Spotlight Demo', 'Shows selective attention in action', 'lottie', 'click_states', 'psychology', 'high', 312000),
  (gen_random_uuid(), 'change-blindness-demo', 'Change Blindness Video', 'Classic change blindness experiment', 'youtube', 'youtube_embed', 'psychology', 'lazy', 0),
  (gen_random_uuid(), 'eye-anatomy-diagram', 'Eye Anatomy Diagram', 'Labeled cross-section of the human eye', 'image', 'static_image', 'anatomy', 'critical', 850000),
  (gen_random_uuid(), 'fovea-detail', 'Fovea Detail View', 'Magnified view of foveal region', 'image', 'static_image', 'anatomy', 'high', 620000);
```

### Analytics Events Seed
```sql
-- Generate sample analytics events for the past 30 days
INSERT INTO analytics_events (user_id, event_type, event_data, module_id, created_at)
SELECT 
  (SELECT id FROM profiles WHERE role = 'student' ORDER BY RANDOM() LIMIT 1),
  (ARRAY['page_view', 'quiz_start', 'quiz_complete', 'highlight_create', 'ai_question'])[floor(random() * 5 + 1)],
  '{"source": "web"}'::jsonb,
  (SELECT id FROM modules ORDER BY RANDOM() LIMIT 1),
  NOW() - (random() * INTERVAL '30 days')
FROM generate_series(1, 500);

-- Generate reading progress entries
INSERT INTO reading_progress (user_id, module_id, time_spent_seconds, scroll_position, is_completed, last_accessed_at)
SELECT 
  p.id,
  m.id,
  floor(random() * 3600 + 120)::int,
  floor(random() * 100)::decimal,
  random() > 0.3,
  NOW() - (random() * INTERVAL '14 days')
FROM profiles p
CROSS JOIN modules m
WHERE p.role = 'student'
ON CONFLICT (user_id, module_id, course_id) DO NOTHING;
```

### Quiz Seed
```sql
-- Create sample quiz
INSERT INTO quizzes (id, module_id, title, description, time_limit_minutes, passing_score, allow_multiple_attempts, show_correct_answers, created_by)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  (SELECT id FROM modules WHERE slug = 'visual-perception-ux' LIMIT 1),
  'Visual Perception Fundamentals Quiz',
  'Test your understanding of how the visual system processes information',
  15,
  70,
  true,
  true,
  (SELECT id FROM profiles WHERE role = 'creator' LIMIT 1)
);

-- Add questions
INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, correct_answer, points, order_index)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 
   'What percentage of the visual field does the fovea cover?',
   'multiple_choice',
   '["About 50%", "About 25%", "About 2%", "About 10%"]'::jsonb,
   'About 2%', 1, 1),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
   'True or False: Change blindness only occurs when people are not paying attention.',
   'true_false', NULL, 'false', 1, 2),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
   'Explain the Gestalt principle of proximity and give an example of its application in UI design.',
   'short_answer', NULL, NULL, 2, 3),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
   'Which of the following is NOT a Gestalt principle?',
   'multiple_choice',
   '["Proximity", "Similarity", "Attention", "Closure"]'::jsonb,
   'Attention', 1, 4),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
   'The lateral geniculate nucleus (LGN) is primarily a passive relay station.',
   'true_false', NULL, 'false', 1, 5);

-- Generate sample quiz attempts
INSERT INTO quiz_attempts (quiz_id, student_id, score, total_points, earned_points, started_at, completed_at, time_spent_seconds, status)
SELECT 
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  p.id,
  floor(random() * 40 + 60)::int,
  6,
  floor(random() * 3 + 3)::int,
  NOW() - (random() * INTERVAL '14 days'),
  NOW() - (random() * INTERVAL '14 days') + INTERVAL '12 minutes',
  floor(random() * 600 + 300)::int,
  'completed'
FROM profiles p
WHERE p.role = 'student'
LIMIT 25;
```

### Trending Highlights Seed
```sql
INSERT INTO trending_highlights (paragraph_id, selected_text, start_offset, end_offset, highlight_count, last_highlighted_at)
SELECT 
  p.id,
  LEFT(p.content_text, 100),
  0,
  100,
  floor(random() * 50 + 10)::int,
  NOW() - (random() * INTERVAL '7 days')
FROM paragraphs p
WHERE p.content_text IS NOT NULL AND LENGTH(p.content_text) > 100
LIMIT 15;
```

---

## Implementation Order

1. **Versions Tab** (simplest, foundational)
2. **Media Tab** (visual, uses existing animations table)
3. **Users Tab** (connects to real profiles data)
4. **Quizzes Tab** (complex but core feature)
5. **Analytics Tab** (requires data in other tables first)

---

## Technical Notes

### Chart Library
Recommend **Chart.js** with **vue-chartjs** wrapper:
```bash
npm install chart.js vue-chartjs
```

### Date Formatting
Use **date-fns** (already likely in project) for consistent date formatting.

### Pagination Pattern
```javascript
const page = ref(1);
const perPage = 20;
const offset = computed(() => (page.value - 1) * perPage);

// API call with pagination
GET /rest/v1/table?limit=${perPage}&offset=${offset.value}
// Get total count via Prefer: count=exact header
```

### Shared Components Needed
- `StatCard.vue` - metric display card
- `DataTable.vue` - sortable/filterable table
- `StatusBadge.vue` - draft/published/archived badges
- `Pagination.vue` - page navigation
- `LineChart.vue`, `BarChart.vue`, `PieChart.vue` - chart wrappers
- `EmptyState.vue` - no data placeholder
- `ConfirmModal.vue` - delete confirmations
