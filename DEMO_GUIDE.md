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

## Demo Flow

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

## Technical Highlights

### Architecture

| Layer | Technology |
|-------|------------|
| Frontend | Vue 3 + Vite |
| Styling | Tailwind CSS |
| State | Pinia stores |
| Auth | Supabase Auth |
| Database | Supabase PostgreSQL |
| Editor | TipTap |

### Database Schema

Key tables:
- `profiles` - User profiles with roles
- `modules` - Content modules (chapters)
- `sections` - Chapter sections
- `courses` - Professor-created courses
- `course_modules` - Links courses to modules
- `course_enrollments` - Student enrollments
- `quizzes` - Quiz definitions
- `quiz_questions` - Quiz questions
- `quiz_attempts` - Student quiz attempts
- `reading_progress` - Student progress tracking

### Role-Based Access

| Role | Dashboard URL | Access |
|------|---------------|--------|
| Creator | `/dashboard` | Full content management |
| Professor | `/professor` | Course curation, student management |
| Student | (Coming Phase 3) | Learning interface |

---

## Recent Development Summary

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

## Questions to Address

1. **Course Types** - Is the Course/Assignment/Lesson/Study Guide taxonomy correct?
2. **Invitation Flow** - Any preferences on the 3 invitation methods?
3. **Collaboration** - Should professors be able to clone each other's courses?
4. **Analytics** - What metrics are most important to professors?
5. **Content Library** - How should content be organized/filtered?

---

*Demo guide prepared for Stuart Trenholm meeting - December 2024*
