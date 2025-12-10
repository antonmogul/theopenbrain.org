# Create Creator User for Seeding

## Problem
The seed script needs a creator profile, but profiles require an auth user first.

## Solution: Create Auth User + Profile

### Step 1: Create Auth User

Go to Supabase Dashboard → Authentication → Users → "Add user"

Or use SQL (requires service_role key or admin access):

```sql
-- This creates an auth user (requires admin/service_role)
-- You can also do this via Supabase Dashboard → Authentication → Users
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'creator@theopenbrain.org',
  crypt('temp_password_change_me', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  false,
  'authenticated'
) RETURNING id;
```

### Step 2: Create Profile

After getting the user ID from Step 1, create the profile:

```sql
-- Replace USER_ID_HERE with the ID from Step 1
INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  institution,
  creator_bio
) VALUES (
  'USER_ID_HERE',  -- Replace with actual user ID
  'creator@theopenbrain.org',
  'Content Creator',
  'creator',
  'The Open Brain',
  'System account for content creation'
);
```

### Step 3: Run Seed Script

Now run the seed script - it will find the creator profile automatically.

---

## Alternative: Use Service Role Key

If you have the service_role key, you can temporarily disable RLS or use the service_role key to run the seed script, which will work with the placeholder UUID.

