import { Router, Response, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import Joi from 'joi';

const router = Router();

// ============================================
// CART MANAGEMENT ENDPOINTS
// ============================================

/**
 * GET /api/cart
 * Get user's cart items
 * Auth: Required
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conn = await pool.getConnection();
    
    // Get cart items with book details
    const [cartItems] = await conn.query(`
      SELECT 
        c.id,
        c.book_id,
        c.added_at,
        b.id as book_id,
        b.title,
        b.author,
        b.price,
        b.cover_image_url,
        b.genre,
        b.description
      FROM cart_items c
      JOIN book_submissions b ON c.book_id = b.id
      WHERE c.user_id = ? AND b.status = 'approved'
      ORDER BY c.added_at DESC
    `, [userId]);

    conn.release();

    return res.json({
      items: cartItems || [],
      count: (cartItems as any[])?.length || 0,
      total: ((cartItems as any[]) || []).reduce((sum, item) => sum + (item.price || 0), 0),
    });
  } catch (error) {
    console.error('Cart fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

/**
 * POST /api/cart/add
 * Add book to cart
 * Auth: Required
 * Body: { bookId: string }
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

    // Check if already in cart
    const [existing]: any = await conn.query(
      'SELECT id FROM cart_items WHERE user_id = ? AND book_id = ?',
      [userId, bookId]
    );

    if (existing.length > 0) {
      conn.release();
      return res.status(409).json({ error: 'Already in cart' });
    }

    // Check if book exists and is approved
    const [books]: any = await conn.query(
      'SELECT id, price FROM book_submissions WHERE id = ? AND status = "approved"',
      [bookId]
    );

    if (books.length === 0) {
      conn.release();
      return res.status(404).json({ error: 'Book not found or not approved' });
    }

    // Add to cart
    const cartId = uuidv4();
    await conn.query(
      'INSERT INTO cart_items (id, user_id, book_id, added_at) VALUES (?, ?, ?, NOW())',
      [cartId, userId, bookId]
    );

    conn.release();

    return res.status(201).json({
      message: 'Added to cart',
      cartItemId: cartId,
      bookPrice: books[0].price,
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    return res.status(500).json({ error: 'Failed to add to cart' });
  }
});

/**
 * DELETE /api/cart/remove/:cartItemId
 * Remove item from cart
 * Auth: Required
 */
router.delete('/remove/:cartItemId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { cartItemId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conn = await pool.getConnection();

    // Verify ownership
    const [items]: any = await conn.query(
      'SELECT id FROM cart_items WHERE id = ? AND user_id = ?',
      [cartItemId, userId]
    );

    if (items.length === 0) {
      conn.release();
      return res.status(404).json({ error: 'Cart item not found' });
    }

    // Delete
    await conn.query('DELETE FROM cart_items WHERE id = ?', [cartItemId]);

    conn.release();

    return res.json({ message: 'Removed from cart' });
  } catch (error) {
    console.error('Remove from cart error:', error);
    return res.status(500).json({ error: 'Failed to remove from cart' });
  }
});

/**
 * DELETE /api/cart/clear
 * Clear entire cart
 * Auth: Required
 */
router.delete('/clear', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conn = await pool.getConnection();
    await conn.query('DELETE FROM cart_items WHERE user_id = ?', [userId]);
    conn.release();

    return res.json({ message: 'Cart cleared' });
  } catch (error) {
    console.error('Clear cart error:', error);
    return res.status(500).json({ error: 'Failed to clear cart' });
  }
});

export default router;
