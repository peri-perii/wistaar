import { Router, Response } from 'express';
import pool from '../config/database.js';
import { authMiddleware, optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ============================================
// GET USER PROFILE
// ============================================
router.get('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const conn = await pool.getConnection();
    const [user] = await conn.query(
      'SELECT id, email, name, avatar, bio, created_at FROM users WHERE id = ?',
      [req.user?.userId]
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

// ============================================
// UPDATE USER PROFILE
// ============================================
router.put('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, avatar, bio } = req.body;

    const conn = await pool.getConnection();
    await conn.query(
      'UPDATE users SET name = COALESCE(?, name), avatar = COALESCE(?, avatar), bio = COALESCE(?, bio), updated_at = NOW() WHERE id = ?',
      [name, avatar, bio, req.user?.userId]
    );
    conn.release();

    return res.json({ message: 'Profile updated' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ============================================
// GET USER WISHLIST
// ============================================
router.get('/wishlist', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const conn = await pool.getConnection();
    const [wishlist] = await conn.query(
      `SELECT bs.id, bs.title, bs.cover_image, bs.average_rating, bs.price, u.name as author_name
       FROM wishlist w
       JOIN book_submissions bs ON w.book_id = bs.id
       JOIN users u ON bs.author_id = u.id
       WHERE w.user_id = ? AND bs.status = 'published'
       ORDER BY w.created_at DESC`,
      [req.user?.userId]
    );
    conn.release();

    return res.json(wishlist);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

// ============================================
// ADD TO WISHLIST
// ============================================
router.post('/wishlist/:bookId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { bookId } = req.params;
    const { v4: uuidv4 } = await import('uuid');
    const wishlistId = uuidv4();

    const conn = await pool.getConnection();
    await conn.query(
      'INSERT INTO wishlist (id, user_id, book_id, created_at) VALUES (?, ?, ?, NOW())',
      [wishlistId, req.user?.userId, bookId]
    );
    conn.release();

    return res.json({ message: 'Added to wishlist' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

// ============================================
// REMOVE FROM WISHLIST
// ============================================
router.delete('/wishlist/:bookId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { bookId } = req.params;

    const conn = await pool.getConnection();
    await conn.query(
      'DELETE FROM wishlist WHERE user_id = ? AND book_id = ?',
      [req.user?.userId, bookId]
    );
    conn.release();

    return res.json({ message: 'Removed from wishlist' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

export default router;
