-- Add tags column to highlights table for free-text tagging (Readwise-style)
ALTER TABLE highlights ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- GIN index for efficient tag queries (e.g. WHERE tags @> ARRAY['biology'])
CREATE INDEX IF NOT EXISTS idx_highlights_tags ON highlights USING GIN(tags);
