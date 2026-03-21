import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ============================================
// ADMIN MANAGEMENT ENDPOINTS
// ============================================

/**
 * GET /api/admin/dashboard
 * Get admin dashboard stats
 * Auth: Required (Admin)
 */
router.get('/dashboard', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conn = await pool.getConnection();

    // Check admin access
    const [admins]: any = await conn.query(
      'SELECT is_super_admin FROM admin_permissions WHERE user_id = ?',
      [userId]
    );

    if (!admins.length) {
      conn.release();
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get stats
    const [totalUsers]: any = await conn.query('SELECT COUNT(*) as count FROM users');
    const [totalRevenue]: any = await conn.query('SELECT SUM(amount) as total FROM book_purchases WHERE payment_status = "completed"');
    const [pendingBooks]: any = await conn.query('SELECT COUNT(*) as count FROM book_submissions WHERE status = "pending"');
    const [totalBooks]: any = await conn.query('SELECT COUNT(*) as count FROM book_submissions WHERE status = "approved"');
    const [recentTransactions]: any = await conn.query(`
      SELECT COUNT(*) as count FROM book_purchases 
      WHERE payment_status = "completed" AND purchased_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    conn.release();

    return res.json({
      stats: {
        totalUsers: totalUsers[0]?.count || 0,
        totalRevenue: totalRevenue[0]?.total || 0,
        pendingBooks: pendingBooks[0]?.count || 0,
        totalBooks: totalBooks[0]?.count || 0,
        recentTransactions: recentTransactions[0]?.count || 0,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

/**
 * GET /api/admin/submissions
 * Get all book submissions for review
 * Auth: Required (Admin with approval permission)
 * Query: { status?, page?, limit? }
 */
router.get('/submissions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conn = await pool.getConnection();

    // Check admin permission
    const [perms]: any = await conn.query(
      'SELECT can_approve_reject FROM admin_permissions WHERE user_id = ?',
      [userId]
    );

    if (!perms.length || !perms[0].can_approve_reject) {
      conn.release();
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const status = req.query.status || 'pending';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Get submissions
    const [submissions]: any = await conn.query(`
      SELECT 
        b.id, b.title, b.description, b.genre, b.price,
        b.author_id, u.name as author_name, u.email as author_email,
        b.status, b.submitted_at, b.admin_feedback, b.cover_image_url,
        b.total_chapters, b.free_chapters
      FROM book_submissions b
      JOIN users u ON b.author_id = u.id
      WHERE b.status = ?
      ORDER BY b.submitted_at DESC
      LIMIT ? OFFSET ?
    `, [status, limit, offset]);

    const [count]: any = await conn.query(
      'SELECT COUNT(*) as total FROM book_submissions WHERE status = ?',
      [status]
    );

    conn.release();

    return res.json({
      submissions: submissions || [],
      pagination: {
        page,
        limit,
        total: count[0]?.total || 0,
        pages: Math.ceil((count[0]?.total || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Fetch submissions error:', error);
    return res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

/**
 * POST /api/admin/submissions/:bookId/approve
 * Approve a book submission
 * Auth: Required (Admin with approval permission)
 * Body: { feedback? }
 */
router.post('/submissions/:bookId/approve', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { bookId } = req.params;
    const { feedback } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conn = await pool.getConnection();

    // Check permission
    const [perms]: any = await conn.query(
      'SELECT can_approve_reject FROM admin_permissions WHERE user_id = ?',
      [userId]
    );

    if (!perms.length || !perms[0].can_approve_reject) {
      conn.release();
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Approve book
    await conn.query(
      'UPDATE book_submissions SET status = "approved", reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
      [userId, bookId]
    );

    // Get book and author info
    const [books]: any = await conn.query(
      'SELECT author_id, title FROM book_submissions WHERE id = ?',
      [bookId]
    );

    if (books.length > 0) {
      // Create notification for author
      const notifId = uuidv4();
      await conn.query(`
        INSERT INTO notifications (id, user_id, title, message, type, created_at)
        VALUES (?, ?, ?, ?, 'book_approved', NOW())
      `, [
        notifId,
        books[0].author_id,
        '📖 Your book has been approved!',
        `"${books[0].title}" is now live on Wistaar and available for readers.`,
      ]);
    }

    conn.release();

    return res.json({ message: 'Book approved' });
  } catch (error) {
    console.error('Approve book error:', error);
    return res.status(500).json({ error: 'Failed to approve book' });
  }
});

/**
 * POST /api/admin/submissions/:bookId/reject
 * Reject a book submission
 * Auth: Required (Admin with approval permission)
 * Body: { reason, feedback }
 */
router.post('/submissions/:bookId/reject', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { bookId } = req.params;
    const { reason, feedback } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason required' });
    }

    const conn = await pool.getConnection();

    // Check permission
    const [perms]: any = await conn.query(
      'SELECT can_approve_reject FROM admin_permissions WHERE user_id = ?',
      [userId]
    );

    if (!perms.length || !perms[0].can_approve_reject) {
      conn.release();
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Reject book
    await conn.query(
      'UPDATE book_submissions SET status = "rejected", admin_feedback = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
      [feedback || reason, userId, bookId]
    );

    // Get book and author info
    const [books]: any = await conn.query(
      'SELECT author_id, title FROM book_submissions WHERE id = ?',
      [bookId]
    );

    if (books.length > 0) {
      // Create notification for author
      const notifId = uuidv4();
      await conn.query(`
        INSERT INTO notifications (id, user_id, title, message, type, created_at)
        VALUES (?, ?, ?, ?, 'book_rejected', NOW())
      `, [
        notifId,
        books[0].author_id,
        '❌ Your book submission needs revision',
        `"${books[0].title}" was not approved. Reason: ${reason}`,
      ]);
    }

    conn.release();

    return res.json({ message: 'Book rejected' });
  } catch (error) {
    console.error('Reject book error:', error);
    return res.status(500).json({ error: 'Failed to reject book' });
  }
});

/**
 * POST /api/admin/admins/add
 * Add new admin user
 * Auth: Required (Super Admin)
 * Body: { userId, canApproveReject, canManageCoupons, canManageAdmins }
 */
router.post('/admins/add', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { targetUserId, canApproveReject, canManageCoupons, canManageAdmins } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conn = await pool.getConnection();

    // Check if requester is super admin
    const [admins]: any = await conn.query(
      'SELECT is_super_admin FROM admin_permissions WHERE user_id = ?',
      [userId]
    );

    if (!admins.length || !admins[0].is_super_admin) {
      conn.release();
      return res.status(403).json({ error: 'Super admin access required' });
    }

    // Check if target user exists
    const [users]: any = await conn.query('SELECT id FROM users WHERE id = ?', [targetUserId]);
    if (!users.length) {
      conn.release();
      return res.status(404).json({ error: 'User not found' });
    }

    // Grant admin permission
    const permId = uuidv4();
    await conn.query(`
      INSERT INTO admin_permissions (
        id, user_id, granted_by, can_approve_reject, 
        can_manage_coupons, can_manage_admins, is_super_admin
      ) VALUES (?, ?, ?, ?, ?, ?, FALSE)
    `, [
      permId,
      targetUserId,
      userId,
      canApproveReject || false,
      canManageCoupons || false,
      canManageAdmins || false,
    ]);

    conn.release();

    return res.status(201).json({
      message: 'Admin added',
      permissionId: permId,
    });
  } catch (error) {
    console.error('Add admin error:', error);
    return res.status(500).json({ error: 'Failed to add admin' });
  }
});

/**
 * GET /api/admin/admins
 * Get list of all admins
 * Auth: Required (Super Admin)
 */
router.get('/admins', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conn = await pool.getConnection();

    // Check super admin
    const [check]: any = await conn.query(
      'SELECT is_super_admin FROM admin_permissions WHERE user_id = ?',
      [userId]
    );

    if (!check.length || !check[0].is_super_admin) {
      conn.release();
      return res.status(403).json({ error: 'Super admin access required' });
    }

    // Get admins
    const [admins]: any = await conn.query(`
      SELECT 
        p.id, p.user_id, u.name, u.email,
        p.can_approve_reject, p.can_manage_coupons, p.can_manage_admins, p.is_super_admin
      FROM admin_permissions p
      JOIN users u ON p.user_id = u.id
      ORDER BY u.name ASC
    `);

    conn.release();

    return res.json({
      admins: admins || [],
      count: (admins as any[])?.length || 0,
    });
  } catch (error) {
    console.error('Fetch admins error:', error);
    return res.status(500).json({ error: 'Failed to fetch admins' });
  }
});

export default router;
