import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { hashPassword, verifyPassword, generateRandomToken } from '../utils/auth.js';
import { generateTokenPair } from '../utils/jwt.js';
import { sendEmailVerification, sendPasswordResetEmail, sendWelcomeEmail } from '../utils/email.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import axios from 'axios';

const router = Router();

// ============================================
// SIGN UP - Email & Password
// ============================================
router.post('/signup', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const conn = await pool.getConnection();
    
    // Check if user exists
    const [existing] = await conn.query('SELECT id FROM users WHERE email = ?', [email]);
    if ((existing as any[]).length > 0) {
      conn.release();
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Create user
    const userId = uuidv4();
    const passwordHash = await hashPassword(password);
    const emailVerificationToken = generateRandomToken();
    const tokenId = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await conn.query(
      'INSERT INTO users (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [userId, email, passwordHash, name || null, 'user']
    );

    await conn.query(
      'INSERT INTO email_verification_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [tokenId, userId, emailVerificationToken, expiresAt]
    );

    conn.release();

    // Send verification email
    try {
      await sendEmailVerification(email, emailVerificationToken);
    } catch (err) {
      console.error('Email sending failed:', err);
      // Continue anyway, user can request new token
    }

    return res.status(201).json({
      message: 'Account created! Check your email to verify.',
      userId,
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Signup failed' });
  }
});

// ============================================
// SIGN IN - Email & Password
// ============================================
router.post('/signin', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const conn = await pool.getConnection();
    const [rows] = await conn.query(
      'SELECT id, password_hash, name, role, is_email_verified FROM users WHERE email = ?',
      [email]
    );
    conn.release();

    if ((rows as any[]).length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = (rows as any)[0];
    const isPasswordValid = await verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_email_verified) {
      return res.status(403).json({
        error: 'Please verify your email first',
        userId: user.id,
        email,
      });
    }

    // Update last login
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    const tokens = generateTokenPair({
      userId: user.id,
      email,
      role: user.role,
    });

    return res.json({
      ...tokens,
      user: {
        id: user.id,
        email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Sign in error:', error);
    return res.status(500).json({ error: 'Sign in failed' });
  }
});

// ============================================
// VERIFY EMAIL
// ============================================
router.post('/verify-email', async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    const conn = await pool.getConnection();
    
    // Find and verify token
    const [tokens]: any = await conn.query(
      'SELECT user_id FROM email_verification_tokens WHERE token = ? AND expires_at > NOW()',
      [token]
    );

    if (tokens.length === 0) {
      conn.release();
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const userId = tokens[0].user_id;

    // Update user
    await conn.query(
      'UPDATE users SET is_email_verified = true, email_verified_at = NOW() WHERE id = ?',
      [userId]
    );

    // Delete token
    await conn.query('DELETE FROM email_verification_tokens WHERE token = ?', [token]);

    conn.release();

    return res.json({ message: 'Email verified successfully!' });
  } catch (error) {
    console.error('Email verification error:', error);
    return res.status(500).json({ error: 'Verification failed' });
  }
});

// ============================================
// RESEND VERIFICATION EMAIL
// ============================================
router.post('/resend-verification', async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const conn = await pool.getConnection();
    const [users]: any = await conn.query('SELECT id FROM users WHERE email = ?', [email]);
    conn.release();

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = users[0].id;
    const emailVerificationToken = generateRandomToken();
    const tokenId = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const conn2 = await pool.getConnection();
    await conn2.query(
      'INSERT INTO email_verification_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [tokenId, userId, emailVerificationToken, expiresAt]
    );
    conn2.release();

    await sendEmailVerification(email, emailVerificationToken);

    return res.json({ message: 'Verification email sent' });
  } catch (error) {
    console.error('Resend verification error:', error);
    return res.status(500).json({ error: 'Failed to send email' });
  }
});

