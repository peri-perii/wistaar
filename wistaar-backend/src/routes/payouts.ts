import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authMiddleware, authorMiddleware, AuthRequest, adminMiddleware } from '../middleware/auth.js';

const router = Router();

// ============================================
// GET AUTHOR EARNINGS
// ============================================
router.get('/earnings', authMiddleware, authorMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, month, year } = req.query;
    const offset = ((Number(page) - 1) * Number(limit));

    const conn = await pool.getConnection();

    let query = 'SELECT * FROM author_earnings WHERE author_id = ?';
    const params: any[] = [req.user?.userId];

    if (month && year) {
      query += ` AND MONTH(created_at) = ? AND YEAR(created_at) = ?`;
      params.push(Number(month), Number(year));
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const [earnings] = await conn.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM author_earnings WHERE author_id = ?';
    const countParams: any[] = [req.user?.userId];
    if (month && year) {
      countQuery += ` AND MONTH(created_at) = ? AND YEAR(created_at) = ?`;
      countParams.push(Number(month), Number(year));
    }

    const [countResult] = await conn.query(countQuery, countParams);

    // Get current balance
    const [balance]: any = await conn.query(
      'SELECT COALESCE(SUM(amount), 0) as total_balance FROM author_earnings WHERE author_id = ?',
      [req.user?.userId]
    );

    conn.release();

    return res.json({
      earnings,
      balance: balance[0].total_balance,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: (countResult as any[])[0].count,
      },
    });
  } catch (error) {
    console.error('Get earnings error:', error);
    return res.status(500).json({ error: 'Failed to fetch earnings' });
  }
});

// ============================================
// GET EARNINGS SUMMARY
// ============================================
router.get('/earnings-summary', authMiddleware, authorMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const conn = await pool.getConnection();

    // Total earnings
    const [totalResult]: any = await conn.query(
      `SELECT COALESCE(SUM(amount), 0) as total_earned FROM author_earnings 
       WHERE author_id = ? AND transaction_type IN ('sale', 'withdrawal')`,
      [req.user?.userId]
    );

    // Earnings this month
    const [monthResult]: any = await conn.query(
      `SELECT COALESCE(SUM(amount), 0) as month_earned FROM author_earnings 
       WHERE author_id = ? AND transaction_type = 'sale'
       AND MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())`,
      [req.user?.userId]
    );

    // Pending balance
    const [pendingResult]: any = await conn.query(
      `SELECT COALESCE(SUM(amount), 0) as pending_balance FROM author_earnings 
       WHERE author_id = ? AND transaction_type IN ('sale')`,
      [req.user?.userId]
    );

    // Get top performing books
    const [topBooks]: any = await conn.query(
      `SELECT bs.id, bs.title, SUM(ae.amount) as total_earned, COUNT(DISTINCT ae.id) as sales_count
       FROM author_earnings ae
       JOIN book_submissions bs ON ae.book_id = bs.id
       WHERE ae.author_id = ? AND ae.transaction_type = 'sale'
       GROUP BY bs.id, bs.title
       ORDER BY total_earned DESC
       LIMIT 5`,
      [req.user?.userId]
    );

    conn.release();

    return res.json({
      totalEarned: totalResult[0].total_earned,
      monthEarned: monthResult[0].month_earned,
      pendingBalance: pendingResult[0].pending_balance,
      topBooks,
    });
  } catch (error) {
    console.error('Get earnings summary error:', error);
    return res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// ============================================
// REQUEST PAYOUT
// ============================================
router.post('/request-payout', authMiddleware, authorMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { amount, bankAccount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (!bankAccount) {
      return res.status(400).json({ error: 'Bank account details required' });
    }

    const conn = await pool.getConnection();

    // Check available balance
    const [balance]: any = await conn.query(
      `SELECT COALESCE(SUM(amount), 0) as available FROM author_earnings 
       WHERE author_id = ? AND transaction_type = 'sale'`,
      [req.user?.userId]
    );

    if (balance[0].available < amount) {
      conn.release();
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Create payout request
    const payoutId = uuidv4();
    await conn.query(
      `INSERT INTO payout_requests (id, author_id, amount, bank_account, status, requested_at, created_at)
       VALUES (?, ?, ?, ?, 'pending', NOW(), NOW())`,
      [payoutId, req.user?.userId, amount, JSON.stringify(bankAccount)]
    );

    // Create earning record
    const earningId = uuidv4();
    const newBalance = balance[0].available - amount;
    await conn.query(
      `INSERT INTO author_earnings (id, author_id, amount, transaction_type, reference_id, description, balance, created_at)
       VALUES (?, ?, ?, 'withdrawal', ?, ?, ?, NOW())`,
      [earningId, req.user?.userId, -amount, payoutId, 'Payout request', newBalance]
    );

    conn.release();

    return res.status(201).json({
      message: 'Payout request submitted',
      payoutId,
    });
  } catch (error) {
    console.error('Request payout error:', error);
    return res.status(500).json({ error: 'Failed to request payout' });
  }
});

// ============================================
// GET PAYOUT REQUESTS
// ============================================
router.get('/payout-requests', authMiddleware, authorMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const conn = await pool.getConnection();
    const [requests] = await conn.query(
      'SELECT id, amount, status, requested_at, processed_at FROM payout_requests WHERE author_id = ? ORDER BY requested_at DESC',
      [req.user?.userId]
    );
    conn.release();

    return res.json(requests);
  } catch (error) {
    console.error('Get payout requests error:', error);
    return res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// ============================================
// ADMIN: GET ALL PAYOUT REQUESTS
// ============================================
router.get('/admin/pending-payouts', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const conn = await pool.getConnection();
    const [requests] = await conn.query(
      `SELECT pr.*, u.email, u.name FROM payout_requests pr
       JOIN users u ON pr.author_id = u.id
       WHERE pr.status = 'pending'
       ORDER BY pr.requested_at ASC`
    );
    conn.release();

    return res.json(requests);
  } catch (error) {
    console.error('Get pending payouts error:', error);
    return res.status(500).json({ error: 'Failed to fetch payouts' });
  }
});

