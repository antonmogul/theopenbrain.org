# The Open Brain - Demo Guide for Stuart Trenholm

## Overview

This guide walks through all the major features built for The Open Brain platform. The development has focused on **Phase 1** (Creator Dashboard) and **Phase 2** (Professor Dashboard) of the project roadmap.

---

## Quick Start

```bash
# Start the development server
npm start

# Navigate to: http://localhost:5173
```

---

## Part 1: Application Features

### 1. Home Page (Public)

**URL:** `http://localhost:5173/`

**What to show:**
- Clean landing page with "The Open Brain" branding
- Chapter cards showing available content (Chapter 1: The Retina, Chapter 2: Visual Perception & UX)
- Sign In button and Quiz link
- Authentication modal (Register/Login)

**Key points:**
- Students and professors can discover content here
- Unauthenticated users can browse chapters

---

### 2. Authentication System

**Click "Sign In" on the home page**

**What to show:**
- Login/Register toggle
- Email + Password authentication
- Role-based access (Creator, Professor, Student)
- Session persistence via localStorage

**Key points:**
- Built on Supabase Auth
- Secure token management
- Role stored in `profiles` table

---

### 3. Creator Dashboard (Admin)

**URL:** `http://localhost:5173/dashboard`

**Prerequisites:** Login as a user with `role: 'creator'`

**Navigation sections to demo:**

#### 3.1 Dashboard Overview
- Activity graph showing edits, signups, active users
- Time range filter (Last 7 Days, Last 30 Days, All Time)
- Quick access cards to all sections

#### 3.2 Chapters Section
- List of all chapters/modules
- Click a chapter to expand and see sections
- **TipTap Rich Text Editor** for content editing
- Accordion UI for nested content structure
- Save changes to Supabase in real-time

#### 3.3 Versions Section
- Content versioning system
- Create new versions (v1.0, v1.1, etc.)
- Track changes over time

#### 3.4 Media Section
- Media library management
- Image and asset organization

#### 3.5 Quizzes Section
- Quiz management interface
- View quiz attempts and scores
- Question management

#### 3.6 Users Section
- View all users (Professors & Students)
- Role management
- User analytics

#### 3.7 Analytics Section
- Platform-wide analytics
- User engagement metrics
- Content performance

**Design highlights:**
- Dark theme with **violet accent color**
- Floating card sidebar design
- Responsive layout

---

### 4. Professor Dashboard (NEW)

**URL:** `http://localhost:5173/professor`

**Prerequisites:** Login as a user with `role: 'professor'`

> **To test:** Update a user's role to 'professor' in the Supabase `profiles` table, or run the seed file.

**Navigation sections to demo:**

#### 4.1 Dashboard Overview
- Stats cards: Active Courses, Enrolled Students, Assessments, Avg Completion
- Quick Actions: Create Course, Invite Students, Browse Content, View Analytics
- Recent Courses list

#### 4.2 Courses Section
**Click "Courses" in sidebar**

- **Create Course button** - Opens course creation form
- Course form fields:
  - Course Title
  - **Course Type dropdown**: Course, Assignment, Lesson, Study Guide
  - Course Code (e.g., NEURO101)
  - Semester (e.g., Spring 2025)
  - Description
  - Welcome Message (shown to students)
  - Publish checkbox

**Key talking point:** Professors can create different types of learning units - not just "courses" but also assignments, lessons, or study guides.

#### 4.3 Content Library Section
**Click "Content Library" in sidebar**

- Browse all published modules from Creators
- Add modules to courses
- Search and filter content

**Key talking point:** Professors don't create content - they curate from the Creator's library.

#### 4.4 Students Section
**Click "Students" in sidebar**

- Search students by name/email
- Filter by course
- **Invite Students button** - Opens invite modal with 3 methods:
  1. **Shareable URL** - Generate a unique enrollment link
  2. **Access Code** - Generate a code students can enter
  3. **Email Invitation** - Send direct email invites

**Key talking point:** Three flexible ways to get students into courses.

#### 4.5 Assessments Section
**Click "Assessments" in sidebar**

- **Create Assessment button** - Opens assessment form
- Assessment form fields:
  - Assessment Title
  - Course (dropdown)
  - Description
  - Time Limit (minutes) - Default: 30
  - Passing Score (%) - Default: 70
  - Max Attempts - Default: 1

