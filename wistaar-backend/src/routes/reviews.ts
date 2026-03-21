import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authMiddleware, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { updateBookRating } from './books.js';

const router = Router();

// ============================================
// GET BOOK REVIEWS
// ============================================
router.get('/book/:bookId', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { bookId } = req.params;
    const { page = 1, limit = 10, sort = 'recent' } = req.query;

    const offset = ((Number(page) - 1) * Number(limit));

    let query = `SELECT br.*, u.name, u.avatar FROM book_reviews br
                 JOIN users u ON br.user_id = u.id
                 WHERE br.book_id = ?`;

    // Sort options
    switch (sort) {
      case 'helpful':
        query += ' ORDER BY helpful_count DESC';
        break;
      case 'highest-rated':
        query += ' ORDER BY rating DESC';
        break;
      case 'lowest-rated':
        query += ' ORDER BY rating ASC';
        break;
      default: // recent
        query += ' ORDER BY created_at DESC';
    }

    query += ' LIMIT ? OFFSET ?';

    const conn = await pool.getConnection();
    const [reviews] = await conn.query(query, [bookId, Number(limit), offset]);

    // Get total count
    const [countResult] = await conn.query(
      'SELECT COUNT(*) as count FROM book_reviews WHERE book_id = ?',
      [bookId]
    );

    conn.release();

    return res.json({
      reviews,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: (countResult as any[])[0].count,
      },
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    return res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// ============================================
// ADD REVIEW & RATING
// ============================================
router.post('/book/:bookId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { bookId } = req.params;
    const { rating, review } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const conn = await pool.getConnection();

    // Check if already reviewed
    const [existing] = await conn.query(
      'SELECT id FROM book_reviews WHERE book_id = ? AND user_id = ?',
      [bookId, req.user?.userId]
    );

    if ((existing as any[]).length > 0) {
      conn.release();
      return res.status(409).json({ error: 'You already reviewed this book' });
    }

    // Check if user purchased the book
    const [purchase] = await conn.query(
      'SELECT id FROM book_purchases WHERE book_id = ? AND user_id = ? AND payment_status = "completed"',
      [bookId, req.user?.userId]
    );

    if ((purchase as any[]).length === 0) {
      conn.release();
      return res.status(403).json({ error: 'Only purchasers can review' });
    }

    const reviewId = uuidv4();
    await conn.query(
      'INSERT INTO book_reviews (id, book_id, user_id, rating, review, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [reviewId, bookId, req.user?.userId, rating, review || null]
    );

    conn.release();

    // Update book rating
    await updateBookRating(bookId);

    return res.status(201).json({
      message: 'Review added successfully',
      reviewId,
    });
  } catch (error) {
    console.error('Add review error:', error);
    return res.status(500).json({ error: 'Failed to add review' });
  }
});

// ============================================
// UPDATE REVIEW
// ============================================
router.put('/:reviewId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { rating, review } = req.body;

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const conn = await pool.getConnection();

    // Check ownership
    const [reviews]: any = await conn.query(
      'SELECT book_id FROM book_reviews WHERE id = ? AND user_id = ?',
      [reviewId, req.user?.userId]
    );

    if (reviews.length === 0) {
      conn.release();
      return res.status(404).json({ error: 'Review not found' });
    }

    const bookId = reviews[0].book_id;

    // Update review
    await conn.query(
      'UPDATE book_reviews SET rating = COALESCE(?, rating), review = COALESCE(?, review), updated_at = NOW() WHERE id = ?',
      [rating, review, reviewId]
    );

    conn.release();

    // Update book rating
    await updateBookRating(bookId);

    return res.json({ message: 'Review updated successfully' });
  } catch (error) {
    console.error('Update review error:', error);
    return res.status(500).json({ error: 'Failed to update review' });
  }
});

// ============================================
// DELETE REVIEW
// ============================================
router.delete('/:reviewId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { reviewId } = req.params;

    const conn = await pool.getConnection();

    // Check ownership and get book_id
    const [reviews]: any = await conn.query(
      'SELECT book_id FROM book_reviews WHERE id = ? AND user_id = ?',
      [reviewId, req.user?.userId]
    );

    if (reviews.length === 0) {
      conn.release();
      return res.status(404).json({ error: 'Review not found' });
    }

    const bookId = reviews[0].book_id;

    // Delete review
    await conn.query('DELETE FROM book_reviews WHERE id = ?', [reviewId]);

    conn.release();

    // Update book rating
    await updateBookRating(bookId);

    return res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    return res.status(500).json({ error: 'Failed to delete review' });
  }
});

// ============================================
// MARK REVIEW HELPFUL
// ============================================
router.post('/:reviewId/helpful', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { reviewId } = req.params;

    const conn = await pool.getConnection();

    // Increment helpful count
    await conn.query(
      'UPDATE book_reviews SET helpful_count = helpful_count + 1 WHERE id = ?',
      [reviewId]
    );

    conn.release();

    return res.json({ message: 'Marked as helpful' });
  } catch (error) {
    console.error('Mark helpful error:', error);
    return res.status(500).json({ error: 'Failed to mark as helpful' });
  }
});

export default router;
