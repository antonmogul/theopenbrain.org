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
│      modules        │  (e.g., "Visual Perception and UX")
│  - slug             │
│  - order_index      │
└─────────┬───────────┘
          │ 1:many
          ▼
┌─────────────────────┐
│      sections       │  (e.g., "Gestalt Principles")
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
    { "type": "text", "content": "Paragraph text with <strong>formatting</strong>..." },
    { "type": "animation", "description": "Animation marker" }
  ]
}
```

## Chapter 2: Visual Perception and UX

```
📚 Visual Perception and UX (module)
    │
    ├── [0] Introduction (6 paragraphs)
    ├── [1] From Retina to Recognition (5 paragraphs)
    ├── [2] Attention Economy (12 paragraphs)
    ├── [3] Foveal vs Peripheral (6 paragraphs)
    ├── [4] Saccades & Scanning (5 paragraphs)
    ├── [5] Gestalt Principles (6 paragraphs)
    ├── [6] Color Perception (6 paragraphs)
    ├── [7] Cognitive Load (5 paragraphs)
    ├── [8] Perceptual Biases (6 paragraphs)
    ├── [9] Motion & Animation (6 paragraphs)
    ├── [10] Case Studies (5 paragraphs)
    ├── [11] Looking Forward (3 paragraphs)
    ├── [12] Glossary (3 paragraphs)
    └── [13] Resources (3 paragraphs)
    
    TOTAL: 77 paragraphs across 14 sections
```

## Data Flow: Supabase → App

```
1. ChapterView.vue
   │
   ├── Route: /chapter/:number/:slug
   │   e.g., /chapter/2/visual-perception-ux
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

| File | Purpose |
|------|---------|
| `src/composables/useChapter.js` | Fetches & transforms Supabase data |
| `src/composables/useModules.js` | Raw Supabase queries |
| `src/views/ChapterView.vue` | Route handler, loads chapter |
| `src/components/chapter/TextComp.vue` | Renders content |
| `supabase/migrations/20250101000000_initial_schema.sql` | DB schema |
| `scripts/import-chapter-2-to-supabase.mjs` | Markdown → DB import |
