-- Create references table for per-chapter bibliography
CREATE TABLE IF NOT EXISTS "references" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  authors TEXT NOT NULL,
  title TEXT NOT NULL,
  journal TEXT,
  year INTEGER,
  volume TEXT,
  pages TEXT,
  doi TEXT,
  url TEXT,
  pub_type TEXT DEFAULT 'article',
  raw_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_id, number)
);

-- Enable RLS
ALTER TABLE "references" ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read references
CREATE POLICY "Anyone can read references"
  ON "references" FOR SELECT
  USING (true);

-- Allow creators to insert references
CREATE POLICY "Creators can insert references"
  ON "references" FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'creator'
    )
  );

-- Allow creators to update references
CREATE POLICY "Creators can update references"
  ON "references" FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'creator'
    )
  );

-- Allow creators to delete references
CREATE POLICY "Creators can delete references"
  ON "references" FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'creator'
    )
  );

-- Index for fast lookups
CREATE INDEX idx_references_module_id ON "references"(module_id);
