# Hybrid Architecture Implementation Checklist

Complete this checklist to fully implement Supabase + MySQL hybrid architecture for real-time features.

---

## Phase 1: Supabase Setup ⏳

### 1.1 Create Supabase Project
- [ ] Go to https://supabase.com
- [ ] Create new project
- [ ] Save Project URL and Anon Key
- [ ] Reference: `SUPABASE_SETUP_GUIDE.md` - Step 1-2

### 1.2 Create Database Tables
- [ ] Run SQL migrations from `SUPABASE_SETUP_GUIDE.md` - Step 3
- [ ] Verify 11 tables created:
  - [ ] user_profiles
  - [ ] books
  - [ ] chapters
  - [ ] book_approvals
  - [ ] comments_reviews
  - [ ] user_roles (for admins)
  - [ ] notifications
  - [ ] reading_progress
  - [ ] bookmarks
  - [ ] wishlists
  - [ ] coupons

### 1.3 Set Up Row-Level Security (RLS)
- [ ] Run RLS policy SQL from `SUPABASE_SETUP_GUIDE.md` - Step 4
- [ ] Test that unauthenticated users can't read/write protected tables
- [ ] Verify users can only access their own data

### 1.4 Enable Real-Time Replication
- [ ] Run realtime SQL from `SUPABASE_SETUP_GUIDE.md` - Step 6
- [ ] Or enable via dashboard: Database → Tables → Enable Realtime
- [ ] Enable on these tables:
  - [ ] books
  - [ ] chapters
  - [ ] comments_reviews
  - [ ] user_roles
  - [ ] notifications
  - [ ] reading_progress
  - [ ] bookmarks
  - [ ] wishlists
  - [ ] book_approvals

---

## Phase 2: Frontend Setup 🎨

### 2.1 Install Dependencies
- [ ] `npm install @supabase/supabase-js`
- [ ] Verify installed: `npm list @supabase/supabase-js`

### 2.2 Create Supabase Client
- [ ] Copy code from `SUPABASE_SETUP_GUIDE.md` - Step 7
- [ ] Create: `src/integrations/supabase/client.ts`
- [ ] Update to use your Supabase URL and key

### 2.3 Set Environment Variables
- [ ] `.env` (local development):
  ```
  VITE_SUPABASE_URL=https://xxxxx.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJ...
  ```
- [ ] Restart dev server after adding env vars
- [ ] Vercel (production):
  - [ ] Go to Settings → Environment Variables
  - [ ] Add same variables above

### 2.4 Update Frontend Hooks (CRITICAL)
Create real-time hooks using templates from `REALTIME_HOOKS_GUIDE.md`:

- [ ] `hooks/useAdmins.ts` - Real-time admin list
- [ ] `hooks/useNotifications.ts` - Toast notifications
- [ ] `hooks/useBookApprovals.ts` - Live book status
- [ ] `hooks/useComments.ts` - Live comments
- [ ] `hooks/useReadingProgress.ts` - Live reading tracking
- [ ] `hooks/useWishlist.ts` - Live wishlist
- [ ] `hooks/useBookmarks.ts` - Live bookmarks

**OR** copy from `REALTIME_HOOKS_GUIDE.md` and paste into your files.

### 2.5 Update Components
Components that need to use new real-time hooks:

- [ ] `AdminManagement.tsx` - Use `AdminManagement.realtime.tsx` as template
- [ ] `ProfilePage.tsx` - Use `useReadingProgress` for live progress
- [ ] `BookDetail.tsx` - Use `useComments` for live comments
- [ ] `BookReader.tsx` - Use `useNotifications` for live alerts
- [ ] `NotificationBell.tsx` - Use `useNotifications` hook

### 2.6 Test Real-Time Locally
```bash
npm run dev
```

Then:
- [ ] Open http://localhost:5173 in two browser windows
- [ ] Window 1: Go to Admin panel
- [ ] Window 2: Go to Admin panel
- [ ] In Window 1: Add a new admin
- [ ] In Window 2: Admin list updates instantly ✨
- [ ] Repeat with comments: Comment on a book, see it appear in other window

---

## Phase 3: Update Authentication 🔐

### 3.1 Google OAuth Setup
- [ ] Follow `GOOGLE_OAUTH_SETUP.md`
- [ ] Get Google OAuth credentials
- [ ] Configure redirect URIs for both:
  - [ ] `http://localhost:5173/auth/callback`
  - [ ] `https://your-vercel-domain/auth/callback`

