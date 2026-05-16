# Supabase to MySQL Migration - Action Guide

## 🎯 What's Been Done

✅ **Backend Foundation:**
- Prisma schema with 25+ models for MySQL
- Complete database design (users, books, purchases, reviews, etc.)
- Environment configuration ready

✅ **Frontend API Layer:**
- Complete API client (`src/integrations/api/client.ts`)
- Replaces all Supabase calls with HTTP requests
- JWT authentication support
- All CRUD operations covered

✅ **New Hooks (API-Based):**
- `useAuth.new.tsx` - Authentication with JWT
- `usePurchases.new.ts` - Purchase history
- `useApprovedBooks.new.ts` - Book browsing
- `useBookChapters.new.ts` - Chapter reading
- `useCart.new.ts` - Shopping cart
- `useWishlist.new.ts` - Wishlist
- `useReadingProgress.new.ts` - Reading tracking & bookmarks
- `useCoupon.new.ts` - Coupon validation
- `useReviews.new.ts` - Book reviews
- `useIsAdmin.new.ts` - Admin checks
- `useAuthorEarnings.new.ts` - Author stats
- `useNotifications.new.ts` - Notifications
- `useBookmarks.new.ts` - Bookmarks

✅ **Documentation:**
- Complete migration guide with examples
- Security best practices
- Common issues & solutions
- Performance considerations

---

## 📋 Next Steps (In Order)

### Step 1: Database Setup (10-15 minutes)

```bash
# 1. Install MySQL locally or use cloud MySQL (AWS RDS, DigitalOcean, etc)

# 2. Create database
mysql -u root -p
CREATE DATABASE wistaar_db;

# 3. Update backend .env
cd wistaar-backend-secure
cp .env.example .env
# Edit .env and set:
# DATABASE_URL=mysql://root:password@localhost:3306/wistaar_db

# 4. Install dependencies and run migrations
npm install
npm run prisma:generate
npx prisma migrate dev --name init
# This creates all tables
```

### Step 2: Configure Backend (15-20 minutes)

```bash
cd wistaar-backend-secure

# 1. Install dependencies
npm install

# 2. Generate Prisma client
npx prisma generate

# 3. Create/update environment variables in .env:
DATABASE_URL="mysql://root:password@localhost:3306/wistaar_db"
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-min-32-chars"
FRONTEND_URL="http://localhost:5173"  # for development
PORT=5000
NODE_ENV="development"

# 4. Start backend in development mode
npm run dev
# Should show: "Server running on port 5000"
```

### Step 3: Configure Frontend (5-10 minutes)

```bash
cd wistaar-reading-studio

# 1. Create/update .env.local
echo "VITE_API_URL=http://localhost:5000/api" > .env.local

# 2. Remove Supabase client files (will be replaced)
# Note: Keep src/integrations/supabase/types.ts for now (can refactor later)

# 3. Don't update package.json yet - wait until new hooks are confirmed working
```

### Step 4: Gradually Migrate Components (Progressive)

**For each component:**

1. **Identify Supabase usage** - Find imports like:
   ```typescript
   import { supabase } from "@/integrations/supabase/client";
   ```

2. **Replace with new hook** - Update import from:
   ```typescript
   import { usePurchases } from "@/hooks/usePurchases";
   ```
   to:
   ```typescript
   import { usePurchases } from "@/hooks/usePurchases.new";
   ```

3. **Test component** - Load component in browser and verify:
   - No console errors
   - Data loads correctly
   - Interactions work

4. **Move to next component** - Once verified working, move new file:
   ```bash
   mv src/hooks/usePurchases.new.ts src/hooks/usePurchases.ts
   ```

**Priority Order:**
1. Auth flow (Auth.tsx + useAuth)
2. Profile (Profile.tsx + related hooks)
3. Home/Explore (useApprovedBooks)
4. Library (usePurchases, useWishlist)
5. Reader (useBookChapters, useReadingProgress)
6. Admin (useIsAdmin + admin pages)

### Step 5: Test Each Page

For each page, verify in browser:

```
Auth.tsx
- ✓ Sign up works
- ✓ Sign in works
- ✓ Password reset works
- ✓ Token stored in localStorage

Profile.tsx
- ✓ Profile loads
- ✓ Avatar upload works
- ✓ Password change works
- ✓ Transaction history displays

Explore.tsx
- ✓ Books load
- ✓ Search works
- ✓ Filters work

Library.tsx
- ✓ Purchases load
- ✓ Wishlist displays

BookReader.tsx
- ✓ Chapters load
- ✓ Reading progress saves
- ✓ Bookmarks work
```

### Step 6: Implement Missing Backend Routes