**Key talking point:** Professors can create their own quizzes with configurable parameters.

#### 4.6 Analytics Section
**Click "Analytics" in sidebar**

- Course Performance metrics
- Time range filter (Last 7 days, Last 30 days, Last 90 days)
- Student engagement data

#### 4.7 Collaboration Section
**Click "Collaboration" in sidebar**

- **My Shared Courses** - Courses you've published for other professors
- **Available from Other Professors** - Courses shared by peers

**Key talking point:** Professors can share their curated courses with colleagues.

**Design highlights:**
- Dark theme with **blue accent color** (differentiates from Creator)
- Same component architecture as Creator dashboard
- "PROFESSOR PORTAL" branding in sidebar

---

### 5. Student Enrollment Flow

**URL:** `http://localhost:5173/enroll/:courseId`

**What to show:**
- Course information display
- Enrollment confirmation
- Redirects to course content after enrollment

---

## Part 2: Supabase Integration & Database Design

### Why Supabase?

Supabase was chosen as the backend-as-a-service platform for several key reasons:

| Benefit | Description |
|---------|-------------|
| **Built-in Auth** | Email/password, social logins, magic links out of the box |
| **PostgreSQL** | Full-featured relational database with advanced queries |
| **Row-Level Security** | Fine-grained access control at the data level |
| **Real-time** | Live subscriptions for collaborative features |
| **Storage** | Built-in file storage for media assets |
| **Open Source** | Aligns with Open Brain's open source philosophy |
| **Cost Effective** | Generous free tier, predictable scaling costs |

---

### Database Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     SUPABASE AUTH                                │
│              (Email/Password Authentication)                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │    profiles    │
                    │   (3 roles)    │
                    └────────┬───────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
   ┌─────────┐         ┌──────────┐        ┌──────────┐
   │ Creator │         │Professor │        │ Student  │
   └────┬────┘         └────┬─────┘        └────┬─────┘
        │                   │                    │
        ▼                   ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ Content Mgmt  │   │Course Curation│   │  Learning     │
│ - modules     │   │ - courses     │   │ - highlights  │
│ - sections    │   │ - enrollments │   │ - notes       │
│ - paragraphs  │   │ - assessments │   │ - progress    │
│ - animations  │   │               │   │ - quiz_attempts│
│ - quizzes     │   │               │   │               │
└───────────────┘   └───────────────┘   └───────────────┘
```

---

### Core Tables (27 Total)

#### Authentication & Users
| Table | Purpose |
|-------|---------|
| `profiles` | Extended user data with role (creator/professor/student) |

#### Content Structure
| Table | Purpose |
|-------|---------|
| `content_versions` | Version control (v1.0, v1.1, v2.0) |
| `modules` | Top-level chapters |
| `sections` | Sections within chapters |
| `paragraphs` | Content blocks (structured JSONB) |
| `animations` | Animation/diagram definitions |
| `animation_states` | Click/toggle states |
| `animation_variants` | Switch variants (Day/Night) |

#### Course Curation (Professor)
| Table | Purpose |
|-------|---------|
| `courses` | Professor-created courses |
| `course_modules` | Many-to-many: courses ↔ modules |
| `course_enrollments` | Student enrollments |

#### Interactive Features
| Table | Purpose |
|-------|---------|
| `highlights` | User text highlights |
| `trending_highlights` | Aggregated popular highlights |
| `notes` | User notes (standalone or on highlights) |

#### Assessments
| Table | Purpose |
|-------|---------|
| `quizzes` | Quiz definitions |
| `quiz_questions` | Questions (multiple choice, T/F, etc.) |
| `quiz_attempts` | Student attempts |
| `quiz_answers` | Individual answers |
| `flashcards` | Flashcard decks |
| `flashcard_sessions` | Study sessions |
| `flashcard_responses` | Spaced repetition tracking |

#### AI & Labs (Phase 3)
| Table | Purpose |
|-------|---------|
| `ai_conversations` | AI tutor threads |
| `ai_messages` | Conversation messages |
| `code_labs` | Python lab definitions |
| `code_submissions` | Student code submissions |

#### Analytics
| Table | Purpose |
|-------|---------|
| `reading_progress` | Student progress through content |
| `analytics_events` | Detailed event tracking |

---

### Row-Level Security (RLS)

Every table has RLS enabled with role-based policies:

```sql
-- Example: Professors can only manage their own courses
CREATE POLICY "Professors manage own courses"
  ON courses FOR ALL
  USING (
    professor_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'professor'
    )
  );