### 3.2 Update Auth Hook
- [ ] Modify `hooks/useAuth.tsx` to use Supabase auth:
  ```typescript
  import { supabase } from '@/integrations/supabase/client'
  
  // Use supabase.auth.signInWithOAuth(), signUp(), etc.
  ```
- [ ] Reference: `GOOGLE_OAUTH_SETUP.md` - Auth integration

### 3.3 Create User Profile on Signup
- [ ] When user signs up, create entry in `user_profiles` table:
  ```typescript
  await supabase.from('user_profiles').insert({
    id: user.id,
    email: user.email,
    display_name: user.user_metadata?.full_name,
  })
  ```

---

## Phase 4: Backend Setup (Payments Only) 💳

### 4.1 Create Express Server
- [ ] Create new folder: `backend/` in root
- [ ] Initialize: `npm init -y`
- [ ] Install: `npm install express cors dotenv @supabase/supabase-js mysql2`
- [ ] Create `backend/server.js`

### 4.2 Set Up Payment Routes
- [ ] Add route: `POST /api/payments` (from `ADMIN_MANAGEMENT_ROUTES.md`)
- [ ] Process PayU webhook
- [ ] Store in MySQL only (never in Supabase)

### 4.3 Create MySQL Database
- [ ] Sign up at https://railway.app or https://render.com
- [ ] Create MySQL instance
- [ ] Get connection string: `mysql://user:pass@host/db`
- [ ] Run SQL migrations for payment tables:
  ```sql
  CREATE TABLE payments (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    book_id UUID NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50),
    transaction_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
  );
  
  CREATE TABLE receipts (
    id UUID PRIMARY KEY,
    payment_id UUID NOT NULL REFERENCES payments(id),
    user_email VARCHAR(255),
    amount DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```

### 4.4 Connect Backend to Databases
- [ ] Update backend `.env`:
  ```
  SUPABASE_URL=https://xxxxx.supabase.co
  SUPABASE_SERVICE_KEY=eyJ...  (NOT anon key!)
  MYSQL_URL=mysql://user:pass@host/db
  PAYু_MERCHANT_ID=xxx
  PAYु_SALT=xxx
  ```
- [ ] Service Role Key needed for backend (admin operations)

### 4.5 Deploy Backend to Railway/Render
- [ ] Push backend code to GitHub
- [ ] Connect Railway/Render to GitHub repo
- [ ] Set environment variables in deployment platform
- [ ] Deploy and test
- [ ] Get backend URL (e.g., `https://wistaar-backend.railway.app`)

---

## Phase 5: Frontend Deployment 🚀

### 5.1 Update Frontend Environment for Production
- [ ] Vercel Settings → Environment Variables:
  ```
  VITE_SUPABASE_URL=your_supabase_url
  VITE_SUPABASE_ANON_KEY=your_anon_key
  VITE_API_URL=https://your-backend.railway.app/api
  ```

### 5.2 Deploy to Vercel
- [ ] Push all changes to GitHub
- [ ] Vercel auto-deploys
- [ ] Visit your live site
- [ ] Test real-time features across different browsers

### 5.3 Update OAuth Redirect URLs
- [ ] Google Console: Add production redirect URI:
  ```
  https://your-vercel-domain/auth/callback
  ```
- [ ] Supabase Auth → Google: Update to production values

---

## Phase 6: Testing 🧪

### 6.1 Real-Time Feature Testing

**Test Admin Management:**
- [ ] Open admin panel in two browser windows
- [ ] Add admin in Window 1
- [ ] See instant update in Window 2
- [ ] Remove admin in Window 1
- [ ] See instant removal in Window 2
- [ ] Update permissions
- [ ] See instant permission changes

**Test Comments:**
- [ ] Open book detail page in two windows
- [ ] Comment in Window 1
- [ ] See comment appear instantly in Window 2
- [ ] See comment count increment

**Test Reading Progress:**
- [ ] Open reader in two windows (same book)
- [ ] Update progress in Window 1
- [ ] See progress update instantly in Window 2

**Test Notifications:**
- [ ] Add book as admin
- [ ] See notification appear as author instantly
- [ ] Add admin
- [ ] See notification appear to new admin

