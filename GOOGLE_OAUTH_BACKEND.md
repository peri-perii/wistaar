// Backend: Express route handler for Google OAuth
// File: routes/auth.js or auth/google.js in your backend

import express from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import db from '../db'; // Your database connection
import bcrypt from 'bcrypt';

const router = express.Router();

// Initialize Google OAuth client
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback'
);

/**
 * POST /api/auth/google
 * Authenticate user with Google credential (JWT token)
 * 
 * Body: { credential: string } // Google-issued JWT
 * Response: { accessToken, refreshToken, user, isNewUser }
 */
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        error: 'Google credential is required',
      });
    }

    // Verify the credential with Google
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (error) {
      console.error('Google token verification failed:', error);
      return res.status(401).json({
        success: false,
        error: 'Invalid Google credential',
      });
    }

    if (!payload) {
      return res.status(401).json({
        success: false,
        error: 'Could not verify Google credential',
      });
    }

    const { sub: googleId, email, name, picture, email_verified } = payload;

    // Check if user exists
    let user = await db.query(
      'SELECT * FROM "User" WHERE "googleId" = ? OR email = ?',
      [googleId, email]
    );

    let isNewUser = false;

    if (!user || user.length === 0) {
      // Create new user
      isNewUser = true;
      
      // Generate random password (not used in OAuth flow)
      const randomPassword = require('crypto').randomBytes(32).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      const result = await db.query(
        `INSERT INTO "User" (
          email, 
          "passwordHash", 
          "googleId", 
          role, 
          "emailVerified",
          "createdAt",
          "updatedAt"
        ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [email, hashedPassword, googleId, 'USER', email_verified]
      );

      user = await db.query('SELECT * FROM "User" WHERE id = ?', [
        result.insertId,
      ]);

      // Create user profile
      await db.query(
        `INSERT INTO "Profile" (
          "userId",
          name,
          avatar,
          bio,
          "isAuthor",
          "createdAt",
          "updatedAt"
        ) VALUES (?, ?, ?, ?, false, NOW(), NOW())`,
        [user[0].id, name, picture, `Welcome to Wistaar!`]
      );
    } else {
      // Update user's Google ID if not set
      if (!user[0].googleId) {
        await db.query('UPDATE "User" SET "googleId" = ? WHERE id = ?', [
          googleId,
          user[0].id,
        ]);
      }

      // Update profile picture if available
      if (picture) {
        await db.query(
          'UPDATE "Profile" SET avatar = ? WHERE "userId" = ?',
          [picture, user[0].id]
        );
      }

      user[0].googleId = googleId;
    }

    // Generate JWT tokens
    const accessToken = jwt.sign(
      {
        id: user[0].id,
        email: user[0].email,
        role: user[0].role,
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      { id: user[0].id },
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
      { expiresIn: '7d' }
    );

    // Get user profile
    const profile = await db.query(
      'SELECT * FROM "Profile" WHERE "userId" = ?',
      [user[0].id]
    );

    return res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user[0].id,
          email: user[0].email,
          name: profile[0]?.name || name,
          picture: profile[0]?.avatar || picture,
          email_verified: user[0].emailVerified,
        },
        isNewUser,
      },
    });
  } catch (error) {
    console.error('Google OAuth error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
});

export default router;