// ============================================
// ADMIN: APPROVE PAYOUT
// ============================================
router.post('/admin/approve-payout/:payoutId', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { payoutId } = req.params;
    const { transactionId } = req.body;

    const conn = await pool.getConnection();

    // Update payout request
    await conn.query(
      'UPDATE payout_requests SET status = ?, transaction_id = ?, processed_at = NOW(), updated_at = NOW() WHERE id = ?',
      ['completed', transactionId || null, payoutId]
    );

    conn.release();

    return res.json({ message: 'Payout approved' });
  } catch (error) {
    console.error('Approve payout error:', error);
    return res.status(500).json({ error: 'Failed to approve payout' });
  }
});

// ============================================
// ADMIN: REJECT PAYOUT
// ============================================
router.post('/admin/reject-payout/:payoutId', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { payoutId } = req.params;
    const { reason } = req.body;

    const conn = await pool.getConnection();

    // Get payout details
    const [payout]: any = await conn.query('SELECT author_id, amount FROM payout_requests WHERE id = ?', [payoutId]);

    if (payout.length === 0) {
      conn.release();
      return res.status(404).json({ error: 'Payout not found' });
    }

    // Update payout request
    await conn.query(
      'UPDATE payout_requests SET status = ?, rejection_reason = ?, updated_at = NOW() WHERE id = ?',
      ['rejected', reason, payoutId]
    );

    // Reverse earning record
    const earningId = uuidv4();
    await conn.query(
      `INSERT INTO author_earnings (id, author_id, amount, transaction_type, reference_id, description, balance, created_at)
       VALUES (?, ?, ?, 'adjustment', ?, ?, ?, NOW())`,
      [earningId, payout[0].author_id, payout[0].amount, payoutId, 'Payout rejected', payout[0].amount]
    );

    conn.release();

    return res.json({ message: 'Payout rejected' });
  } catch (error) {
    console.error('Reject payout error:', error);
    return res.status(500).json({ error: 'Failed to reject payout' });
  }
});

export default router;
