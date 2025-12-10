-- Fix RLS Policies for Sections and Content Tables
-- Run this to allow reads and inserts during development/testing
-- Works with publishable key (new API) or anon key (legacy)

-- ============================================
-- Fix Sections Table Policies
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read published sections" ON sections;
DROP POLICY IF EXISTS "Creators can manage sections" ON sections;
DROP POLICY IF EXISTS "Temporary: Allow all for testing" ON sections;

-- Allow all reads (public access)
CREATE POLICY "Anyone can read published sections"
  ON sections FOR SELECT
  USING (true);

-- Temporary: Allow all operations for testing (INSERT, UPDATE, DELETE)
CREATE POLICY "Temporary: Allow all for testing"
  ON sections FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Fix Paragraphs Table Policies
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read paragraphs" ON paragraphs;
DROP POLICY IF EXISTS "Creators can manage paragraphs" ON paragraphs;
DROP POLICY IF EXISTS "Temporary: Allow all for testing" ON paragraphs;

-- Allow all reads (public access)
CREATE POLICY "Anyone can read paragraphs"
  ON paragraphs FOR SELECT
  USING (true);

-- Temporary: Allow all operations for testing (INSERT, UPDATE, DELETE)
CREATE POLICY "Temporary: Allow all for testing"
  ON paragraphs FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Fix Content Versions Table Policies
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read published versions" ON content_versions;
DROP POLICY IF EXISTS "Creators can manage versions" ON content_versions;
DROP POLICY IF EXISTS "Temporary: Allow all for testing" ON content_versions;

-- Allow all reads (public access)
CREATE POLICY "Anyone can read published versions"
  ON content_versions FOR SELECT
  USING (true);

-- Temporary: Allow all operations for testing (INSERT, UPDATE, DELETE)
CREATE POLICY "Temporary: Allow all for testing"
  ON content_versions FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Note
-- ============================================
-- These policies are permissive for development/testing.
-- In production, replace with proper role-based policies.

