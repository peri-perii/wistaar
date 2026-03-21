import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ============================================
// COUPON MANAGEMENT ENDPOINTS
// ============================================

/**
 * GET /api/coupons/validate/:code
 * Validate coupon and get discount info
 * Query: { amount? } - Optional amount to calculate discount
 */
router.get('/validate/:code', async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;
    const { amount } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'Coupon code required' });
    }

    const conn = await pool.getConnection();

    const [coupons]: any = await conn.query(`
      SELECT 
        id, code, discount_type, discount_value, min_purchase, 
        max_uses, uses_count, expires_at, is_active
      FROM coupon_codes 
      WHERE code = ? AND is_active = TRUE AND expires_at > NOW()
    `, [code.toUpperCase()]);

    conn.release();

    if (coupons.length === 0) {
      return res.status(404).json({ error: 'Coupon not found or expired' });
    }

    const coupon = coupons[0];

    // Check usage limit
    if (coupon.uses_count >= coupon.max_uses) {
      return res.status(400).json({ error: 'Coupon usage limit reached' });
    }

    // Calculate discount if amount provided
    let discountAmount = 0;
    let finalAmount = amount ? parseFloat(amount as string) : 0;

    if (amount && finalAmount >= coupon.min_purchase) {
      if (coupon.discount_type === 'percentage') {
        discountAmount = (finalAmount * coupon.discount_value) / 100;
        finalAmount = finalAmount - discountAmount;
      } else if (coupon.discount_type === 'fixed') {
        discountAmount = coupon.discount_value;
        finalAmount = Math.max(0, finalAmount - discountAmount);
      }
    }

    return res.json({
      valid: true,
      coupon: {
        code: coupon.code,
        discountType: coupon.discount_type,
        discountValue: coupon.discount_value,
        minPurchase: coupon.min_purchase,
      },
      discount: amount ? {
        discountAmount: Math.round(discountAmount * 100) / 100,
        finalAmount: Math.round(finalAmount * 100) / 100,
        savings: Math.round(discountAmount * 100) / 100,
      } : null,
    });
  } catch (error) {
    console.error('Validate coupon error:', error);
    return res.status(500).json({ error: 'Failed to validate coupon' });
  }
});

/**
 * GET /api/coupons/active
 * Get all active coupons (for public listing)
 * Query: { page?, limit? }
 */
router.get('/active', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const conn = await pool.getConnection();

    const [coupons]: any = await conn.query(`
      SELECT 
        code, discount_type, discount_value, min_purchase, 
        expires_at
      FROM coupon_codes 
      WHERE is_active = TRUE AND expires_at > NOW()
      ORDER BY expires_at ASC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const [count]: any = await conn.query(`
      SELECT COUNT(*) as total 
      FROM coupon_codes 
      WHERE is_active = TRUE AND expires_at > NOW()
    `);

    conn.release();

    return res.json({
      coupons: coupons || [],
      pagination: {
        page,
        limit,
        total: count[0]?.total || 0,
        pages: Math.ceil((count[0]?.total || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Fetch coupons error:', error);
    return res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

/**
 * POST /api/coupons/admin/create
 * Create new coupon (Admin only)
 * Auth: Required (Admin)
 * Body: { code, discountType, discountValue, minPurchase, maxUses, expiresAt }
 */
router.post('/admin/create', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { code, discountType, discountValue, minPurchase, maxUses, expiresAt } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conn = await pool.getConnection();

    // Check if user is admin
    const [admins]: any = await conn.query(
      'SELECT id FROM admin_permissions WHERE user_id = ? AND is_super_admin = TRUE',
      [userId]
    );

    if (admins.length === 0) {
      conn.release();
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Validate input
    if (!code || !discountType || !discountValue) {
      conn.release();
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if code already exists
    const [existing]: any = await conn.query(
      'SELECT id FROM coupon_codes WHERE code = ?',
      [code.toUpperCase()]
    );

    if (existing.length > 0) {
      conn.release();
      return res.status(409).json({ error: 'Coupon code already exists' });
    }

    // Create coupon
    const couponId = uuidv4();
    await conn.query(`
      INSERT INTO coupon_codes (
        id, code, discount_type, discount_value, min_purchase, 
        max_uses, uses_count, expires_at, is_active, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, TRUE, ?)
    `, [
      couponId,
      code.toUpperCase(),
      discountType,
      discountValue,
      minPurchase || 0,
      maxUses || 1000,
      expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      userId,
    ]);

    conn.release();

    return res.status(201).json({
      message: 'Coupon created',
      couponId,
      code: code.toUpperCase(),
    });
  } catch (error) {
    console.error('Create coupon error:', error);
    return res.status(500).json({ error: 'Failed to create coupon' });
  }
});

/**
 * PUT /api/coupons/admin/:couponId
 * Update coupon (Admin only)
 * Auth: Required (Admin)
 */
router.put('/admin/:couponId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { couponId } = req.params;
    const { discountValue, maxUses, expiresAt, isActive } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conn = await pool.getConnection();

    // Check admin
    const [admins]: any = await conn.query(
      'SELECT id FROM admin_permissions WHERE user_id = ? AND (is_super_admin = TRUE OR can_manage_coupons = TRUE)',
      [userId]
    );

    if (admins.length === 0) {
      conn.release();
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Update coupon
    const updates = [];
    const values = [];

    if (discountValue !== undefined) {
      updates.push('discount_value = ?');
      values.push(discountValue);
    }
    if (maxUses !== undefined) {
      updates.push('max_uses = ?');
      values.push(maxUses);
    }
    if (expiresAt !== undefined) {
      updates.push('expires_at = ?');
      values.push(expiresAt);
    }
    if (isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(isActive);
    }

    if (updates.length === 0) {
      conn.release();
      return res.status(400).json({ error: 'Nothing to update' });
    }

    values.push(couponId);

    await conn.query(
      `UPDATE coupon_codes SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    conn.release();

    return res.json({ message: 'Coupon updated' });
  } catch (error) {
    console.error('Update coupon error:', error);
    return res.status(500).json({ error: 'Failed to update coupon' });
  }
});

/**
 * DELETE /api/coupons/admin/:couponId
 * Delete coupon (Admin only)
 * Auth: Required (Admin)
 */
router.delete('/admin/:couponId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { couponId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conn = await pool.getConnection();

    // Check admin
    const [admins]: any = await conn.query(
      'SELECT id FROM admin_permissions WHERE user_id = ? AND (is_super_admin = TRUE OR can_manage_coupons = TRUE)',
      [userId]
    );

    if (admins.length === 0) {
      conn.release();
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Delete coupon
    await conn.query('DELETE FROM coupon_codes WHERE id = ?', [couponId]);

    conn.release();

    return res.json({ message: 'Coupon deleted' });
  } catch (error) {
    console.error('Delete coupon error:', error);
    return res.status(500).json({ error: 'Failed to delete coupon' });
  }
});

export default router;
