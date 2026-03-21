import { Router, Response } from 'express';
import pool from '../config/database.js';
import { optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ============================================
// FULL-TEXT SEARCH ACROSS BOOKS
// ============================================
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { q, type = 'all', page = 1, limit = 20 } = req.query;

    if (!q || q.toString().trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const offset = ((Number(page) - 1) * Number(limit));
    const searchTerm = `+${q}*`;
    const results: any = {};

    const conn = await pool.getConnection();

    // Search books
    if (type === 'all' || type === 'books') {
      const [books] = await conn.query(
        `SELECT id, title, description, cover_image, author_id, average_rating, total_ratings FROM book_submissions
         WHERE MATCH(title, description) AGAINST(? IN BOOLEAN MODE)
         AND status = 'published'
         LIMIT ? OFFSET ?`,
        [searchTerm, Number(limit), offset]
      );

      const [bookCount] = await conn.query(
        `SELECT COUNT(*) as count FROM book_submissions
         WHERE MATCH(title, description) AGAINST(? IN BOOLEAN MODE)
         AND status = 'published'`,
        [searchTerm]
      );

      results.books = {
        data: books,
        count: (bookCount as any[])[0].count,
      };
    }

    // Search authors
    if (type === 'all' || type === 'authors') {
      const [authors] = await conn.query(
        `SELECT u.id, u.name, u.avatar, COUNT(DISTINCT bs.id) as book_count
         FROM users u
         LEFT JOIN book_submissions bs ON u.id = bs.author_id AND bs.status = 'published'
         WHERE u.role IN ('author', 'admin')
         AND (u.name LIKE ? OR u.bio LIKE ?)
         GROUP BY u.id
         LIMIT ? OFFSET ?`,
        [`%${q}%`, `%${q}%`, Number(limit), offset]
      );

      const [authorCount] = await conn.query(
        `SELECT COUNT(DISTINCT u.id) as count FROM users u
         WHERE u.role IN ('author', 'admin')
         AND (u.name LIKE ? OR u.bio LIKE ?)`,
        [`%${q}%`, `%${q}%`]
      );

      results.authors = {
        data: authors,
        count: (authorCount as any[])[0].count,
      };
    }

    // Search chapters (content search)
    if (type === 'all' || type === 'chapters') {
      const [chapters] = await conn.query(
        `SELECT bc.id, bc.title, bc.chapter_number, bs.id as book_id, bs.title as book_title
         FROM book_chapters bc
         JOIN book_submissions bs ON bc.book_id = bs.id
         WHERE MATCH(bc.content) AGAINST(? IN BOOLEAN MODE)
         AND bs.status = 'published'
         LIMIT ? OFFSET ?`,
        [searchTerm, Number(limit), offset]
      );

      const [chapterCount] = await conn.query(
        `SELECT COUNT(*) as count FROM book_chapters bc
         JOIN book_submissions bs ON bc.book_id = bs.id
         WHERE MATCH(bc.content) AGAINST(? IN BOOLEAN MODE)
         AND bs.status = 'published'`,
        [searchTerm]
      );

      results.chapters = {
        data: chapters,
        count: (chapterCount as any[])[0].count,
      };
    }

    conn.release();

    return res.json({
      results,
      query: q,
      pagination: {
        page: Number(page),
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'Search failed' });
  }
});

// ============================================
// SEARCH BY CATEGORY/GENRE
// ============================================
router.get('/genre/:genre', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { genre } = req.params;
    const { page = 1, limit = 20, sort = 'newest' } = req.query;
    const offset = ((Number(page) - 1) * Number(limit));

    const conn = await pool.getConnection();

    let query = `SELECT id, title, description, cover_image, author_id, average_rating, total_ratings, published_at
                 FROM book_submissions
                 WHERE genre = ? AND status = 'published'`;

    // Sort options
    switch (sort) {
      case 'popular':
        query += ' ORDER BY total_readers DESC';
        break;
      case 'top-rated':
        query += ' ORDER BY average_rating DESC';
        break;
      default:
        query += ' ORDER BY published_at DESC';
    }

    query += ' LIMIT ? OFFSET ?';

    const [books] = await conn.query(query, [genre, Number(limit), offset]);

    // Get count
    const [countResult] = await conn.query(
      'SELECT COUNT(*) as count FROM book_submissions WHERE genre = ? AND status = "published"',
      [genre]
    );

    conn.release();

    return res.json({
      books,
      genre,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: (countResult as any[])[0].count,
      },
    });
  } catch (error) {
    console.error('Search genre error:', error);
    return res.status(500).json({ error: 'Failed to search genre' });
  }
});

// ============================================
// ADVANCED FILTER & SORT
// ============================================
router.get('/advanced', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      genre,
      minRating = 0,
      maxRating = 5,
      price,
      language,
      sortBy = 'popularity',
      page = 1,
      limit = 20,
    } = req.query;

    const offset = ((Number(page) - 1) * Number(limit));

    let query = `SELECT id, title, description, cover_image, author_id, average_rating, total_ratings, price, language, published_at
                 FROM book_submissions
                 WHERE status = 'published'`;
    const params: any[] = [];

    if (genre) {
      query += ' AND genre = ?';
      params.push(genre);
    }

    query += ' AND average_rating BETWEEN ? AND ?';
    params.push(Number(minRating), Number(maxRating));

    if (price) {
      query += ' AND price = ?';
      params.push(price);
    }

    if (language) {
      query += ' AND language = ?';
      params.push(language);
    }

    // Sort
    switch (sortBy) {
      case 'highest-rated':
        query += ' ORDER BY average_rating DESC';
        break;
      case 'most-readers':
        query += ' ORDER BY total_readers DESC';
        break;
      case 'newest':
        query += ' ORDER BY published_at DESC';
        break;
      default:
        query += ' ORDER BY total_readers DESC';
    }

    query += ' LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const conn = await pool.getConnection();
    const [books] = await conn.query(query, params);

    // Get count for same filters
    let countQuery = 'SELECT COUNT(*) as count FROM book_submissions WHERE status = "published"';
    const countParams: any[] = [];

    if (genre) {
      countQuery += ' AND genre = ?';
      countParams.push(genre);
    }
    countQuery += ' AND average_rating BETWEEN ? AND ?';
    countParams.push(Number(minRating), Number(maxRating));

    if (price) {
      countQuery += ' AND price = ?';
      countParams.push(price);
    }
    if (language) {
      countQuery += ' AND language = ?';
      countParams.push(language);
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
      appliedFilters: { genre, minRating, maxRating, price, language },
    });
  } catch (error) {
    console.error('Advanced search error:', error);
    return res.status(500).json({ error: 'Advanced search failed' });
  }
});

export default router;
