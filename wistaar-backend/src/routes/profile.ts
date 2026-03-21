import { Router, Response } from 'express';
import pool from '../config/database.js';
import { optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ============================================
// GET PUBLIC PROFILE
// ============================================
router.get('/:userId', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const conn = await pool.getConnection();
    const [user] = await conn.query(
      'SELECT id, name, avatar, bio, role, created_at FROM users WHERE id = ?',
      [userId]
    );
    conn.release();

    if ((user as any[]).length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json((user as any)[0]);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export default router;
