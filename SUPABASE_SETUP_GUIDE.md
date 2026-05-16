# Supabase Setup Guide for Wistaar

Follow these steps to set up Supabase for the hybrid architecture.

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: `wistaar-hybrid-db`
   - **Password**: Use a strong password (save it!)
   - **Region**: Choose closest to your users (e.g., `us-east-1` or `ap-south-1`)
   - **Pricing Plan**: Start with "Free" ($0/month)
5. Click "Create new project" and wait 2-3 minutes
6. Once ready, you'll see the project dashboard

## Step 2: Get Your Credentials

In your Supabase dashboard:

1. Click "Settings" (gear icon) → "API"
2. Copy these values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **Anon Key** (starts with `eyJ...`)
   - **Service Role Key** (keep this secret! Don't share)

## Step 3: Create Supabase Tables

Go to "SQL Editor" in your Supabase dashboard and run this SQL:

```sql
-- Users table (Supabase auth handles this, but we need a profiles extension)
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  display_name text,
  avatar_url text,
  role text DEFAULT 'user', -- 'user', 'author', 'admin'
  is_email_verified boolean DEFAULT false,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Books table
CREATE TABLE IF NOT EXISTS books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  author_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  cover_image_url text,
  price numeric(10, 2) DEFAULT 0,
  status text DEFAULT 'draft', -- 'draft', 'submitted', 'approved', 'rejected'
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Chapters table
CREATE TABLE IF NOT EXISTS chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  chapter_number integer NOT NULL,
  title text NOT NULL,
  content text,
  is_free boolean DEFAULT false,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Book approvals (for admin approval workflow)
CREATE TABLE IF NOT EXISTS book_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  status text DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  feedback text,
  approved_by uuid REFERENCES user_profiles(id),
  approved_at timestamp,
  created_at timestamp DEFAULT now()
);

-- Comments/Reviews table
CREATE TABLE IF NOT EXISTS comments_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Admin permissions table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role text NOT NULL,
  can_approve_reject boolean DEFAULT false,
  can_manage_coupons boolean DEFAULT false,
  can_manage_admins boolean DEFAULT false,
  can_manage_users boolean DEFAULT false,
  created_at timestamp DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text,
  type text DEFAULT 'info', -- 'info', 'warning', 'error', 'success'
  is_read boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);

-- Reading progress table
CREATE TABLE IF NOT EXISTS reading_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  current_page integer DEFAULT 0,
  total_pages integer,
  reading_time integer DEFAULT 0, -- in minutes
  last_read_at timestamp DEFAULT now(),
  completed_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  UNIQUE(book_id, user_id)
);

-- Bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  page integer NOT NULL,
  note text,
  created_at timestamp DEFAULT now(),
  UNIQUE(book_id, user_id, page)
);

-- Wishlists table
CREATE TABLE IF NOT EXISTS wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  created_at timestamp DEFAULT now(),
  UNIQUE(user_id, book_id)
);

-- Coupons table
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_percent integer,
  discount_amount numeric(10, 2),
  max_uses integer,
  current_uses integer DEFAULT 0,
  expires_at timestamp,
  created_by uuid NOT NULL REFERENCES user_profiles(id),
  created_at timestamp DEFAULT now()
);

-- Enable RLS (Row Level Security)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_approvals ENABLE ROW LEVEL SECURITY;
```

## Step 4: Set Up Row-Level Security (RLS) Policies

```sql
-- Users can only read own profile
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Authors can read own books
CREATE POLICY "Authors can read own books" ON books
  FOR SELECT USING (auth.uid() = author_id OR status = 'approved');

-- Users can read comments
CREATE POLICY "Users can read comments" ON comments_reviews
  FOR SELECT USING (true); -- public

-- Users can create their own comments
CREATE POLICY "Users can create comments" ON comments_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can read own reading progress
CREATE POLICY "Users can read own progress" ON reading_progress
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update own reading progress
CREATE POLICY "Users can update own progress" ON reading_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can read own bookmarks
CREATE POLICY "Users can read own bookmarks" ON bookmarks
  FOR SELECT USING (auth.uid() = user_id);

-- Users can manage own wishlists
CREATE POLICY "Users can manage wishlists" ON wishlists
  FOR ALL USING (auth.uid() = user_id);

-- Admins can read notifications
CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);
```

## Step 5: Update Your Frontend Environment Variables

In **Vercel**, go to your project settings:

1. Go to Settings → Environment Variables
2. Add:
   ```
   VITE_SUPABASE_URL=your_supabase_url_here
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```

Locally in `.env`:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## Step 6: Enable Real-Time Replication

In your Supabase dashboard:

1. Go to "Database" → "Tables"
2. For each table, click the "3 dots" menu
3. Select "Edit tables"
4. Toggle "Enable Realtime"
5. Or run this SQL:

```sql
BEGIN;
  ALTER PUBLICATION supabase_realtime ADD TABLE books;
  ALTER PUBLICATION supabase_realtime ADD TABLE chapters;
  ALTER PUBLICATION supabase_realtime ADD TABLE comments_reviews;
  ALTER PUBLICATION supabase_realtime ADD TABLE user_roles;
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  ALTER PUBLICATION supabase_realtime ADD TABLE reading_progress;
  ALTER PUBLICATION supabase_realtime ADD TABLE bookmarks;
  ALTER PUBLICATION supabase_realtime ADD TABLE wishlists;
  ALTER PUBLICATION supabase_realtime ADD TABLE book_approvals;
COMMIT;
```

## Step 7: Create Supabase Client in Frontend

Create file: `src/integrations/supabase/client.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})
```

## Step 8: Install Supabase Client

```bash
npm install @supabase/supabase-js
```

## Step 9: Test Real-Time Locally

```bash
npm run dev
```

Then open two browser windows:
1. Window 1: http://localhost:5173/admin
2. Window 2: http://localhost:5173/admin
3. In Window 1: Add a new admin
4. In Window 2: The admin list should update instantly! ✨

## Checkpoint Checklist

- [ ] Supabase project created
- [ ] Tables created (11 total)
- [ ] RLS policies configured
- [ ] Realtime enabled on all tables
- [ ] Environment variables set
- [ ] Supabase client created
- [ ] @supabase/supabase-js installed
- [ ] Frontend running on localhost
- [ ] Real-time test working (two browser windows)

## Next Steps

1. **Update hooks** - Replace all HTTP API calls with Supabase subscriptions
   - Use the templates in `REALTIME_HOOKS_GUIDE.md`
   
2. **Set up authentication**
   - Configure Google OAuth → Supabase
   - Configure email/password auth
   
3. **Deploy to Vercel**
   - Push changes to GitHub
   - Vercel auto-deploys
   - Verify environment variables are set
   
4. **Enable payment webhook** (MySQL only)
   - Deploy Express backend to Railway
   - Configure PayU webhook endpoint

## Troubleshooting

### "Missing environment variables"
- Check `.env` file has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart dev server after adding env vars

### "RLS policy denies access"
- Check you're logged in with correct user
- Verify RLS policy includes your user ID
- Check `auth.uid()` matches user in database

### "Real-time not working"
- Confirm table has realtime enabled in Supabase console
- Check RLS still allows SELECT (realtime needs it)
- Check subscription filters match your RLS

### "Columns not found"
- Verify table was created successfully
- Check table name spelling (table names are lowercase)
- Run SQL migration again if schema is missing

---

**Resources:**
- Supabase Docs: https://supabase.com/docs
- Real-time Subscriptions: https://supabase.com/docs/guides/realtime
- Row-Level Security: https://supabase.com/docs/guides/auth/row-level-security
- Database Schema: https://supabase.com/docs/guides/database/tables
