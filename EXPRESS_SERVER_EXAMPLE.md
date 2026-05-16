// Complete Express Backend Setup with Google OAuth
// File: server.js or index.js

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'
import mysql from 'mysql2/promise'
import bcrypt from 'bcrypt'
import crypto from 'crypto'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// ============ MIDDLEWARE ============

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://wistaar-76ivdwxzy-priyamj1502-8614s-projects.vercel.app'
  ],
  credentials: true
}))

app.use(express.json())

// ============ GOOGLE OAUTH CLIENT ============

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:5000/api/auth/google/callback'
)

// ============ DATABASE ============

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'wistaar',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

// ============ AUTH MIDDLEWARE ============

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret')
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid token' })
  }
}

// ============ ROUTES ============

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' })
})

// Google OAuth endpoint
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body

    if (!credential) {
      return res.status(400).json({
        success: false,
        error: 'Google credential is required',
      })
    }

    // Verify credential with Google
    let payload
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      })
      payload = ticket.getPayload()
    } catch (error) {
      console.error('Google verification failed:', error.message)
      return res.status(401).json({
        success: false,
        error: 'Invalid Google credential',
      })
    }

    if (!payload) {
      return res.status(401).json({
        success: false,
        error: 'Could not verify Google credential',
      })
    }

    const { sub: googleId, email, name, picture, email_verified } = payload
    const connection = await pool.getConnection()

    try {
      // Check if user exists
      const [existingUser] = await connection.query(
        'SELECT id, email, role FROM User WHERE googleId = ? OR email = ?',
        [googleId, email]
      )

      let user
      let isNewUser = false

      if (existingUser.length === 0) {
        // Create new user
        isNewUser = true
        const randomPassword = crypto.randomBytes(32).toString('hex')
        const hashedPassword = await bcrypt.hash(randomPassword, 10)

        const [result] = await connection.query(
          `INSERT INTO User (email, passwordHash, googleId, role, emailVerified) 
           VALUES (?, ?, ?, 'USER', ?)`,
          [email, hashedPassword, googleId, email_verified ? 1 : 0]
        )

        const userId = result.insertId

        // Create user profile
        await connection.query(
          `INSERT INTO Profile (userId, name, avatar, bio, isAuthor) 
           VALUES (?, ?, ?, ?, false)`,
          [userId, name, picture, 'Welcome to Wistaar!']
        )

        user = { id: userId, email, role: 'USER' }
      } else {
        // Update existing user
        user = existingUser[0]

        // Update googleId if not set
        if (!existingUser[0].googleId) {
          await connection.query(
            'UPDATE User SET googleId = ? WHERE id = ?',
            [googleId, user.id]
          )
        }

        // Update profile picture
        if (picture) {
          await connection.query(
            'UPDATE Profile SET avatar = ? WHERE userId = ?',
            [picture, user.id]
          )
        }
      }

      // Generate JWT tokens
      const accessToken = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      )

      const refreshToken = jwt.sign(
        { id: user.id },
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
        { expiresIn: '7d' }
      )

      res.json({
        success: true,
        data: {
          accessToken,
          refreshToken,
          user: {
            id: user.id,
            email: user.email,
            name: name,
            picture: picture,
            email_verified,
          },
          isNewUser,
        },
      })
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('Google OAuth error:', error)
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    })
  }
})

// Get current user (protected)
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const connection = await pool.getConnection()
    const [users] = await connection.query(
      'SELECT id, email, role FROM User WHERE id = ?',
      [req.user.id]
    )
    connection.release()

    if (users.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }

    res.json({ success: true, data: users[0] })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Logout (token invalidation)
app.post('/api/auth/logout', authMiddleware, (req, res) => {
  // Token is invalidated client-side by removing from localStorage
  // Or you can maintain a token blacklist in your database
  res.json({ success: true, message: 'Logged out' })
})

// Refresh token endpoint
app.post('/api/auth/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
      })
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret'
    )

    const accessToken = jwt.sign(
      {
        id: decoded.id,
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    )

    res.json({ success: true, data: { accessToken } })
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid refresh token' })
  }
})

// ============ ERROR HANDLING ============

app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
  })
})

// ============ START SERVER ============

app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`)
  console.log(`📝 Health check: http://localhost:${PORT}/api/health`)
})

export default app
