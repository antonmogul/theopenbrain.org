# Supabase Setup Guide - Open Brain Platform

## Current Status

✅ **Supabase CLI Installed**: v2.39.2 (at `/opt/homebrew/bin/supabase`)  
⚠️ **Update Available**: v2.65.5 (recommended to update)  
❌ **Supabase Project**: Not initialized yet  
❌ **Supabase NPM Package**: Not installed yet

---

## Step 1: Update Supabase CLI (Optional but Recommended)

```bash
# Update via Homebrew (if installed via Homebrew)
brew upgrade supabase

# Or download latest from: https://github.com/supabase/cli/releases
```

---

## Step 2: Create Supabase Project

### Option A: Create via Supabase Dashboard (Recommended for first time)

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in:
   - **Name**: `theopenbrain` (or your preferred name)
   - **Database Password**: Save this securely!
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is fine to start
4. Wait for project to be created (~2 minutes)
5. Note your project details:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **API Key (anon/public)**: Found in Settings → API
   - **Service Role Key**: Found in Settings → API (keep secret!)

### Option B: Link to Existing Project via CLI

```bash
# Login to Supabase
supabase login

# Link to your project (after creating in dashboard)
supabase link --project-ref your-project-ref
```

---

## Step 3: Initialize Supabase in Your Project

```bash
# Navigate to project root
cd /Users/antonmorrison/Documents/GitHub/the-open-brain/theopenbrain.org

# Initialize Supabase (creates supabase/ directory)
supabase init

# This creates:
# - supabase/
#   - config.toml (local config)
#   - migrations/ (SQL migration files)
```

---

## Step 4: Install Supabase JavaScript Client

```bash
npm install @supabase/supabase-js --legacy-peer-deps
```

---

## Step 5: Create Database Schema

I'll create the migration files for you. The migration will:

1. Create all tables from our schema design
2. Set up indexes
3. Configure Row-Level Security (RLS) policies
4. Create functions and triggers

**Next step**: I'll create the migration SQL file that you can run.

---

## Step 6: Run Migrations

### Option A: Via Supabase Dashboard

1. Go to your project dashboard
2. Navigate to **SQL Editor**
3. Copy the migration SQL
4. Paste and run

### Option B: Via CLI (Local Development)

```bash
# Create a local Supabase instance (optional, for local dev)
supabase start

# Apply migrations
supabase db push

# Or apply specific migration
supabase migration up
```

### Option C: Via CLI (Remote Project)

```bash
# Link to remote project first
supabase link --project-ref your-project-ref

# Push migrations to remote
supabase db push
```

---

## Step 7: Set Up Environment Variables

Create `.env.local` file (add to `.gitignore`):

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important**: Never commit `.env.local` to git!

---

## Step 8: Create Supabase Client

Create `src/lib/supabase.js`:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

## Project Structure After Setup

```
theopenbrain.org/
├── supabase/
│   ├── config.toml
│   └── migrations/
│       └── YYYYMMDDHHMMSS_initial_schema.sql
├── src/
│   └── lib/
│       └── supabase.js
├── .env.local (not in git)
└── package.json
```

---

## Next Steps After Setup

1. ✅ Run migrations (create all tables)
2. ✅ Test database connection
3. ✅ Set up authentication
4. ✅ Create first test user
5. ✅ Build TipTap editor integration
6. ✅ Create first new chapter using new structure

---

## Useful Supabase CLI Commands

```bash
# Check status
supabase status

# View logs
supabase logs

# Generate TypeScript types from database
supabase gen types typescript --local > src/types/database.types.ts

# Reset local database (careful!)
supabase db reset

# Create new migration
supabase migration new migration_name
```

---

## Troubleshooting

### CLI Not Found
```bash
# If supabase command not found, add to PATH or reinstall
brew install supabase/tap/supabase
```

### Connection Issues
- Check your project URL and API keys
- Ensure project is not paused (free tier pauses after inactivity)
- Check firewall/network settings

### Migration Errors
- Check SQL syntax
- Ensure tables don't already exist
- Review error messages in Supabase dashboard

---

## Security Checklist

- [ ] `.env.local` is in `.gitignore`
- [ ] Never commit API keys to git
- [ ] Use `anon` key in frontend (public)
- [ ] Use `service_role` key only in backend (never expose!)
- [ ] Enable RLS on all tables
- [ ] Test RLS policies work correctly

---

**Ready to proceed?** Let me know when you've created your Supabase project, and I'll generate the migration SQL file for you!

