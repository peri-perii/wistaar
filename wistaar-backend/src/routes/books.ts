import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authMiddleware, optionalAuth, AuthRequest, authorMiddleware } from '../middleware/auth.js';

const router = Router();

// ============================================
// GET ALL BOOKS (with search, filtering, pagination)
// ============================================
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      genre,
      price,
      sort = 'newest',
      search,
    } = req.query;

    const offset = ((Number(page) - 1) * Number(limit));
    let query = 'SELECT * FROM book_submissions WHERE status = "published"';
    const params: any[] = [];

    // Genre filter
    if (genre) {
      query += ' AND genre = ?';
      params.push(genre);
    }

    // Price filter
    if (price) {
      query += ' AND price = ?';
      params.push(price);
    }

    // Full-text search
    if (search) {
      query += ' AND MATCH(title, description) AGAINST(? IN BOOLEAN MODE)';
      params.push(`+${search}*`);
    }

    // Sorting
    switch (sort) {
      case 'popular':
        query += ' ORDER BY total_readers DESC';
        break;
      case 'top-rated':
        query += ' ORDER BY average_rating DESC';
        break;
      case 'trendy':
        query += ' ORDER BY published_at DESC LIMIT 10';
        break;
      default: // newest
        query += ' ORDER BY published_at DESC';
    }

    query += ' LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const conn = await pool.getConnection();
    const [books] = await conn.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM book_submissions WHERE status = "published"';
    const countParams: any[] = [];
    if (genre) {
      countQuery += ' AND genre = ?';
      countParams.push(genre);
    }
    if (price) {
      countQuery += ' AND price = ?';
      countParams.push(price);
    }
    if (search) {
      countQuery += ' AND MATCH(title, description) AGAINST(? IN BOOLEAN MODE)';
      countParams.push(`+${search}*`);
    }

    const [countResult] = await conn.query(countQuery, countParams);
    conn.release();

    const total = (countResult as any[])[0].count;

    return res.json({
      books,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get books error:', error);
    return res.status(500).json({ error: 'Failed to fetch books' });
  }
});

// ============================================
// GET SINGLE BOOK
// ============================================
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const conn = await pool.getConnection();
    const [books] = await conn.query(
      `SELECT bs.*, u.name as author_name, u.avatar as author_avatar
       FROM book_submissions bs
       JOIN users u ON bs.author_id = u.id
       WHERE bs.id = ? AND bs.status = "published"`,
      [id]
    );

    if ((books as any[]).length === 0) {
      conn.release();
      return res.status(404).json({ error: 'Book not found' });
    }

    const book = (books as any)[0];

    // Get chapters
    const [chapters] = await conn.query(
      'SELECT id, chapter_number, title, reading_time, word_count FROM book_chapters WHERE book_id = ? ORDER BY chapter_number',
      [id]
    );

    // Get reviews count
    const [reviewCount] = await conn.query(
      'SELECT COUNT(*) as count FROM book_reviews WHERE book_id = ?',
      [id]
    );

    // Check if user has purchased (if logged in)
    let isPurchased = false;
    if (req.user) {
      const [purchase] = await conn.query(
        'SELECT id FROM book_purchases WHERE book_id = ? AND user_id = ? AND payment_status = "completed"',
        [id, req.user.userId]
      );
      isPurchased = (purchase as any[]).length > 0;
    }

    conn.release();

    return res.json({
      ...book,
      chapters,
      totalReviews: (reviewCount as any[])[0].count,
      isPurchased,
    });
  } catch (error) {
    console.error('Get book error:', error);
    return res.status(500).json({ error: 'Failed to fetch book' });
  }
});

