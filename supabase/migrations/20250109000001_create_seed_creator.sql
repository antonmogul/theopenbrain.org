-- =============================================================================
-- Create Seed Creator User
-- =============================================================================
-- This script creates a creator user for seeding content.
-- Run this BEFORE running the Chapter 2 seed script.
-- =============================================================================

-- Option 1: If you already have a user via Supabase Auth Dashboard
-- Just create the profile (replace USER_ID with your auth user ID):
/*
INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  institution,
  creator_bio
) VALUES (
  'YOUR_AUTH_USER_ID_HERE',  -- Get this from Supabase Dashboard → Authentication → Users
  'creator@theopenbrain.org',
  'Content Creator',
  'creator',
  'The Open Brain',
  'System account for content creation'
) ON CONFLICT (id) DO NOTHING;
*/

-- Option 2: Create via Supabase Dashboard (RECOMMENDED)
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Add user" → "Create new user"
-- 3. Email: creator@theopenbrain.org
-- 4. Password: (set a secure password)
-- 5. Auto Confirm User: ✅ (checked)
-- 6. Copy the User UID
-- 7. Run the INSERT below with that UID

-- After creating user via dashboard, uncomment and run:
/*
INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  institution,
  creator_bio
) VALUES (
  'PASTE_USER_UID_HERE',  -- From Supabase Dashboard
  'creator@theopenbrain.org',
  'Content Creator',
  'creator',
  'The Open Brain',
  'System account for content creation'
) ON CONFLICT (id) DO NOTHING;
*/

-- =============================================================================
-- Quick Check: Verify Creator Exists
-- =============================================================================

-- Run this to check if you have a creator profile:
SELECT 
  id,
  email,
  full_name,
  role,
  created_at
FROM profiles 
WHERE role = 'creator'
LIMIT 1;

-- If this returns a row, you're ready to run the Chapter 2 seed script!
-- If it returns no rows, create a user first (see instructions above).

