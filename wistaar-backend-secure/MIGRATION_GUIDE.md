# Supabase to MySQL Migration Guide

## Overview
This document outlines the migration from Supabase to MySQL with a Node.js/Express backend and JWT authentication. All real-time functionality will be handled via WebSockets (Socket.io).

## Phase 1: Setup & Configuration ✅

### Backend Setup
- [x] Create Prisma schema for MySQL (25+ models)
- [x] Configure environment variables for MySQL connection
- [x] Set up JWT secret variables

### Frontend Setup
- [x] Create API client to replace Supabase client
- [x] Configure API URL environment variable

## Phase 2: Hook Migration (In Progress)

### Completed Hooks
- [ ] Authentication (useAuth) - New version created: `useAuth.new.tsx`
- [ ] Purchases (usePurchases) - New version created: `usePurchases.new.ts`
- [ ] Approved Books (useApprovedBooks) - New version created: `useApprovedBooks.new.ts`
- [ ] Book Chapters (useBookChapters) - New version created: `useBookChapters.new.ts`
- [ ] Wishlist (useWishlist) - New version created: `useWishlist.new.ts`
- [ ] Cart (useCart) - New version created: `useCart.new.ts`
- [ ] Reading Progress (useReadingProgress) - New version created: `useReadingProgress.new.ts`
- [ ] Coupons (useCoupon) - New version created: `useCoupon.new.ts`
- [ ] Reviews (useReviews) - New version created: `useReviews.new.ts`
- [ ] Admin (useIsAdmin) - New version created: `useIsAdmin.new.ts`

### Remaining Hooks to Migrate
- [ ] useBookmarks.ts
- [ ] useNotifications.ts
- [ ] useApprovedBooks.ts (full)
- [ ] useAuthorEarnings.ts
- [ ] Other component-specific hooks

## Phase 3: Component Updates

### Pages to Update
1. **Auth.tsx**
   - Replace Supabase auth with useAuth hook (API-based)
   - Update email verification flow
   - Update password reset flow

2. **Profile.tsx**
   - Replace supabase profile queries with API calls
   - Update avatar upload to use new API
   - Use new password change function from useAuth

3. **BookSubmit.tsx**
   - Update book submission to use API
   - Handle file uploads via API

4. **AdminDashboard.tsx**
   - Replace Supabase queries with admin API endpoints
   - Update submission review/approval flows

5. **BookReader.tsx**
   - Replace chapter fetching with API
   - Update reading progress tracking

6. **Explore.tsx**
   - Use new useApprovedBooks hook

7. **Library.tsx**
   - Use new usePurchases hook

### Components to Update
1. **AdminManagement.tsx**
   - Replace Supabase admin queries
   - Add API calls for user management

2. **CouponManagement.tsx**
   - Replace coupon queries with API calls

3. **RecentSales.tsx**
   - Replace sales queries with API calls

4. **EmailVerificationBanner.tsx**
   - Update email verification logic