If you encounter "404 Not Found" errors, that endpoint needs to be created. Template:

```typescript
// File: wistaar-backend-secure/src/modules/<feature>/routes.ts

import { Router, Request, Response } from 'express';
import { authenticate } from '@/middleware/auth';
import { prisma } from '@/utils/prisma';

const router = Router();

// GET endpoint example
router.get('/feature', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    const data = await prisma.model.findMany({
      where: { userId },
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;
```

### Step 7: Clean Up Supabase

Once all components are working with new API:

```bash
cd wistaar-reading-studio

# 1. Remove Supabase from package.json
npm uninstall @supabase/supabase-js

# 2. Delete old integration folder
rm -rf src/integrations/supabase

# 3. Update any remaining imports of Supabase
# Search for: import { supabase }
# Replace with appropriate API client call
```

---

## 🔌 Connecting Backend Routes

When you create backend routes, they must be registered in `src/app.ts`:

```typescript
// wistaar-backend-secure/src/app.ts

import authRoutes from './modules/auth/routes';
import bookRoutes from './modules/books/routes';
import purchaseRoutes from './modules/purchases/routes';
// ... etc

app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/purchases', purchaseRoutes);
// ... etc
```

---

## 🚨 Common Errors & Solutions

### Error: "Cannot GET /api/..."
**Cause:** Backend route not implemented yet
**Solution:** Implement the route following the template above

### Error: "401 Unauthorized"
**Cause:** Token not being sent or invalid
**Solution:** 
1. Check localStorage has `authToken` key
2. Verify JWT_SECRET matches between encode/decode
3. Check token hasn't expired

### Error: "CORS blocked request"
**Cause:** Backend CORS not configured for frontend URL
**Solution:** Update backend .env:
```
FRONTEND_URL=http://localhost:5173
```

### Error: "Request timeout"
**Cause:** Backend not running or database not connected
**Solution:**
1. Check backend is running: `npm run dev`
2. Check MySQL is running
3. Check DATABASE_URL is correct

---

## 📊 Migration Checklist

- [ ] MySQL database created
- [ ] Backend .env configured
- [ ] Backend running: `npm run dev`
- [ ] Frontend .env.local configured
- [ ] useAuth working (test auth flow)
- [ ] usePurchases working (test purchases loading)
- [ ] useApprovedBooks working (test book browsing)
- [ ] useCart working
- [ ] useWishlist working
- [ ] useReadingProgress working
- [ ] Admin hooks working
- [ ] All Supabase imports removed
- [ ] No console errors
- [ ] All features tested end-to-end
- [ ] Ready for deployment

---

## 🎓 Architecture Overview

```
FRONTEND (React)
    ↓
src/integrations/api/client.ts (HTTP requests)
    ↓
BACKEND (Express + Prisma)
    ↓
DATABASE (MySQL)
```

**Data Flow Example:**
1. User clicks "Add to Cart" in React component
2. Component calls `apiClient.addToCart(bookId)`
3. HTTP POST to `http://localhost:5000/api/cart`
4. Backend route checks auth, calls Prisma
5. Prisma inserts row in `cart_items` table
6. Response sent back to frontend
7. React Query invalidates cache, UI updates

---

## 🚀 Deployment Checklist

When ready to deploy:

1. **Backend:**
   - Deploy Node.js server to hosting (Heroku, Railway, Render, etc.)
   - Set up MySQL database in cloud
   - Update environment variables
   - Run migrations on production DB

2. **Frontend:**
   - Update VITE_API_URL to production backend URL
   - Build: `npm run build`
   - Deploy to hosting (Vercel, Netlify, etc.)

3. **DNS & SSL:**
   - Point domain to frontend hosting
   - Enable HTTPS/SSL
   - Update CORS if needed

---

## 📚 Files to Review

- **Backend:** `wistaar-backend-secure/MIGRATION_GUIDE.md`
- **Frontend API:** `wistaar-reading-studio/src/integrations/api/client.ts`
- **Prisma Schema:** `wistaar-backend-secure/prisma/schema.prisma`
- **New Hooks:** `wistaar-reading-studio/src/hooks/*.new.ts`

---

## 💬 Need Help?

If you encounter issues:
1. Check browser console for errors
2. Check backend terminal output
3. Verify database connection
4. Check environment variables
5. Review MIGRATION_GUIDE.md for common issues

---

## 📈 Next Phase (After Migration)

Once Supabase is fully replaced:
1. Add WebSocket support (Socket.io) for real-time notifications
2. Implement advanced caching strategies
3. Add API rate limiting per user
4. Implement admin analytics
5. Add automated backups
6. Set up monitoring/logging
