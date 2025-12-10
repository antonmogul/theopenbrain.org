# Chapter 2 Import Guide

## Overview

You have:
- ✅ **SQL seed script** (`supabase/migrations/20250109000000_seed_chapter_2.sql`) - Creates structure
- ✅ **Full markdown content** (`claude/Content/Chapter-2/*.md`) - 38 markdown files
- ✅ **Import script** (`scripts/import-chapter-2-to-supabase.mjs`) - Imports markdown to database

## Steps to Import Chapter 2

### Step 1: Run the Seed Script (if not already done)

1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase/migrations/20250109000000_seed_chapter_2.sql`
3. Copy and paste the entire SQL
4. Run it

This creates:
- Content version (v1.0)
- Module: "Visual Perception and UX"
- 14 sections (Introduction, 11 main sections, 2 appendices)
- Empty structure (no paragraph content yet)

### Step 2: Import Markdown Content

Run the import script:

```bash
npm run import:chapter2
```

This script will:
- Read all 38 markdown files from `claude/Content/Chapter-2/`
- Convert markdown to JSONB structured content blocks
- Insert paragraphs into the correct sections
- Map files to sections automatically

### Step 3: Verify Import

Check in Supabase Dashboard:

```sql
-- Check module
SELECT * FROM modules WHERE slug = 'visual-perception-ux';

-- Check sections
SELECT s.title, COUNT(p.id) as paragraph_count
FROM sections s
LEFT JOIN paragraphs p ON p.section_id = s.id
JOIN modules m ON s.module_id = m.id
WHERE m.slug = 'visual-perception-ux'
GROUP BY s.id, s.title, s.order_index
ORDER BY s.order_index;
```

## Next: Display Chapter 2

After import, we'll create a component to display Chapter 2 using the same styles as Chapter 1.

---

## Troubleshooting

### "Module not found"
- Run the seed script first (Step 1)

### "Section not found"
- Check that seed script created all sections
- Verify section slugs match the mapping in the import script

### Import errors
- Check `.env.local` has correct Supabase credentials
- Ensure RLS policies allow inserts (temporarily permissive for development)

