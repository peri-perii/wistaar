import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ============================================
// UPDATE READING PROGRESS
// ============================================
router.post('/reading-progress', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { bookId, currentChapter, scrollPosition, timeSpentMinutes } = req.body;

    if (!bookId || currentChapter === undefined) {
      return res.status(400).json({ error: 'Book ID and chapter required' });
    }

    const conn = await pool.getConnection();

    // Check if record exists
    const [existing]: any = await conn.query(
      'SELECT id FROM reading_progress WHERE user_id = ? AND book_id = ?',
      [req.user?.userId, bookId]
    );

    if (existing.length > 0) {
      // Update existing
      await conn.query(
        `UPDATE reading_progress 
         SET current_chapter = ?, scroll_position = ?, time_spent_minutes = time_spent_minutes + ?, last_read_at = NOW(), updated_at = NOW()
         WHERE user_id = ? AND book_id = ?`,
        [currentChapter, scrollPosition || 0, timeSpentMinutes || 0, req.user?.userId, bookId]
      );
    } else {
      // Create new
      const progressId = uuidv4();
      await conn.query(
        `INSERT INTO reading_progress (id, user_id, book_id, current_chapter, scroll_position, time_spent_minutes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [progressId, req.user?.userId, bookId, currentChapter, scrollPosition || 0, timeSpentMinutes || 0]
      );
    }

    conn.release();

    return res.json({ message: 'Reading progress updated' });
  } catch (error) {
    console.error('Update reading progress error:', error);
    return res.status(500).json({ error: 'Failed to update progress' });
  }
});

// ============================================
// GET READING PROGRESS FOR USER
// ============================================
router.get('/reading-progress/:bookId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { bookId } = req.params;

    const conn = await pool.getConnection();
    const [progress] = await conn.query(
      'SELECT * FROM reading_progress WHERE user_id = ? AND book_id = ?',
      [req.user?.userId, bookId]
    );
    conn.release();

    if ((progress as any[]).length === 0) {
      return res.status(404).json({ error: 'No reading progress found' });
    }

    return res.json((progress as any)[0]);
  } catch (error) {
    console.error('Get reading progress error:', error);
    return res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// ============================================
// GET USER READING HISTORY (all books they've read)
// ============================================
router.get('/reading-history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const conn = await pool.getConnection();
    const [history] = await conn.query(
      `SELECT rp.*, bs.title, bs.cover_image, bs.author_id, u.name as author_name, br.average_rating
       FROM reading_progress rp
       JOIN book_submissions bs ON rp.book_id = bs.id
       JOIN users u ON bs.author_id = u.id
       WHERE rp.user_id = ?
       ORDER BY rp.last_read_at DESC`,
      [req.user?.userId]
    );
    conn.release();

    return res.json(history);
  } catch (error) {
    console.error('Get reading history error:', error);
    return res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// ============================================
// GET BOOK ANALYTICS (for authors)
// ============================================
router.get('/book/:bookId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { bookId } = req.params;

    const conn = await pool.getConnection();

    // Verify ownership
    const [book]: any = await conn.query(
      'SELECT author_id FROM book_submissions WHERE id = ?',
      [bookId]
    );

    if (book.length === 0 || book[0].author_id !== req.user?.userId) {
      conn.release();
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get daily analytics for last 30 days
    const [analytics] = await conn.query(
      `SELECT * FROM reading_analytics 
       WHERE book_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       ORDER BY date DESC`,
      [bookId]
    );

    // Get total stats
    const [totals]: any = await conn.query(
      `SELECT 
         COUNT(DISTINCT user_id) as total_readers,
         SUM(time_spent_minutes) as total_time_minutes,
         AVG(time_spent_minutes) as avg_time_per_reader
       FROM reading_progress WHERE book_id = ?`,
      [bookId]
    );

    // Get most read chapters
    const [chapters]: any = await conn.query(
      `SELECT bc.chapter_number, bc.title, COUNT(*) as read_count
       FROM book_chapters bc
       LEFT JOIN reading_progress rp ON rp.book_id = ? AND rp.current_chapter >= bc.chapter_number
       GROUP BY bc.id, bc.chapter_number, bc.title
       ORDER BY read_count DESC
       LIMIT 5`,
      [bookId]
    );

    conn.release();

    return res.json({
      dailyAnalytics: analytics,
      totalStats: totals[0],
      topChapters: chapters,
    });
  } catch (error) {
    console.error('Get book analytics error:', error);
    return res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ============================================
// GET AUTHOR'S TOTAL ANALYTICS
// ============================================
router.get('/author/summary', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const conn = await pool.getConnection();

    // Get summary stats
    const [stats]: any = await conn.query(
      `SELECT 
         COUNT(DISTINCT bs.id) as total_books,
         SUM(bs.total_readers) as total_readers,
         AVG(bs.average_rating) as avg_rating,
         SUM(rp.time_spent_minutes) as total_time_spent
       FROM book_submissions bs
       LEFT JOIN reading_progress rp ON bs.id = rp.book_id
       WHERE bs.author_id = ?`,
      [req.user?.userId]
    );

    // Get recent analytics for all books
    const [recentActivity] = await conn.query(
      `SELECT bs.id, bs.title, ra.total_readers, ra.total_time_minutes, ra.date
       FROM reading_analytics ra
       JOIN book_submissions bs ON ra.book_id = bs.id
       WHERE bs.author_id = ? AND ra.date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       ORDER BY ra.date DESC`,
      [req.user?.userId]
    );

    conn.release();

    return res.json({
      summary: stats[0],
      recentActivity,
    });
  } catch (error) {
    console.error('Get author analytics error:', error);
    return res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ============================================
// GENERATE DAILY ANALYTICS (background job / admin only)
// ============================================
router.post('/generate-daily', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // This should be called once per day, ideally via cron job
    const conn = await pool.getConnection();

    // Get all books and aggregate today's reading data
    const [books]: any = await conn.query('SELECT DISTINCT book_id FROM reading_progress');

    for (const { book_id } of books) {
      const [result]: any = await conn.query(
        `SELECT 
           COUNT(DISTINCT user_id) as total_readers,
           SUM(time_spent_minutes) as total_time_minutes,
           AVG(time_spent_minutes) as average_time_per_chapter
         FROM reading_progress 
         WHERE book_id = ? AND DATE(last_read_at) = CURDATE()`,
        [book_id]
      );

      const analyticsId = uuidv4();
      await conn.query(
        `INSERT INTO reading_analytics (id, book_id, date, total_readers, total_time_minutes, average_time_per_chapter, created_at)
         VALUES (?, ?, CURDATE(), ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE 
         total_readers = ?, total_time_minutes = ?, average_time_per_chapter = ?, updated_at = NOW()`,
        [
          analyticsId,
          book_id,
          result[0].total_readers || 0,
          result[0].total_time_minutes || 0,
          result[0].average_time_per_chapter || 0,
          result[0].total_readers || 0,
          result[0].total_time_minutes || 0,
          result[0].average_time_per_chapter || 0,
        ]
      );
    }

    conn.release();

    return res.json({ message: 'Daily analytics generated' });
  } catch (error) {
    console.error('Generate analytics error:', error);
    return res.status(500).json({ error: 'Failed to generate analytics' });
  }
});

export default router;
