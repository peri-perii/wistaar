import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ============================================
// WISHLIST ENDPOINTS
// ============================================

/**
 * GET /api/wishlists
 * Get user's wishlist with book details
 * Auth: Required
 * Query: { page?, limit? }
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const conn = await pool.getConnection();

    // Get wishlist items
    const [items]: any = await conn.query(`
      SELECT 
        w.id,
        w.book_id,
        w.added_at,
        b.title,
        b.author,
        b.price,
        b.genre,
        b.rating,
        b.read_count,
        b.cover_image_url,
        b.description,
        (SELECT COUNT(*) FROM book_purchases WHERE user_id = ? AND book_id = b.id AND payment_status = "completed") as hasPurchased
      FROM wishlists w
      JOIN book_submissions b ON w.book_id = b.id
      WHERE w.user_id = ? AND b.status = 'approved'
      ORDER BY w.added_at DESC
      LIMIT ? OFFSET ?
    `, [userId, userId, limit, offset]);

    // Get count
    const [count]: any = await conn.query(
      'SELECT COUNT(*) as total FROM wishlists w JOIN book_submissions b ON w.book_id = b.id WHERE w.user_id = ? AND b.status = "approved"',
      [userId]
    );

    conn.release();

    return res.json({
      items: items || [],
      pagination: {
        page,
        limit,
        total: count[0]?.total || 0,
        pages: Math.ceil((count[0]?.total || 0) / limit),
      },
      count: (items as any[])?.length || 0,
    });
  } catch (error) {
    console.error('Fetch wishlist error:', error);
    return res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

/**
 * POST /api/wishlists/add
 * Add book to wishlist
 * Auth: Required
 * Body: { bookId }
 */
router.post('/add', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { bookId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!bookId) {
      return res.status(400).json({ error: 'Book ID required' });
    }

    const conn = await pool.getConnection();

    // Check if already in wishlist
    const [existing]: any = await conn.query(
      'SELECT id FROM wishlists WHERE user_id = ? AND book_id = ?',
      [userId, bookId]
    );

    if (existing.length > 0) {
      conn.release();
      return res.status(409).json({ error: 'Already in wishlist' });
    }

    // Check if book exists
    const [books]: any = await conn.query(
      'SELECT id FROM book_submissions WHERE id = ? AND status = "approved"',
      [bookId]
    );

    if (books.length === 0) {
      conn.release();
      return res.status(404).json({ error: 'Book not found' });
    }

    // Add to wishlist
    const wishlistId = uuidv4();
    await conn.query(
      'INSERT INTO wishlists (id, user_id, book_id, added_at) VALUES (?, ?, ?, NOW())',
      [wishlistId, userId, bookId]
    );

    conn.release();

    return res.status(201).json({
      message: 'Added to wishlist',
      wishlistId,
    });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    return res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

/**
 * DELETE /api/wishlists/remove/:bookId
 * Remove book from wishlist
 * Auth: Required
 */
router.delete('/remove/:bookId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { bookId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conn = await pool.getConnection();

    // Verify ownership
    const [items]: any = await conn.query(
      'SELECT id FROM wishlists WHERE user_id = ? AND book_id = ?',
      [userId, bookId]
    );

    if (items.length === 0) {
      conn.release();
      return res.status(404).json({ error: 'Not in wishlist' });
    }

    // Remove
    await conn.query(
      'DELETE FROM wishlists WHERE user_id = ? AND book_id = ?',
      [userId, bookId]
    );

    conn.release();

    return res.json({ message: 'Removed from wishlist' });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    return res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

/**
 * GET /api/wishlists/check/:bookId
 * Check if book is in wishlist
 * Auth: Required
 */
router.get('/check/:bookId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { bookId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conn = await pool.getConnection();

    const [items]: any = await conn.query(
      'SELECT id FROM wishlists WHERE user_id = ? AND book_id = ?',
      [userId, bookId]
    );

    conn.release();

    return res.json({
      inWishlist: items.length > 0,
    });
  } catch (error) {
    console.error('Check wishlist error:', error);
    return res.status(500).json({ error: 'Failed to check wishlist' });
  }
});

export default router;
