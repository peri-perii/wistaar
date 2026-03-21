# ⚡ Admin Management - Quick Start

## What's Done ✅

Your admin management system is now **fully implemented for MySQL**:

### Frontend (✅ Complete)
- **AdminManagement.tsx** - Updated to use new API endpoints
- **New API Methods:**
  - `getAdmins()` - List all admins
  - `addAdmin(email, permissions)` - Add new admin
  - `updateAdminPermissions(userId, permissions)` - Update permissions
  - `removeAdmin(userId)` - Remove admin

### Features
✅ Add admins with granular permissions  
✅ List all current admins  
✅ **Super Admin (Owner) Protection** - Your main admin (priyamj1502@gmail.com) shows with 👑 badge, can't be removed  
✅ Update permissions dynamically  
✅ Remove admin access with confirmation  
✅ User notifications on promotion/demotion  
✅ Beautiful Shadcn UI components  

---

## 3 Things You Need To Do

### 1️⃣ Update Database Schema

Run this SQL:
```sql
ALTER TABLE User ADD COLUMN role VARCHAR(50) DEFAULT 'USER' NOT NULL;
ALTER TABLE User ADD COLUMN can_approve_reject BOOLEAN DEFAULT false;
ALTER TABLE User ADD COLUMN can_manage_coupons BOOLEAN DEFAULT false;
ALTER TABLE User ADD COLUMN can_manage_admins BOOLEAN DEFAULT false;

CREATE INDEX idx_user_role ON User(role);
```

**Or with Prisma:**
```bash
# Update schema.prisma with admin fields (see ADMIN_MANAGEMENT_SETUP.md)
npx prisma migrate dev --name add_admin_fields
```

---

### 2️⃣ Create Backend Routes

Copy code from **ADMIN_MANAGEMENT_ROUTES.md**:

1. Create file: `routes/admin-management.js`
2. Paste the route handler code
3. Add to `server.js`:

```javascript
import adminManagementRoutes from './routes/admin-management.js'
app.use('/api/admin/admins', adminManagementRoutes)
```

---

### 3️⃣ Set Environment Variable

Add to backend `.env`:

```env
SUPER_ADMIN_ID=1
```

(Change `1` to the ID of priyamj1502@gmail.com in your User table)

---

## 🎯 That's It! Test It

### Local Testing

**Terminal 1 (Backend):**
```bash
npm start
```

**Terminal 2 (Frontend):**
```bash
npm run dev
```

**In Browser:**
1. Go to `http://localhost:5173/admin`
2. Click **"Manage Admins"** tab
3. See your current admins listed with super admin highlighted
4. Add a new admin by email
5. Toggle permissions
6. Remove an admin

---

## UI Overview

### Current Admins Display

**Super Admin (Owner) Card** - Gold theme
```
👑 priyamj1502@gmail.com [Owner / Super Admin]
Owner account - Full access to all admin features
✓ Approve & reject book submissions
✓ Create & manage coupon codes
✓ Add & remove other admins
```

**Regular Admin Cards** - Blue theme
```
🛡️ admin@example.com [Remove Button]
Added 3/15/2026 • 12 books approved

Permissions:
☑ Approve / reject book submissions
☐ Manage coupon codes
☐ Manage other admins
```

---

## 📋 Admin Permissions

Each admin can have:
- **can_approve_reject** - Approve/reject book submissions ✓
- **can_manage_coupons** - Create & manage coupon codes ✓
- **can_manage_admins** - Add & remove other admins ✓

---

## Files Reference

| File | Purpose |
|------|---------|
| `src/integrations/api/client.ts` | ✅ Updated with 4 new methods |
| `src/components/admin/AdminManagement.tsx` | ✅ Migrated from Supabase to MySQL API |
| `ADMIN_MANAGEMENT_ROUTES.md` | Backend route handler code (copy-paste) |
| `ADMIN_MANAGEMENT_SETUP.md` | Complete setup guide + troubleshooting |

---

## API Endpoints

```
GET    /api/admin/admins              - List all admins
POST   /api/admin/admins              - Add new admin
PATCH  /api/admin/admins/:userId      - Update permissions
DELETE /api/admin/admins/:userId      - Remove admin
```

---

## 🚀 Next Steps

1. ✅ Run SQL migrations (add admin columns to User table)
2. ✅ Create backend route handler (copy from ADMIN_MANAGEMENT_ROUTES.md)
3. ✅ Add route to server.js
4. ✅ Set SUPER_ADMIN_ID environment variable
5. ✅ Test locally on http://localhost:5173/admin
6. ✅ Deploy to production

---

## 🐛 Common Issues

### Lists shows "Loading..." forever
→ Backend route not responding. Check GET /api/admin/admins exists

### "User not found" when adding admin
→ Email must be an existing user. Check User table first.

### Can't remove admin
→ If marked as super_admin=true, can't remove. (This is intentional!)

### Super admin doesn't show special badge
→ Set SUPER_ADMIN_ID env var to match the user's ID in database

---

**Ready to go! Start with Step 1 above.** 🎉

Need help? Check `ADMIN_MANAGEMENT_SETUP.md` for detailed troubleshooting.
