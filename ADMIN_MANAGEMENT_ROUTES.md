# Admin Management Backend Routes

Add these routes to your Express backend for admin management functionality.

## File: `routes/admin-management.js` or `admin-management/index.js`

```javascript
import express from 'express';
import db from '../db'; // Your database connection
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';

const router = express.Router();

// Middleware to check if user can manage admins
async function canManageAdminsMiddleware(req, res, next) {
  try {
    // Check if user is admin and has can_manage_admins permission
    const [userAdmin] = await db.query(
      `SELECT * FROM User WHERE id = ? AND role = 'ADMIN'`,
      [req.user?.id]
    );
    
    if (!userAdmin || userAdmin.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Only admins can manage admin access'
      });
    }

    // For now, anyone with ADMIN role can manage admins
    // In future, add permission check for can_manage_admins field
    next();
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================================
// GET /api/admin/admins - Get all configured admins
// ============================================================================
router.get('/', authMiddleware, canManageAdminsMiddleware, async (req, res) => {
  try {
    const [admins] = await db.query(`
      SELECT 
        u.id,
        u.email,
        p.name,
        p.avatar,
        u.role,
        u.createdAt,
        COUNT(CASE WHEN o.id IS NOT NULL THEN 1 END) as bookCount,
        CASE WHEN u.id = '${process.env.SUPER_ADMIN_ID || '1'}' THEN true ELSE false END as is_super_admin,
        CASE WHEN u.id = '${process.env.SUPER_ADMIN_ID || '1'}' THEN true ELSE false END as can_approve_reject,
        CASE WHEN u.id = '${process.env.SUPER_ADMIN_ID || '1'}' THEN true ELSE false END as can_manage_coupons,
        CASE WHEN u.id = '${process.env.SUPER_ADMIN_ID || '1'}' THEN true ELSE false END as can_manage_admins
      FROM User u
      LEFT JOIN Profile p ON u.id = p.userId
      LEFT JOIN BookSubmission o ON u.id = o.userId
      WHERE u.role = 'ADMIN'
      GROUP BY u.id
      ORDER BY u.createdAt DESC
    `);

    return res.json({
      success: true,
      data: admins || []
    });
  } catch (error) {
    console.error('Get admins error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch admins'
    });
  }
});

// ============================================================================
// POST /api/admin/admins - Add new admin
// ============================================================================
router.post('/', authMiddleware, canManageAdminsMiddleware, async (req, res) => {
  try {
    const { email, permissions } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Find user by email
    const [users] = await db.query(
      'SELECT id, email, role FROM User WHERE email = ?',
      [email.toLowerCase()]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found. User must have an account before granting admin access.'
      });
    }

    const user = users[0];

    // Check if already admin
    if (user.role === 'ADMIN') {
      return res.status(409).json({
        success: false,
        error: 'User is already an admin'
      });
    }

    // Update user role to ADMIN
    const [updateResult] = await db.query(
      'UPDATE User SET role = ? WHERE id = ?',
      ['ADMIN', user.id]
    );

    // Store admin permissions in a separate table if you have one
    // For now, storing permissions as separate columns in User table
    // ALTER TABLE User ADD COLUMN can_approve_reject BOOLEAN DEFAULT true;
    // ALTER TABLE User ADD COLUMN can_manage_coupons BOOLEAN DEFAULT false;
    // ALTER TABLE User ADD COLUMN can_manage_admins BOOLEAN DEFAULT false;

    if (permissions) {
      await db.query(
        `UPDATE User SET 
          can_approve_reject = ?, 
          can_manage_coupons = ?, 
          can_manage_admins = ?
        WHERE id = ?`,
        [
          permissions.can_approve_reject || true,
          permissions.can_manage_coupons || false,
          permissions.can_manage_admins || false,
          user.id
        ]
      );
    }

    // Send notification to new admin
    await db.query(
      `INSERT INTO Notification (userId, title, message, type, createdAt) 
       VALUES (?, ?, ?, ?, NOW())`,
      [
        user.id,
        '🎉 You have been granted Admin access',
        `You now have admin privileges on Wistaar.`,
        'admin_promotion'
      ]
    );

    return res.json({
      success: true,
      data: {
        message: `${email} has been granted admin access`,
        userId: user.id
      }
    });
  } catch (error) {
    console.error('Add admin error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to add admin'
    });
  }
});

// ============================================================================
// PATCH /api/admin/admins/:userId - Update admin permissions
// ============================================================================
router.patch('/:userId', authMiddleware, canManageAdminsMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { permissions } = req.body;

    if (!permissions) {
      return res.status(400).json({
        success: false,
        error: 'Permissions object is required'
      });
    }

    // Check if user is admin
    const [users] = await db.query(
      'SELECT id, email, role FROM User WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (users[0].role !== 'ADMIN') {
      return res.status(400).json({
        success: false,
        error: 'User is not an admin'
      });
    }

    // Update permissions
    const updateFields = [];
    const updateValues = [];

    if (permissions.can_approve_reject !== undefined) {
      updateFields.push('can_approve_reject = ?');
      updateValues.push(permissions.can_approve_reject);
    }
    if (permissions.can_manage_coupons !== undefined) {
      updateFields.push('can_manage_coupons = ?');
      updateValues.push(permissions.can_manage_coupons);
    }
    if (permissions.can_manage_admins !== undefined) {
      updateFields.push('can_manage_admins = ?');
      updateValues.push(permissions.can_manage_admins);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid permissions to update'
      });
    }

    updateValues.push(userId);

    await db.query(
      `UPDATE User SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    return res.json({
      success: true,
      data: {
        message: 'Admin permissions updated successfully'
      }
    });
  } catch (error) {
    console.error('Update permissions error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update permissions'
    });
  }
});

