# Supabase Integration - Setup Complete ✅

## What's Been Set Up

### 1. Database Schema ✅
- All 20+ tables created
- Indexes and RLS policies configured
- Functions and triggers in place

### 2. Supabase Client ✅
- **File**: `src/lib/supabase.js`
- Configured with environment variables
- Auto-refresh tokens enabled

### 3. Composables Created ✅
- **`useAuth.js`**: Authentication (sign up, sign in, sign out)
- **`useProfile.js`**: User profile management
- **`useModules.js`**: Content module operations

## Next Steps

### Step 1: Set Up Environment Variables

Create `.env.local` file in project root:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these values from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api

### Step 2: Test the Connection

Create a simple test component or add to existing component:

```vue
<script setup>
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/composables/useAuth'

const { user, isAuthenticated, signIn, signOut } = useAuth()

// Test connection
const testConnection = async () => {
  const { data, error } = await supabase.from('profiles').select('count')
  console.log('Connection test:', { data, error })
}
</script>

<template>
  <div>
    <p>User: {{ user?.email || 'Not logged in' }}</p>
    <button @click="testConnection">Test Connection</button>
  </div>
</template>
```

### Step 3: Create Profile on Sign Up

When a user signs up, you need to create their profile. Add this to your sign-up flow:

```javascript
import { useAuth } from '@/composables/useAuth'
import { useProfile } from '@/composables/useProfile'

const { signUp } = useAuth()
const { createProfile } = useProfile()

const handleSignUp = async (email, password, role) => {
  // 1. Sign up user
  const { data: authData, error: authError } = await signUp(email, password, { role })
  
  if (authError) {
    console.error('Sign up error:', authError)
    return
  }

  // 2. Create profile
  const { data: profileData, error: profileError } = await createProfile({
    role: role, // 'creator', 'professor', or 'student'
    full_name: '', // Get from form
    institution: '' // Get from form
  })

  if (profileError) {
    console.error('Profile creation error:', profileError)
  }
}
```

### Step 4: Set Up Authentication Triggers (Optional but Recommended)

Create a database trigger to auto-create profile on user signup:

```sql
-- Run this in Supabase SQL Editor
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Usage Examples

### Authentication

```vue
<script setup>
import { useAuth } from '@/composables/useAuth'

const { user, isAuthenticated, signIn, signOut, loading } = useAuth()

const handleSignIn = async () => {
  const { data, error } = await signIn('user@example.com', 'password')
  if (error) {
    console.error('Sign in error:', error)
  }
}
</script>
```

### Fetching Modules

```vue
<script setup>
import { useModules } from '@/composables/useModules'

const { modules, loading, fetchModules } = useModules()

// Fetch all published modules
onMounted(async () => {
  await fetchModules(null, 'published')
})
</script>
```

### User Profile

```vue
<script setup>
import { useProfile } from '@/composables/useProfile'

const { profile, loading, fetchProfile, updateProfile } = useProfile()

// Profile is auto-fetched when user is available
// Or manually fetch:
// await fetchProfile()

// Update profile
const updateName = async () => {
  await updateProfile({ full_name: 'New Name' })
}
</script>
```

## File Structure

```
src/
├── lib/
│   └── supabase.js          # Supabase client
├── composables/
│   ├── useAuth.js           # Authentication
│   ├── useProfile.js        # User profiles
│   └── useModules.js        # Content modules
└── .env.local               # Environment variables (not in git)
```

## Next Development Steps

1. ✅ **Database schema** - Done
2. ✅ **Supabase client** - Done
3. ✅ **Basic composables** - Done
4. ⏭️ **Authentication UI** - Build login/signup components
5. ⏭️ **TipTap editor** - Content creation interface
6. ⏭️ **Module creation** - Build UI for creating new chapters
7. ⏭️ **Migration script** - Convert existing JSON to database

## Testing Checklist

- [ ] Environment variables set
- [ ] Supabase connection works
- [ ] Can sign up new user
- [ ] Profile auto-creates (if trigger set up)
- [ ] Can fetch modules
- [ ] RLS policies working (test with different roles)

## Troubleshooting

### "Missing Supabase environment variables"
- Check `.env.local` exists
- Verify variable names: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart dev server after adding env vars

### "relation does not exist"
- Make sure you ran the migration SQL
- Check table names match exactly

### RLS Policy Errors
- Verify user is authenticated
- Check user role in profiles table
- Review RLS policies in Supabase dashboard

---

**Ready to build!** 🚀

