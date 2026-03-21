import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ============================================
// PURCHASES & PAYMENTS ENDPOINTS
// ============================================

/**
 * GET /api/purchases
 * Get user's purchase history
 * Auth: Required
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conn = await pool.getConnection();

    // Get user's purchases
    const [purchases]: any = await conn.query(`
      SELECT 
        p.id,
        p.book_id,
        p.amount,
        p.payment_status,
        p.transaction_id,
        p.purchased_at,
        b.title,
        b.author,
        b.cover_image_url,
        b.genre
      FROM book_purchases p
      JOIN book_submissions b ON p.book_id = b.id
      WHERE p.user_id = ?
      ORDER BY p.purchased_at DESC
    `, [userId]);

    conn.release();

    return res.json({
      purchases: purchases || [],
      count: (purchases as any[])?.length || 0,
      totalSpent: ((purchases as any[]) || [])
        .filter(p => p.payment_status === 'completed')
        .reduce((sum, p) => sum + (p.amount || 0), 0),
    });
  } catch (error) {
    console.error('Fetch purchases error:', error);
    return res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

/**
 * POST /api/purchases/initiate
 * Initiate a purchase (create purchase record, return payment gateway data if needed)
 * Auth: Required
 * Body: { bookId, couponCode? }
 */
router.post('/initiate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { bookId, couponCode } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!bookId) {
      return res.status(400).json({ error: 'Book ID required' });
    }

    const conn = await pool.getConnection();

    // Check if already purchased
    const [existing]: any = await conn.query(
      'SELECT id FROM book_purchases WHERE user_id = ? AND book_id = ? AND payment_status = "completed"',
      [userId, bookId]
    );

    if (existing.length > 0) {
      conn.release();
      return res.status(409).json({ error: 'Book already purchased' });
    }

    // Get book price
    const [books]: any = await conn.query(
      'SELECT title, price FROM book_submissions WHERE id = ? AND status = "approved"',
      [bookId]
    );

    if (books.length === 0) {
      conn.release();
      return res.status(404).json({ error: 'Book not found' });
    }

    let amount = books[0].price;

    // Apply coupon if provided
    if (couponCode) {
      const [coupons]: any = await conn.query(`
        SELECT discount_type, discount_value, min_purchase 
        FROM coupon_codes 
        WHERE code = ? AND is_active = TRUE AND expires_at > NOW() AND uses_count < max_uses
      `, [couponCode]);

      if (coupons.length > 0) {
        const coupon = coupons[0];
        if (amount >= coupon.min_purchase) {
          if (coupon.discount_type === 'percentage') {
            amount = amount * (1 - coupon.discount_value / 100);
          } else if (coupon.discount_type === 'fixed') {
            amount = Math.max(0, amount - coupon.discount_value);
          }
        }
      } else {
        conn.release();
        return res.status(400).json({ error: 'Invalid or expired coupon' });
      }
    }

    // Create purchase record (pending)
    const purchaseId = uuidv4();
    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await conn.query(`
      INSERT INTO book_purchases (id, user_id, book_id, amount, payment_status, transaction_id, purchased_at)
      VALUES (?, ?, ?, ?, 'pending', ?, NOW())
    `, [purchaseId, userId, bookId, amount, transactionId]);

    // Increment coupon usage if applied
    if (couponCode) {
      await conn.query(
        'UPDATE coupon_codes SET uses_count = uses_count + 1 WHERE code = ?',
        [couponCode]
      );
    }

    conn.release();

    return res.status(201).json({
      purchaseId,
      transactionId,
      bookId,
      amount,
      currency: 'INR',
      bookTitle: books[0].title,
      // Return this to frontend to send to payment gateway
      paymentData: {
        txnId: transactionId,
        amount,
        bookTitle: books[0].title,
        userEmail: req.user?.email,
      },
    });
  } catch (error) {
    console.error('Initiate purchase error:', error);
    return res.status(500).json({ error: 'Failed to initiate purchase' });
  }
});

/**
 * POST /api/purchases/verify
 * Verify payment and mark purchase as completed
 * Auth: Required
 * Body: { transactionId, paymentGatewayResponse }
 */
router.post('/verify', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { transactionId, paymentGatewayResponse } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!transactionId) {
      return res.status(400).json({ error: 'Transaction ID required' });
    }

    const conn = await pool.getConnection();

    // Get pending purchase
    const [purchases]: any = await conn.query(`
      SELECT id, user_id, book_id, amount 
      FROM book_purchases 
      WHERE transaction_id = ? AND payment_status = 'pending'
    `, [transactionId]);

    if (purchases.length === 0) {
      conn.release();
      return res.status(404).json({ error: 'Purchase not found' });
    }

    const purchase = purchases[0];

    // Verify ownership
    if (purchase.user_id !== userId) {
      conn.release();
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Mark as completed
    await conn.query(
      'UPDATE book_purchases SET payment_status = "completed" WHERE id = ?',
      [purchase.id]
    );

    // Create earning record for author
    const [books]: any = await conn.query(
      'SELECT author_id FROM book_submissions WHERE id = ?',
      [purchase.book_id]
    );

    if (books.length > 0) {
      const earningId = uuidv4();
      await conn.query(`
        INSERT INTO author_earnings (id, author_id, book_id, transaction_id, amount, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `, [earningId, books[0].author_id, purchase.book_id, transactionId, purchase.amount]);
    }

    // Create notification for user
    const notificationId = uuidv4();
    const [bookDetails]: any = await conn.query(
      'SELECT title FROM book_submissions WHERE id = ?',
      [purchase.book_id]
    );

    await conn.query(`
      INSERT INTO notifications (id, user_id, title, message, type, created_at)
      VALUES (?, ?, ?, ?, 'purchase_success', NOW())
    `, [
      notificationId,
      userId,
      `📖 "${bookDetails[0]?.title}" purchased!`,
      `Your book is now in your library. Happy reading!`,
    ]);

    conn.release();

    return res.json({
      message: 'Purchase completed',
      purchaseId: purchase.id,
      bookId: purchase.book_id,
      amount: purchase.amount,
    });
  } catch (error) {
    console.error('Verify purchase error:', error);
    return res.status(500).json({ error: 'Failed to verify purchase' });
  }
});

/**
 * GET /api/purchases/check/:bookId
 * Check if user has purchased a book
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

    const [purchases]: any = await conn.query(
      'SELECT id FROM book_purchases WHERE user_id = ? AND book_id = ? AND payment_status = "completed"',
      [userId, bookId]
    );

    conn.release();

    return res.json({
      hasPurchased: purchases.length > 0,
    });
  } catch (error) {
    console.error('Check purchase error:', error);
    return res.status(500).json({ error: 'Failed to check purchase' });
  }
});

export default router;