// ============================================
// GET BOOK CHAPTERS
// ============================================
router.get('/:id/chapters', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const conn = await pool.getConnection();
    
    // Check if book exists
    const [book] = await conn.query('SELECT id, price FROM book_submissions WHERE id = ? AND status = "published"', [id]);
    
    if ((book as any[]).length === 0) {
      conn.release();
      return res.status(404).json({ error: 'Book not found' });
    }

    // If premium, check if user purchased
    if ((book as any)[0].price === 'premium' && req.user) {
      const [purchase] = await conn.query(
        'SELECT id FROM book_purchases WHERE book_id = ? AND user_id = ? AND payment_status = "completed"',
        [id, req.user.userId]
      );
      if ((purchase as any[]).length === 0) {
        conn.release();
        return res.status(403).json({ error: 'Please purchase this book first' });
      }
    }

    const [chapters] = await conn.query(
      'SELECT * FROM book_chapters WHERE book_id = ? ORDER BY chapter_number',
      [id]
    );

    conn.release();
    return res.json(chapters);
  } catch (error) {
    console.error('Get chapters error:', error);
    return res.status(500).json({ error: 'Failed to fetch chapters' });
  }
});

// ============================================
// GET CHAPTER CONTENT
// ============================================
router.get('/:id/chapters/:chapterNumber', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id, chapterNumber } = req.params;

    const conn = await pool.getConnection();
    
    // Check authorization
    const [book] = await conn.query('SELECT price FROM book_submissions WHERE id = ? AND status = "published"', [id]);
    
    if ((book as any[]).length === 0) {
      conn.release();
      return res.status(404).json({ error: 'Book not found' });
    }

    if ((book as any)[0].price === 'premium' && req.user) {
      const [purchase] = await conn.query(
        'SELECT id FROM book_purchases WHERE book_id = ? AND user_id = ? AND payment_status = "completed"',
        [id, req.user.userId]
      );
      if ((purchase as any[]).length === 0) {
        conn.release();
        return res.status(403).json({ error: 'Please purchase this book first' });
      }
    }

    const [chapters] = await conn.query(
      'SELECT * FROM book_chapters WHERE book_id = ? AND chapter_number = ?',
      [id, chapterNumber]
    );

    conn.release();

    if ((chapters as any[]).length === 0) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    return res.json((chapters as any)[0]);
  } catch (error) {
    console.error('Get chapter error:', error);
    return res.status(500).json({ error: 'Failed to fetch chapter' });
  }
});

// ============================================
// SUBMIT BOOK (for authors)
// ============================================
router.post('/', authMiddleware, authorMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      description,
      fullDescription,
      genre,
      price,
      priceAmount,
      coverImage,
      coverColor,
      language,
    } = req.body;

    if (!title || !description || !genre) {
      return res.status(400).json({ error: 'Title, description, and genre required' });
    }

    const bookId = uuidv4();
    const conn = await pool.getConnection();

    await conn.query(
      `INSERT INTO book_submissions 
       (id, author_id, title, description, full_description, genre, price, price_amount, cover_image, cover_color, language, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', NOW())`,
      [
        bookId,
        req.user?.userId,
        title,
        description,
        fullDescription,
        genre,
        price || 'free',
        priceAmount || 0,
        coverImage,
        coverColor,
        language || 'English',
      ]
    );

    conn.release();

    return res.status(201).json({
      message: 'Book submitted for review',
      bookId,
    });
  } catch (error) {
    console.error('Submit book error:', error);
    return res.status(500).json({ error: 'Failed to submit book' });
  }
});

// ============================================
// UPDATE BOOK RATING (called after review is added)
// ============================================
async function updateBookRating(bookId: string) {
  try {
    const conn = await pool.getConnection();

    // Calculate average rating
    const [result]: any = await conn.query(
      'SELECT AVG(rating) as averageRating, COUNT(*) as totalRatings FROM book_reviews WHERE book_id = ?',
      [bookId]
    );

    const averageRating = result[0].averageRating || 0;
    const totalRatings = result[0].totalRatings || 0;

    // Update book submission
    await conn.query(
      'UPDATE book_submissions SET average_rating = ?, total_ratings = ? WHERE id = ?',
      [averageRating.toFixed(2), totalRatings, bookId]
    );

    conn.release();
  } catch (error) {
    console.error('Error updating book rating:', error);
  }
}

// Export for use in reviews route
export { router as default, updateBookRating };
