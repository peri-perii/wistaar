import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ============================================
// NOTIFICATIONS ENDPOINTS
// ============================================

/**
 * GET /api/notifications
 * Get user's notifications
 * Auth: Required
 * Query: { page?, limit?, unreadOnly? }
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const unreadOnly = req.query.unreadOnly === 'true';
    const offset = (page - 1) * limit;

    const conn = await pool.getConnection();

    // Get notifications
    let query = 'SELECT id, title, message, type, is_read, created_at FROM notifications WHERE user_id = ?';
    let countQuery = 'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?';
    const params: any[] = [userId];

    if (unreadOnly) {
      query += ' AND is_read = FALSE';
      countQuery += ' AND is_read = FALSE';
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [notifications]: any = await conn.query(query, params);
    const [count]: any = await conn.query(countQuery, [userId]);

    // Get unread count
    const [unread]: any = await conn.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );

    conn.release();

    return res.json({
      notifications: notifications || [],
      unreadCount: unread[0]?.count || 0,
      pagination: {
        page,
        limit,
        total: count[0]?.total || 0,
        pages: Math.ceil((count[0]?.total || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications
 * Auth: Required
 */
router.get('/unread-count', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conn = await pool.getConnection();

    const [result]: any = await conn.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );

    conn.release();

    return res.json({
      unreadCount: result[0]?.count || 0,
    });
  } catch (error) {
    console.error('Unread count error:', error);
    return res.status(500).json({ error: 'Failed to get unread count' });
  }
});

/**
 * PUT /api/notifications/:notificationId/read
 * Mark notification as read
 * Auth: Required
 */
router.put('/:notificationId/read', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { notificationId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conn = await pool.getConnection();

    // Verify ownership
    const [notifs]: any = await conn.query(
      'SELECT id FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    if (!notifs.length) {
      conn.release();
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Mark as read
    await conn.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ?',
      [notificationId]
    );

    conn.release();

    return res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    return res.status(500).json({ error: 'Failed to mark as read' });
  }
});

/**
 * PUT /api/notifications/mark-all-read
 * Mark all notifications as read
 * Auth: Required
 */
router.put('/mark-all-read', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conn = await pool.getConnection();

    await conn.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );

    conn.release();

    return res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    return res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

/**
 * DELETE /api/notifications/:notificationId
 * Delete a notification
 * Auth: Required
 */
router.delete('/:notificationId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { notificationId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conn = await pool.getConnection();

    // Verify ownership
    const [notifs]: any = await conn.query(
      'SELECT id FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    if (!notifs.length) {
      conn.release();
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Delete
    await conn.query('DELETE FROM notifications WHERE id = ?', [notificationId]);

    conn.release();

    return res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    return res.status(500).json({ error: 'Failed to delete notification' });
  }
});

/**
 * DELETE /api/notifications/clear-all
 * Clear all notifications
 * Auth: Required
 */
router.delete('/clear-all', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conn = await pool.getConnection();

    await conn.query('DELETE FROM notifications WHERE user_id = ?', [userId]);

    conn.release();

    return res.json({ message: 'All notifications cleared' });
  } catch (error) {
    console.error('Clear all error:', error);
    return res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

export default router;