// ============================================
// FORGOT PASSWORD
// ============================================
router.post('/forgot-password', async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const conn = await pool.getConnection();
    const [users]: any = await conn.query('SELECT id FROM users WHERE email = ?', [email]);
    conn.release();

    if (users.length === 0) {
      // Return success anyway for security reasons
      return res.json({ message: 'If email exists, reset link sent' });
    }

    const userId = users[0].id;
    const resetToken = generateRandomToken();
    const tokenId = uuidv4();
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    const conn2 = await pool.getConnection();
    await conn2.query(
      'INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [tokenId, userId, resetToken, expiresAt]
    );
    conn2.release();

    await sendPasswordResetEmail(email, resetToken);

    return res.json({ message: 'Reset link sent to email' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
});

// ============================================
// RESET PASSWORD
// ============================================
router.post('/reset-password', async (req: AuthRequest, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password required' });
    }

    const conn = await pool.getConnection();
    
    // Find and verify token
    const [tokens]: any = await conn.query(
      'SELECT user_id FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()',
      [token]
    );

    if (tokens.length === 0) {
      conn.release();
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const userId = tokens[0].user_id;
    const passwordHash = await hashPassword(newPassword);

    // Update password
    await conn.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);

    // Delete token
    await conn.query('DELETE FROM password_reset_tokens WHERE token = ?', [token]);

    conn.release();

    return res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: 'Password reset failed' });
  }
});

// ============================================
// GOOGLE OAUTH
// ============================================
router.post('/google-signin', async (req: AuthRequest, res: Response) => {
  try {
    const { googleToken } = req.body;

    if (!googleToken) {
      return res.status(400).json({ error: 'Google token required' });
    }

    // Verify Google token
    const response = await axios.get(
      'https://www.googleapis.com/oauth2/v1/userinfo',
      {
        headers: { Authorization: `Bearer ${googleToken}` },
      }
    );

    const { id: googleId, email, name, picture } = response.data;

    if (!email) {
      return res.status(400).json({ error: 'Could not get email from Google' });
    }

    const conn = await pool.getConnection();
    
    // Check if user exists with Google ID or email
    const [existing]: any = await conn.query(
      'SELECT * FROM users WHERE google_id = ? OR email = ?',
      [googleId, email]
    );

    let user;
    if (existing.length > 0) {
      user = existing[0];
      // Update Google info if needed
      if (!user.google_id) {
        await conn.query(
          'UPDATE users SET google_id = ?, google_email = ? WHERE id = ?',
          [googleId, email, user.id]
        );
      }
    } else {
      // Create new user
      const userId = uuidv4();
      await conn.query(
        'INSERT INTO users (id, email, name, avatar, google_id, google_email, is_email_verified, email_verified_at, role, created_at) VALUES (?, ?, ?, ?, ?, ?, true, NOW(), ?, NOW())',
        [userId, email, name, picture, googleId, email, 'user']
      );
      user = { id: userId, email, name, role: 'user' };
    }

    conn.release();

    // Update last login
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return res.json({
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error('Google signin error:', error);
    return res.status(500).json({ error: 'Google signin failed' });
  }
});

// ============================================
// REFRESH TOKEN
// ============================================
router.post('/refresh', async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT id, email, role FROM users WHERE id = ?', [req.user?.userId]);
    conn.release();

    if ((rows as any[]).length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = (rows as any)[0];
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return res.json(tokens);
  } catch (error) {
    return res.status(401).json({ error: 'Token refresh failed' });
  }
});

// ============================================
// LOGOUT
// ============================================
router.post('/logout', authMiddleware, async (req: AuthRequest, res: Response) => {
  // In a real app, you might want to blacklist the token or update session status
  return res.json({ message: 'Logged out successfully' });
});

// ============================================
// GET CURRENT USER
// ============================================
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query(
      'SELECT id, email, name, avatar, role, created_at FROM users WHERE id = ?',
      [req.user?.userId]
    );
    conn.release();

    if ((rows as any[]).length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json((rows as any)[0]);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;