## Phase 4: Environment Configuration

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api
```

Or for production:
```
VITE_API_URL=https://api.wistaar.com/api
```

### Backend (.env)
Already configured in `.env.example`:
- `DATABASE_URL` - MySQL connection string
- `JWT_SECRET` - JWT signing key
- `JWT_REFRESH_SECRET` - Refresh token key
- `FRONTEND_URL` - CORS origin

## Phase 5: Dependencies Update

### Remove from Frontend
```bash
npm uninstall @supabase/supabase-js
```

### Frontend Already Has
- `@tanstack/react-query` - For data fetching (already installed)
- React Router - For navigation

### Backend Already Has
- `@prisma/client` - ORM for MySQL
- `express` - Web framework
- `jsonwebtoken` - JWT auth
- `socket.io` - Real-time updates

## Migration Strategy

### Step 1: Backup & Setup
1. Create `.env` from `.env.example`
2. Set up MySQL database
3. Run migrations: `prisma db push` or `prisma migrate deploy`
4. Configure JWT secrets

### Step 2: Implement Backend APIs
Create Express routes for:
- `/api/auth/*` - Authentication endpoints
- `/api/profiles/*` - User profile management
- `/api/books/*` - Book operations
- `/api/purchases/*` - Purchase & payment handling
- `/api/cart/*` - Shopping cart
- `/api/wishlist/*` - Wishlist
- `/api/reading-progress/*` - Reading tracking
- `/api/reviews/*` - Book reviews
- `/api/coupons/*` - Coupon validation
- `/api/admin/*` - Admin operations
- `/api/notifications/*` - Notifications (WebSocket)

### Step 3: Replace Hooks Progressively
1. Rename new hook files (remove `.new` suffix)
2. Update component imports
3. Test each page/component
4. Remove old Supabase versions

### Step 4: Update Pages & Components
1. Update authentication flow (Auth.tsx)
2. Update profile management (Profile.tsx)
3. Update book operations
4. Update admin panels
5. Update reader functionality

### Step 5: Remove Supabase Configuration
1. Delete `/src/integrations/supabase/` folder
2. Remove Supabase client from any remaining files
3. Remove `@supabase/supabase-js` dependency

## Creating New Backend APIs

### Template for API Endpoint

```typescript
// Backend: src/modules/books/routes.ts
import { Router, Request, Response } from 'express';
import { authenticate } from '@/middleware/auth';

const router = Router();

// Get all approved books
router.get('/books', async (req: Request, res: Response) => {
  try {
    const { genre, limit = 100 } = req.query;
    
    // Query using Prisma
    const books = await prisma.bookSubmission.findMany({
      where: {
        status: 'APPROVED',
        ...(genre && { genre: genre as string }),
      },
      take: parseInt(limit as string),
      include: {
        author: {
          select: { profile: true },
        },
      },
    });

    res.json({ success: true, data: books });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get book chapters
router.get('/books/:bookId/chapters', async (req: Request, res: Response) => {
  try {
    const { bookId } = req.params;
    
    const chapters = await prisma.bookChapter.findMany({
      where: { bookId },
      orderBy: { chapterNumber: 'asc' },
    });

    res.json({ success: true, data: chapters });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Add authenticated endpoint example
router.post(
  '/books',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { title, description, genre } = req.body;
      const userId = req.user!.id;

      const book = await prisma.bookSubmission.create({
        data: {
          title,
          description,
          genre,
          authorId: userId,
        },
      });

      res.json({ success: true, data: book });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
);

export default router;
```

## Real-Time Updates with WebSockets

For real-time features (notifications, live updates), use Socket.io:

```typescript
// Backend setup
import { Server } from 'socket.io';
import { createServer } from 'http';

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Example: Book approval notification
  socket.on('admin:approve-book', async (data) => {
    // ... approval logic ...
    io.emit('book:approved', { bookId: data.bookId });
  });
});
```

## Testing Checklist

- [ ] Authentication (signup, signin, password reset)
- [ ] Profile management (update, avatar upload)
- [ ] Book operations (browse, search, read)
- [ ] Purchase flow (checkout, payment)
- [ ] Cart operations (add, remove, checkout)
- [ ] Wishlist operations
- [ ] Reading progress tracking
- [ ] Admin operations (approve/reject books, manage users)
- [ ] Notifications
- [ ] Error handling

## Common Issues & Solutions

### 1. CORS Errors
**Problem:** Frontend can't reach backend API
**Solution:** 
- Update CORS configuration in backend
- Ensure `VITE_API_URL` is correctly configured
- Check that backend is running on correct port

### 2. 401 Unauthorized
**Problem:** API returns 401 when accessing protected routes
**Solution:**
- Verify JWT token is being sent in Authorization header
- Check JWT_SECRET matches between token creation and verification
- Ensure token hasn't expired

### 3. File Upload Issues
**Problem:** Files not uploading correctly
**Solution:**
- Use multipart/form-data for file uploads
- Don't set Content-Type header manually (let browser set it)
- Verify file size limits in backend config
- Check that files are stored correctly as blobs

### 4. Real-Time Updates Not Working
**Problem:** WebSocket connections failing
**Solution:**
- Verify Socket.io is properly configured
- Check CORS settings for WebSocket
- Ensure frontend is connecting to correct socket URL
- Check browser console for WebSocket errors

## Performance Considerations

1. **Database Indexes:** Already set up in Prisma schema on frequently queried fields
2. **Caching:** Use React Query's stale time wisely
3. **Pagination:** Implement for large datasets when needed
4. **Compression:** Use gzip middleware on backend
5. **Connection Pooling:** Prisma handles this automatically

## Security Notes

1. **Passwords:** Never transmitted in plain text (use HTTPS in production)
2. **JWT:** Set reasonable expiration times (15 min access, 7 day refresh)
3. **Rate Limiting:** Already implemented in backend
4. **SQL Injection:** Protected by Prisma ORM
5. **CORS:** Restrict to your frontend domain in production
6. **Environment Variables:** Never commit `.env` file to Git

## Next Steps

1. **Implement Backend APIs** - Create Express routes for all operations
2. **Set Up Database** - Install MySQL, run Prisma migrations
3. **Replace Hooks** - Systematically replace Supabase hooks with new API-based versions
4. **Update Components** - Update all components to use new hooks
5. **Test Thoroughly** - Test all features end-to-end
6. **Deploy** - Deploy backend and frontend together
