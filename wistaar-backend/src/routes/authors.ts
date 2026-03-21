import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authMiddleware, optionalAuth, authorMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ============================================
// PUBLIC AUTHOR PROFILE
// ============================================
router.get('/profile/:userId', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const conn = await pool.getConnection();

    // Get author info
    const [users]: any = await conn.query(
      'SELECT id, name, avatar, bio FROM users WHERE id = ? AND role IN ("author", "admin")',
      [userId]
    );

    if (users.length === 0) {
      conn.release();
      return res.status(404).json({ error: 'Author not found' });
    }

    const author = users[0];

    // Get published books
    const [books] = await conn.query(
      `SELECT id, title, description, cover_image, average_rating, total_ratings, published_at
       FROM book_submissions 
       WHERE author_id = ? AND status = "published"
       ORDER BY published_at DESC`,
      [userId]
    );

    // Get author stats
    const [stats]: any = await conn.query(
      `SELECT 
         COUNT(DISTINCT book_id) as books_published,
         SUM(total_ratings) as total_ratings_received,
         AVG(average_rating) as average_rating,
         COUNT(DISTINCT rp.user_id) as total_readers
       FROM book_submissions bs
       LEFT JOIN reading_progress rp ON bs.id = rp.book_id
       WHERE bs.author_id = ? AND bs.status = "published"`,
      [userId]
    );

    conn.release();

    return res.json({
      author,
      books,
      stats: stats[0] || { books_published: 0, total_ratings_received: 0, average_rating: 0, total_readers: 0 },
    });
  } catch (error) {
    console.error('Get author profile error:', error);
    return res.status(500).json({ error: 'Failed to fetch author profile' });
  }
});

// ============================================
// UPDATE AUTHOR PROFILE (own profile only)
// ============================================
router.put('/profile', authMiddleware, authorMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { bio, website, avatar, socialLinks } = req.body;

    const conn = await pool.getConnection();

    // Update user profile
    await conn.query(
      'UPDATE users SET bio = COALESCE(?, bio), avatar = COALESCE(?, avatar) WHERE id = ?',
      [bio, avatar, req.user?.userId]
    );

    // Update or create author profile
    const [existing]: any = await conn.query(
      'SELECT id FROM author_profiles WHERE user_id = ?',
      [req.user?.userId]
    );

    if (existing.length > 0) {
      await conn.query(
        'UPDATE author_profiles SET bio = COALESCE(?, bio), avatar = COALESCE(?, avatar), website = COALESCE(?, website), social_links = COALESCE(?, social_links), updated_at = NOW() WHERE user_id = ?',
        [bio, avatar, website, socialLinks ? JSON.stringify(socialLinks) : null, req.user?.userId]
      );
    } else {
      const profileId = uuidv4();
      await conn.query(
        'INSERT INTO author_profiles (id, user_id, bio, avatar, website, social_links, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
        [profileId, req.user?.userId, bio, avatar, website, socialLinks ? JSON.stringify(socialLinks) : null]
      );
    }

    conn.release();

    return res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ============================================
// GET AUTHOR'S BOOKS
// ============================================
router.get('/my-books', authMiddleware, authorMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { status = 'all', page = 1, limit = 10 } = req.query;
    const offset = ((Number(page) - 1) * Number(limit));

    const conn = await pool.getConnection();

    let query = 'SELECT * FROM book_submissions WHERE author_id = ?';
    const params: any[] = [req.user?.userId];

    if (status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const [books] = await conn.query(query, params);

    // Get count
    let countQuery = 'SELECT COUNT(*) as count FROM book_submissions WHERE author_id = ?';
    const countParams: any[] = [req.user?.userId];
    if (status !== 'all') {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    const [countResult] = await conn.query(countQuery, countParams);
    conn.release();

    return res.json({
      books,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: (countResult as any[])[0].count,
      },
    });
  } catch (error) {
    console.error('Get my books error:', error);
    return res.status(500).json({ error: 'Failed to fetch books' });
  }
});

// ============================================
// UPDATE BOOK (author only)
// ============================================
router.put('/:bookId', authMiddleware, authorMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { bookId } = req.params;
    const { title, description, fullDescription, genre, price, priceAmount, coverImage, coverColor } = req.body;

    const conn = await pool.getConnection();

    // Check ownership
    const [book]: any = await conn.query(
      'SELECT author_id FROM book_submissions WHERE id = ?',
      [bookId]
    );

    if (book.length === 0 || book[0].author_id !== req.user?.userId) {
      conn.release();
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Update book
    await conn.query(
      `UPDATE book_submissions SET 
       title = COALESCE(?, title),
       description = COALESCE(?, description),
       full_description = COALESCE(?, full_description),
       genre = COALESCE(?, genre),
       price = COALESCE(?, price),
       price_amount = COALESCE(?, price_amount),
       cover_image = COALESCE(?, cover_image),
       cover_color = COALESCE(?, cover_color),
       updated_at = NOW()
       WHERE id = ?`,
      [title, description, fullDescription, genre, price, priceAmount, coverImage, coverColor, bookId]
    );

    conn.release();

    return res.json({ message: 'Book updated successfully' });
  } catch (error) {
    console.error('Update book error:', error);
    return res.status(500).json({ error: 'Failed to update book' });
  }
});

export default router;
