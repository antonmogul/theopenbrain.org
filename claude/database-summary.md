# Database Schema Summary

## Key Design Decisions

### 1. **Content Structure (Scalable & Safe)**
- **Replaced HTML strings with JSONB**: Content stored as structured blocks instead of raw HTML
  - Prevents XSS vulnerabilities
  - Enables better search and parsing
  - Supports future rendering formats (mobile, PDF, etc.)

- **Flattened hierarchy**: Modules → Sections → Paragraphs (3 levels instead of 4-5)
  - Easier to query and maintain
  - Better performance
  - Still supports subsections via `subsection_level` field

### 2. **Standardized Animations**
- **Interaction types**: 9 standardized patterns (auto_loop, click_states, switch, etc.)
- **Component mapping**: Each animation type maps to a Vue component
- **Flexible config**: JSONB for animation-specific settings
- **States & variants**: Separate tables for multi-state animations

### 3. **User Roles & Permissions**
- **Three-tier auth**: Creator, Professor, Student
- **Row-Level Security (RLS)**: Supabase handles permissions at database level
- **Role-specific features**: Each role has appropriate access

### 4. **Course Curation System**
- **Many-to-many**: Courses can include multiple modules
- **Custom ordering**: Professors control module order in their courses
- **Unique URLs**: Each course gets a published URL
- **Enrollment tracking**: Students enrolled in courses

### 5. **Collaborative Features**
- **Highlights**: Stored in database (replaces localStorage)
- **Trending feed**: Aggregated highlights from all students
- **Public/private**: Users control visibility
- **Notes**: Standalone or attached to highlights

### 6. **Interactive Learning Tools**
- **Quizzes**: Attached to sections/modules, with attempts tracking
- **Flashcards**: Spaced repetition algorithm (SM-2)
- **AI Tutor**: Conversation threads with context
- **Python Labs**: Code execution with Git integration

### 7. **Analytics & Progress**
- **Reading progress**: Track where students are in content
- **Event tracking**: Detailed analytics for all interactions
- **Time tracking**: Monitor engagement

## Database Relationships

```
profiles (users)
  ├─→ content_versions (creators create versions)
  ├─→ modules (creators create modules)
  ├─→ courses (professors create courses)
  ├─→ highlights (students create highlights)
  ├─→ notes (students create notes)
  └─→ quiz_attempts (students take quizzes)

content_versions
  └─→ modules (version contains modules)

modules
  ├─→ sections (module contains sections)
  └─→ course_modules (modules in courses)

sections
  ├─→ paragraphs (section contains paragraphs)
  └─→ animations (section can have animation)

paragraphs
  ├─→ highlights (paragraphs can be highlighted)
  └─→ animations (paragraphs can trigger animations)

animations
  ├─→ animation_states (for click/state animations)
  └─→ animation_variants (for switch animations)

courses
  ├─→ course_modules (courses contain modules)
  ├─→ course_enrollments (students enroll)
  └─→ quizzes (course-specific quizzes)
```

## Standardized Animation Interactions

### Current → New Mapping

| Current Pattern | New `interaction_type` | Component | Use Case |
|----------------|----------------------|-----------|----------|
| Auto-play loop | `auto_loop` | IllustrationComp | Decorative, continuous |
| Click states | `click_states` | IllustrationComp | Anatomy exploration |
| Switch variants | `switch` | IllustrationSwitch | Circuit comparisons |
| Fullscreen states | `fullscreen_states` | FullScreenIllustrationLoop | Complex processes |
| Scroll transition | `scroll_transition` | IllustrationTransition | Section transitions |
| Scroll-linked | `scroll_linked` | FullScreenIllustrationSplit | Dual-panel scroll |
| Video flip | `video_flip` | IllustrationFlip | Disease visualization |
| Static image | `static_image` | IllustrationComp | Simple images |
| YouTube embed | `youtube_embed` | IllustrationComp | External videos |

## Content Migration Path

### From JSON to Database

**Current structure (text.json):**
```json
{
  "sections": [{
    "id": "uuid",
    "title": "Section",
    "paragraphs": [{
      "id": "uuid",
      "text": "<p>HTML content</p>",
      "animation": {"name": "animationEye"}
    }]
  }]
}
```

**New structure (database):**
```sql
-- Module
INSERT INTO modules (title, slug, content_version_id) VALUES (...);

-- Section
INSERT INTO sections (module_id, title, animation_id) VALUES (...);

-- Paragraph (structured content)
INSERT INTO paragraphs (section_id, content, animation_id) VALUES (
  ...,
  '{"blocks": [
    {"type": "text", "content": "Normal text"},
    {"type": "highlight", "content": "term", "hoverImage": "id"}
  ]}',
  ...
);
```

## Benefits of New Structure

1. **Security**: No HTML injection, validated content structure
2. **Scalability**: Supports unlimited modules, users, courses
3. **Performance**: Indexed queries, efficient relationships
4. **Flexibility**: JSONB allows evolution without migrations
5. **Collaboration**: Built-in sharing and trending features
6. **Analytics**: Track everything for insights
7. **Versioning**: Content updates don't break existing courses

## Next Implementation Steps

1. ✅ **Database schema designed** (this document)
2. ⏭️ **Set up Supabase project**
3. ⏭️ **Create migration scripts**
4. ⏭️ **Build TipTap editor integration**
5. ⏭️ **Implement authentication**
6. ⏭️ **Create first new chapter using new structure**