-- Example: Students can view published courses
CREATE POLICY "Students can view published courses"
  ON courses FOR SELECT
  USING (is_published = TRUE);

-- Example: Users can only see their own highlights
CREATE POLICY "Users manage own highlights"
  ON highlights FOR ALL
  USING (auth.uid() = user_id);
```

**Key RLS Patterns:**
- **Content**: Published content is public, draft is creator-only
- **Courses**: Professors manage own, students see published
- **User Data**: Users see only their own highlights/notes/progress
- **Analytics**: Creators can view all, users can insert own events

---

### Database Relationships (ER Diagram)

```
profiles ──────┬──────────────────────────────────────────────┐
               │                                              │
               ▼                                              ▼
      content_versions                                    courses
               │                                              │
               ▼                                              │
           modules ◄──────────────── course_modules ──────────┘
               │                          │
               ▼                          │
          sections                        │
               │                          ▼
               ▼                 course_enrollments
         paragraphs                       │
               │                          │
               ▼                          ▼
         animations                   students
               │                          │
               ├──► animation_states      ├──► highlights
               └──► animation_variants    ├──► notes
                                          ├──► quiz_attempts
                                          └──► reading_progress
```

---

### API Integration Pattern

We use **direct REST API calls** instead of the Supabase JS client for better control:

```javascript
// Example: Fetch modules for a professor
const response = await fetch(
  `${supabaseUrl}/rest/v1/modules?status=eq.published&select=*`,
  {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  }
);
const modules = await response.json();
```

**Benefits:**
- Full control over requests
- No client library overhead
- Works with any HTTP client
- Easier debugging

---

### Migration Files

Located in `supabase/migrations/`:

| File | Purpose |
|------|---------|
| `20250101000000_initial_schema.sql` | All 27 tables, indexes, RLS policies, triggers |
| `20250101000001_fix_rls_policies.sql` | RLS policy refinements |
| `20250109000000_seed_chapter_2.sql` | Chapter 2 content seed |
| `20250109000001_create_seed_creator.sql` | Creator user seed |
| `20250109000002_fix_sections_rls.sql` | Section RLS fixes |

---

### Key Database Features

#### 1. Content Versioning
```sql
-- Supports v1.0, v1.1, v2.0 releases
CREATE TABLE content_versions (
  version_number TEXT NOT NULL UNIQUE,  -- '1.0', '1.1', '2.0'
  status TEXT CHECK (status IN ('draft', 'published', 'archived')),
  release_notes TEXT,
  published_at TIMESTAMPTZ
);
```

#### 2. Structured Content (No Raw HTML)
```sql
-- Paragraphs store structured JSONB, not HTML strings
content JSONB NOT NULL,
-- Example:
-- {
--   "blocks": [
--     {"type": "text", "content": "Normal text"},
--     {"type": "highlight", "content": "Key term", "hoverImage": "img-id"},
--     {"type": "footnote", "ref": "1"}
--   ]
-- }
```

#### 3. Automatic Timestamps
```sql
-- All tables have automatic updated_at triggers
CREATE TRIGGER update_modules_updated_at 
  BEFORE UPDATE ON modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### 4. Trending Highlights Aggregation
```sql
-- Automatically aggregates public highlights
CREATE TRIGGER highlight_trending_update
  AFTER INSERT ON highlights
  FOR EACH ROW
  WHEN (NEW.is_public = TRUE)
  EXECUTE FUNCTION update_trending_highlights();
```

#### 5. Full-Text Search
```sql
-- Paragraph content is searchable
CREATE INDEX idx_paragraphs_search 
  ON paragraphs USING gin(to_tsvector('english', content_text));
```

---

### Seed Data

**Professor Test Data:** `supabase/seeds/professor_test_data.sql`

Creates:
- Sample professor profile
- 3 sample courses (Introduction to Neuroscience, Visual System Lab, Retinal Circuits)
- Course-module links
- Sample student profiles
- Sample enrollments
- Sample quiz with questions
- Sample quiz attempts
- Sample reading progress