// ============================================================================
// DELETE /api/admin/admins/:userId - Remove admin access
// ============================================================================
router.delete('/:userId', authMiddleware, canManageAdminsMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent removing super admin
    if (userId === process.env.SUPER_ADMIN_ID) {
      return res.status(403).json({
        success: false,
        error: 'Cannot remove the super admin'
      });
    }

    // Check if user is admin
    const [users] = await db.query(
      'SELECT id, email, role FROM User WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (users[0].role !== 'ADMIN') {
      return res.status(400).json({
        success: false,
        error: 'User is not an admin'
      });
    }

    // Downgrade user from ADMIN to USER
    await db.query(
      'UPDATE User SET role = ?, can_approve_reject = false, can_manage_coupons = false, can_manage_admins = false WHERE id = ?',
      ['USER', userId]
    );

    // Send notification to user
    await db.query(
      `INSERT INTO Notification (userId, title, message, type, createdAt) 
       VALUES (?, ?, ?, ?, NOW())`,
      [
        userId,
        '👋 Admin access revoked',
        `Your admin privileges on Wistaar have been revoked.`,
        'admin_revoked'
      ]
    );

    return res.json({
      success: true,
      data: {
        message: `${users[0].email} has been removed from admin role`
      }
    });
  } catch (error) {
    console.error('Remove admin error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to remove admin'
    });
  }
});

export default router;
```

## Integration into Express App

Add this to your main `server.js`:

```javascript
import adminManagementRoutes from './routes/admin-management.js'

// Mount admin management routes (place after other admin routes)
app.use('/api/admin/admins', adminManagementRoutes)
```

## Database Schema Requirements

Make sure your `User` table has these columns:

```sql
ALTER TABLE User ADD COLUMN role VARCHAR(50) DEFAULT 'USER' NOT NULL;
ALTER TABLE User ADD COLUMN can_approve_reject BOOLEAN DEFAULT false;
ALTER TABLE User ADD COLUMN can_manage_coupons BOOLEAN DEFAULT false;
ALTER TABLE User ADD COLUMN can_manage_admins BOOLEAN DEFAULT false;

-- Optional: Create an admin_permissions table for more granular control
CREATE TABLE AdminPermission (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  can_approve_reject BOOLEAN DEFAULT true,
  can_manage_coupons BOOLEAN DEFAULT false,
  can_manage_admins BOOLEAN DEFAULT false,
  grantedBy INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
  FOREIGN KEY (grantedBy) REFERENCES User(id) ON DELETE SET NULL
);
```

## Prisma Schema Update

If using Prisma, update your `schema.prisma`:

```prisma
model User {
  id        Int     @id @default(autoincrement())
  email     String  @unique
  passwordHash String?
  role      String  @default("USER")  // "USER", "ADMIN"
  
  // Admin permissions
  can_approve_reject Boolean @default(false)
  can_manage_coupons Boolean @default(false)
  can_manage_admins  Boolean @default(false)
  
  emailVerified Boolean @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  profile     Profile?
  
  @@index([role])
  @@index([email])
}
```

Then run migrations:
```bash
npx prisma migrate dev --name add_admin_fields
```

## Environment Variables

Add to `.env`:

```env
# Optional: Set your super admin user ID
SUPER_ADMIN_ID=1
```

## Testing the Endpoints

### Get all admins
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/admin/admins
```

### Add new admin
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newadmin@example.com",
    "permissions": {
      "can_approve_reject": true,
      "can_manage_coupons": true,
      "can_manage_admins": false
    }
  }' \
  http://localhost:5000/api/admin/admins
```

### Update admin permissions
```bash
curl -X PATCH \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": {
      "can_manage_admins": true
    }
  }' \
  http://localhost:5000/api/admin/admins/2
```

### Remove admin
```bash
curl -X DELETE \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/admin/admins/2
```