### 6.2 Payment Testing
- [ ] Test payment flow with test credit card
- [ ] Verify payment recorded in MySQL (not Supabase)
- [ ] Verify receipt generated
- [ ] Verify webhook received correctly

### 6.3 Security Testing
- [ ] Login as different users
- [ ] Verify can only see own data (RLS working)
- [ ] Test unauthorized table access
- [ ] Verify JWT tokens working

---

## Phase 7: Production Hardening 🔒

### 7.1 Supabase Security
- [ ] Review and strengthen RLS policies
- [ ] Disable anon signup if not needed:
  - [ ] Auth → Settings → Disable "Enable sign up"
- [ ] Set password requirements
- [ ] Enable email verification
- [ ] Rotate keys if exposed

### 7.2 Backend Security
- [ ] Add rate limiting to payment endpoints
- [ ] Verify webhook signatures
- [ ] Use HTTPS only
- [ ] Add request logging
- [ ] Set up error tracking (e.g., Sentry)

### 7.3 Database Security
- [ ] Use strong passwords
- [ ] Enable SSL connections
- [ ] Regular backups enabled
- [ ] Monitor for suspicious queries

---

## Phase 8: Monitoring & Maintenance 📊

### 8.1 Set Up Monitoring
- [ ] Monitor Supabase usage (check free tier limits)
- [ ] Monitor backend uptime
- [ ] Monitor error rates
- [ ] Set up alerts for failures

### 8.2 Regular Tasks
- [ ] **Weekly**: 
  - [ ] Check error logs
  - [ ] Verify backups
- [ ] **Monthly**: 
  - [ ] Review logs for suspicious activity
  - [ ] Check database performance
  - [ ] Update dependencies
- [ ] **Quarterly**: 
  - [ ] Security audit
  - [ ] Database optimization
  - [ ] Cost review

---

## Files to Reference

| File | Purpose |
|------|---------|
| `SUPABASE_SETUP_GUIDE.md` | Step-by-step Supabase setup |
| `REALTIME_HOOKS_GUIDE.md` | Real-time hook implementations |
| `HYBRID_ARCHITECTURE.md` | Architecture overview |
| `GOOGLE_OAUTH_SETUP.md` | OAuth integration |
| `AdminManagement.realtime.tsx` | Real-time admin component |

---

## Troubleshooting

### Real-time not updating
1. Check table has realtime enabled: `ALTER PUBLICATION supabase_realtime ADD TABLE tablename;`
2. Verify RLS allows SELECT
3. Check browser console for errors
4. Restart dev server

### Permission denied errors
1. Verify user is logged in
2. Check RLS policies allow operation
3. Verify user ID matches filter

### Environment variables not working
1. Restart dev server
2. Verify variables in `.env` (local) or Vercel settings (production)
3. Check `import.meta.env.VITE_SUPABASE_URL` is correct

### MySQL connection errors
1. Verify connection string
2. Check database is accessible from backend
3. Verify credentials in `.env`

---

## Post-Launch Checklist ✅

- [ ] All real-time features working
- [ ] Admin management live
- [ ] Payments processing
- [ ] Users can be created and authenticated
- [ ] Comments update in real-time
- [ ] Reading progress updates in real-time
- [ ] Notifications appear instantly
- [ ] No console errors
- [ ] Mobile responsive working
- [ ] Lighthouse score > 80
- [ ] No SQL injection vulnerabilities
- [ ] RLS policies verified
- [ ] OAuth working for social login
- [ ] Payment webhook verified
- [ ] Backups configured
- [ ] Monitoring alerts set

---

## Success Indicators 🎉

Your hybrid architecture is working when:

✅ Admin adds another admin → Appears instantly for all admins  
✅ User comments on book → Comment appears instantly for all readers  
✅ User reads page 10 → Progress syncs across devices instantly  
✅ Payment made → Recorded in MySQL, not Supabase  
✅ Admin approves book → Book becomes visible to readers instantly  
✅ Two users on same page → See each other's comments in real-time  

**Congratulations! You've built a real-time collaborative platform!** 🚀

---

## Get Help

- **Supabase Docs**: https://supabase.com/docs
- **Real-Time Guide**: https://supabase.com/docs/guides/realtime
- **RLS Guide**: https://supabase.com/docs/guides/auth/row-level-security
- **Railway Docs**: https://docs.railway.app
- **React Query**: https://tanstack.com/query/latest