---

## Part 3: Technical Architecture

### Frontend Stack

| Technology | Purpose |
|------------|---------|
| Vue 3 | Reactive UI framework (Composition API) |
| Vite | Fast build tool and dev server |
| Pinia | State management |
| Vue Router | Client-side routing |
| Tailwind CSS | Utility-first styling |
| TipTap | Rich text editor for content |
| GSAP | Animations |

### Project Structure

```
src/
├── components/
│   ├── dashboard/          # Shared dashboard components
│   │   ├── DashboardSidebar.vue
│   │   └── DashboardHeader.vue
│   ├── Navigation/         # Menu components
│   └── UI/                 # Reusable UI components
├── composables/
│   └── useAuth.js          # Authentication logic
├── lib/
│   └── supabase.js         # Supabase client config
├── stores/
│   └── index.js            # Pinia stores
├── views/
│   ├── DashboardView.vue   # Creator dashboard
│   ├── ProfessorDashboardView.vue  # Professor dashboard
│   ├── EnrollView.vue      # Student enrollment
│   ├── ChapterView.vue     # Content reader
│   └── HomeView.vue        # Landing page
└── router/
    └── index.js            # Route definitions + guards
```

### Role-Based Routing

```javascript
// Route guard checks role before allowing access
{
  path: "/professor",
  component: ProfessorDashboardView,
  meta: { requiresAuth: true, requiredRole: "professor" }
}
```

---

## Part 4: Development Summary

### Phase 1: Creator Dashboard (Complete)
- Supabase integration with direct REST API
- TipTap rich text editor for content editing
- Full dashboard with 7 sections
- Content versioning system
- Quiz management
- User management
- Analytics

### Phase 2: Professor Dashboard (Complete)
- Course creation with 4 types
- Content library browsing
- Student management with 3 invitation methods
- Assessment creation
- Analytics dashboard
- Collaboration/sharing system

### Key Commits

```
feat: add Professor Dashboard with courses, students, assessments, and collaboration
ui: redesign sidebar with floating cards layout
feat: implement all dashboard tabs (Versions, Media, Users, Analytics, Quizzes)
feat: add chapter editing section with accordion UI and improved TipTap editor
fix: overhaul auth system to use direct REST API
feat: integrate TipTap rich text editor for content management
feat: add role-based dashboard and navigation
feat: add Supabase authentication UI
feat: add database migrations for Chapter 2 and RLS policies
```

---

## Setup for Demo

### Option 1: Use Existing Creator Account
Login with your existing creator account to show the Creator Dashboard.

### Option 2: Test Professor Dashboard
1. Go to Supabase Dashboard > SQL Editor
2. Run the seed file: `supabase/seeds/professor_test_data.sql`
3. Or manually update a user's role:
   ```sql
   UPDATE profiles SET role = 'professor' WHERE email = 'your-email@example.com';
   ```
4. Login and navigate to `/professor`

---

## What's Next (Phase 3: Student Experience)

- Student dashboard and personalized learning
- Interactive highlighting and annotations
- Collaborative annotation (trending highlights)
- AI tutor integration
- Python code labs with Pyodide
- Progress tracking and achievements

---

## Questions to Discuss with Stuart

### Features
1. **Course Types** - Is the Course/Assignment/Lesson/Study Guide taxonomy correct?
2. **Invitation Flow** - Any preferences on the 3 invitation methods?
3. **Collaboration** - Should professors be able to clone each other's courses?
4. **Analytics** - What metrics are most important to professors?
5. **Content Library** - How should content be organized/filtered?

### Technical
6. **Content Structure** - Is the JSONB paragraph structure flexible enough?
7. **Versioning** - How should version releases work in practice?
8. **Real-time** - Which features need real-time updates?

---

## Additional Documentation

For more details, see:
- `claude/database-schema-design.md` - Full schema documentation
- `claude/database-er-diagram.md` - Visual ER diagram (Mermaid)
- `claude/MASTER_PROJECT_OVERVIEW.md` - Project roadmap and phases
- `supabase/migrations/` - All database migrations

---

*Demo guide prepared for Stuart Trenholm meeting - December 2024*
