# Content Structure

## Hierarchy Overview

```
content_versions (versioning container)
    │
    └── modules (chapters)
            │
            └── sections (major topics within a chapter)
                    │
                    └── paragraphs (content blocks with JSONB)
```

## Database Relationships

```
┌─────────────────────┐
│  content_versions   │  (e.g., "v1.0")
└─────────┬───────────┘
          │ 1:many
          ▼
┌─────────────────────┐
│      modules        │  (e.g., "Foundations of Neuroscience")
│  - slug             │
│  - order_index      │
└─────────┬───────────┘
          │ 1:many
          ▼
┌─────────────────────┐
│      sections       │  (e.g., "Where is my mind?")
│  - order_index      │
│  - module_id (FK)   │
└─────────┬───────────┘
          │ 1:many
          ▼
┌─────────────────────┐
│     paragraphs      │  (actual content)
│  - content (JSONB)  │  ← { blocks: [{type, content}, ...] }
│  - content_text     │  ← plain text for search
│  - order_index      │
│  - section_id (FK)  │
└─────────────────────┘
```

## JSONB Content Block Format

Each paragraph stores content as JSONB with this structure:

```json
{
  "blocks": [
    { "type": "heading", "level": 2, "content": "Section Title" },
    {
      "type": "text",
      "content": "Paragraph text with <strong>formatting</strong>..."
    },
    { "type": "animation", "description": "Animation marker" }
  ]
}
```

## Current authored chapter: Foundations of Neuroscience

```
📚 Foundations of Neuroscience (module)
    │
    ├── [0] Introduction
    ├── [1] Where is my mind?
    ├── [2] Do different parts of the brain do different things?
    ├── [3] What's the basic functional unit of the brain?
    ├── [4] How do neurons communicate?
    ├── [5] Closing words
    ├── Supporting historical boxes
    └── References
```

The temporary `visual-perception-ux` module is retired. Its source under
`claude/Content/Chapter-2/` is historical only and must not be imported or
seeded. The removal migration is
`supabase/migrations/20260828000000_remove_temporary_visual_perception_ux.sql`.

## Data Flow: Supabase → App

```
1. ChapterView.vue
   │
   ├── Route: /chapter/:number/:slug
   │   e.g., /chapter/3/foundations-of-neuroscience
   │
   └── Calls useChapter().fetchChapter(slug)

2. useChapter.js
   │
   ├── Fetches module by slug from Supabase
   ├── Transforms DB structure → Chapter 1 JSON format
   └── Returns { intro: [...], sections: [...] }

3. useModules.js
   │
   └── Supabase query:
       modules → sections → paragraphs
       (nested select with ordering)

4. TextComp.vue
   │
   └── Renders transformed data matching
       Chapter 1's JSON structure
```

## Key Files

| File                                                                    | Purpose                            |
| ----------------------------------------------------------------------- | ---------------------------------- |
| `src/composables/useChapter.js`                                         | Fetches & transforms Supabase data |
| `src/composables/useModules.js`                                         | Raw Supabase queries               |
| `src/views/ChapterView.vue`                                             | Route handler, loads chapter       |
| `src/components/chapter/TextComp.vue`                                   | Renders content                    |
| `supabase/migrations/20250101000000_initial_schema.sql`                 | DB schema                          |
| `supabase/migrations/20260605000000_seed_chapter_foundations.sql`       | Foundations chapter seed, part 1   |
| `supabase/migrations/20260605000001_seed_chapter_foundations_part2.sql` | Foundations chapter seed, part 2   |
